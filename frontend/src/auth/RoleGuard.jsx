import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function RoleGuard({ allow, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
