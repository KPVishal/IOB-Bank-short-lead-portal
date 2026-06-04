import client from './client.js';

export const branchesApi = {
  list: (params = {}) =>
    client.get('/api/branches', { params }).then((r) => r.data),

  create: (payload) =>
    client.post('/api/branches', payload).then((r) => r.data),

  get: (id) =>
    client.get(`/api/branches/${id}`).then((r) => r.data),

  downloadTemplate: () =>
    client.get('/api/branches/template', { responseType: 'blob' }).then((r) => r.data),

  bulkImport: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return client
      .post('/api/branches/bulk-import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
