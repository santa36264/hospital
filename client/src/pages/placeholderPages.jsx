import { useAuth } from '../context/AuthContext';

function AppHome() {
  const { user } = useAuth();
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">
        Welcome, {user?.name}
      </h2>
      <p className="text-slate-600">
        You are signed in as <strong>{user?.role}</strong>. Use the navigation
        to access your role area.
      </p>
    </div>
  );
}

function UnauthorizedPage() {
  return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-semibold text-red-600">403 — Unauthorized</h2>
      <p className="text-slate-600">You do not have access to this area.</p>
    </div>
  );
}

export { AppHome, UnauthorizedPage };
