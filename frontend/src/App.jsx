import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import RoleGuard from './auth/RoleGuard.jsx';
import Layout from './components/Layout.jsx';
import PlaceholderPage from './components/PlaceholderPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import BranchesPage from './pages/branches/BranchesPage.jsx';
import UsersPage from './pages/users/UsersPage.jsx';
import LeadEntryPage from './pages/leads/LeadEntryPage.jsx';
import StatusTrackerPage from './pages/status/StatusTrackerPage.jsx';
import MerchantsPage from './pages/merchants/MerchantsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"      element={<Dashboard />} />
        <Route path="/lead-entry"     element={<LeadEntryPage />} />
        <Route path="/status-tracker" element={<StatusTrackerPage />} />
        <Route path="/merchants"      element={<RoleGuard allow={['ADMIN']}><MerchantsPage /></RoleGuard>} />
        <Route path="/transactions"   element={<RoleGuard allow={['ADMIN']}><PlaceholderPage title="Transactions" subtitle="Card and UPI transactions across all merchants." /></RoleGuard>} />
        <Route path="/settled"        element={<RoleGuard allow={['ADMIN']}><PlaceholderPage title="Settled Transactions" subtitle="MDR, GST, and net settlement breakdown." /></RoleGuard>} />
        <Route path="/users"          element={<RoleGuard allow={['ADMIN']}><UsersPage /></RoleGuard>} />
        <Route path="/branches"       element={<RoleGuard allow={['ADMIN']}><BranchesPage /></RoleGuard>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
