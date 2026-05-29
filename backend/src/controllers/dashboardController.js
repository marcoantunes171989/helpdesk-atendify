const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodRange(period = '14d') {
  const now = new Date();
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);

  switch (period) {
    case 'today':     break;
    case 'yesterday':
      start.setUTCDate(start.getUTCDate() - 1);
      end.setUTCDate(end.getUTCDate() - 1);
      end.setUTCHours(23, 59, 59, 999);
      break;
    case '7d':  start.setUTCDate(start.getUTCDate() - 6);  break;
    case '14d': start.setUTCDate(start.getUTCDate() - 13); break;
    case '30d': start.setUTCDate(start.getUTCDate() - 29); break;
    default:    start.setUTCDate(start.getUTCDate() - 13);
  }
  return { start, end };
}

function getPrevRange(start, end) {
  const diff = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diff);
  return { prevStart, prevEnd };
}

function delta(curr, prev) {
  if (prev === null || prev === undefined || prev === 0) return null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

function avgMinutes(tickets) {
  if (!tickets.length) return null;
  const total = tickets.reduce(
    (acc, t) => acc + (new Date(t.resolvedAt) - new Date(t.createdAt)) / 60000,
    0
  );
  return Math.round((total / tickets.length) * 10) / 10;
}

// ─── Legacy (backwards compat) ────────────────────────────────────────────────

exports.stats = async (req, res) => {
  const where = {};
  const [total, open, inProgress, resolved, closed, overdueSla] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { ...where, status: 'OPEN' } }),
    prisma.ticket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    prisma.ticket.count({ where: { ...where, status: 'RESOLVED' } }),
    prisma.ticket.count({ where: { ...where, status: 'CLOSED' } }),
    prisma.ticket.count({
      where: {
        ...where,
        slaDeadline: { lt: new Date() },
        status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] },
      },
    }),
  ]);
  const byPriority = await prisma.ticket.groupBy({ by: ['priority'], where, _count: true });
  const byStatus   = await prisma.ticket.groupBy({ by: ['status'],   where, _count: true });
  const byCategory = await prisma.ticket.groupBy({
    by: ['categoryId'],
    where: { ...where, categoryId: { not: null } },
    _count: true,
    orderBy: { _count: { categoryId: 'desc' } },
    take: 5,
  });
  const categoryIds = byCategory.map(c => c.categoryId);
  const categories  = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const byCategoryWithName = byCategory.map(c => ({
    ...c,
    name: categories.find(cat => cat.id === c.categoryId)?.name || 'Sem categoria',
  }));
  const recentTickets = await prisma.ticket.findMany({
    where, take: 10, orderBy: { createdAt: 'desc' },
    include: {
      user:     { select: { name: true } },
      category: { select: { name: true } },
      company:  { select: { name: true, fantasia: true } },
      employee: { select: { name: true } },
    },
  });
  res.json({ summary: { total, open, inProgress, resolved, closed, overdueSla }, byPriority, byStatus, byCategory: byCategoryWithName, recentTickets });
};

// ─── KPIs ─────────────────────────────────────────────────────────────────────

