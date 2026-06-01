const jwt = require('jsonwebtoken');

// Auth via JWT puro — sem query no banco a cada request.
// O payload do token já contém id + role (definidos no login).
// Consulta ao banco só ocorre no login (authController) e em operações
// que realmente precisam dos dados completos do usuário.
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Expõe apenas o necessário — controllers que precisam de mais dados
    // fazem a própria query com req.user.id
    req.user = {
      id:    decoded.id,
      role:  decoded.role,
      email: decoded.email,
      name:  decoded.name,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
