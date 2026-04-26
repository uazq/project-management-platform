import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'حدث خطأ غير متوقع';
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('انتهت الجلسة، يرجى تسجيل الدخول مجدداً');
    } else if (error.response?.status === 403) {
      toast.error('ليس لديك صلاحية للقيام بهذا الإجراء');
    } else if (error.response?.status === 404) {
      toast.error('المورد غير موجود');
    } else {
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

export default api;