exports.kpis = async (req, res) => {
  const { period = '14d' } = req.query;
  const { start, end } = getPeriodRange(period);
  const { prevStart, prevEnd } = getPrevRange(start, end);

  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);

  const [
    openCount, inProgressCount, overdueSlaCount,
    resolvedToday,
    periodTickets, prevTickets,
    agentCount,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: 'OPEN' } }),
    prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.ticket.count({
      where: { slaDeadline: { lt: new Date() }, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } },
    }),
    prisma.ticket.count({
      where: { resolvedAt: { gte: todayStart, lte: todayEnd }, status: { in: ['RESOLVED', 'CLOSED'] } },
    }),
    prisma.ticket.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { id: true, status: true, createdAt: true, resolvedAt: true, slaDeadline: true },
    }),
    prisma.ticket.findMany({
      where: { createdAt: { gte: prevStart, lte: prevEnd } },
      select: { id: true, status: true, createdAt: true, resolvedAt: true, slaDeadline: true },
    }),
    prisma.user.count({ where: { role: { in: ['AGENT', 'ADMIN', 'SUPER_ADMIN'] }, active: true } }),
  ]);

  const resolvedCurr = periodTickets.filter(t => t.resolvedAt && ['RESOLVED', 'CLOSED'].includes(t.status));
  const resolvedPrev = prevTickets.filter(t => t.resolvedAt && ['RESOLVED', 'CLOSED'].includes(t.status));
  const tma = avgMinutes(resolvedCurr);
  const prevTma = avgMinutes(resolvedPrev);

  const slaCalc = (tickets) => {
    const withSla = tickets.filter(t => t.slaDeadline && t.resolvedAt);
    const ok = withSla.filter(t => new Date(t.resolvedAt) <= new Date(t.slaDeadline));
    return withSla.length > 0 ? Math.round((ok.length / withSla.length) * 100) : null;
  };
  const slaPct     = slaCalc(periodTickets);
  const prevSlaPct = slaCalc(prevTickets);

  res.json({
    period: `${start.toISOString().split('T')[0]}/${end.toISOString().split('T')[0]}`,
    kpis: {
      total_tickets_abertos:   { value: openCount,             delta_pct: null,                    trend: null },
      tickets_resolvidos_hoje: { value: resolvedToday,         delta_pct: null,                    trend: null },
      em_andamento:            { value: inProgressCount,       delta_pct: null,                    trend: null },
      sla_vencido:             { value: overdueSlaCount,       delta_pct: null,                    trend: null },
      total_periodo:           {
        value: periodTickets.length,
        delta_pct: delta(periodTickets.length, prevTickets.length),
        trend: periodTickets.length > prevTickets.length ? 'up' : periodTickets.length < prevTickets.length ? 'down' : 'stable',
      },
      tma_minutos: {
        value: tma,
        delta_pct: tma !== null && prevTma !== null ? delta(tma, prevTma) : null,
        trend: tma !== null && prevTma !== null ? (tma > prevTma ? 'up' : tma < prevTma ? 'down' : 'stable') : null,
      },
      sla_cumprido_pct: {
        value: slaPct,
        delta_pct: slaPct !== null && prevSlaPct !== null ? delta(slaPct, prevSlaPct) : null,
        trend: slaPct !== null && prevSlaPct !== null ? (slaPct > prevSlaPct ? 'up' : slaPct < prevSlaPct ? 'down' : 'stable') : null,
      },
      agentes_online: { value: agentCount, total_ativos: agentCount, delta_pct: null, trend: null },
    },
  });
};

// ─── Volume ───────────────────────────────────────────────────────────────────

exports.volume = async (req, res) => {
  const { period = '14d' } = req.query;
  const { start, end } = getPeriodRange(period);

  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { createdAt: { gte: start, lte: end } },
        { resolvedAt: { gte: start, lte: end } },
      ],
    },
    select: { id: true, createdAt: true, resolvedAt: true, status: true, slaDeadline: true },
  });

  const days = [];
  const cur = new Date(start);
  while (cur <= end) { days.push(new Date(cur)); cur.setUTCDate(cur.getUTCDate() + 1); }

  const data = days.map(day => {
    const ds = new Date(day); ds.setUTCHours(0, 0, 0, 0);
    const de = new Date(day); de.setUTCHours(23, 59, 59, 999);

    const inRange = (d) => d >= ds && d <= de;
    const opened  = tickets.filter(t => inRange(new Date(t.createdAt))).length;
    const resolved = tickets.filter(t => t.resolvedAt && inRange(new Date(t.resolvedAt))).length;
    const expired  = tickets.filter(t => {
      if (!t.slaDeadline) return false;
      return inRange(new Date(t.slaDeadline)) && ['OPEN', 'IN_PROGRESS'].includes(t.status);
    }).length;

    return { date: day.toISOString().split('T')[0], opened, resolved, expired };
  });

  res.json({ period: `${start.toISOString().split('T')[0]}/${end.toISOString().split('T')[0]}`, data });
};

// ─── Categories ───────────────────────────────────────────────────────────────

exports.categories = async (req, res) => {
  const { period = '14d', limit = '10' } = req.query;
  const { start, end } = getPeriodRange(period);

  const byCategory = await prisma.ticket.groupBy({
    by: ['categoryId'],
    where: { categoryId: { not: null }, createdAt: { gte: start, lte: end } },
    _count: true,
    orderBy: { _count: { categoryId: 'desc' } },
    take: Number(limit),
  });

  const total = byCategory.reduce((acc, c) => acc + c._count, 0);
  const categoryIds = byCategory.map(c => c.categoryId);
  const categories  = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });

  const data = byCategory.map(c => ({
    categoryId: c.categoryId,
    name:  categories.find(cat => cat.id === c.categoryId)?.name || 'Sem categoria',
    count: c._count,
    pct:   total > 0 ? Math.round((c._count / total) * 1000) / 10 : 0,
  }));

  res.json({ total, data });
};

// ─── SLA by Priority ──────────────────────────────────────────────────────────

