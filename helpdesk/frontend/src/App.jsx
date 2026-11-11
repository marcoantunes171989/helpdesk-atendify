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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spin fullscreen />;
  return user ? children : <Navigate to="/login" replace />;
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
        <Route path="companies" element={<Companies />} />
        <Route path="companies/:id" element={<CompanyDetail />} />
        <Route path="users" element={<Users />} />
        <Route path="categories" element={<Categories />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="employees" element={<Employees />} />
        <Route path="statuses" element={<Status />} />
        <Route path="technicians" element={<Technicians />} />
        <Route path="states" element={<States />} />
        <Route path="cities" element={<Cities />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="reports" element={<Reports />} />
        <Route path="crm" element={<CRM />} />
        <Route path="implantacoes" element={<Implantacoes />} />
        <Route path="modulos-treinamento" element={<ModulosTreinamento />} />
        <Route path="etapas-treinamento" element={<EtapasTreinamento />} />
        <Route path="treinamentos" element={<Treinamentos />} />
        <Route path="visitas" element={<Visitas />} />
        <Route path="agenda-tecnica" element={<AgendaTecnica />} />
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
