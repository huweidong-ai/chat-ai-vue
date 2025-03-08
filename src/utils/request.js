import axios from 'axios';
// import API_CONFIG from '@/config/api';

const request = axios.create({
  baseURL: '/',  // 使用配置的域名
  timeout: 10000,
  headers: {'Content-Type': 'application/json'}
});

request.interceptors.request.use(
  config => {
    const token = document.cookie.replace(/(?:(?:^|.*;\s*)authToken\s*=\s*([^;]*).*$)|^.*$/, "$1");
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

request.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error)
);

export default request;