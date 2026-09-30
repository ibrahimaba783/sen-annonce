import { API_BASE } from './axios';

export const imageUrl = (path) => {
  if (!path) return 'https://via.placeholder.com/200';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
};