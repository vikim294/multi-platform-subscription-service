import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AdminRoutes } from './routes/AdminRoutes.jsx';
import { AdminLogin } from './pages/AdminLogin.jsx';
import { UserAuthPage } from './pages/UserAuthPage.jsx';
import { UserNotificationsPage } from './pages/UserNotificationsPage.jsx';
import { UserTargetsPage } from './pages/UserTargetsPage.jsx';
import { AUTH_STORAGE_EVENT, getAdminToken, getUserToken } from './api/http.js';

const readAuthTokens = () => ({
  adminToken: getAdminToken(),
  userToken: getUserToken(),
});

export const App = () => {
  const [{ adminToken, userToken }, setAuthTokens] = useState(readAuthTokens);

  useEffect(() => {
    const syncAuthTokens = () => setAuthTokens(readAuthTokens());

    window.addEventListener(AUTH_STORAGE_EVENT, syncAuthTokens);
    window.addEventListener('storage', syncAuthTokens);

    return () => {
      window.removeEventListener(AUTH_STORAGE_EVENT, syncAuthTokens);
      window.removeEventListener('storage', syncAuthTokens);
    };
  }, []);

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
