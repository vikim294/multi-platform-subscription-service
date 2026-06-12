import { http } from './http.js';

export const userApi = {
  register: async (payload) => {
    const { data } = await http.post('/auth/register', payload);
    return data;
  },
  login: async (payload) => {
    const { data } = await http.post('/auth/login', payload);
    return data;
  },
  me: async () => {
    const { data } = await http.get('/auth/me');
    return data;
  },
  listTargets: async () => {
    const { data } = await http.get('/targets');
    return data;
  },
  subscribe: async (targetId) => {
    const { data } = await http.post(`/subscriptions/${targetId}`);
    return data;
  },
  unsubscribe: async (targetId) => {
    const { data } = await http.delete(`/subscriptions/${targetId}`);
    return data;
  },
  listTargetActivities: async (targetId, params = {}) => {
    const { data } = await http.get(`/targets/${targetId}/activities`, { params });
    return data;
  },
  listUnreadNotifications: async () => {
    const { data } = await http.get('/notifications/unread');
    return data;
  },
  markNotificationRead: async (notificationId) => {
    const { data } = await http.patch(`/notifications/${notificationId}/read`);
    return data;
  },
  markAllNotificationsRead: async () => {
    const { data } = await http.patch('/notifications/read-all');
    return data;
  },
};
