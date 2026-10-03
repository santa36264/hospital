import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import {
  LayoutDashboard,
  Users,
  Database,
  ListChecks,
  CalendarDays,
  ShieldCheck,
  Settings,
  FileText,
  FileBarChart,
  LineChart,
  CheckCheck,
  SlidersHorizontal,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';

// ─── Navigation structure per role ────────────────────────────────────────────
const NAV_BY_ROLE = {
  ADMIN: [
    {
      group: 'Main',
      items: [
        { to: '/app/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      ],
    },
    {
      group: 'Data Management',
      items: [
        { to: '/app/admin/datasets',          label: 'Datasets',          icon: Database },
        { to: '/app/admin/indicators',        label: 'Indicators',        icon: ListChecks },
        { to: '/app/admin/reporting-periods', label: 'Reporting Periods', icon: CalendarDays },
      ],
    },
    {
      group: 'Reporting',
      items: [
        { to: '/app/reporting/reports/dataset', label: 'Reports',   icon: FileBarChart },
        { to: '/app/manager/analysis',          label: 'Analysis',  icon: LineChart },
      ],
    },
    {
      group: 'User & Security',
      items: [
        { to: '/app/admin/users',      label: 'Users',          icon: Users },
        { to: '/app/notifications',    label: 'Notifications',  icon: Bell },
        { to: '/app/admin/audit-logs', label: 'Audit Logs',     icon: ShieldCheck },
        { to: '/app/admin/system',     label: 'System',         icon: Settings },
      ],
    },
  ],

  DATA_ENTRY: [
    {
      group: 'Main',
      items: [
        { to: '/app/data-entry/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Reporting Work',
      items: [
        { to: '/app/data-entry/submissions',     label: 'My Submissions', icon: FileText },
        { to: '/app/data-entry/submissions/new', label: 'New Submission', icon: SlidersHorizontal },
      ],
    },
    {
      group: 'Account',
      items: [
        { to: '/app/notifications', label: 'Notifications', icon: Bell },
      ],
    },
  ],

  REPORTING: [
    {
      group: 'Main',
      items: [
        { to: '/app/reporting/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Review',
      items: [
        { to: '/app/reporting/queue', label: 'Review Queue', icon: CheckCheck },
      ],
    },
    {
      group: 'Reports',
      items: [
        { to: '/app/reporting/reports/dataset',           label: 'Dataset Report',    icon: FileBarChart },
        { to: '/app/reporting/reports/monthly',           label: 'Monthly Report',    icon: FileBarChart },
        { to: '/app/reporting/reports/indicator',         label: 'Indicator Report',  icon: FileBarChart },
        { to: '/app/reporting/reports/submission-status', label: 'Submission Status', icon: FileText },
        { to: '/app/reporting/reports/custom',            label: 'Custom Reports',    icon: SlidersHorizontal },
        { to: '/app/reporting/reports/history',           label: 'Report History',    icon: LineChart },
      ],
    },
    {
      group: 'Analysis',
      items: [
        { to: '/app/manager/dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
        { to: '/app/manager/analysis',  label: 'Indicator Analysis',  icon: LineChart },
      ],
    },
    {
      group: 'Account',
      items: [
        { to: '/app/notifications', label: 'Notifications', icon: Bell },
      ],
    },
  ],

  MANAGER: [
    {
      group: 'Main',
      items: [
        { to: '/app/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Analysis',
      items: [
        { to: '/app/manager/analysis', label: 'Indicator Analysis', icon: LineChart },
      ],
    },
    {
      group: 'Account',
      items: [
        { to: '/app/notifications', label: 'Notifications', icon: Bell },
      ],
    },
  ],
};

// ─── Sidebar nav-link style ────────────────────────────────────────────────────
function navLinkClass({ isActive }) {
  return [
    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800',
    isActive
      ? 'bg-blue-600 text-white font-medium'
      : 'text-slate-300 hover:bg-slate-700 hover:text-white',
  ].join(' ');
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ navGroups, user, onSignOut, onNavClick }) {
  const roleColors = {
    ADMIN:      'bg-blue-700',
    DATA_ENTRY: 'bg-emerald-700',
    REPORTING:  'bg-purple-700',
    MANAGER:    'bg-teal-700',
  };
  const roleBadge = roleColors[user?.role] || 'bg-slate-600';

  return (
    <div className="h-full flex flex-col bg-slate-800 text-slate-100">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-700/60 shrink-0">
        <h2 className="text-sm font-bold text-white leading-tight tracking-tight">
          Hospital Health Data
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Management System</p>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
        aria-label="Main navigation"
        onClick={onNavClick}
      >
        {navGroups.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase select-none">
              {group.group}
            </p>
            <ul className="space-y-0.5" role="list">
              {group.items.map((item) => (
                <li key={item.to + item.label}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={navLinkClass}
                  >
                    <item.icon className="w-4 h-4 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User / Sign out */}
      <div className="px-4 py-4 border-t border-slate-700/60 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-full ${roleBadge} flex items-center justify-center shrink-0`}>
            <span className="text-xs font-bold text-white" aria-hidden>
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${roleBadge} mt-0.5`}>
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef(null);

  const navGroups = NAV_BY_ROLE[user?.role] || [];

  async function handleSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  // Close on Escape
  useEffect(() => {
    function handler(e) {
      if (e.key === 'Escape' && mobileOpen) setMobileOpen(false);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen]);

  // Trap focus inside drawer when open (accessibility)
  useEffect(() => {
    if (mobileOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [mobileOpen]);

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex md:flex-col md:w-60 md:shrink-0 bg-slate-800"
        aria-label="Application sidebar"
      >
        <Sidebar
          navGroups={navGroups}
          user={user}
          onSignOut={handleSignOut}
          onNavClick={undefined}
        />
      </aside>

      {/* ── Mobile overlay backdrop ──────────────────────────────────────── */}
      {mobileOpen && (
        <button
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          tabIndex={-1}
        />
      )}

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      <aside
        ref={drawerRef}
        tabIndex={-1}
        className={[
          'fixed inset-y-0 left-0 z-30 w-64 flex flex-col md:hidden',
          'transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        {/* Close button inside drawer */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <Sidebar
          navGroups={navGroups}
          user={user}
          onSignOut={handleSignOut}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger — professional Menu icon, no emoji */}
            <button
              className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="w-5 h-5" aria-hidden />
            </button>
            <h1 className="text-sm font-semibold text-slate-700 truncate hidden sm:block">
              Hospital Health Data Management
            </h1>
          </div>

          {/* Right-side header controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notification bell — icon only, no text, with unread badge and accessible label */}
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
