import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoutes } from './routes/AdminRoutes.jsx';
import { AdminLogin } from './pages/AdminLogin.jsx';
import { UserAuthPage } from './pages/UserAuthPage.jsx';
import { UserNotificationsPage } from './pages/UserNotificationsPage.jsx';
import { UserTargetsPage } from './pages/UserTargetsPage.jsx';
import { getAdminToken, getUserToken } from './api/http.js';

export const App = () => {
  const adminToken = getAdminToken();
  const userToken = getUserToken();

  return (
    <Routes>
      <Route path="/login" element={<UserAuthPage />} />
      <Route path="/app" element={userToken ? <UserTargetsPage /> : <Navigate to="/login" replace />} />
      <Route path="/notifications" element={userToken ? <UserNotificationsPage /> : <Navigate to="/login" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/*" element={adminToken ? <AdminRoutes /> : <Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to={userToken ? '/app' : '/login'} replace />} />
    </Routes>
  );
};
