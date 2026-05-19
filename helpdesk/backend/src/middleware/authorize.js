const ROLE_HIERARCHY = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  AGENT: 2,
  CLIENT: 1,
};

module.exports = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
};

module.exports.minRole = (minRole) => {
  return (req, res, next) => {
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY[minRole]) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
};
