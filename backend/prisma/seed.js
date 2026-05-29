const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      name: 'Empresa Demo',
      cnpj: '00.000.000/0001-00',
      email: 'contato@empresademo.com.br',
      phone: '(11) 99999-9999',
      address: 'Rua das Flores, 123 - São Paulo/SP',
    },
  });

  const hash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'superadmin@helpdesk.com' },
    update: {},
    create: {
      name: 'Super Administrador',
      email: 'superadmin@helpdesk.com',
      password: hash,
      role: 'SUPER_ADMIN',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@empresademo.com.br' },
    update: {},
    create: {
      name: 'Admin Demo',
      email: 'admin@empresademo.com.br',
      password: hash,
      role: 'ADMIN',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'agente@empresademo.com.br' },
    update: {},
    create: {
      name: 'Agente Demo',
      email: 'agente@empresademo.com.br',
      password: hash,
      role: 'AGENT',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'cliente@empresademo.com.br' },
    update: {},
    create: {
      name: 'Cliente Demo',
      email: 'cliente@empresademo.com.br',
      password: hash,
      role: 'CLIENT',
      companyId: company.id,
    },
  });

  const cats = [
    { name: 'Suporte Técnico', description: 'Problemas técnicos em geral', slaHours: 8 },
    { name: 'Financeiro', description: 'Cobranças, faturas e pagamentos', slaHours: 24 },
    { name: 'Comercial', description: 'Vendas e contratos', slaHours: 4 },
    { name: 'RH', description: 'Recursos humanos e benefícios', slaHours: 48 },
  ];
  for (const cat of cats) {
    const existing = await prisma.category.findFirst({ where: { name: cat.name, companyId: company.id } });
    if (!existing) {
      await prisma.category.create({ data: { ...cat, companyId: company.id } });
    }
  }

  // ─── CRM seed (Contatos, Oportunidades, Atividades) ─────────────────────────
  const admin = await prisma.user.findUnique({ where: { email: 'admin@empresademo.com.br' } });
  const agent = await prisma.user.findUnique({ where: { email: 'agente@empresademo.com.br' } });

  const contactsData = [
    { code: 1, name: 'João Silva',         email: 'joao.silva@empresademo.com.br',     phone: '(11) 98888-1001', position: 'Diretor Comercial',    department: 'Comercial' },
    { code: 2, name: 'Maria Oliveira',     email: 'maria.oliveira@empresademo.com.br', phone: '(11) 98888-1002', position: 'Gerente de Compras',   department: 'Suprimentos' },
    { code: 3, name: 'Carlos Pereira',     email: 'carlos.pereira@empresademo.com.br', phone: '(11) 98888-1003', position: 'Coordenador de TI',    department: 'Tecnologia' },
    { code: 4, name: 'Ana Souza',          email: 'ana.souza@empresademo.com.br',      phone: '(11) 98888-1004', position: 'Analista Financeiro',  department: 'Financeiro' },
    { code: 5, name: 'Roberto Mendes',     email: 'roberto.mendes@empresademo.com.br', phone: '(11) 98888-1005', position: 'CEO',                  department: 'Diretoria' },
  ];
  for (const c of contactsData) {
    await prisma.crmContact.upsert({
      where: { code: c.code },
      update: {},
      create: { ...c, companyId: company.id, notes: 'Contato de demonstração.' },
    });
  }
  const contacts = await prisma.crmContact.findMany({ where: { companyId: company.id }, orderBy: { code: 'asc' } });

  const today = new Date();
  const addDays = (d) => new Date(today.getTime() + d * 86400000);

  const oppsData = [
    { code: 1, title: 'Renovação Contrato Anual',     stage: 'NEGOTIATION', value: 48000.00, probability: 75, contactIdx: 0, ownerId: admin?.id,  expectedClose: addDays(15) },
    { code: 2, title: 'Implantação Módulo Financeiro', stage: 'PROPOSAL',    value: 22500.00, probability: 50, contactIdx: 3, ownerId: agent?.id,  expectedClose: addDays(30) },
    { code: 3, title: 'Migração Servidor Cloud',       stage: 'PROSPECT',    value: 18000.00, probability: 30, contactIdx: 2, ownerId: admin?.id,  expectedClose: addDays(45) },
    { code: 4, title: 'Treinamento Equipe Suporte',    stage: 'LEAD',        value: 8500.00,  probability: 15, contactIdx: 1, ownerId: agent?.id,  expectedClose: addDays(60) },
    { code: 5, title: 'Consultoria Estratégica Q1',    stage: 'WON',         value: 35000.00, probability: 100, contactIdx: 4, ownerId: admin?.id, expectedClose: addDays(-10), closedAt: addDays(-5) },
    { code: 6, title: 'Plataforma Mobile',             stage: 'LOST',        value: 60000.00, probability: 0,  contactIdx: 0, ownerId: agent?.id,  expectedClose: addDays(-20), closedAt: addDays(-15) },
  ];
  for (const o of oppsData) {
    await prisma.crmOpportunity.upsert({
      where: { code: o.code },
      update: {},
      create: {
        code: o.code,
        title: o.title,
        description: 'Oportunidade de demonstração gerada pelo seed.',
        stage: o.stage,
        value: o.value,
        probability: o.probability,
        companyId: company.id,
        contactId: contacts[o.contactIdx]?.id || null,
        ownerId: o.ownerId,
        expectedClose: o.expectedClose,
        closedAt: o.closedAt || null,
      },
    });
  }
  const opps = await prisma.crmOpportunity.findMany({ where: { companyId: company.id }, orderBy: { code: 'asc' } });

  const actsData = [
    { code: 1, type: 'CALL',    title: 'Ligação inicial — apresentação',          status: 'DONE',    contactIdx: 0, oppIdx: 0, userId: admin?.id, scheduledAt: addDays(-7),  completedAt: addDays(-7) },
    { code: 2, type: 'MEETING', title: 'Reunião de alinhamento de proposta',      status: 'DONE',    contactIdx: 3, oppIdx: 1, userId: agent?.id, scheduledAt: addDays(-3),  completedAt: addDays(-3) },
    { code: 3, type: 'EMAIL',   title: 'Enviar proposta comercial revisada',      status: 'PENDING', contactIdx: 0, oppIdx: 0, userId: admin?.id, scheduledAt: addDays(2) },
    { code: 4, type: 'VISIT',   title: 'Visita técnica para levantamento',         status: 'PENDING', contactIdx: 2, oppIdx: 2, userId: agent?.id, scheduledAt: addDays(5) },
    { code: 5, type: 'TASK',    title: 'Preparar deck de treinamento',            status: 'PENDING', contactIdx: 1, oppIdx: 3, userId: admin?.id, scheduledAt: addDays(7) },
    { code: 6, type: 'NOTE',    title: 'Cliente sinalizou interesse em add-ons',  status: 'DONE',    contactIdx: 4, oppIdx: 4, userId: admin?.id, scheduledAt: addDays(-12), completedAt: addDays(-12) },
    { code: 7, type: 'CALL',    title: 'Follow-up — confirmar fechamento',        status: 'PENDING', contactIdx: 0, oppIdx: 0, userId: agent?.id, scheduledAt: addDays(-1) },
  ];
  for (const a of actsData) {
    await prisma.crmActivity.upsert({
      where: { code: a.code },
      update: {},
      create: {
        code: a.code,
        type: a.type,
        title: a.title,
        description: 'Atividade de demonstração.',
        status: a.status,
        companyId: company.id,
        contactId: contacts[a.contactIdx]?.id || null,
        opportunityId: opps[a.oppIdx]?.id || null,
        userId: a.userId,
        scheduledAt: a.scheduledAt,
        completedAt: a.completedAt || null,
      },
    });
  }

  console.log('Seed executado com sucesso!');
  console.log('Login: superadmin@helpdesk.com / admin123');
  console.log('Login: admin@empresademo.com.br / admin123');
  console.log(`CRM: ${contactsData.length} contatos, ${oppsData.length} oportunidades, ${actsData.length} atividades.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
