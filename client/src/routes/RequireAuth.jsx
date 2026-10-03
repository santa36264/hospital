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

/**
 * RequireRole accepts a single role string OR an array of allowed roles.
 * Usage:
 *   <RequireRole role="ADMIN">...</RequireRole>
 *   <RequireRole role={['MANAGER','REPORTING','ADMIN']}>...</RequireRole>
 */
export function RequireRole({ role, children }) {
  const { user } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

export default RequireAuth;
