import { useEffect, useState } from 'react';
import { Button, Select, Tag, Tooltip, message, Spin } from 'antd';
import { UserAddOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import { ticketService } from '../services/api';
import { ROLES } from '../utils/constants';

const { Option } = Select;

function userLabel(user) {
  if (!user) return '';
  const role = ROLES[user.role]?.label;
  return role ? `${user.name} · ${role}` : user.name;
}

export default function TicketAccessPanel({ ticketId }) {
  const [access, setAccess] = useState(null);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    ticketService.getAccess(ticketId)
      .then(setAccess)
      .catch(err => message.error(err.response?.data?.error || 'Erro ao carregar acessos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    ticketService.accessCandidates().then(setUsers).catch(() => setUsers([]));
  }, [ticketId]);

  const apply = async (userId, mode) => {
    setSaving(true);
    try {
      const updated = await ticketService.setAccess(ticketId, { userId, mode });
      setAccess(updated);
      setSelected(null);
      message.success(mode === 'GRANT' ? 'Usuário incluído neste chamado' : 'Chamado ocultado para este usuário');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao atualizar acesso');
    } finally {
      setSaving(false);
    }
  };

  const restore = async (userId) => {
    setSaving(true);
    try {
      const updated = await ticketService.removeAccess(ticketId, userId);
      setAccess(updated);
      message.success('Acesso deste chamado atualizado');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao atualizar acesso');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !access) {
    return <div style={{ padding: 16, textAlign: 'center' }}><Spin size="small" /></div>;
  }

  const companyUsers = access?.companyUsers || [];
  const grants = access?.grants || [];
  const taken = new Set([
    ...companyUsers.map(u => u.id),
    ...grants.map(u => u.id),
  ]);
  const available = users.filter(u => !taken.has(u.id));

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--cl-text-soft)', lineHeight: 1.5, marginBottom: 12 }}>
        Usuários da empresa veem todos os chamados dela. Aqui dá para ocultar este chamado ou incluir alguém só nele. Quem tem acesso pode incluir trâmites.
      </div>

      {companyUsers.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Pela empresa
          </div>
          {companyUsers.map(user => (
            <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--cl-border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text-hi)' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{user.email}</div>
              </div>
              {user.excluded ? (
                <Tooltip title="Volta a ver este chamado junto com os demais da empresa">
                  <Button size="small" icon={<UndoOutlined />} loading={saving} onClick={() => restore(user.id)}>
                    Restaurar
                  </Button>
                </Tooltip>
              ) : (
                <Tooltip title="Este usuário deixa de ver só este chamado">
                  <Button size="small" icon={<StopOutlined />} loading={saving} onClick={() => apply(user.id, 'DENY')}>
                    Ocultar
                  </Button>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Incluídos só neste chamado
        </div>
        {grants.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--cl-text-faint)', marginBottom: 8 }}>Nenhum usuário incluído só neste chamado.</div>
        )}
        {grants.map(user => (
          <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--cl-border)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text-hi)' }}>
                {user.name}{' '}
                <Tag style={{ marginLeft: 4, borderRadius: 6 }}>{ROLES[user.role]?.label || user.role}</Tag>
              </div>
              <div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{user.email}</div>
            </div>
            <Button size="small" loading={saving} onClick={() => restore(user.id)}>Remover</Button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Select
          showSearch
          allowClear
          placeholder="Incluir usuário neste chamado"
          value={selected}
          onChange={setSelected}
          optionFilterProp="label"
          style={{ flex: 1 }}
          notFoundContent="Nenhum usuário disponível"
        >
          {available.map(user => (
            <Option key={user.id} value={user.id} label={userLabel(user)}>
              {userLabel(user)}
            </Option>
          ))}
        </Select>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          disabled={!selected}
          loading={saving}
          onClick={() => apply(selected, 'GRANT')}
        >
          Incluir
        </Button>
      </div>
    </div>
  );
}
