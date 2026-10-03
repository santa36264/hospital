/**
 * RoleIndex — renders the correct dashboard for the authenticated user's role.
 * Mounted at /app (index route). Each role sees its own operational dashboard.
 *
 * ADMIN      → AdminDashboardPage  (/app/admin is the canonical admin dashboard
 *              but /app for admin shows the same via redirect)
 * DATA_ENTRY → DataEntryDashboardPage
 * REPORTING  → ReportingDashboardPage
 * MANAGER    → ManagerDashboardPage
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DataEntryDashboardPage from './data-entry/DataEntryDashboardPage';
import ReportingDashboardPage from './reporting/ReportingDashboardPage';
import ManagerDashboardPage from './manager/ManagerDashboardPage';
import AdminDashboardPage from './admin/AdminDashboardPage';
import { LoadingState } from '../components/reports';

export default function RoleIndex() {
  const { user, status } = useAuth();

  if (status === 'loading') return <LoadingState message="Loading…" />;

  switch (user?.role) {
    case 'ADMIN':     return <AdminDashboardPage />;
    case 'DATA_ENTRY': return <DataEntryDashboardPage />;
    case 'REPORTING': return <ReportingDashboardPage />;
    case 'MANAGER':   return <ManagerDashboardPage />;
    default:          return <Navigate to="/login" replace />;
  }
}
