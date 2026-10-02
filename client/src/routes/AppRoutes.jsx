import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import RequireAuth, { RequireRole } from './RequireAuth';
import LoginPage from '../pages/LoginPage';
import AppShell from '../layouts/AppShell';
import {
  AppHome,
  AdminPlaceholder,
  DataEntryPlaceholder,
  ReportingPlaceholder,
  ManagerPlaceholder,
  UnauthorizedPage,
} from '../pages/placeholderPages';
import DatasetsPage from '../pages/DatasetsPage';
import IndicatorsPage from '../pages/IndicatorsPage';
import ReportingPeriodsPage from '../pages/ReportingPeriodsPage';

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
            <Route
              path="data-entry"
              element={
                <RequireRole role="DATA_ENTRY">
                  <DataEntryPlaceholder />
                </RequireRole>
              }
            />
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
