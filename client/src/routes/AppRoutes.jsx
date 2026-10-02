import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import RequireAuth, { RequireRole } from './RequireAuth';
import LoginPage from '../pages/LoginPage';
import AppShell from '../layouts/AppShell';
import {
  AppHome,
  AdminPlaceholder,
  ManagerPlaceholder,
  UnauthorizedPage,
} from '../pages/placeholderPages';
import DatasetsPage from '../pages/DatasetsPage';
import IndicatorsPage from '../pages/IndicatorsPage';
import ReportingPeriodsPage from '../pages/ReportingPeriodsPage';
// Data Entry
import MySubmissionsPage from '../pages/data-entry/MySubmissionsPage';
import NewSubmissionPage from '../pages/data-entry/NewSubmissionPage';
import SubmissionFormPage from '../pages/data-entry/SubmissionFormPage';
// Reporting (Stage 07)
import SubmissionQueuePage from '../pages/reporting/SubmissionQueuePage';
import ReviewDetailPage from '../pages/reporting/ReviewDetailPage';
// Reporting Reports (Stage 08)
import DatasetReportPage from '../pages/reporting/reports/DatasetReportPage';
import MonthlyReportPage from '../pages/reporting/reports/MonthlyReportPage';
import IndicatorReportPage from '../pages/reporting/reports/IndicatorReportPage';
import SubmissionStatusPage from '../pages/reporting/reports/SubmissionStatusPage';
import ReportHistoryPage from '../pages/reporting/reports/ReportHistoryPage';
// Notifications (Stage 07)
import NotificationsPage from '../pages/notifications/NotificationsPage';

function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<AppHome />} />

            {/* ── Admin ── */}
            <Route path="admin" element={<RequireRole role="ADMIN"><AdminPlaceholder /></RequireRole>} />
            <Route path="admin/datasets" element={<RequireRole role="ADMIN"><DatasetsPage /></RequireRole>} />
            <Route path="admin/indicators" element={<RequireRole role="ADMIN"><IndicatorsPage /></RequireRole>} />
            <Route path="admin/reporting-periods" element={<RequireRole role="ADMIN"><ReportingPeriodsPage /></RequireRole>} />

            {/* ── Data Entry ── */}
            <Route path="data-entry/submissions/new" element={<RequireRole role="DATA_ENTRY"><NewSubmissionPage /></RequireRole>} />
            <Route path="data-entry/submissions/:id"  element={<RequireRole role="DATA_ENTRY"><SubmissionFormPage /></RequireRole>} />
            <Route path="data-entry/submissions"      element={<RequireRole role="DATA_ENTRY"><MySubmissionsPage /></RequireRole>} />
            <Route path="data-entry" element={<RequireRole role="DATA_ENTRY"><Navigate to="/app/data-entry/submissions" replace /></RequireRole>} />

            {/* ── Reporting (Stage 07) ── */}
            <Route path="reporting/queue" element={<RequireRole role="REPORTING"><SubmissionQueuePage /></RequireRole>} />
            <Route path="reporting/submissions/:id" element={<RequireRole role="REPORTING"><ReviewDetailPage /></RequireRole>} />

            {/* ── Reporting Reports (Stage 08) ── */}
            <Route path="reporting/reports/dataset" element={<RequireRole role="REPORTING"><DatasetReportPage /></RequireRole>} />
            <Route path="reporting/reports/monthly" element={<RequireRole role="REPORTING"><MonthlyReportPage /></RequireRole>} />
            <Route path="reporting/reports/indicator" element={<RequireRole role="REPORTING"><IndicatorReportPage /></RequireRole>} />
            <Route path="reporting/reports/submission-status" element={<RequireRole role="REPORTING"><SubmissionStatusPage /></RequireRole>} />
            <Route path="reporting/reports/history" element={<RequireRole role="REPORTING"><ReportHistoryPage /></RequireRole>} />

            <Route path="reporting" element={<RequireRole role="REPORTING"><Navigate to="/app/reporting/queue" replace /></RequireRole>} />

            {/* ── Manager (placeholder) ── */}
            <Route path="manager" element={<RequireRole role="MANAGER"><ManagerPlaceholder /></RequireRole>} />

            {/* ── Notifications (all authenticated roles) ── */}
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppRoutes;
