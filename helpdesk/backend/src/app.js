require('dotenv').config();
const express = require('express');
const cors = require('cors');

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
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
