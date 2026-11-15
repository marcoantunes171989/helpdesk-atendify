// RBAC-04 ETAPA 3: módulos e etapas de treinamento eram os únicos endpoints
// de treinamentos ainda protegidos por minRole('AGENT') em vez de
// treinamentos.* (gap identificado na auditoria RBAC-04). Este teste valida,
// via requisição HTTP real contra o router (não apenas o middleware isolado),
// que a permissão correta é exigida em cada rota e que um usuário sem
// accessGroupId e role CLIENT (que nunca recebeu treinamentos.* no catálogo)
// continua bloqueado — sem escalonamento de privilégio.

jest.mock('../../prisma', () => ({
  user: { findUnique: jest.fn() },
  accessGroup: { findUnique: jest.fn() },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
  moduloTreinamento: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ id: 'm1' }),
    create: jest.fn().mockResolvedValue({ id: 'm1' }),
    findFirst: jest.fn().mockResolvedValue(null),
  },
  etapaTreinamento: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ id: 'e1' }),
    create: jest.fn().mockResolvedValue({ id: 'e1' }),
    findFirst: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('jsonwebtoken');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const prisma = require('../../prisma');
const modulosRouter = require('../modulosTreinamento');
const etapasRouter = require('../etapasTreinamento');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/modulos-treinamento', modulosRouter);
  app.use('/api/etapas-treinamento', etapasRouter);
  return app;
}

function asUser({ id, role }) {
  jwt.verify.mockReturnValue({ id, role, email: 'u@x.com', name: 'U' });
  prisma.user.findUnique.mockResolvedValue({ id, name: 'U', role, active: true, accessGroupId: null, tokenVersion: 0 });
}

describe('rotas de módulos/etapas de treinamento — exigem treinamentos.* (RBAC-04 ETAPA 3)', () => {
  let app;
  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    prisma.auditLog.create.mockResolvedValue({});
  });

  describe('positivo — AGENT (tem treinamentos.read/create/update no padrão do catálogo)', () => {
    test('GET /modulos-treinamento retorna 200', async () => {
      asUser({ id: 'u1', role: 'AGENT' });
      const res = await request(app).get('/api/modulos-treinamento').set('Authorization', 'Bearer t');
      expect(res.status).toBe(200);
    });

    test('POST /modulos-treinamento retorna 201/200 (não 403)', async () => {
      asUser({ id: 'u1', role: 'AGENT' });
      const res = await request(app).post('/api/modulos-treinamento').set('Authorization', 'Bearer t').send({ name: 'X' });
      expect(res.status).not.toBe(403);
    });

    test('GET /etapas-treinamento retorna 200', async () => {
      asUser({ id: 'u1', role: 'AGENT' });
      const res = await request(app).get('/api/etapas-treinamento').set('Authorization', 'Bearer t');
      expect(res.status).toBe(200);
    });

    test('PUT /etapas-treinamento/:id não retorna 403', async () => {
      asUser({ id: 'u1', role: 'AGENT' });
      const res = await request(app).put('/api/etapas-treinamento/e1').set('Authorization', 'Bearer t').send({ name: 'Y' });
      expect(res.status).not.toBe(403);
    });
  });

  describe('negativo — CLIENT (catálogo nunca concede treinamentos.* a CLIENT)', () => {
    test('GET /modulos-treinamento retorna 403', async () => {
      asUser({ id: 'u2', role: 'CLIENT' });
      const res = await request(app).get('/api/modulos-treinamento').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    test('POST /modulos-treinamento retorna 403', async () => {
      asUser({ id: 'u2', role: 'CLIENT' });
      const res = await request(app).post('/api/modulos-treinamento').set('Authorization', 'Bearer t').send({ name: 'X' });
      expect(res.status).toBe(403);
    });

    test('GET /etapas-treinamento retorna 403', async () => {
      asUser({ id: 'u2', role: 'CLIENT' });
      const res = await request(app).get('/api/etapas-treinamento').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });

    test('PUT /etapas-treinamento/:id retorna 403', async () => {
      asUser({ id: 'u2', role: 'CLIENT' });
      const res = await request(app).put('/api/etapas-treinamento/e1').set('Authorization', 'Bearer t').send({ name: 'Y' });
      expect(res.status).toBe(403);
    });
  });

  describe('negativo — sem token', () => {
    test('GET /modulos-treinamento sem Authorization retorna 401', async () => {
      const res = await request(app).get('/api/modulos-treinamento');
      expect(res.status).toBe(401);
    });
  });
});
