import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const FEATURES = [
  {
    icon: '🎫', bg: '#eff6ff', color: '#2563eb',
    title: 'Gestão de Chamados',
    desc: 'Abra, acompanhe e resolva tickets com controle completo de status, prioridade e histórico de atendimento.',
  },
  {
    icon: '⏱️', bg: '#fffbeb', color: '#d97706',
    title: 'Controle de SLA',
    desc: 'Defina prazos por categoria e receba alertas automáticos antes do vencimento. Nunca perca um prazo.',
  },
  {
    icon: '👥', bg: '#eff6ff', color: '#2563eb',
    title: 'Gestão de Equipes',
    desc: 'Cadastre agentes, atribua chamados e controle a carga de trabalho de toda a equipe em tempo real.',
  },
  {
    icon: '📊', bg: '#f5f3ff', color: '#7c3aed',
    title: 'Dashboard em Tempo Real',
    desc: 'Visualize métricas, tendências e indicadores de desempenho do seu atendimento em um painel completo.',
  },
  {
    icon: '🏢', bg: '#fef2f2', color: '#dc2626',
    title: 'Múltiplas Empresas',
    desc: 'Gerencie vários clientes ou unidades de negócio em um único sistema com isolamento total de dados.',
  },
  {
    icon: '🔒', bg: '#eff6ff', color: '#2563eb',
    title: 'Perfis de Acesso',
    desc: 'Controle granular de permissões: Super Admin, Administrador, Agente e Cliente com acessos distintos.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Cadastre sua empresa',
    desc: 'Configure sua empresa, categorias de atendimento e defina os prazos de SLA.',
  },
  {
    n: '2',
    title: 'Adicione sua equipe',
    desc: 'Convide agentes e clientes. Cada perfil tem acesso personalizado ao sistema.',
  },
  {
    n: '3',
    title: 'Comece a atender',
    desc: 'Gerencie chamados, acompanhe prazos e melhore a experiência dos seus clientes.',
  },
];

