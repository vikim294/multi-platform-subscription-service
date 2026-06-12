import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoutes } from './routes/AdminRoutes.jsx';
import { AdminLogin } from './pages/AdminLogin.jsx';
import { getAdminToken } from './api/http.js';

export const App = () => {
  const token = getAdminToken();

  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/admin/*" element={token ? <AdminRoutes /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={token ? '/admin' : '/login'} replace />} />
    </Routes>
  );
};
