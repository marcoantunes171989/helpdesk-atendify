import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Users from './pages/Users';
import Categories from './pages/Categories';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Employees from './pages/Employees';
import CompanyDetail from './pages/CompanyDetail';
import Status from './pages/Status';
import Technicians from './pages/Technicians';
import Settings from './pages/Settings';
import States from './pages/States';
import Cities from './pages/Cities';
import KnowledgeBase from './pages/KnowledgeBase';
import Reports from './pages/Reports';
import CRM from './pages/CRM';
import Implantacoes from './pages/Implantacoes';
import EtapasTreinamento from './pages/EtapasTreinamento';
import ModulosTreinamento from './pages/ModulosTreinamento';
import Treinamentos from './pages/Treinamentos';
import Visitas from './pages/Visitas';
import AgendaTecnica from './pages/AgendaTecnica';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spin fullscreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spin fullscreen />;
  return user ? <Navigate to="/app" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/app" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
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
