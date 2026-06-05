import client from './client.js';

export const authApi = {
  login: (email, password) =>
    client.post('/api/auth/login', { email, password }).then((r) => r.data),
  changePassword: (changeToken, newPassword, confirmPassword) =>
    client.post('/api/auth/change-password', { changeToken, newPassword, confirmPassword }).then((r) => r.data),
  me: () => client.get('/api/auth/me').then((r) => r.data),
};
