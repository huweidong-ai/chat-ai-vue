import axios from 'axios';
import { getToken, handleUnauthorized } from '@/services/authService';

const request = axios.create({
  baseURL: '/',
  timeout: 10000,
  headers: {'Content-Type': 'application/json'}
});

// 请求拦截器：添加token
request.interceptors.request.use(
  config => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 响应拦截器：处理响应和错误
request.interceptors.response.use(
  response => {
    const { data } = response;
    // 判断业务状态码
    if (data.code === 200 || data.success) {
      return data;
    } else {
      return Promise.reject(new Error(data.message || '请求失败'));
    }
  },
  error => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          handleUnauthorized();
          break;
        case 403:
          return Promise.reject(new Error('没有权限访问'));
        case 404:
          return Promise.reject(new Error('请求的资源不存在'));
        case 500:
          return Promise.reject(new Error('服务器内部错误'));
        default:
          return Promise.reject(new Error('网络错误'));
      }
    }
    return Promise.reject(error);
  }
);

export default request;