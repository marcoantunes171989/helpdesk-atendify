# Helpdesk - Sistema de Atendimento

Sistema completo de helpdesk com cadastro de empresas, usuários, categorias e chamados.

## Stack

- **Frontend**: React 18 + Vite + Ant Design 5
- **Backend**: Node.js + Express + Prisma ORM
- **Banco de dados**: PostgreSQL

---

## Estrutura

```
helpdesk/
├── backend/         # API Node.js + Express
│   ├── prisma/      # Schema e seed do banco
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       └── routes/
└── frontend/        # React + Ant Design
    └── src/
        ├── components/
        ├── contexts/
        ├── pages/
        ├── services/
        └── utils/
```

---

## Configuração e Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL instalado e rodando

### 1. Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do PostgreSQL

# Criar o banco e aplicar migrações
npx prisma migrate dev --name init

# Gerar o Prisma Client
npx prisma generate

# Popular banco com dados iniciais
npm run prisma:seed

# Iniciar servidor de desenvolvimento
npm run dev
```

O servidor estará em `http://localhost:3001`

### 2. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O frontend estará em `http://localhost:5173`

---

## Usuários de Teste (após seed)

| Email | Senha | Perfil |
|-------|-------|--------|
| superadmin@helpdesk.com | admin123 | Super Admin |
| admin@empresademo.com.br | admin123 | Administrador |
| agente@empresademo.com.br | admin123 | Agente |
| cliente@empresademo.com.br | admin123 | Cliente |

---

## Perfis de Acesso

| Perfil | Empresas | Usuários | Categorias | Chamados |
|--------|----------|----------|------------|----------|
| **Super Admin** | CRUD total | CRUD total | CRUD total | Ver todos |
| **Admin** | Editar própria | CRUD na empresa | CRUD na empresa | Ver empresa |
| **Agente** | — | Ver agentes | Ver | Atender |
| **Cliente** | — | — | — | Próprios |

---

## Funcionalidades

- **Autenticação JWT** com refresh automático
- **Cadastro de Empresas** — CNPJ, email, telefone, status ativo/inativo
- **Cadastro de Usuários** — perfis hierárquicos por empresa
- **Categorias com SLA** — prazo de atendimento configurável por categoria
- **Chamados (Tickets)** — prioridade, status, atribuição e histórico de comentários
- **Dashboard** — métricas em tempo real, SLA vencido, distribuição por prioridade/categoria
- **Controle de SLA** — alerta visual quando o prazo de atendimento é ultrapassado

---

## API Endpoints

```
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/change-password

GET    /api/companies
POST   /api/companies
PUT    /api/companies/:id
DELETE /api/companies/:id

GET    /api/users
POST   /api/users
PUT    /api/users/:id
PUT    /api/users/:id/reset-password

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/tickets
POST   /api/tickets
GET    /api/tickets/:id
PUT    /api/tickets/:id
POST   /api/tickets/:id/comments

GET    /api/dashboard/stats
```