const STATS = [
  { val: '99%', label: 'Uptime garantido' },
  { val: '< 1s', label: 'Tempo de resposta' },
  { val: '4', label: 'Perfis de acesso' },
  { val: '24/7', label: 'Disponibilidade' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div className="lp">
      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <a className="lp-nav-logo" href="#">
          <div className="lp-nav-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white" />
            </svg>
          </div>
          <span className="lp-nav-logo-text">Atendexa</span>
        </a>

        <div className="lp-nav-links">
          <span className="lp-nav-link" onClick={() => scrollTo('features')}>Funcionalidades</span>
          <span className="lp-nav-link" onClick={() => scrollTo('how')}>Como funciona</span>
          <span className="lp-nav-link" onClick={() => scrollTo('cta')}>Contato</span>
          <a className="lp-nav-btn" onClick={() => navigate('/login')}>
            Acessar Sistema →
          </a>
        </div>

        <button className="lp-nav-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`lp-mobile-menu${menuOpen ? ' open' : ''}`}>
        <span className="lp-nav-link" onClick={() => scrollTo('features')}>Funcionalidades</span>
        <span className="lp-nav-link" onClick={() => scrollTo('how')}>Como funciona</span>
        <span className="lp-nav-link" onClick={() => scrollTo('cta')}>Contato</span>
        <a className="lp-nav-btn" style={{ textAlign: 'center' }} onClick={() => navigate('/login')}>Acessar Sistema →</a>
      </div>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div>
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot" />
              Sistema de Atendimento
            </div>
            <h1 className="lp-hero-title">
              Atendimento ágil,<br />
              <span>resultados reais</span>
            </h1>
            <p className="lp-hero-subtitle">
              Plataforma completa de atendimento para gerenciar chamados, equipes e
              prazos de SLA — tudo em um só lugar, com clareza e eficiência.
            </p>
            <div className="lp-hero-actions">
              <a className="lp-btn-primary" onClick={() => navigate('/login')}>
                Acessar Sistema →
              </a>
              <a className="lp-btn-secondary" onClick={() => scrollTo('features')}>
                Ver funcionalidades
              </a>
            </div>
          </div>

          {/* Mockup visual */}
          <div className="lp-hero-visual">
            <div className="lp-mockup">
              <div className="lp-mockup-bar">
                <div className="lp-mockup-dot" style={{ background: '#ff5f57' }} />
                <div className="lp-mockup-dot" style={{ background: '#ffbd2e' }} />
                <div className="lp-mockup-dot" style={{ background: '#28c840' }} />
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#e5e7eb', marginLeft: 8 }} />
              </div>
              <div className="lp-mockup-body">
                <div className="lp-mockup-header">
                  <span className="lp-mockup-title">Dashboard</span>
                  <span className="lp-mockup-btn">+ Novo Chamado</span>
                </div>
                <div className="lp-mockup-stat-row">
                  {[{ v: '24', l: 'Abertos', c: '#2563eb' }, { v: '8', l: 'Em andamento', c: '#d97706' }, { v: '142', l: 'Resolvidos', c: '#2563eb' }].map(s => (
                    <div key={s.l} className="lp-mockup-stat">
                      <div className="lp-mockup-stat-val" style={{ color: s.c }}>{s.v}</div>
                      <div className="lp-mockup-stat-label">{s.l}</div>
                    </div>
                  ))}
                </div>
                {[
                  { t: 'Erro no sistema de login', tag: 'Alta', tc: '#fee2e2', tcc: '#dc2626', st: 'Aberto', sc: '#dbeafe', scc: '#2563eb' },
                  { t: 'Solicitação de acesso VPN', tag: 'Média', tc: '#fef3c7', tcc: '#d97706', st: 'Em andamento', sc: '#fef3c7', scc: '#d97706' },
                  { t: 'Atualização de cadastro', tag: 'Baixa', tc: '#f3f4f6', tcc: '#6b7280', st: 'Resolvido', sc: '#dbeafe', scc: '#2563eb' },
                ].map((r, i) => (
                  <div key={i} className="lp-mockup-row">
                    <span className="lp-mockup-row-title">{r.t}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span className="lp-mockup-tag" style={{ background: r.tc, color: r.tcc }}>{r.tag}</span>
                      <span className="lp-mockup-tag" style={{ background: r.sc, color: r.scc }}>{r.st}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Float cards */}
            <div className="lp-float-card lp-float-card-1">
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✅</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>SLA Cumprido</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>98% dos chamados</div>
              </div>
            </div>

            <div className="lp-float-card lp-float-card-2">
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>TEMPO MÉDIO</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>2.4h</div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>de resolução</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <span className="lp-section-label">Funcionalidades</span>
          <h2 className="lp-section-title">Tudo que você precisa<br />para um atendimento de excelência</h2>
          <p className="lp-section-subtitle">
            Uma plataforma completa e intuitiva que centraliza todo o seu processo de suporte ao cliente.
          </p>
          <div className="lp-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon" style={{ background: f.bg }}>
                  <span>{f.icon}</span>
                </div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="lp-stats">
        <div className="lp-stats-inner">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="lp-stat-val">{s.val}</div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section className="lp-section lp-section-alt" id="how">
        <div className="lp-section-inner">
          <span className="lp-section-label">Como funciona</span>
          <h2 className="lp-section-title">Em 3 passos simples</h2>
          <p className="lp-section-subtitle">
            Configure e comece a usar em minutos, sem complexidade técnica.
          </p>
          <div className="lp-steps">
            {STEPS.map(s => (
              <div key={s.n} className="lp-step">
                <div className="lp-step-num">{s.n}</div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta" id="cta">
        <div className="lp-cta-inner">
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
          <h2 className="lp-cta-title">Pronto para começar?</h2>
          <p className="lp-cta-subtitle">
            Acesse agora e transforme a forma como sua equipe gerencia o atendimento ao cliente.
          </p>
          <a className="lp-btn-primary" style={{ fontSize: 16, padding: '16px 36px', display: 'inline-flex' }}
            onClick={() => navigate('/login')}>
            Acessar o Sistema →
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">
          <div className="lp-nav-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white" />
            </svg>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Atendexa</span>
        </div>
        <span className="lp-footer-text">© {new Date().getFullYear()} Atendexa · Todos os direitos reservados</span>
        <a className="lp-nav-btn" onClick={() => navigate('/login')}>Acessar →</a>
      </footer>
    </div>
  );
}
