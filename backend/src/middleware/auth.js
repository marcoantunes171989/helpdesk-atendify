const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuário inativo ou não encontrado' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
