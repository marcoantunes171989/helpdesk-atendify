const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const statusCache = require('../utils/userStatusCache');

// Auth via JWT + revalidação de status com cache de curta duração.
// O payload do token ainda contém id + role (definidos no login), mas a role
// e o status `active` usados para autorizar a requisição vêm do banco (via
// cache de até CACHE_TTL_MS), não do token — isso garante que desativar um
// usuário ou mudar sua role tem efeito em poucos segundos em TODAS as rotas,
// sem exigir uma query a cada requisição (ETAPA 3 do RBAC-02).
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }

  let status = statusCache.get(decoded.id);
  if (!status) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { active: true, role: true, tokenVersion: true },
      });
      if (!dbUser) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }
      status = { active: dbUser.active, role: dbUser.role, tokenVersion: dbUser.tokenVersion };
      statusCache.set(decoded.id, status);
    } catch (err) {
      console.error('[AUTH_DB_CHECK_FAILED]', err.message);
      return res.status(503).json({ error: 'Serviço indisponível, tente novamente' });
    }
  }

  if (!status.active) {
    return res.status(401).json({ error: 'Usuário inativo' });
  }

  // Token emitido antes de uma troca/reset de senha, desativação ou alteração
  // crítica de autorização tem sua versão desatualizada e é rejeitado — a
  // revogação é imediata neste processo e alcança as demais instâncias em
  // até CACHE_TTL_MS (ver userStatusCache), sem depender de um store externo.
  if ((decoded.tokenVersion || 0) !== (status.tokenVersion || 0)) {
    return res.status(401).json({ error: 'Sessão expirada, faça login novamente' });
  }

  // Expõe apenas o necessário — controllers que precisam de mais dados
  // fazem a própria query com req.user.id
  req.user = {
    id: decoded.id,
    role: status.role, // role atual do banco, não a do token
    email: decoded.email,
    name: decoded.name,
  };
  next();
};
