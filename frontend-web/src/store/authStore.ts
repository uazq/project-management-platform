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
        
        // ✅ التأكد من وجود isActive في كائن المستخدم
        let userData = response.user;
        if (userData && userData.isActive === undefined) {
          console.warn('⚠️ isActive مفقود من استجابة الخادم، سيتم تعيينه افتراضياً إلى true');
          userData = { ...userData, isActive: true };
        }
        
        console.log('✅ مستخدم مسجل دخوله:', userData);
        
        safeLocalStorage.setItem('token', response.token);
        safeLocalStorage.setItem('user', JSON.stringify(userData));
        set({ user: userData, token: response.token, isLoading: false });
        toast.success('تم تسجيل الدخول بنجاح');
      } catch (error) {
        console.error('❌ فشل تسجيل الدخول:', error);
        set({ isLoading: false });
      }
    },

    register: async (data) => {
      set({ isLoading: true });
      try {
        const response = await apiRegister(data);
        
        let userData = response.user;
        if (userData && userData.isActive === undefined) {
          userData = { ...userData, isActive: true };
        }
        
        safeLocalStorage.setItem('token', response.token);
        safeLocalStorage.setItem('user', JSON.stringify(userData));
        set({ user: userData, token: response.token, isLoading: false });
        toast.success('تم إنشاء الحساب بنجاح');
      } catch (error) {
        console.error('❌ فشل التسجيل:', error);
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
      // التأكد من وجود isActive عند تحديث المستخدم
      let updatedUser = user;
      if (updatedUser && updatedUser.isActive === undefined) {
        updatedUser = { ...updatedUser, isActive: true };
      }
      safeLocalStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  };
});