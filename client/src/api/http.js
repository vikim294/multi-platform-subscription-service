import axios from 'axios';

const ADMIN_TOKEN_KEY = 'mpss_admin_token';
const USER_TOKEN_KEY = 'mpss_user_token';

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);
export const getUserToken = () => localStorage.getItem(USER_TOKEN_KEY);

export const setAdminToken = (token) => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const setUserToken = (token) => {
  localStorage.setItem(USER_TOKEN_KEY, token);
};

export const clearAdminToken = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
};

export const clearUserToken = () => {
  localStorage.removeItem(USER_TOKEN_KEY);
};

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
});

http.interceptors.request.use((config) => {
  const url = config.url || '';
  const token = url.startsWith('/admin') ? getAdminToken() : getUserToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthRequest = url.startsWith('/auth/');
    const isUnauthorized = error.response?.data?.error === 'Unauthorized';

    if (error.response?.status === 401 && isUnauthorized && url.startsWith('/admin')) {
      clearAdminToken();
      window.location.href = '/admin/login';
    } else if (error.response?.status === 401 && isUnauthorized && !isAuthRequest) {
      clearUserToken();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);
