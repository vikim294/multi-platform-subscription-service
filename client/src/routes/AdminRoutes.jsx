import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShellLayout } from '../components/AppShellLayout.jsx';
import { AdminDashboard } from '../pages/AdminDashboard.jsx';
import { FetchLogsPage } from '../pages/FetchLogsPage.jsx';
import { PlatformTokenPage } from '../pages/PlatformTokenPage.jsx';
import { SchedulerPage } from '../pages/SchedulerPage.jsx';
import { TargetsPage } from '../pages/TargetsPage.jsx';

export const AdminRoutes = () => (
  <AppShellLayout>
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="platform-token" element={<PlatformTokenPage />} />
      <Route path="targets" element={<TargetsPage />} />
      <Route path="scheduler" element={<SchedulerPage />} />
      <Route path="fetch-logs" element={<FetchLogsPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </AppShellLayout>
);
