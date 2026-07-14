import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000, // 30s — feedback mais rápido ao usuário
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
  deactivate: (id) => api.delete(`/companies/${id}`).then(r => r.data),
  delete: (id) => api.delete(`/companies/${id}?force=true`).then(r => r.data),
  checkLinks: (id) => api.get(`/companies/${id}/links`).then(r => r.data),
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    const idx = typeof result === 'string' ? result.indexOf(',') : -1;
    resolve(idx >= 0 ? result.slice(idx + 1) : result);
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const companyAttachmentService = {
  list: (companyId) => api.get(`/companies/${companyId}/attachments`).then(r => r.data),
  upload: async (companyId, file) => {
    const data = await fileToBase64(file);
    return api.post(`/companies/${companyId}/attachments`, {
      name: file.name,
      mimeType: file.type,
      size: file.size,
      data,
    }).then(r => r.data);
  },
  download: async (companyId, id, filename) => {
    const res = await api.get(`/companies/${companyId}/attachments/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  remove: (companyId, id) => api.delete(`/companies/${companyId}/attachments/${id}`).then(r => r.data),
};

export const userService = {
  list: (params) => api.get('/users', { params }).then(r => r.data),
  get: (id) => api.get(`/users/${id}`).then(r => r.data),
  create: (data) => api.post('/users', data).then(r => r.data),
  update: (id, data) => api.put(`/users/${id}`, data).then(r => r.data),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data).then(r => r.data),
  remove: (id) => api.delete(`/users/${id}`).then(r => r.data),
  checkLinks: (id) => api.get(`/users/${id}/links`).then(r => r.data),
};

export const categoryService = {
  list: (params) => api.get('/categories', { params }).then(r => r.data),
  create: (data) => api.post('/categories', data).then(r => r.data),
  update: (id, data) => api.put(`/categories/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/categories/${id}`).then(r => r.data),
  checkLinks: (id) => api.get(`/categories/${id}/links`).then(r => r.data),
};

export const ticketService = {
  list: (params) => api.get('/tickets', { params }).then(r => r.data),
  get: (id) => api.get(`/tickets/${id}`).then(r => r.data),
  create: (data) => api.post('/tickets', data).then(r => r.data),
  update: (id, data) => api.put(`/tickets/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/tickets/${id}`).then(r => r.data),
  addComment: (id, data) => api.post(`/tickets/${id}/comments`, data).then(r => r.data),
  updateComment: (id, commentId, data) => api.put(`/tickets/${id}/comments/${commentId}`, data).then(r => r.data),
  deleteComment: (id, commentId) => api.delete(`/tickets/${id}/comments/${commentId}`).then(r => r.data),
  rate: (id, satisfaction) => api.post(`/tickets/${id}/rate`, { satisfaction }).then(r => r.data),
};

export const technicianService = {
  list: (params) => api.get('/technicians', { params }).then(r => r.data),
  get: (id) => api.get(`/technicians/${id}`).then(r => r.data),
  create: (data) => api.post('/technicians', data).then(r => r.data),
  update: (id, data) => api.put(`/technicians/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/technicians/${id}`).then(r => r.data),
};

export const statusService = {
  list: (params) => api.get('/statuses', { params }).then(r => r.data),
  create: (data) => api.post('/statuses', data).then(r => r.data),
  update: (id, data) => api.put(`/statuses/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/statuses/${id}`).then(r => r.data),
};

export const stateService = {
  list: (params) => api.get('/states', { params }).then(r => r.data),
  create: (data) => api.post('/states', data).then(r => r.data),
  update: (id, data) => api.put(`/states/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/states/${id}`).then(r => r.data),
  removeAll: () => api.delete('/states/all').then(r => r.data),
  importFromIbge: (data) => api.post('/states/import-ibge', data).then(r => r.data),
  checkLinks: (id) => api.get(`/states/${id}/links`).then(r => r.data),
};

export const cityService = {
  list: (params) => api.get('/cities', { params }).then(r => r.data),
  get: (id) => api.get(`/cities/${id}`).then(r => r.data),
  create: (data) => api.post('/cities', data).then(r => r.data),
  update: (id, data) => api.put(`/cities/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/cities/${id}`).then(r => r.data),
  removeAll: () => api.delete('/cities/all').then(r => r.data),
  importFromIbge: (data) => api.post('/cities/import-ibge', data).then(r => r.data),
};

export const dashboardService = {
  stats:         ()             => api.get('/dashboard/stats').then(r => r.data),
  kpis:          (period)       => api.get('/dashboard/kpis',            { params: period }).then(r => r.data),
  volume:        (period)       => api.get('/dashboard/volume',          { params: period }).then(r => r.data),
  categories:    (period)       => api.get('/dashboard/categories',      { params: { ...period, limit: 10 } }).then(r => r.data),
  slaByPriority: (period)       => api.get('/dashboard/sla-by-priority', { params: period }).then(r => r.data),
  byStatus:      (period)       => api.get('/dashboard/by-status',       { params: period }).then(r => r.data),
  agents:        (period)       => api.get('/dashboard/agents',          { params: period }).then(r => r.data),
  queue:         ()             => api.get('/dashboard/queue/realtime').then(r => r.data),
};

export const employeeService = {
  list: (params) => api.get('/employees', { params }).then(r => r.data),
  get: (id) => api.get(`/employees/${id}`).then(r => r.data),
  create: (data) => api.post('/employees', data).then(r => r.data),
  update: (id, data) => api.put(`/employees/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/employees/${id}`).then(r => r.data),
  checkLinks: (id) => api.get(`/employees/${id}/links`).then(r => r.data),
  departments: (params) => api.get('/employees/departments', { params }).then(r => r.data),
};

export const crmService = {
  listContacts: (params) => api.get('/crm/contacts', { params }).then(r => r.data),
  createContact: (data) => api.post('/crm/contacts', data).then(r => r.data),
  updateContact: (id, data) => api.put(`/crm/contacts/${id}`, data).then(r => r.data),
  removeContact: (id) => api.delete(`/crm/contacts/${id}`).then(r => r.data),

  listOpportunities: (params) => api.get('/crm/opportunities', { params }).then(r => r.data),
  createOpportunity: (data) => api.post('/crm/opportunities', data).then(r => r.data),
  updateOpportunity: (id, data) => api.put(`/crm/opportunities/${id}`, data).then(r => r.data),
  removeOpportunity: (id) => api.delete(`/crm/opportunities/${id}`).then(r => r.data),

  listActivities: (params) => api.get('/crm/activities', { params }).then(r => r.data),
  createActivity: (data) => api.post('/crm/activities', data).then(r => r.data),
  updateActivity: (id, data) => api.put(`/crm/activities/${id}`, data).then(r => r.data),
  removeActivity: (id) => api.delete(`/crm/activities/${id}`).then(r => r.data),
};

export const reportService = {
  tickets: (params) => api.get('/reports/tickets', { params }).then(r => r.data),
};

export const implantacaoService = {
  list: (params) => api.get('/implantacoes', { params }).then(r => r.data),
  get: (id) => api.get(`/implantacoes/${id}`).then(r => r.data),
  create: (data) => api.post('/implantacoes', data).then(r => r.data),
  update: (id, data) => api.put(`/implantacoes/${id}`, data).then(r => r.data),
  updateFase: (id, faseId, data) => api.put(`/implantacoes/${id}/fases/${faseId}`, data).then(r => r.data),
  remove: (id) => api.delete(`/implantacoes/${id}`).then(r => r.data),
};

export const moduloTreinamentoService = {
  list: (params) => api.get('/modulos-treinamento', { params }).then(r => r.data),
  get: (id) => api.get(`/modulos-treinamento/${id}`).then(r => r.data),
  create: (data) => api.post('/modulos-treinamento', data).then(r => r.data),
  update: (id, data) => api.put(`/modulos-treinamento/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/modulos-treinamento/${id}`).then(r => r.data),
};

export const etapaTreinamentoService = {
  list: (params) => api.get('/etapas-treinamento', { params }).then(r => r.data),
  get: (id) => api.get(`/etapas-treinamento/${id}`).then(r => r.data),
  create: (data) => api.post('/etapas-treinamento', data).then(r => r.data),
  update: (id, data) => api.put(`/etapas-treinamento/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/etapas-treinamento/${id}`).then(r => r.data),
};

export const treinamentoService = {
  list: (params) => api.get('/treinamentos', { params }).then(r => r.data),
  get: (id) => api.get(`/treinamentos/${id}`).then(r => r.data),
  create: (data) => api.post('/treinamentos', data).then(r => r.data),
  update: (id, data) => api.put(`/treinamentos/${id}`, data).then(r => r.data),
  updateParticipante: (id, participanteId, data) => api.put(`/treinamentos/${id}/participantes/${participanteId}`, data).then(r => r.data),
  remove: (id) => api.delete(`/treinamentos/${id}`).then(r => r.data),
};

export const visitaService = {
  list:   (params)   => api.get('/visitas', { params }).then(r => r.data),
  get:    (id)       => api.get(`/visitas/${id}`).then(r => r.data),
  create: (data)     => api.post('/visitas', data).then(r => r.data),
  update: (id, data) => api.put(`/visitas/${id}`, data).then(r => r.data),
  remove: (id)       => api.delete(`/visitas/${id}`).then(r => r.data),
};

export const agendaTecnicaService = {
  stats:    ()           => api.get('/agenda-tecnica/stats').then(r => r.data),
  clearAll: ()           => api.delete('/agenda-tecnica/all').then(r => r.data),
  bulk:     (data)       => api.post('/agenda-tecnica/bulk', data).then(r => r.data),

  listVisitas:    (p)    => api.get('/agenda-tecnica/visitas',     { params: p }).then(r => r.data),
  createVisita:   (d)    => api.post('/agenda-tecnica/visitas',    d).then(r => r.data),
  updateVisita:   (id,d) => api.put(`/agenda-tecnica/visitas/${id}`, d).then(r => r.data),
  removeVisita:   (id)   => api.delete(`/agenda-tecnica/visitas/${id}`).then(r => r.data),

  listPlantoes:   (p)    => api.get('/agenda-tecnica/plantoes',    { params: p }).then(r => r.data),
  createPlantao:  (d)    => api.post('/agenda-tecnica/plantoes',   d).then(r => r.data),
  updatePlantao:  (id,d) => api.put(`/agenda-tecnica/plantoes/${id}`, d).then(r => r.data),
  removePlantao:  (id)   => api.delete(`/agenda-tecnica/plantoes/${id}`).then(r => r.data),

  listFerias:     (p)    => api.get('/agenda-tecnica/ferias',      { params: p }).then(r => r.data),
  createFerias:   (d)    => api.post('/agenda-tecnica/ferias',     d).then(r => r.data),
  updateFerias:   (id,d) => api.put(`/agenda-tecnica/ferias/${id}`, d).then(r => r.data),
  removeFerias:   (id)   => api.delete(`/agenda-tecnica/ferias/${id}`).then(r => r.data),

  listTecnicos:   ()     => api.get('/agenda-tecnica/tecnicos').then(r => r.data),
  createTecnico:  (d)    => api.post('/agenda-tecnica/tecnicos',   d).then(r => r.data),
  updateTecnico:  (id,d) => api.put(`/agenda-tecnica/tecnicos/${id}`, d).then(r => r.data),
  removeTecnico:  (id)   => api.delete(`/agenda-tecnica/tecnicos/${id}`).then(r => r.data),
};

export const knowledgeService = {
  list: (params) => api.get('/knowledge', { params }).then(r => r.data),
  get: (id) => api.get(`/knowledge/${id}`).then(r => r.data),
  create: (data) => api.post('/knowledge', data).then(r => r.data),
  update: (id, data) => api.put(`/knowledge/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/knowledge/${id}`).then(r => r.data),
  query: (data) => api.post('/knowledge/query', data).then(r => r.data),
};

export default api;
