import { useState, useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useAuth } from '../contexts/AuthContext';

const BREAKPOINT = 768;

const PHOTO_URL = '/Atendexa.png';

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
    <div style={{ minHeight: '100vh', display: 'flex' }}>

      {/* ── Painel esquerdo — foto com overlay ── */}
      {!isMobile && (
        <div style={{
          width: '50%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#111827',
          backgroundImage: `url('${PHOTO_URL}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
        }}>
          {/* Overlay gradiente escuro para legibilidade */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 50%, rgba(0,20,10,0.72) 100%)',
          }} />

          {/* Faixa verde sutil na base — identidade da marca */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
            background: 'linear-gradient(to top, rgba(29,78,216,0.65) 0%, transparent 100%)',
          }} />

          {/* Conteúdo sobre a foto */}
          <div style={{
            position: 'relative', zIndex: 1,
            height: '100%',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '44px 44px 40px',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 11,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white" />
                </svg>
              </div>
              <span style={{
                color: 'white', fontSize: 22, fontWeight: 700,
                fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.3px',
                textShadow: '0 1px 8px rgba(0,0,0,0.4)',
              }}>
                Atendexa
              </span>
            </div>

            {/* Tagline + features — base da foto */}
            <div>
              {/* Linha decorativa */}
              <div style={{
                width: 40, height: 3, borderRadius: 2,
                background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                marginBottom: 18,
              }} />

              <p style={{
                color: 'rgba(255,255,255,0.96)', fontSize: 24, fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
                margin: '0 0 8px', lineHeight: 1.35,
                textShadow: '0 2px 12px rgba(0,0,0,0.5)',
                letterSpacing: '-0.3px',
              }}>
                Suporte inteligente para<br />equipes que entregam.
              </p>
              <p style={{
                color: 'rgba(255,255,255,0.65)', fontSize: 14,
                margin: '0 0 28px', lineHeight: 1.5,
                textShadow: '0 1px 6px rgba(0,0,0,0.4)',
              }}>
                Gerencie chamados, SLAs e equipes em um só lugar.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: '⚡', text: 'Chamados em tempo real com SLA automático' },
                  { icon: '📊', text: 'Dashboard completo por empresa e equipe' },
                  { icon: '🔒', text: 'Controle de acesso por perfil e permissão' },
                ].map(item => (
                  <div key={item.text} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: '10px 14px',
                  }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{
                      color: 'rgba(255,255,255,0.88)', fontSize: 13,
                      fontWeight: 500, lineHeight: 1.4,
                      textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
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
              background: '#2563eb',
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
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: 'none',
                fontWeight: 700, fontSize: 15,
                boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                letterSpacing: '0.01em',
              }}
            >
              Entrar na plataforma
            </Button>
          </Form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 0' }}>
            <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
            <span style={{ color: '#d1d5db', fontSize: 12 }}>seguro e criptografado</span>
            <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16 }}>
            {['🔒 SSL', '✓ LGPD', '☁ Cloud'].map(badge => (
              <span key={badge} style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
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
