import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const FEATURES = [
  {
    icon: '🎫', title: 'Gestão de Chamados',
    desc: 'Abra, acompanhe e resolva tickets com controle completo de status, prioridade e histórico detalhado de atendimento.',
  },
  {
    icon: '⏱️', title: 'Controle de SLA',
    desc: 'Defina prazos por categoria, receba alertas automáticos antes do vencimento e nunca mais perca um prazo.',
  },
  {
    icon: '👥', title: 'Gestão de Equipes',
    desc: 'Cadastre técnicos, atribua chamados e acompanhe a carga de trabalho de toda a equipe em tempo real.',
  },
  {
    icon: '📊', title: 'Dashboard Completo',
    desc: 'Visualize métricas, tendências e indicadores de desempenho do seu atendimento em um painel intuitivo.',
  },
  {
    icon: '🏢', title: 'Múltiplas Empresas',
    desc: 'Gerencie vários clientes ou unidades em um único sistema com isolamento total de dados por empresa.',
  },
  {
    icon: '🔒', title: 'Perfis de Acesso',
    desc: 'Controle granular de permissões: Super Admin, Administrador, Agente e Cliente com acessos distintos.',
  },
];

const STATS = [
  { val: '99%', label: 'Uptime garantido' },
  { val: '< 2h', label: 'Tempo médio de resolução' },
  { val: '4', label: 'Perfis de acesso' },
  { val: '24/7', label: 'Disponibilidade' },
];

const STEPS = [
  {
    n: '01', icon: '🏢',
    title: 'Cadastre sua empresa',
    desc: 'Configure sua empresa, defina categorias de atendimento e estabeleça os prazos de SLA por tipo de chamado.',
  },
  {
    n: '02', icon: '👤',
    title: 'Adicione sua equipe',
    desc: 'Convide técnicos e clientes. Cada perfil tem acesso personalizado com as permissões corretas automaticamente.',
  },
  {
    n: '03', icon: '🚀',
    title: 'Comece a atender',
    desc: 'Gerencie chamados, acompanhe SLAs em tempo real e entregue um atendimento que fideliza clientes.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Ricardo Andrade',
    role: 'Gerente de TI · Rede Farma Plus',
    avatar: 'RA',
    color: '#2563eb',
    stars: 5,
    text: 'Em menos de um mês, reduzimos o tempo médio de resolução de chamados em 58%. A visibilidade que o dashboard dá é incomparável — agora meu gestor recebe relatórios sem eu precisar montar nada manualmente.',
  },
  {
    name: 'Fernanda Costa',
    role: 'Diretora de Operações · LogisTech',
    avatar: 'FC',
    color: '#7c3aed',
    stars: 5,
    text: 'O controle de SLA salvou vários contratos importantes. Antes perdíamos prazos sem perceber. Hoje recebo alerta antes de vencer e minha equipe age a tempo. Vale cada centavo.',
  },
  {
    name: 'Paulo Mendes',
    role: 'Coordenador de Suporte · Grupo Piassi',
    avatar: 'PM',
    color: '#059669',
    stars: 5,
    text: 'Interface simples, minha equipe aprendeu em um dia. A funcionalidade de múltiplas empresas foi decisiva — gerencio 4 unidades do grupo com dados completamente separados, sem confusão.',
  },
];

