import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

/* ─── Logo SVG dourado (fiel à marca) ─── */
const LogoIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 88" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gold-a" x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stopColor="#f5d96a" />
        <stop offset="45%" stopColor="#d4a520" />
        <stop offset="100%" stopColor="#9a6e00" />
      </linearGradient>
    </defs>
    {/* Perna esquerda do A */}
    <path d="M50 3 L2 85 L22 85 L50 26 Z" fill="url(#gold-a)" />
    {/* Perna direita do A */}
    <path d="M50 3 L98 85 L78 85 L50 26 Z" fill="url(#gold-a)" />
    {/* Swoosh diagonal (crossbar inclinado) */}
    <path d="M17 72 L83 44" stroke="url(#gold-a)" strokeWidth="11" strokeLinecap="round" />
  </svg>
);

const FEATURES = [
  { icon: '🎫', title: 'Gestão de Chamados', desc: 'Abra, acompanhe e resolva tickets com controle completo de status, prioridade e histórico detalhado de atendimento.' },
  { icon: '⏱️', title: 'Controle de SLA', desc: 'Defina prazos por categoria, receba alertas automáticos antes do vencimento e nunca mais perca um prazo crítico.' },
  { icon: '👥', title: 'Gestão de Equipes', desc: 'Cadastre técnicos, atribua chamados e acompanhe a carga de trabalho de toda a equipe em tempo real.' },
  { icon: '📊', title: 'Dashboard Completo', desc: 'Visualize métricas, tendências e indicadores de desempenho do seu atendimento em um painel intuitivo.' },
  { icon: '🏢', title: 'Múltiplas Empresas', desc: 'Gerencie vários clientes ou unidades em um único sistema com isolamento total de dados por empresa.' },
  { icon: '🔒', title: 'Perfis de Acesso', desc: 'Controle granular de permissões: Super Admin, Administrador, Técnico e Cliente com acessos distintos.' },
];

const STATS = [
  { val: '99%', label: 'Uptime garantido' },
  { val: '< 2h', label: 'Tempo médio de resolução' },
  { val: '4', label: 'Perfis de acesso' },
  { val: '24/7', label: 'Disponibilidade' },
];

const STEPS = [
  { n: '01', icon: '🏢', title: 'Cadastre sua empresa', desc: 'Configure sua empresa, defina categorias de atendimento e estabeleça os prazos de SLA por tipo de chamado.' },
  { n: '02', icon: '👤', title: 'Adicione sua equipe', desc: 'Convide técnicos e clientes. Cada perfil recebe acesso personalizado com as permissões corretas automaticamente.' },
  { n: '03', icon: '🚀', title: 'Comece a atender', desc: 'Gerencie chamados, acompanhe SLAs em tempo real e entregue um atendimento que fideliza clientes.' },
];

const TESTIMONIALS = [
  {
    name: 'Ricardo Andrade', role: 'Gerente de TI · Rede Farma Plus',
    avatar: 'RA', color: '#2563eb', stars: 5,
    text: 'Em menos de um mês, reduzimos o tempo médio de resolução de chamados em 58%. A visibilidade que o dashboard dá é incomparável — meu gestor recebe relatórios sem eu precisar montar nada manualmente.',
  },
  {
    name: 'Fernanda Costa', role: 'Diretora de Operações · LogisTech',
    avatar: 'FC', color: '#7c3aed', stars: 5,
    text: 'O controle de SLA salvou vários contratos importantes. Antes perdíamos prazos sem perceber. Hoje recebo alerta antes de vencer e minha equipe age a tempo. Vale cada centavo.',
  },
  {
    name: 'Paulo Mendes', role: 'Coordenador de Suporte · Grupo Piassi',
    avatar: 'PM', color: '#059669', stars: 5,
    text: 'Interface simples, minha equipe aprendeu em um dia. A funcionalidade de múltiplas empresas foi decisiva — gerencio 4 unidades com dados completamente separados, sem confusão.',
  },
];

