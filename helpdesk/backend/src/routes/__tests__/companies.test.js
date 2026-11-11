// RBAC-06 ETAPA 2: POST/PUT/DELETE de empresas usavam minRole('ADMIN') em vez
// de companies.create/update/delete do catálogo — um grupo de acesso podia
// conceder a permissão (liberando o botão no frontend via can()) e o backend
// continuava bloqueando com 403. Este teste valida, via requisição HTTP real
// contra o router, que a permissão correta é exigida e que: (a) ADMIN/
// SUPER_ADMIN legados continuam com acesso total; (b) AGENT legado sem grupo
// continua bloqueado (sem escalonamento); (c) um grupo de acesso configurado
// explicitamente PODE conceder companies.create/update/delete a um AGENT.

jest.mock('../../prisma', () => ({
  user: { findUnique: jest.fn() },
  accessGroup: { findUnique: jest.fn() },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
  company: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ id: 'c1', name: 'Acme' }),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'c1', name: 'Acme' }),
    update: jest.fn().mockResolvedValue({ id: 'c1', name: 'Acme' }),
  },
  $transaction: jest.fn(async (fn) => fn({
    ticketComment: { deleteMany: jest.fn() },
    ticket: { deleteMany: jest.fn() },
    employee: { deleteMany: jest.fn() },
    category: { deleteMany: jest.fn() },
    company: { delete: jest.fn() },
  })),
}));
jest.mock('jsonwebtoken');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const prisma = require('../../prisma');
const companiesRouter = require('../companies');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/companies', companiesRouter);
  return app;
}

function asUser({ id, role, accessGroupId = null }) {
  jwt.verify.mockReturnValue({ id, role, email: 'u@x.com', name: 'U' });
  prisma.user.findUnique.mockResolvedValue({ id, name: 'U', role, active: true, accessGroupId, tokenVersion: 0 });
}

describe('rotas de empresas — create/update/delete exigem companies.* (RBAC-06 ETAPA 2)', () => {
  let app;
  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    prisma.auditLog.create.mockResolvedValue({});
    prisma.company.findMany.mockResolvedValue([]);
    prisma.company.findFirst.mockResolvedValue(null);
    prisma.company.findUnique.mockResolvedValue({
      id: 'c1', name: 'Acme',
      _count: { employees: 0, tickets: 0, categories: 0 },
    });
  });

  describe('positivo — ADMIN legado (ROLE_DEFAULT_PERMISSIONS concede companies.*)', () => {
    test('POST /companies não retorna 403', async () => {
      asUser({ id: 'u1', role: 'ADMIN' });
      const res = await request(app).post('/api/companies').set('Authorization', 'Bearer t')
        .send({ name: 'Acme', cnpj: '12345678901234', email: 'a@acme.com' });
      expect(res.status).not.toBe(403);
    });

    test('PUT /companies/:id não retorna 403', async () => {
      asUser({ id: 'u1', role: 'ADMIN' });
      const res = await request(app).put('/api/companies/c1').set('Authorization', 'Bearer t').send({ name: 'Acme 2' });
      expect(res.status).not.toBe(403);
    });

    test('DELETE /companies/:id não retorna 403', async () => {
      asUser({ id: 'u1', role: 'ADMIN' });
      const res = await request(app).delete('/api/companies/c1').set('Authorization', 'Bearer t');
      expect(res.status).not.toBe(403);
    });
  });

  describe('negativo — AGENT legado sem grupo (catálogo não concede companies.create/update/delete)', () => {
    test('POST /companies retorna 403', async () => {
      asUser({ id: 'u2', role: 'AGENT' });
      const res = await request(app).post('/api/companies').set('Authorization', 'Bearer t')
        .send({ name: 'Acme', cnpj: '12345678901234', email: 'a@acme.com' });
      expect(res.status).toBe(403);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    test('PUT /companies/:id retorna 403', async () => {
      asUser({ id: 'u2', role: 'AGENT' });
      const res = await request(app).put('/api/companies/c1').set('Authorization', 'Bearer t').send({ name: 'X' });
      expect(res.status).toBe(403);
    });

    test('DELETE /companies/:id retorna 403', async () => {
      asUser({ id: 'u2', role: 'AGENT' });
      const res = await request(app).delete('/api/companies/c1').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });
  });

  describe('positivo — grupo de acesso personalizado concede companies.create a um AGENT', () => {
    test('POST /companies não retorna 403 quando o grupo concede companies.create', async () => {
      asUser({ id: 'u3', role: 'AGENT', accessGroupId: 'g1' });
      prisma.accessGroup.findUnique.mockResolvedValue({
        active: true,
        permissions: [{ permission: { key: 'companies.create' } }],
      });
      const res = await request(app).post('/api/companies').set('Authorization', 'Bearer t')
        .send({ name: 'Acme', cnpj: '12345678901234', email: 'a@acme.com' });
      expect(res.status).not.toBe(403);
    });
  });

  describe('negativo — sem token', () => {
    test('POST /companies sem Authorization retorna 401', async () => {
      const res = await request(app).post('/api/companies').send({ name: 'Acme' });
      expect(res.status).toBe(401);
    });
  });
});
