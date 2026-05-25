require('dotenv').config();
const path = require('path');
const { execSync } = require('child_process');
const express = require('express');
const cors = require('cors');
const runSetupTriggers = require('../prisma/setup-triggers');

// Garante que todas as migrations estejam aplicadas antes de subir o servidor
try {
  console.log('[migrate] rodando prisma migrate deploy...');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  console.log('[migrate] concluído');
} catch (e) {
  console.error('[migrate] falhou (não fatal):', e.message);
}

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const ticketRoutes = require('./routes/tickets');
const dashboardRoutes = require('./routes/dashboard');
const employeeRoutes = require('./routes/employees');
const statusRoutes = require('./routes/statuses');
const technicianRoutes = require('./routes/technicians');
const stateRoutes = require('./routes/states');
const cityRoutes = require('./routes/cities');
const knowledgeRoutes = require('./routes/knowledge');
const reportRoutes = require('./routes/reports');
const crmRoutes = require('./routes/crm');
const implantacaoRoutes = require('./routes/implantacoes');
const etapaTreinamentoRoutes = require('./routes/etapasTreinamento');
const moduloTreinamentoRoutes = require('./routes/modulosTreinamento');
const treinamentoRoutes = require('./routes/treinamentos');
const visitaRoutes          = require('./routes/visitas');
const agendaTecnicaRoutes   = require('./routes/agendaTecnica');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://helpdesk-atendify.vercel.app',
  'https://www.atendexa.com.br',
  'https://atendexa.com.br',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/implantacoes', implantacaoRoutes);
app.use('/api/etapas-treinamento', etapaTreinamentoRoutes);
app.use('/api/modulos-treinamento', moduloTreinamentoRoutes);
app.use('/api/treinamentos', treinamentoRoutes);
app.use('/api/visitas',           visitaRoutes);
app.use('/api/agenda-tecnica',    agendaTecnicaRoutes);

// Captura erros de rotas síncronas e assíncronas
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Erro interno do servidor' });
});

// Captura unhandledRejection para evitar crash silencioso no Render
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});

const PORT = process.env.PORT || 3001;

runSetupTriggers().then(() => {
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
});