const FAQS = [
  { q: 'O sistema funciona em dispositivos móveis?', a: 'Sim. A plataforma é totalmente responsiva e funciona em qualquer dispositivo com navegador — smartphone, tablet ou desktop, sem necessidade de instalar aplicativo.' },
  { q: 'Posso gerenciar múltiplas empresas ou unidades?', a: 'Sim. A Atendexa suporta múltiplas empresas no mesmo sistema, com isolamento total de dados. Cada empresa tem seus próprios chamados, equipes e configurações de SLA.' },
  { q: 'Como funciona o controle de SLA?', a: 'Você define prazos por categoria (ex: Fiscal = 4h, Financeiro = 8h). O sistema calcula automaticamente, exibe alertas visuais e marca chamados vencidos no dashboard.' },
  { q: 'Preciso de conhecimento técnico para configurar?', a: 'Não. Em menos de 30 minutos você cadastra a empresa, cria categorias, convida a equipe e já está pronto para começar a atender.' },
  { q: 'Quais perfis de acesso estão disponíveis?', a: 'Quatro perfis: Super Admin (controle total), Administrador (gestão da empresa), Técnico (atendimento) e Cliente (abertura e acompanhamento de chamados).' },
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
          <LogoIcon size={34} />
          <div>
            <div className="lp-nav-logo-text">ATENDEXA</div>
            <div className="lp-nav-logo-sub">SOLUÇÕES INTELIGENTES</div>
          </div>
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

      {/* ── Hero com foto da marca ── */}
      <section className="lp-hero">
        {/* Foto de fundo */}
        <img
          src="/Atendexa.png"
          alt=""
          fetchPriority="high"
          decoding="sync"
          className="lp-hero-bg"
        />
        {/* Overlay degradê — mais escuro à esquerda para o texto */}
        <div className="lp-hero-overlay" />

        <div className="lp-hero-inner">
          {/* Coluna esquerda — conteúdo */}
          <div className="lp-hero-content">
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

          {/* Coluna direita — estatísticas flutuantes sobre a foto */}
          <div className="lp-hero-stats">
            <div className="lp-hero-stat-card">
              <div className="lp-hero-stat-icon">✅</div>
              <div>
                <div className="lp-hero-stat-val">98%</div>
                <div className="lp-hero-stat-label">SLA cumprido no prazo</div>
              </div>
            </div>
            <div className="lp-hero-stat-card">
              <div className="lp-hero-stat-icon">⚡</div>
              <div>
                <div className="lp-hero-stat-val">2.4h</div>
                <div className="lp-hero-stat-label">Tempo médio de resolução</div>
              </div>
            </div>
            <div className="lp-hero-stat-card">
              <div className="lp-hero-stat-icon">🏢</div>
              <div>
                <div className="lp-hero-stat-val">Multi</div>
                <div className="lp-hero-stat-label">Empresas num só sistema</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="lp-hero-scroll" onClick={() => scrollTo('features')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="lp-trust-bar">
        <span className="lp-trust-label">Recursos que fazem a diferença no atendimento</span>
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
                <div className="lp-feature-icon"><span>{f.icon}</span></div>
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
            {STEPS.map(s => (
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
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="lp-testimonial-card">
                <div className="lp-testimonial-stars">{'★'.repeat(t.stars)}</div>
                <p className="lp-testimonial-text">"{t.text}"</p>
                <div className="lp-testimonial-author">
                  <div className="lp-testimonial-avatar" style={{ background: t.color }}>{t.avatar}</div>
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
              <div key={i} className={`lp-faq-item${openFaq === i ? ' open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="lp-faq-question">
                  <span>{f.q}</span>
                  <span className="lp-faq-icon">{openFaq === i ? '−' : '+'}</span>
                </div>
                {openFaq === i && <div className="lp-faq-answer">{f.a}</div>}
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
            <LogoIcon size={52} />
            <span className="lp-section-label" style={{ display: 'block', marginTop: 20, marginBottom: 14 }}>Pronto para começar?</span>
            <h2 className="lp-cta-title">Transforme seu atendimento<br />a partir de hoje</h2>
            <p className="lp-cta-subtitle">
              Acesse a plataforma agora e descubra como a Atendexa pode elevar o nível do seu suporte ao cliente com controle, agilidade e inteligência.
            </p>
            <div className="lp-cta-actions">
              <a className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/login')}>Acessar o Sistema →</a>
              <a className="lp-btn-glass" onClick={() => scrollTo('features')}>Ver funcionalidades</a>
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
              <LogoIcon size={30} />
              <div>
                <div className="lp-footer-logo-text">ATENDEXA</div>
                <div className="lp-footer-logo-sub">SOLUÇÕES INTELIGENTES</div>
              </div>
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
