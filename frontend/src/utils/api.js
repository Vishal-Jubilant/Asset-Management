import axios from 'axios';

const getBaseURL = () => {
    // In the browser, always use relative '/api' so requests route through the Vite proxy (port 4001).
    // This avoids needing to expose backend port 4000 to the public network,
    // and eliminates ERR_CONNECTION_TIMED_OUT, CORS, and SSL certificate mismatch errors.
    if (typeof window !== 'undefined') {
        return '/api';
    }
    return 'https://localhost:4000/api';
};

const api = axios.create({
    baseURL: getBaseURL()
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

export default api;
