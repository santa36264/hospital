import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldOff } from 'lucide-react';

// AppHome is only shown for the /app index route, which RoleIndex handles by
// delegating to the correct dashboard. This placeholder is a fallback only.
function AppHome() {
  const { user } = useAuth();
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-center">
        <p className="text-slate-500 text-sm">Redirecting to your dashboard…</p>
      </div>
    </div>
  );
}

function UnauthorizedPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-4">
          <ShieldOff className="w-12 h-12 text-red-300" aria-hidden />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500 text-sm mb-6">
          You do not have permission to access this area.
        </p>
        <Link
          to="/app"
          className="inline-flex items-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export { AppHome, UnauthorizedPage };
