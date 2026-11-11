import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';

const AppLayout = lazy(() => import('./components/AppLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Companies = lazy(() => import('./pages/Companies'));
const Users = lazy(() => import('./pages/Users'));
const Categories = lazy(() => import('./pages/Categories'));
const Tickets = lazy(() => import('./pages/Tickets'));
const TicketDetail = lazy(() => import('./pages/TicketDetail'));
const Employees = lazy(() => import('./pages/Employees'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const Status = lazy(() => import('./pages/Status'));
const Technicians = lazy(() => import('./pages/Technicians'));
const Settings = lazy(() => import('./pages/Settings'));
const States = lazy(() => import('./pages/States'));
const Cities = lazy(() => import('./pages/Cities'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const Reports = lazy(() => import('./pages/Reports'));
const CRM = lazy(() => import('./pages/CRM'));
const Implantacoes = lazy(() => import('./pages/Implantacoes'));
const EtapasTreinamento = lazy(() => import('./pages/EtapasTreinamento'));
const ModulosTreinamento = lazy(() => import('./pages/ModulosTreinamento'));
const Treinamentos = lazy(() => import('./pages/Treinamentos'));
const Visitas = lazy(() => import('./pages/Visitas'));
const AgendaTecnica = lazy(() => import('./pages/AgendaTecnica'));
const AccessGroups = lazy(() => import('./pages/AccessGroups'));

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spin fullscreen />;
  return user ? children : <Navigate to="/login" replace />;
}

// DENY BY DEFAULT: sem a permissão exigida, a rota não é acessível mesmo por URL direta.
function PermissionRoute({ permission, children }) {
  const { can } = useAuth();
  return can(permission) ? children : <Navigate to="/app" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return children;
  return user ? <Navigate to="/app" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/app" element={<PrivateRoute><Suspense fallback={<Spin fullscreen />}><AppLayout /></Suspense></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="companies" element={<PermissionRoute permission="companies.read"><Companies /></PermissionRoute>} />
        <Route path="companies/:id" element={<PermissionRoute permission="companies.read"><CompanyDetail /></PermissionRoute>} />
        <Route path="users" element={<PermissionRoute permission="users.read"><Users /></PermissionRoute>} />
        <Route path="access-groups" element={<PermissionRoute permission="access_groups.read"><AccessGroups /></PermissionRoute>} />
        <Route path="categories" element={<PermissionRoute permission="categories.read"><Categories /></PermissionRoute>} />
        <Route path="tickets" element={<PermissionRoute permission="tickets.read"><Tickets /></PermissionRoute>} />
        <Route path="tickets/:id" element={<PermissionRoute permission="tickets.read"><TicketDetail /></PermissionRoute>} />
        <Route path="employees" element={<PermissionRoute permission="employees.read"><Employees /></PermissionRoute>} />
        <Route path="statuses" element={<PermissionRoute permission="statuses.read"><Status /></PermissionRoute>} />
        <Route path="technicians" element={<PermissionRoute permission="technicians.read"><Technicians /></PermissionRoute>} />
        <Route path="states" element={<PermissionRoute permission="states_cities.read"><States /></PermissionRoute>} />
        <Route path="cities" element={<PermissionRoute permission="states_cities.read"><Cities /></PermissionRoute>} />
        <Route path="knowledge" element={<PermissionRoute permission="knowledge.read"><KnowledgeBase /></PermissionRoute>} />
        <Route path="reports" element={<PermissionRoute permission="reports.read"><Reports /></PermissionRoute>} />
        <Route path="crm" element={<PermissionRoute permission="crm.read"><CRM /></PermissionRoute>} />
        <Route path="implantacoes" element={<PermissionRoute permission="implantacoes.read"><Implantacoes /></PermissionRoute>} />
        <Route path="modulos-treinamento" element={<PermissionRoute permission="treinamentos.read"><ModulosTreinamento /></PermissionRoute>} />
        <Route path="etapas-treinamento" element={<PermissionRoute permission="treinamentos.read"><EtapasTreinamento /></PermissionRoute>} />
        <Route path="treinamentos" element={<PermissionRoute permission="treinamentos.read"><Treinamentos /></PermissionRoute>} />
        <Route path="visitas" element={<PermissionRoute permission="visitas.read"><Visitas /></PermissionRoute>} />
        <Route path="agenda-tecnica" element={<PermissionRoute permission="agenda_tecnica.read"><AgendaTecnica /></PermissionRoute>} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
