import { http } from './http.js';

export const adminApi = {
  health: async () => {
    const { data } = await http.get('/health');
    return data;
  },
  listPlatformTokens: async () => {
    const { data } = await http.get('/admin/platform-tokens');
    return data;
  },
  savePlatformToken: async (platform, payload) => {
    const { data } = await http.put(`/admin/platform-tokens/${platform}`, payload);
    return data;
  },
  listTargets: async (params = {}) => {
    const { data } = await http.get('/admin/targets', { params });
    return data;
  },
  createTarget: async (payload) => {
    const { data } = await http.post('/admin/targets', payload);
    return data;
  },
  deleteTarget: async (id) => {
    const { data } = await http.delete(`/admin/targets/${id}`);
    return data;
  },
  fetchTarget: async (id) => {
    const { data } = await http.post(`/admin/fetch/targets/${id}`);
    return data;
  },
  fetchAll: async () => {
    const { data } = await http.post('/admin/fetch/all');
    return data;
  },
  listFetchLogs: async (params = {}) => {
    const { data } = await http.get('/admin/fetch-logs', { params });
    return data;
  },
  listActivities: async (params = {}) => {
    const { data } = await http.get('/admin/activities', { params });
    return data;
  },
};
