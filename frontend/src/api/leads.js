import client from './client.js';

export const leadsApi = {
  downloadTemplate: () =>
    client.get('/api/leads/template', { responseType: 'blob' }).then((r) => r.data),

  parseBulk: (file, soleId) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('soleId', soleId);
    return client
      .post('/api/leads/parse-bulk', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
