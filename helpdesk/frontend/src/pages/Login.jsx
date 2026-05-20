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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundImage: `url('${PHOTO_URL}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundColor: '#0f172a',
    }}>

      {/* ── Painel esquerdo — transparente e minimalista ── */}
      {!isMobile && (
        <div style={{
          width: '55%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 52px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white" />
              </svg>
            </div>
            <span style={{
              color: 'rgba(255,255,255,0.92)', fontSize: 20, fontWeight: 700,
              fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.2px',
            }}>
              Atendexa
            </span>
          </div>

          {/* Features — base do painel */}
          <div style={{ maxWidth: 400 }}>
            <div style={{
              width: 32, height: 2, borderRadius: 2,
              background: 'rgba(255,255,255,0.35)',
              marginBottom: 20,
            }} />

            <p style={{
              color: 'rgba(255,255,255,0.88)', fontSize: 22, fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
              margin: '0 0 6px', lineHeight: 1.4, letterSpacing: '-0.3px',
            }}>
              Suporte inteligente para<br />equipes que entregam.
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.45)', fontSize: 13,
              margin: '0 0 28px', lineHeight: 1.6,
            }}>
              Gerencie chamados, SLAs e equipes em um só lugar.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '⚡', text: 'Chamados em tempo real com SLA automático' },
                { icon: '📊', text: 'Dashboard completo por empresa e equipe' },
                { icon: '🔒', text: 'Controle de acesso por perfil e permissão' },
              ].map(item => (
                <div key={item.text} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  <span style={{
                    color: 'rgba(255,255,255,0.72)', fontSize: 13,
                    fontWeight: 400, lineHeight: 1.4,
                  }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Painel de login — card glass ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'stretch',
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '40px 24px' : '52px 48px',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderLeft: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
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

          <div style={{ width: '100%', maxWidth: 360 }}>
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
                  style={{ borderRadius: 9, borderColor: '#e5e7eb', height: 48, background: 'rgba(255,255,255,0.7)' }}
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
                  style={{ borderRadius: 9, borderColor: '#e5e7eb', height: 48, background: 'rgba(255,255,255,0.7)' }}
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
                  boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
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
    </div>
  );
}
