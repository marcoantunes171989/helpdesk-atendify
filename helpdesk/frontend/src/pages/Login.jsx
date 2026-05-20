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
      backgroundColor: '#0c0c0c',
      overflow: 'hidden',
    }}>

      {/* Estilos para inputs do Ant Design no tema glass */}
      <style>{`
        .glass-form .ant-input,
        .glass-form .ant-input-affix-wrapper {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.18) !important;
          color: #fff !important;
          box-shadow: none !important;
        }
        .glass-form .ant-input-affix-wrapper:hover,
        .glass-form .ant-input-affix-wrapper:focus-within {
          border-color: rgba(255,255,255,0.4) !important;
        }
        .glass-form .ant-input:focus { border-color: rgba(255,255,255,0.4) !important; }
        .glass-form .ant-input::placeholder { color: rgba(255,255,255,0.3) !important; }
        .glass-form .ant-input-affix-wrapper .ant-input { background: transparent !important; }
        .glass-form .anticon { color: rgba(255,255,255,0.4) !important; }
        .glass-form .ant-form-item-explain-error { color: #fca5a5 !important; }
        .glass-form .ant-form-item-required::before { color: #fca5a5 !important; }
      `}</style>

      {/* Imagem de fundo — sem cortes em nenhum lado */}
      <img
        src={PHOTO_URL}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center center',
          zIndex: 0,
        }}
      />

      {/* Overlay direcional: escurece só o lado direito para contraste do card */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(105deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.55) 100%)',
        zIndex: 1,
      }} />

      {/* ── Painel esquerdo — transparente sobre a foto ── */}
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
              background: 'rgba(255,255,255,0.1)',
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
              fontFamily: "'Poppins', sans-serif",
              textShadow: '0 1px 8px rgba(0,0,0,0.6)',
            }}>
              Atendexa
            </span>
          </div>

          {/* Tagline + features */}
          <div style={{ maxWidth: 380 }}>
            <div style={{
              width: 30, height: 2, borderRadius: 2,
              background: 'rgba(255,255,255,0.35)',
              marginBottom: 18,
            }} />
            <p style={{
              color: '#fff', fontSize: 26, fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              margin: '0 0 8px', lineHeight: 1.35, letterSpacing: '-0.4px',
              textShadow: '0 2px 20px rgba(0,0,0,0.7)',
            }}>
              Suporte inteligente para<br />equipes que entregam.
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.55)', fontSize: 14,
              margin: '0 0 28px', lineHeight: 1.6,
              textShadow: '0 1px 8px rgba(0,0,0,0.6)',
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
                  background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 1.4 }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Card de login — vidro real ── */}
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
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(36px)',
          WebkitBackdropFilter: 'blur(36px)',
          borderRadius: 22,
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
          padding: '48px 40px 40px',
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
              <span style={{ color: '#fff', fontSize: 20, fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>
                Atendexa
              </span>
            </div>
          )}

          <h2 style={{
            fontSize: 25, fontWeight: 700, color: '#fff',
            margin: '0 0 6px', fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.4px',
          }}>
            Bem-vindo de volta 👋
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 32px', lineHeight: 1.5 }}>
            Acesse sua conta para continuar gerenciando seus atendimentos.
          </p>

          <div className="glass-form">
            <Form layout="vertical" onFinish={handleSubmit} autoComplete="off">
              <Form.Item
                name="email"
                label={<span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>E-mail</span>}
                rules={[
                  { required: true, message: 'Informe o e-mail' },
                  { type: 'email', message: 'E-mail inválido' },
                ]}
                style={{ marginBottom: 16 }}
              >
                <Input
                  placeholder="seu@email.com"
                  size="large"
                  style={{ borderRadius: 9, height: 48 }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>Senha</span>}
                rules={[{ required: true, message: 'Informe a senha' }]}
                style={{ marginBottom: 28 }}
              >
                <Input.Password
                  placeholder="••••••••"
                  size="large"
                  style={{ borderRadius: 9, height: 48 }}
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
                  boxShadow: '0 4px 18px rgba(37,99,235,0.45)',
                  letterSpacing: '0.01em',
                }}
              >
                Entrar na plataforma
              </Button>
            </Form>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>seguro e criptografado</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 14 }}>
            {['🔒 SSL', '✓ LGPD', '☁ Cloud'].map(badge => (
              <span key={badge} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                {badge}
              </span>
            ))}
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontSize: 11, marginTop: 32, marginBottom: 0 }}>
            © {new Date().getFullYear()} Atendexa · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
