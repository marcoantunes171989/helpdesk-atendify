const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      name: 'Empresa Demo',
      cnpj: '00.000.000/0001-00',
      email: 'contato@empresademo.com.br',
      phone: '(11) 99999-9999',
      address: 'Rua das Flores, 123 - São Paulo/SP',
    },
  });

  const hash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'superadmin@helpdesk.com' },
    update: {},
    create: {
      name: 'Super Administrador',
      email: 'superadmin@helpdesk.com',
      password: hash,
      role: 'SUPER_ADMIN',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@empresademo.com.br' },
    update: {},
    create: {
      name: 'Admin Demo',
      email: 'admin@empresademo.com.br',
      password: hash,
      role: 'ADMIN',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'agente@empresademo.com.br' },
    update: {},
    create: {
      name: 'Agente Demo',
      email: 'agente@empresademo.com.br',
      password: hash,
      role: 'AGENT',
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'cliente@empresademo.com.br' },
    update: {},
    create: {
      name: 'Cliente Demo',
      email: 'cliente@empresademo.com.br',
      password: hash,
      role: 'CLIENT',
      companyId: company.id,
    },
  });

  const cats = [
    { name: 'Suporte Técnico', description: 'Problemas técnicos em geral', slaHours: 8 },
    { name: 'Financeiro', description: 'Cobranças, faturas e pagamentos', slaHours: 24 },
    { name: 'Comercial', description: 'Vendas e contratos', slaHours: 4 },
    { name: 'RH', description: 'Recursos humanos e benefícios', slaHours: 48 },
  ];
  for (const cat of cats) {
    const existing = await prisma.category.findFirst({ where: { name: cat.name, companyId: company.id } });
    if (!existing) {
      await prisma.category.create({ data: { ...cat, companyId: company.id } });
    }
  }

  console.log('Seed executado com sucesso!');
  console.log('Login: superadmin@helpdesk.com / admin123');
  console.log('Login: admin@empresademo.com.br / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
