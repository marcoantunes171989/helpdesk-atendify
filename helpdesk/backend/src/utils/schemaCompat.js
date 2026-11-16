// Compatibilidade com bancos que ainda não receberam a migration RBAC-09E.
// Quando colunas/tabelas novas não existem, o Prisma Client tipado falha (P2022).

function isMissingColumnError(err) {
  const msg = String(err?.message || '');
  return err?.code === 'P2022'
    || msg.includes('does not exist in the current database')
    || (msg.includes('column') && msg.includes('does not exist'))
    || msg.includes('relation') && msg.includes('does not exist');
}

function rbacSchemaMissingResponse(res) {
  return res.status(503).json({
    error: 'Schema RBAC ainda não aplicado no banco. Execute a migration RBAC-09E (FASE 1) no SQL Editor do Supabase e o seed de permissões.',
  });
}

module.exports = { isMissingColumnError, rbacSchemaMissingResponse };
