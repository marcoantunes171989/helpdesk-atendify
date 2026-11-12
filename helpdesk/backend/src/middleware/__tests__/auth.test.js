jest.mock('jsonwebtoken');

const jwt = require('jsonwebtoken');
const auth = require('../auth');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

function mockReq(authHeader) {
  return { headers: { authorization: authHeader } };
}

describe('auth middleware (main — JWT puro, sem consulta ao banco)', () => {
  afterEach(() => jest.clearAllMocks());

  test('401 quando não há header Authorization', () => {
    const req = mockReq(undefined);
    const res = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('401 quando o header não começa com "Bearer "', () => {
    const req = mockReq('Token abc123');
    const res = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('401 quando o token é inválido/expirado', () => {
    jwt.verify.mockImplementation(() => { throw new Error('jwt malformed'); });
    const req = mockReq('Bearer garbage');
    const res = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  test('com token válido, popula req.user a partir do payload e chama next()', () => {
    jwt.verify.mockReturnValue({ id: 'u1', role: 'ADMIN', email: 'a@x.com', name: 'A', iat: 1, exp: 2 });
    const req = mockReq('Bearer valid-token');
    const res = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'u1', role: 'ADMIN', email: 'a@x.com', name: 'A' });
    expect(res.status).not.toHaveBeenCalled();
  });

  test('usa process.env.JWT_SECRET para verificar o token', () => {
    jwt.verify.mockReturnValue({ id: 'u1', role: 'AGENT', email: 'a@x.com', name: 'A' });
    const req = mockReq('Bearer valid-token');
    auth(req, mockRes(), jest.fn());
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
  });
});
