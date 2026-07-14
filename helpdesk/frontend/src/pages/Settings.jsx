import { MoonOutlined, SunOutlined, LaptopOutlined, CheckOutlined } from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';

const OPTIONS = [
  {
    value: 'dark',
    icon: <MoonOutlined style={{ fontSize: 24 }} />,
    label: 'Escuro',
    desc: 'Visual escuro em todas as telas',
  },
  {
    value: 'light',
    icon: <SunOutlined style={{ fontSize: 24 }} />,
    label: 'Claro',
    desc: 'Visual claro em todas as telas',
  },
  {
    value: 'system',
    icon: <LaptopOutlined style={{ fontSize: 24 }} />,
    label: 'Sistema',
    desc: 'Segue a preferência do dispositivo',
  },
];

export default function Settings() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p style={{ color: 'var(--cl-text-faint)', fontSize: 13, margin: '4px 0 0' }}>
            Personalize o visual do sistema
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 580 }}>
        <div style={{
          background: 'var(--cl-bg)',
          border: '1px solid var(--cl-border)',
          borderRadius: 16,
          padding: '24px 28px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'var(--cl-shadow)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--cl-primary-text)', marginBottom: 6,
          }}>
            Aparência
          </div>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, marginBottom: 20, marginTop: 0 }}>
            Escolha o tema visual do sistema
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {OPTIONS.map(opt => {
              const selected = preference === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => setPreference(opt.value)}
                  style={{
                    flex: '1 1 140px',
                    padding: '18px 20px 16px',
                    borderRadius: 12,
                    border: `2px solid ${selected ? 'var(--cl-primary)' : 'var(--cl-border)'}`,
                    background: selected ? 'rgba(37,99,235,0.08)' : 'var(--cl-bg)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                    userSelect: 'none',
                    position: 'relative',
                  }}
                >
                  {selected && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'var(--cl-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CheckOutlined style={{ color: '#fff', fontSize: 10 }} />
                    </div>
                  )}
                  <div style={{
                    color: selected ? 'var(--cl-primary-text)' : 'var(--cl-text-muted)',
                    marginBottom: 10,
                    transition: 'color 0.15s',
                  }}>
                    {opt.icon}
                  </div>
                  <div style={{
                    fontWeight: 700, fontSize: 14,
                    color: 'var(--cl-text)',
                    marginBottom: 3,
                  }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--cl-text-faint)' }}>
                    {opt.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
