import client from './client.js';

export const referenceApi = {
  states: () => client.get('/api/reference/states').then((r) => r.data),
  cities: (params = {}) =>
    client.get('/api/reference/cities', { params }).then((r) => r.data),
};
