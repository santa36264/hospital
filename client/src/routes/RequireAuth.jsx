import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RequireAuth({ children }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (user?.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

export default RequireAuth;
