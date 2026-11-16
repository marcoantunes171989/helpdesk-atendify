// Compatibilidade com bancos que ainda não receberam a migration RBAC-09E.
// Quando colunas/tabelas novas não existem, o Prisma Client tipado falha (P2022).
// Estes helpers caem para SQL/seleção legada sem exigir rollback do deploy.

function isMissingColumnError(err) {
  const msg = String(err?.message || '');
  return err?.code === 'P2022'
    || msg.includes('does not exist in the current database')
    || msg.includes('column') && msg.includes('does not exist');
}

module.exports = { isMissingColumnError };
