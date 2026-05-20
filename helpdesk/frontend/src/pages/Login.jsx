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
      position: 'relative',
      backgroundColor: '#0d0d0d',
      overflow: 'hidden',
    }}>

      {/* Imagem de fundo — cobre toda a tela */}
      <img
        src={PHOTO_URL}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center center',
          zIndex: 0,
        }}
      />

      {/* Overlay escuro sutil para contraste do texto */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(100deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.52) 100%)',
        zIndex: 1,
      }} />

      {/* ── Painel esquerdo — conteúdo sobre a foto ── */}
      {!isMobile && (
        <div style={{
          width: '55%',
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px 52px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white" />
              </svg>
            </div>
            <span style={{
              color: 'rgba(255,255,255,0.95)', fontSize: 20, fontWeight: 700,
              fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.2px',
              textShadow: '0 1px 8px rgba(0,0,0,0.5)',
            }}>
              Atendexa
            </span>
          </div>

          {/* Tagline + features */}
          <div style={{ maxWidth: 380 }}>
            <div style={{
              width: 32, height: 2, borderRadius: 2,
              background: 'rgba(255,255,255,0.4)',
              marginBottom: 18,
            }} />

            <p style={{
              color: '#fff', fontSize: 26, fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              margin: '0 0 8px', lineHeight: 1.35, letterSpacing: '-0.4px',
              textShadow: '0 2px 16px rgba(0,0,0,0.65)',
            }}>
              Suporte inteligente para<br />equipes que entregam.
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.62)', fontSize: 14,
              margin: '0 0 28px', lineHeight: 1.6,
              textShadow: '0 1px 8px rgba(0,0,0,0.5)',
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
                  background: 'rgba(0,0,0,0.28)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  <span style={{
                    color: 'rgba(255,255,255,0.88)', fontSize: 13,
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

      {/* ── Card de login — glass flutuante sobre a foto ── */}
      <div style={{
        flex: 1,
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '40px 20px' : '32px 40px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 400,
          background: 'rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRadius: 22,
          border: '1px solid rgba(255,255,255,0.55)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.32), 0 2px 12px rgba(0,0,0,0.12)',
          padding: '44px 40px 40px',
        }}>
          {/* Logo mobile */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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

          <h2 style={{
            fontSize: 25, fontWeight: 700, color: '#111827',
            margin: '0 0 6px', fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.4px',
          }}>
            Bem-vindo de volta 👋
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 30px', lineHeight: 1.5 }}>
            Acesse sua conta para continuar gerenciando seus atendimentos.
          </p>

          <Form layout="vertical" onFinish={handleSubmit} autoComplete="off">
            <Form.Item
              name="email"
              label={<span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>E-mail</span>}
              rules={[
                { required: true, message: 'Informe o e-mail' },
                { type: 'email', message: 'E-mail inválido' },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input
                placeholder="seu@email.com"
                size="large"
                style={{
                  borderRadius: 9, borderColor: '#e5e7eb', height: 48,
                  background: 'rgba(255,255,255,0.75)',
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Senha</span>}
              rules={[{ required: true, message: 'Informe a senha' }]}
              style={{ marginBottom: 26 }}
            >
              <Input.Password
                placeholder="••••••••"
                size="large"
                style={{
                  borderRadius: 9, borderColor: '#e5e7eb', height: 48,
                  background: 'rgba(255,255,255,0.75)',
                }}
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
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                border: 'none',
                fontWeight: 700, fontSize: 15,
                boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
                letterSpacing: '0.01em',
              }}
            >
              Entrar na plataforma
            </Button>
          </Form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 0' }}>
            <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
            <span style={{ color: '#d1d5db', fontSize: 12 }}>seguro e criptografado</span>
            <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 14 }}>
            {['🔒 SSL', '✓ LGPD', '☁ Cloud'].map(badge => (
              <span key={badge} style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
                {badge}
              </span>
            ))}
          </div>

          <p style={{ textAlign: 'center', color: '#d1d5db', fontSize: 11, marginTop: 32, marginBottom: 0 }}>
            © {new Date().getFullYear()} Atendexa · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
