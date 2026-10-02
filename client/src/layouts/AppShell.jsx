import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_BY_ROLE = {
  ADMIN: [
    { to: '/app/admin', label: 'Admin Home' },
    { to: '/app/admin/datasets', label: 'Datasets' },
    { to: '/app/admin/indicators', label: 'Indicators' },
    { to: '/app/admin/reporting-periods', label: 'Reporting Periods' },
  ],
  DATA_ENTRY: [{ to: '/app/data-entry', label: 'Data Entry' }],
  REPORTING: [{ to: '/app/reporting', label: 'Reporting' }],
  MANAGER: [{ to: '/app/manager', label: 'Manager' }],
};

function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = NAV_BY_ROLE[user?.role] || [];

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-56 bg-slate-800 text-slate-100 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-6">Hospital Health Data</h2>
        <nav className="flex-1 space-y-2">
          <Link to="/app" className="block px-3 py-2 rounded hover:bg-slate-700">
            Dashboard
          </Link>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block px-3 py-2 rounded hover:bg-slate-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-4 rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm"
        >
          Logout
        </button>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-slate-800">
            Hospital Health Data Management
          </h1>
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">{user?.name}</span>{' '}
            <span className="ml-2 inline-block rounded bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold">
              {user?.role}
            </span>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
