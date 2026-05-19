import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
      background: '#f0faf4',
    }}>
      {/* Painel esquerdo verde */}
      <div style={{
        width: '45%',
        background: 'linear-gradient(160deg, #1a7a4a 0%, #22c55e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
              fill="white" opacity="0.3"/>
            <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
              fill="white"/>
          </svg>
        </div>
        <h1 style={{
          color: 'white',
          fontSize: 32,
          fontWeight: 700,
          margin: '0 0 12px',
          letterSpacing: '-0.3px',
          fontFamily: "'Poppins', sans-serif",
        }}>
          Helpdesk
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: 15,
          textAlign: 'center',
          lineHeight: 1.6,
          maxWidth: 260,
          margin: 0,
        }}>
          Gerencie seus atendimentos com agilidade e organização
        </p>

        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['Chamados em tempo real', 'Controle de SLA', 'Dashboard completo'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#111',
            margin: '0 0 6px',
            fontFamily: "'Poppins', sans-serif",
            letterSpacing: '-0.3px',
          }}>
            Bem-vindo de volta
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 36px' }}>
            Acesse sua conta para continuar
          </p>

          <Form layout="vertical" onFinish={handleSubmit} autoComplete="off">
            <Form.Item
              name="email"
              label={<span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Email</span>}
              rules={[{ required: true, message: 'Informe o email' }, { type: 'email', message: 'Email inválido' }]}
            >
              <Input
                placeholder="seu@email.com"
                size="large"
                style={{ borderRadius: 8, borderColor: '#d1d5db' }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Senha</span>}
              rules={[{ required: true, message: 'Informe a senha' }]}
              style={{ marginBottom: 28 }}
            >
              <Input.Password
                placeholder="••••••••"
                size="large"
                style={{ borderRadius: 8, borderColor: '#d1d5db' }}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{
                height: 46,
                borderRadius: 8,
                background: '#16a34a',
                borderColor: '#16a34a',
                fontWeight: 600,
                fontSize: 15,
                boxShadow: '0 2px 8px rgba(22,163,74,0.35)',
              }}
            >
              Entrar
            </Button>
          </Form>

          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 40 }}>
            © {new Date().getFullYear()} Helpdesk · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