exports.slaByPriority = async (req, res) => {
  const { period = '14d' } = req.query;
  const { start, end } = getPeriodRange(period);

  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: start, lte: end }, slaDeadline: { not: null } },
    select: { id: true, priority: true, status: true, resolvedAt: true, slaDeadline: true },
  });

  const GOALS  = { CRITICAL: 95, HIGH: 90, MEDIUM: 85, LOW: 80 };
  const LABELS = { CRITICAL: 'Crítica (P1)', HIGH: 'Alta (P2)', MEDIUM: 'Média (P3)', LOW: 'Baixa (P4)' };

  const data = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => {
    const group     = tickets.filter(t => t.priority === priority);
    const compliant = group.filter(t => t.resolvedAt && new Date(t.resolvedAt) <= new Date(t.slaDeadline));
    const pct  = group.length > 0 ? Math.round((compliant.length / group.length) * 100) : null;
    const goal = GOALS[priority];
    const status = pct === null ? 'none' : pct >= goal ? 'green' : pct >= goal - 10 ? 'yellow' : 'red';
    return { priority, label: LABELS[priority], total: group.length, compliant: compliant.length, pct, goal, status };
  });

  res.json({ data });
};

// ─── Peak Hours ───────────────────────────────────────────────────────────────

exports.peakHours = async (req, res) => {
  const { period = '30d' } = req.query;
  const { start, end } = getPeriodRange(period);

  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { id: true, createdAt: true },
  });

  const wdCounts  = Array(24).fill(0);
  const weCounts  = Array(24).fill(0);
  const wdDaysSet = new Set();
  const weDaysSet = new Set();

  tickets.forEach(t => {
    const d   = new Date(t.createdAt);
    const dow = d.getUTCDay();
    const h   = d.getUTCHours();
    const ds  = d.toISOString().split('T')[0];
    if (dow === 0 || dow === 6) { weCounts[h]++;  weDaysSet.add(ds); }
    else                        { wdCounts[h]++;  wdDaysSet.add(ds); }
  });

  const wdDays = wdDaysSet.size || 1;
  const weDays = weDaysSet.size || 1;

  const data = Array(24).fill(null).map((_, i) => ({
    hour:    `${String(i).padStart(2, '0')}h`,
    seg_sex: Math.round((wdCounts[i] / wdDays) * 100) / 100,
    sab_dom: Math.round((weCounts[i] / weDays) * 100) / 100,
  }));

  res.json({ data });
};

// ─── Agent Performance ────────────────────────────────────────────────────────

exports.agents = async (req, res) => {
  const { period = '14d' } = req.query;
  const { start, end } = getPeriodRange(period);

  const ROLE_LABELS = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Administrador', AGENT: 'Agente' };

  const [agentUsers, resolvedTickets] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['AGENT', 'ADMIN', 'SUPER_ADMIN'] }, active: true },
      select: { id: true, name: true, role: true },
    }),
    prisma.ticket.findMany({
      where: {
        assignedTo: { not: null },
        resolvedAt: { gte: start, lte: end },
        status: { in: ['RESOLVED', 'CLOSED'] },
      },
      select: { id: true, assignedTo: true, createdAt: true, resolvedAt: true, slaDeadline: true },
    }),
  ]);

  const agentData = agentUsers.map(agent => {
    const mine   = resolvedTickets.filter(t => t.assignedTo === agent.id);
    const tma    = avgMinutes(mine);
    const withSla = mine.filter(t => t.slaDeadline);
    const slaOk   = withSla.filter(t => new Date(t.resolvedAt) <= new Date(t.slaDeadline));
    const slaPct  = withSla.length > 0 ? Math.round((slaOk.length / withSla.length) * 100) : null;

    return {
      id:                agent.id,
      nome_agente:       agent.name,
      equipe:            ROLE_LABELS[agent.role] || agent.role,
      tickets_resolvidos: mine.length,
      tma_agente:        tma,
      csat_agente:       null,
      sla_agente_pct:    slaPct,
      status_atual:      'Online',
    };
  });

  agentData.sort((a, b) => b.tickets_resolvidos - a.tickets_resolvidos);
  res.json({ agents: agentData });
};

// ─── Queue Real-time ──────────────────────────────────────────────────────────

exports.queue = async (req, res) => {
  const now = new Date();

  const openTickets = await prisma.ticket.findMany({
    where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
    select: { id: true, priority: true, status: true, createdAt: true, slaDeadline: true },
  });

  const LABELS = { CRITICAL: 'Crítica', HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' };

  const data = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => {
    const group   = openTickets.filter(t => t.priority === priority);
    const avgWait = group.length > 0
      ? Math.round(group.reduce((acc, t) => acc + (now - new Date(t.createdAt)) / 60000, 0) / group.length)
      : 0;
    const expiredSla = group.filter(t => t.slaDeadline && new Date(t.slaDeadline) < now).length;
    return { priority, label: LABELS[priority], count: group.length, avg_wait_min: avgWait, expired_sla: expiredSla };
  });

  res.json({ updated_at: now.toISOString(), data });
};
