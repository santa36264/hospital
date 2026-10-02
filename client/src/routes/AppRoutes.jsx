import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import RequireAuth, { RequireRole } from './RequireAuth';
import LoginPage from '../pages/LoginPage';
import AppShell from '../layouts/AppShell';
import {
  AppHome,
  AdminPlaceholder,
  ReportingPlaceholder,
  ManagerPlaceholder,
  UnauthorizedPage,
} from '../pages/placeholderPages';
import DatasetsPage from '../pages/DatasetsPage';
import IndicatorsPage from '../pages/IndicatorsPage';
import ReportingPeriodsPage from '../pages/ReportingPeriodsPage';
import MySubmissionsPage from '../pages/data-entry/MySubmissionsPage';
import NewSubmissionPage from '../pages/data-entry/NewSubmissionPage';
import SubmissionFormPage from '../pages/data-entry/SubmissionFormPage';

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
            <Route
              path="admin"
              element={
                <RequireRole role="ADMIN">
                  <AdminPlaceholder />
                </RequireRole>
              }
            />
            <Route
              path="admin/datasets"
              element={
                <RequireRole role="ADMIN">
                  <DatasetsPage />
                </RequireRole>
              }
            />
            <Route
              path="admin/indicators"
              element={
                <RequireRole role="ADMIN">
                  <IndicatorsPage />
                </RequireRole>
              }
            />
            <Route
              path="admin/reporting-periods"
              element={
                <RequireRole role="ADMIN">
                  <ReportingPeriodsPage />
                </RequireRole>
              }
            />

            {/* ── Data Entry (Stage 06) ── */}
            <Route
              path="data-entry/submissions/new"
              element={
                <RequireRole role="DATA_ENTRY">
                  <NewSubmissionPage />
                </RequireRole>
              }
            />
            <Route
              path="data-entry/submissions/:id"
              element={
                <RequireRole role="DATA_ENTRY">
                  <SubmissionFormPage />
                </RequireRole>
              }
            />
            <Route
              path="data-entry/submissions"
              element={
                <RequireRole role="DATA_ENTRY">
                  <MySubmissionsPage />
                </RequireRole>
              }
            />
            {/* data-entry index → redirect to submissions list */}
            <Route
              path="data-entry"
              element={
                <RequireRole role="DATA_ENTRY">
                  <Navigate to="/app/data-entry/submissions" replace />
                </RequireRole>
              }
            />

            {/* ── Reporting / Manager (placeholders) ── */}
            <Route
              path="reporting"
              element={
                <RequireRole role="REPORTING">
                  <ReportingPlaceholder />
                </RequireRole>
              }
            />
            <Route
              path="manager"
              element={
                <RequireRole role="MANAGER">
                  <ManagerPlaceholder />
                </RequireRole>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppRoutes;
