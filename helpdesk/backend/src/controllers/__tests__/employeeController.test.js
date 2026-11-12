jest.mock('../../prisma', () => ({
  employee: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ id: 'e1' }) },
}));

const prisma = require('../../prisma');
const ctrl = require('../employeeController');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('employeeController — dados sensíveis restritos por permissão (ETAPA 6 do RBAC-03)', () => {
  afterEach(() => jest.clearAllMocks());

  test('list: sem employees.read (ex.: CLIENT abrindo chamado) recebe apenas campos públicos (select), nunca CPF/salário', async () => {
    const req = { query: {}, permissions: new Set() };
    await ctrl.list(req, mockRes());

    const call = prisma.employee.findMany.mock.calls[0][0];
    expect(call.select).toBeDefined();
    expect(call.include).toBeUndefined();
    expect(call.select.salary).toBeUndefined();
    expect(call.select.cpf).toBeUndefined();
    expect(call.select.name).toBe(true);
  });

  test('list: com employees.read recebe o registro completo (include), preservando o comportamento de gestão', async () => {
    const req = { query: {}, permissions: new Set(['employees.read']) };
    await ctrl.list(req, mockRes());

    const call = prisma.employee.findMany.mock.calls[0][0];
    expect(call.include).toBeDefined();
    expect(call.select).toBeUndefined();
  });

  test('get: sem employees.read usa select restrito', async () => {
    const req = { params: { id: 'e1' }, permissions: new Set() };
    await ctrl.get(req, mockRes());

    const call = prisma.employee.findUnique.mock.calls[0][0];
    expect(call.select).toBeDefined();
    expect(call.select.cpf).toBeUndefined();
  });
});
