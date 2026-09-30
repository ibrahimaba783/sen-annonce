import axios from 'axios';

export const API_BASE = 'http://localhost:5000';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `${API_BASE}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;