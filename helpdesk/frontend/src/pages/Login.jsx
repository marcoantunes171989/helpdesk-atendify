import { useState, useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useAuth } from '../contexts/AuthContext';

const BREAKPOINT = 768;

function WomanIllustration() {
  return (
    <svg viewBox="0 0 420 520" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 360, display: 'block' }}>

      {/* Decorative background rings */}
      <circle cx="210" cy="300" r="195" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <circle cx="210" cy="300" r="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

      {/* === DESK === */}
      <rect x="55" y="370" width="310" height="12" rx="6" fill="rgba(255,255,255,0.22)" />
      <rect x="75" y="382" width="270" height="90" rx="4" fill="rgba(255,255,255,0.05)" />

      {/* === LAPTOP === */}
      {/* Base / keyboard */}
      <rect x="90" y="354" width="240" height="20" rx="6" fill="rgba(255,255,255,0.28)" />
      {/* Keyboard rows */}
      <rect x="105" y="359" width="90" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
      <rect x="105" y="366" width="90" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
      <rect x="210" y="359" width="105" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
      <rect x="210" y="366" width="105" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
      {/* Hinge */}
      <rect x="90" y="350" width="240" height="7" rx="3" fill="rgba(255,255,255,0.18)" />
      {/* Screen outer bezel */}
      <rect x="100" y="218" width="220" height="135" rx="9" fill="rgba(255,255,255,0.18)" />
      {/* Screen inner */}
      <rect x="110" y="226" width="200" height="116" rx="5" fill="rgba(255,255,255,0.28)" />

      {/* Screen content — dashboard UI */}
      {/* Top bar */}
      <rect x="120" y="235" width="75" height="9" rx="4" fill="rgba(255,255,255,0.75)" />
      <circle cx="298" cy="239" r="5" fill="rgba(255,255,255,0.45)" />
      <circle cx="285" cy="239" r="5" fill="rgba(255,255,255,0.3)" />
      {/* Divider */}
      <line x1="120" y1="250" x2="308" y2="250" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      {/* Text lines */}
      <rect x="120" y="257" width="130" height="5" rx="2.5" fill="rgba(255,255,255,0.35)" />
      <rect x="120" y="268" width="100" height="5" rx="2.5" fill="rgba(255,255,255,0.25)" />
      {/* Bar chart */}
      <rect x="120" y="295" width="14" height="30" rx="3" fill="rgba(255,255,255,0.45)" />
      <rect x="140" y="283" width="14" height="42" rx="3" fill="rgba(255,255,255,0.6)" />
      <rect x="160" y="290" width="14" height="35" rx="3" fill="rgba(255,255,255,0.45)" />
      <rect x="180" y="278" width="14" height="47" rx="3" fill="rgba(255,255,255,0.6)" />
      <rect x="200" y="288" width="14" height="37" rx="3" fill="rgba(255,255,255,0.45)" />
      {/* Pie / donut circle (right of chart) */}
      <circle cx="277" cy="300" r="24" fill="rgba(255,255,255,0.18)" />
      <circle cx="277" cy="300" r="24" stroke="rgba(255,255,255,0.55)" strokeWidth="8"
        strokeDasharray="75 76" strokeDashoffset="-19" strokeLinecap="round" />
      <circle cx="277" cy="300" r="14" fill="rgba(255,255,255,0.22)" />
      <rect x="256" y="328" width="42" height="4" rx="2" fill="rgba(255,255,255,0.3)" />

      {/* === PERSON === */}

      {/* Chair back (subtle) */}
      <rect x="172" y="220" width="76" height="155" rx="12" fill="rgba(255,255,255,0.06)" />

      {/* Torso */}
      <path d="M162 300 Q160 258 210 252 Q260 258 258 300 L252 360 Q210 366 168 360Z"
        fill="rgba(255,255,255,0.2)" />

      {/* Blouse detail */}
      <path d="M185 255 Q210 268 235 255 L232 280 Q210 292 188 280Z"
        fill="rgba(255,255,255,0.1)" />

      {/* Left arm — extended forward, resting on laptop */}
      <path d="M162 268 Q130 285 110 330 Q110 344 124 342 Q150 298 172 280Z"
        fill="rgba(255,255,255,0.18)" />
      <ellipse cx="118" cy="344" rx="18" ry="9" transform="rotate(-10 118 344)"
        fill="rgba(255,255,255,0.22)" />

      {/* Right arm — extended forward */}
      <path d="M258 268 Q290 285 310 330 Q310 344 296 342 Q270 298 248 280Z"
        fill="rgba(255,255,255,0.18)" />
      <ellipse cx="302" cy="344" rx="18" ry="9" transform="rotate(10 302 344)"
        fill="rgba(255,255,255,0.22)" />

      {/* Neck */}
      <rect x="200" y="225" width="18" height="32" rx="9" fill="rgba(255,255,255,0.24)" />

      {/* Head */}
      <ellipse cx="209" cy="198" rx="44" ry="48" fill="rgba(255,255,255,0.26)" />

      {/* Hair — dark top layer */}
      <path d="M166 188 Q168 140 209 137 Q250 140 252 188 Q248 158 209 155 Q170 158 166 188Z"
        fill="rgba(255,255,255,0.42)" />
      {/* Side hair */}
      <path d="M166 185 Q158 195 160 218 Q162 228 170 225 Q166 210 170 194Z"
        fill="rgba(255,255,255,0.35)" />
      {/* Ponytail */}
      <path d="M250 162 Q272 165 275 192 Q273 210 262 208 Q272 190 260 178Z"
        fill="rgba(255,255,255,0.38)" />
      {/* Ponytail tail */}
      <path d="M262 205 Q270 218 268 238 Q264 246 258 242 Q264 226 256 216Z"
        fill="rgba(255,255,255,0.3)" />

      {/* Eyes */}
      <ellipse cx="196" cy="196" rx="5" ry="4.5" fill="rgba(255,255,255,0.65)" />
      <ellipse cx="222" cy="196" rx="5" ry="4.5" fill="rgba(255,255,255,0.65)" />
      {/* Eye shine */}
      <circle cx="198" cy="194" r="1.5" fill="rgba(255,255,255,0.9)" />
      <circle cx="224" cy="194" r="1.5" fill="rgba(255,255,255,0.9)" />
      {/* Eyebrows */}
      <path d="M190 188 Q196 184 202 186" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M216 186 Q222 184 228 188" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Smile */}
      <path d="M199 212 Q209 221 219 212" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5"
        strokeLinecap="round" fill="none" />

      {/* === FLOATING UI ELEMENTS === */}

      {/* Chat bubble — top right */}
      <rect x="298" y="92" width="104" height="72" rx="13" fill="rgba(255,255,255,0.18)" />
      <path d="M298 154 L284 172 L310 162" fill="rgba(255,255,255,0.18)" />
      <rect x="312" y="108" width="72" height="7" rx="3.5" fill="rgba(255,255,255,0.6)" />
      <rect x="312" y="121" width="56" height="5" rx="2.5" fill="rgba(255,255,255,0.35)" />
      <rect x="312" y="132" width="64" height="5" rx="2.5" fill="rgba(255,255,255,0.35)" />
      <rect x="312" y="143" width="48" height="5" rx="2.5" fill="rgba(255,255,255,0.25)" />
      {/* Notification dot */}
      <circle cx="396" cy="96" r="8" fill="rgba(255, 180, 100, 0.85)" />
      <text x="396" y="100" textAnchor="middle" fill="white" fontSize="9" fontWeight="700">3</text>

      {/* Check badge — left */}
      <circle cx="62" cy="200" r="32" fill="rgba(255,255,255,0.15)" />
      <circle cx="62" cy="200" r="23" fill="rgba(255,255,255,0.18)" />
      <path d="M50 200 L59 209 L76 191" stroke="rgba(255,255,255,0.85)" strokeWidth="3.5"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* SLA card — bottom left */}
      <rect x="18" y="300" width="96" height="58" rx="11" fill="rgba(255,255,255,0.18)" />
      <rect x="28" y="311" width="36" height="6" rx="3" fill="rgba(255,255,255,0.5)" />
      <rect x="28" y="322" width="60" height="9" rx="4" fill="rgba(255,255,255,0.7)" />
      <rect x="28" y="337" width="48" height="5" rx="2.5" fill="rgba(255,255,255,0.3)" />
      <rect x="28" y="347" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.25)" />

      {/* Decorative dots */}
      <circle cx="36" cy="100" r="6" fill="rgba(255,255,255,0.18)" />
      <circle cx="52" cy="112" r="4" fill="rgba(255,255,255,0.12)" />
      <circle cx="380" cy="310" r="6" fill="rgba(255,255,255,0.18)" />
      <circle cx="366" cy="325" r="4" fill="rgba(255,255,255,0.12)" />
      <circle cx="140" cy="80" r="5" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < BREAKPOINT);
  const { login } = useAuth();

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
    } catch (err) {
      message.error(err.response?.data?.error || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f0faf4' }}>

      {/* ── Painel esquerdo (desktop) ── */}
      {!isMobile && (
        <div style={{
          width: '48%',
          background: 'linear-gradient(155deg, #0f5c32 0%, #16a34a 55%, #22c55e 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '44px 40px 36px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Círculos decorativos de fundo */}
          <div style={{
            position: 'absolute', bottom: -120, right: -120,
            width: 380, height: 380, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: -80, left: -80,
            width: 280, height: 280, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }} />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, alignSelf: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white" />
              </svg>
            </div>
            <span style={{
              color: 'white', fontSize: 22, fontWeight: 700,
              fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.3px',
            }}>
              Atendexa
            </span>
          </div>

          {/* Ilustração */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative', zIndex: 1 }}>
            <WomanIllustration />
          </div>

          {/* Tagline + features */}
          <div style={{ width: '100%', position: 'relative', zIndex: 1 }}>
            <p style={{
              color: 'rgba(255,255,255,0.92)', fontSize: 17, fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
              margin: '0 0 20px', lineHeight: 1.45,
            }}>
              Suporte inteligente para<br />equipes que entregam resultado.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[
                { icon: '⚡', text: 'Chamados em tempo real com SLA automático' },
                { icon: '📊', text: 'Dashboard completo por empresa e equipe' },
                { icon: '🔒', text: 'Controle de acesso por perfil e permissão' },
              ].map(item => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(255,255,255,0.14)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                  }}>
                    {item.icon}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 1.4 }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Painel do formulário ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '40px 24px' : '48px',
        background: '#fff',
      }}>
        {/* Logo mobile */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white" />
              </svg>
            </div>
            <span style={{
              color: '#111827', fontSize: 20, fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
            }}>
              Atendexa
            </span>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{
            fontSize: isMobile ? 22 : 26, fontWeight: 700, color: '#111827',
            margin: '0 0 6px', fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.4px',
          }}>
            Bem-vindo de volta 👋
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 32px', lineHeight: 1.5 }}>
            Acesse sua conta para continuar gerenciando seus atendimentos.
          </p>

          <Form layout="vertical" onFinish={handleSubmit} autoComplete="off">
            <Form.Item
              name="email"
              label={<span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>E-mail</span>}
              rules={[{ required: true, message: 'Informe o e-mail' }, { type: 'email', message: 'E-mail inválido' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                placeholder="seu@email.com"
                size="large"
                style={{ borderRadius: 9, borderColor: '#e5e7eb', height: 48 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Senha</span>}
              rules={[{ required: true, message: 'Informe a senha' }]}
              style={{ marginBottom: 28 }}
            >
              <Input.Password
                placeholder="••••••••"
                size="large"
                style={{ borderRadius: 9, borderColor: '#e5e7eb', height: 48 }}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{
                height: 50, borderRadius: 9,
                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                border: 'none',
                fontWeight: 700, fontSize: 15,
                boxShadow: '0 4px 14px rgba(22,163,74,0.4)',
                letterSpacing: '0.01em',
              }}
            >
              Entrar na plataforma
            </Button>
          </Form>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 0',
          }}>
            <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
            <span style={{ color: '#d1d5db', fontSize: 12 }}>seguro e criptografado</span>
            <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16 }}>
            {['🔒 SSL', '✓ LGPD', '☁ Cloud'].map(badge => (
              <span key={badge} style={{
                fontSize: 11, color: '#9ca3af', fontWeight: 500,
              }}>
                {badge}
              </span>
            ))}
          </div>

          <p style={{ textAlign: 'center', color: '#d1d5db', fontSize: 11, marginTop: 36 }}>
            © {new Date().getFullYear()} Atendexa · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
