import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';

    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  changePassword: (data) => api.put('/auth/change-password', data).then(r => r.data),
};

export const companyService = {
  list: (params) => api.get('/companies', { params }).then(r => r.data),
  get: (id) => api.get(`/companies/${id}`).then(r => r.data),
  create: (data) => api.post('/companies', data).then(r => r.data),
  update: (id, data) => api.put(`/companies/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/companies/${id}`).then(r => r.data),
};

export const userService = {
  list: (params) => api.get('/users', { params }).then(r => r.data),
  get: (id) => api.get(`/users/${id}`).then(r => r.data),
  create: (data) => api.post('/users', data).then(r => r.data),
  update: (id, data) => api.put(`/users/${id}`, data).then(r => r.data),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data).then(r => r.data),
  remove: (id) => api.delete(`/users/${id}`).then(r => r.data),
};

export const categoryService = {
  list: (params) => api.get('/categories', { params }).then(r => r.data),
  create: (data) => api.post('/categories', data).then(r => r.data),
  update: (id, data) => api.put(`/categories/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/categories/${id}`).then(r => r.data),
};

export const ticketService = {
  list: (params) => api.get('/tickets', { params }).then(r => r.data),
  get: (id) => api.get(`/tickets/${id}`).then(r => r.data),
  create: (data) => api.post('/tickets', data).then(r => r.data),
  update: (id, data) => api.put(`/tickets/${id}`, data).then(r => r.data),
  addComment: (id, data) => api.post(`/tickets/${id}/comments`, data).then(r => r.data),
};

export const dashboardService = {
  stats: () => api.get('/dashboard/stats').then(r => r.data),
};

export const employeeService = {
  list: (params) => api.get('/employees', { params }).then(r => r.data),
  get: (id) => api.get(`/employees/${id}`).then(r => r.data),
  create: (data) => api.post('/employees', data).then(r => r.data),
  update: (id, data) => api.put(`/employees/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/employees/${id}`).then(r => r.data),
  departments: (params) => api.get('/employees/departments', { params }).then(r => r.data),
};

export default api;
