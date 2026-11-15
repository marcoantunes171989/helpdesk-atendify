// Cache em memória de curta duração para o status (active/role) do usuário.
// Objetivo: o middleware `auth` (usado em todas as rotas) possa revalidar o
// usuário no banco sem pagar o custo de uma query por requisição, preservando
// a otimização de performance do login/app (ver auth.js).
// Entradas são invalidadas explicitamente nos pontos onde active/role mudam
// (userController.update/remove) e expiram sozinhas em CACHE_TTL_MS como
// rede de segurança (ex.: múltiplas instâncias do processo).
const CACHE_TTL_MS = 20_000;

const cache = new Map();

function get(userId) {
  const entry = cache.get(userId);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return undefined;
  }
  return entry;
}

function set(userId, { active, role, tokenVersion }) {
  cache.set(userId, { active, role, tokenVersion, expiresAt: Date.now() + CACHE_TTL_MS });
}

function invalidate(userId) {
  cache.delete(userId);
}

module.exports = { get, set, invalidate, CACHE_TTL_MS };
