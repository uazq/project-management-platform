import { create } from 'zustand';
import { User } from '../types';
import { login as apiLogin, register as apiRegister } from '../services/auth';
import toast from 'react-hot-toast';

// دوال مساعدة آمنة للتعامل مع localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // تجاهل الخطأ
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // تجاهل الخطأ
    }
  }
};

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { fullName: string; username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // قراءة آمنة من localStorage
  const savedUser = (() => {
    try {
      const data = safeLocalStorage.getItem('user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  const savedToken = safeLocalStorage.getItem('token');

  return {
    user: savedUser,
    token: savedToken,
    isLoading: false,

    login: async (username, password) => {
      set({ isLoading: true });
      try {
        const response = await apiLogin({ username, password });
        safeLocalStorage.setItem('token', response.token);
        safeLocalStorage.setItem('user', JSON.stringify(response.user));
        set({ user: response.user, token: response.token, isLoading: false });
        toast.success('تم تسجيل الدخول بنجاح');
      } catch (error) {
        set({ isLoading: false });
      }
    },

    register: async (data) => {
      set({ isLoading: true });
      try {
        const response = await apiRegister(data);
        safeLocalStorage.setItem('token', response.token);
        safeLocalStorage.setItem('user', JSON.stringify(response.user));
        set({ user: response.user, token: response.token, isLoading: false });
        toast.success('تم إنشاء الحساب بنجاح');
      } catch (error) {
        set({ isLoading: false });
      }
    },

    logout: () => {
  safeLocalStorage.removeItem('token');
  safeLocalStorage.removeItem('user');
  set({ user: null, token: null });
  toast.success('تم تسجيل الخروج');
},
    setUser: (user) => {
      safeLocalStorage.setItem('user', JSON.stringify(user));
      set({ user });
    }
  };
});