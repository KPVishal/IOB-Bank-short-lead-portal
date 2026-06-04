import axios from 'axios';

const client = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token) {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const onLogin = window.location.pathname.startsWith('/login');
      if (!onLogin && localStorage.getItem('iob.token')) {
        localStorage.removeItem('iob.token');
        setAuthToken(null);
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  }
);

export default client;