const FAQS = [
  {
    q: 'O sistema funciona em dispositivos móveis?',
    a: 'Sim. A plataforma é totalmente responsiva e funciona em qualquer dispositivo com navegador — smartphone, tablet ou desktop, sem necessidade de instalar nenhum aplicativo.',
  },
  {
    q: 'Posso gerenciar múltiplas empresas ou unidades?',
    a: 'Sim. A Atendexa suporta múltiplas empresas no mesmo sistema, com isolamento total de dados. Cada empresa tem seus próprios chamados, equipes e configurações de SLA.',
  },
  {
    q: 'Como funciona o controle de SLA?',
    a: 'Você define prazos de atendimento por categoria (ex: Fiscal = 4h, Financeiro = 8h). O sistema calcula automaticamente o prazo, exibe alertas visuais e marca os chamados vencidos no dashboard.',
  },
  {
    q: 'Preciso de conhecimento técnico para configurar?',
    a: 'Não. A configuração é simples e intuitiva. Em menos de 30 minutos você cadastra a empresa, cria categorias, convida a equipe e está pronto para começar a atender.',
  },
  {
    q: 'Quais perfis de acesso estão disponíveis?',
    a: 'Quatro perfis: Super Admin (controle total da plataforma), Administrador (gestão da empresa), Técnico (atendimento de chamados) e Cliente (abertura e acompanhamento de chamados).',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

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
          <span className="lp-nav-link" onClick={() => scrollTo('testimonials')}>Depoimentos</span>
          <span className="lp-nav-link" onClick={() => scrollTo('faq')}>FAQ</span>
          <a className="lp-nav-btn" onClick={() => navigate('/login')}>Acessar Sistema →</a>
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
        <span className="lp-nav-link" onClick={() => scrollTo('testimonials')}>Depoimentos</span>
        <span className="lp-nav-link" onClick={() => scrollTo('faq')}>FAQ</span>
        <a className="lp-nav-btn" style={{ textAlign: 'center' }} onClick={() => navigate('/login')}>Acessar Sistema →</a>
      </div>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div>
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot" />
              Sistema de Atendimento Inteligente
            </div>
            <h1 className="lp-hero-title">
              Atendimento ágil,<br />
              <span>resultados reais</span>
            </h1>
            <p className="lp-hero-subtitle">
              Plataforma completa para gerenciar chamados, equipes e prazos de SLA —
              tudo em um só lugar, com clareza e eficiência que transforma o suporte ao cliente.
            </p>
            <div className="lp-hero-actions">
              <a className="lp-btn-primary" onClick={() => navigate('/login')}>
                Acessar o Sistema →
              </a>
              <a className="lp-btn-secondary" onClick={() => scrollTo('features')}>
                Ver funcionalidades
              </a>
            </div>
            <div className="lp-hero-trust">
              <div className="lp-hero-trust-stars">★★★★★</div>
              <span className="lp-hero-trust-text">Avaliado com 5 estrelas por equipes de suporte</span>
            </div>
          </div>

          {/* Mockup visual */}
          <div className="lp-hero-visual">
            <div className="lp-mockup">
              <div className="lp-mockup-bar">
                <div className="lp-mockup-dot" style={{ background: '#ff5f57' }} />
                <div className="lp-mockup-dot" style={{ background: '#ffbd2e' }} />
                <div className="lp-mockup-dot" style={{ background: '#28c840' }} />
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', marginLeft: 8 }} />
              </div>
              <div className="lp-mockup-body">
                <div className="lp-mockup-header">
                  <span className="lp-mockup-title">Dashboard · Chamados</span>
                  <span className="lp-mockup-btn">+ Novo Chamado</span>
                </div>
                <div className="lp-mockup-stat-row">
                  {[{ v: '24', l: 'Abertos', c: '#3b82f6' }, { v: '8', l: 'Em andamento', c: '#f59e0b' }, { v: '142', l: 'Resolvidos', c: '#10b981' }].map(s => (
                    <div key={s.l} className="lp-mockup-stat">
                      <div className="lp-mockup-stat-val" style={{ color: s.c }}>{s.v}</div>
                      <div className="lp-mockup-stat-label">{s.l}</div>
                    </div>
                  ))}
                </div>
                {[
                  { t: 'Erro no sistema de login', tag: 'Alta', tc: 'rgba(239,68,68,0.2)', tcc: '#f87171', st: 'Aberto', sc: 'rgba(59,130,246,0.2)', scc: '#60a5fa' },
                  { t: 'Solicitação de acesso VPN', tag: 'Média', tc: 'rgba(245,158,11,0.2)', tcc: '#fbbf24', st: 'Em andamento', sc: 'rgba(245,158,11,0.2)', scc: '#fbbf24' },
                  { t: 'Atualização de cadastro', tag: 'Baixa', tc: 'rgba(107,114,128,0.2)', tcc: '#9ca3af', st: 'Resolvido', sc: 'rgba(16,185,129,0.2)', scc: '#34d399' },
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

            <div className="lp-float-card lp-float-card-1">
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✅</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>SLA Cumprido</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>98% dos chamados</div>
              </div>
            </div>

            <div className="lp-float-card lp-float-card-2">
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tempo Médio</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#3b82f6' }}>2.4h</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>de resolução</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="lp-trust-bar">
        <span className="lp-trust-label">Plataforma confiada por equipes de suporte em todo o Brasil</span>
        <div className="lp-trust-items">
          {['Gestão de Chamados', 'Controle de SLA', 'Dashboard em Tempo Real', 'Múltiplas Empresas', 'Perfis de Acesso'].map(item => (
            <span key={item} className="lp-trust-item">
              <span className="lp-trust-dot" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <span className="lp-section-label">Funcionalidades</span>
          <h2 className="lp-section-title">Tudo que você precisa<br />para um atendimento de excelência</h2>
          <p className="lp-section-subtitle">
            Uma plataforma completa e intuitiva que centraliza todo o processo de suporte — do chamado ao relatório.
          </p>
          <div className="lp-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon">
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
            <div key={s.label} className="lp-stat-item">
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
            Configure e comece a usar em minutos, sem complexidade técnica ou instalação de software.
          </p>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={s.n} className="lp-step">
                <div className="lp-step-icon">{s.icon}</div>
                <div className="lp-step-num">{s.n}</div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="lp-section" id="testimonials">
        <div className="lp-section-inner">
          <span className="lp-section-label">Depoimentos</span>
          <h2 className="lp-section-title">O que dizem nossos clientes</h2>
          <p className="lp-section-subtitle">
            Equipes reais, resultados reais. Veja como a Atendexa transformou o atendimento de quem já usa.
          </p>
          <div className="lp-testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="lp-testimonial-card">
                <div className="lp-testimonial-stars">
                  {'★'.repeat(t.stars)}
                </div>
                <p className="lp-testimonial-text">"{t.text}"</p>
                <div className="lp-testimonial-author">
                  <div className="lp-testimonial-avatar" style={{ background: t.color }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="lp-testimonial-name">{t.name}</div>
                    <div className="lp-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-section lp-section-alt" id="faq">
        <div className="lp-section-inner lp-faq-inner">
          <div>
            <span className="lp-section-label">Perguntas frequentes</span>
            <h2 className="lp-section-title" style={{ marginBottom: 12 }}>Tem alguma dúvida?</h2>
            <p className="lp-section-subtitle" style={{ marginBottom: 0 }}>
              Respondemos as perguntas mais comuns sobre a plataforma.
            </p>
          </div>
          <div className="lp-faq-list">
            {FAQS.map((f, i) => (
              <div
                key={i}
                className={`lp-faq-item${openFaq === i ? ' open' : ''}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="lp-faq-question">
                  <span>{f.q}</span>
                  <span className="lp-faq-icon">{openFaq === i ? '−' : '+'}</span>
                </div>
                {openFaq === i && (
                  <div className="lp-faq-answer">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta" id="cta">
        <div className="lp-cta-card">
          <div className="lp-cta-glow" />
          <div className="lp-cta-inner">
            <span className="lp-section-label" style={{ marginBottom: 16 }}>Pronto para começar?</span>
            <h2 className="lp-cta-title">Transforme seu atendimento<br />a partir de hoje</h2>
            <p className="lp-cta-subtitle">
              Acesse a plataforma agora e descubra como a Atendexa pode elevar o nível do seu suporte ao cliente com controle, agilidade e inteligência.
            </p>
            <div className="lp-cta-actions">
              <a className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/login')}>
                Acessar o Sistema →
              </a>
              <a className="lp-btn-glass" onClick={() => scrollTo('features')}>
                Ver funcionalidades
              </a>
            </div>
            <div className="lp-cta-badges">
              {['🔒 Seguro e criptografado', '✓ Conforme LGPD', '☁ Infraestrutura Cloud', '⚡ Sem instalação'].map(b => (
                <span key={b} className="lp-cta-badge">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-footer-logo">
              <div className="lp-nav-logo-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white" />
                </svg>
              </div>
              <span className="lp-footer-logo-text">Atendexa</span>
            </div>
            <p className="lp-footer-brand-desc">
              Plataforma inteligente de gestão de chamados e atendimento ao cliente.
            </p>
          </div>
          <div className="lp-footer-links">
            <div className="lp-footer-col">
              <span className="lp-footer-col-title">Plataforma</span>
              <span className="lp-footer-col-link" onClick={() => scrollTo('features')}>Funcionalidades</span>
              <span className="lp-footer-col-link" onClick={() => scrollTo('how')}>Como funciona</span>
              <span className="lp-footer-col-link" onClick={() => scrollTo('testimonials')}>Depoimentos</span>
              <span className="lp-footer-col-link" onClick={() => scrollTo('faq')}>FAQ</span>
            </div>
            <div className="lp-footer-col">
              <span className="lp-footer-col-title">Acesso</span>
              <span className="lp-footer-col-link" onClick={() => navigate('/login')}>Entrar na plataforma</span>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span className="lp-footer-copy">© {new Date().getFullYear()} Atendexa · Todos os direitos reservados</span>
          <div className="lp-footer-bottom-badges">
            {['🔒 SSL', '✓ LGPD', '☁ Cloud'].map(b => (
              <span key={b} className="lp-footer-badge">{b}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
