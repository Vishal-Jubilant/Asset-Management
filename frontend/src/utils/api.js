import axios from 'axios';

const getBaseURL = () => {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        return `http://${window.location.hostname}:4000/api`;
    }
    return 'http://localhost:4000/api';
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
