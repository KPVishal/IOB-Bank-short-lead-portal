import client from './client.js';

export const usersApi = {
  list: (params = {}) =>
    client.get('/api/users', { params }).then((r) => r.data),

  create: (payload) =>
    client.post('/api/users', payload).then((r) => r.data),

  downloadTemplate: () =>
    client.get('/api/users/template', { responseType: 'blob' }).then((r) => r.data),

  bulkImport: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return client
      .post('/api/users/bulk-import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
