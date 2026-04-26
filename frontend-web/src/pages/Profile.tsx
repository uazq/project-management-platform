import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import socket from '../services/socket';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiLock, FiCamera, FiSave, FiHelpCircle, FiAlertCircle } from 'react-icons/fi';

const Profile = () => {
  const { t } = useTranslation();
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ حالة المستخدم النشطة ديناميكياً (تستجيب للتغييرات)
  const isInactive = user?.isActive === false;

  // ✅ دالة لجلب أحدث بيانات المستخدم من الخادم
  const refreshUserData = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data) {
        setUser(res.data);
        console.log('🔄 تم تحديث بيانات المستخدم:', res.data);
      }
    } catch (error) {
      console.error('❌ فشل تحديث بيانات المستخدم:', error);
    }
  };

  // ✅ تحديث النموذج عند تغيير بيانات المستخدم (مثلاً بعد التحديث)
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // ✅ الاستماع لتغييرات الحالة عبر WebSocket
  useEffect(() => {
    const handleUserStatusChanged = (data: { userId: number; isActive: boolean }) => {
      if (user && data.userId === user.id) {
        console.log('📡 استلام تغيير الحالة عبر WebSocket:', data);
        refreshUserData(); // جلب البيانات الجديدة
      }
    };
    socket.on('userStatusChanged', handleUserStatusChanged);
    return () => {
      socket.off('userStatusChanged', handleUserStatusChanged);
    };
  }, [user]);

  // ✅ تحديث تلقائي كل 30 ثانية (للتأكد من مزامنة الحالة)
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) refreshUserData();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // ✅ تحديث عند العودة إلى الصفحة (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) refreshUserData();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInactive) {
      toast.error('لا يمكنك تعديل الملف الشخصي وحسابك غير نشط');
      return;
    }
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', formData);
      setUser(res.data);
      toast.success(t('profile.updateSuccess'));
    } catch (error: any) {
      const message = error.response?.data?.message || t('profile.updateError');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInactive) {
      toast.error('لا يمكنك تغيير كلمة المرور وحسابك غير نشط');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success(t('profile.passwordSuccess'));
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      const message = error.response?.data?.message || t('profile.passwordError');
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isInactive) {
      toast.error('لا يمكنك تغيير الصورة وحسابك غير نشط');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setImageError(false);
    const formData = new FormData();
    formData.append('profilePicture', file);
    try {
      const res = await api.post('/users/profile/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser({ ...user!, profilePicture: res.data.profilePicture });
      toast.success(t('profile.pictureSuccess'));
    } catch {
      toast.error(t('profile.pictureError'));
    } finally {
      setUploading(false);
    }
  };

  const imageUrl = user?.profilePicture 
    ? `http://localhost:5000${user.profilePicture.startsWith('/') ? user.profilePicture : '/' + user.profilePicture}`
    : null;

  // ✅ عرض رسالة للمستخدم غير النشط
  if (isInactive) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card text-center py-12">
          <FiAlertCircle className="mx-auto text-6xl text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">حسابك غير نشط</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">تم تعطيل حسابك من قبل المسؤول. يرجى التواصل مع الإدارة.</p>
          <button onClick={() => logout()} className="btn-primary">
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card text-center">
            <div className="relative mb-4 inline-block">
              {imageUrl && !imageError ? (
                <img
                  src={imageUrl}
                  onError={() => setImageError(true)}
                  className="w-32 h-32 rounded-full object-cover ring-4 ring-primary-500"
                  alt="profile"
                />
              ) : (
                <div className="w-32 h-32 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-4xl font-bold text-white ring-4 ring-primary-500">
                  {user?.fullName?.[0] || 'U'}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-gradient-to-r from-primary-500 to-secondary-500 text-white p-2 rounded-full hover:from-primary-600 hover:to-secondary-600 shadow-lg transition disabled:opacity-50"
                title={t('profile.changePicture')}
              >
                <FiCamera size={18} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <h2 className="text-xl font-semibold">{user?.fullName}</h2>
            <p className="text-sm text-gray-500">@{user?.username}</p>
            <div className="mt-4 w-full bg-gray-50 dark:bg-dark-200 p-4 rounded-xl text-sm">
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">{t('profile.role')}:</span>
                <span className="font-medium text-primary-600 dark:text-primary-400">
                  {user?.role === 'admin' ? t('member.admin') :
                   user?.role === 'project_manager' ? t('member.project_manager') : t('member.team_member')}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">{t('profile.email')}:</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              {/* ✅ قسم الحالة ديناميكي (يتغير مع user.isActive) */}
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">{t('profile.status')}:</span>
                <span className={`flex items-center gap-1 ${user?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {user?.isActive ? '✓' : '✗'} {user?.isActive ? t('profile.active') : t('profile.inactive')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiUser className="text-primary-500" /> {t('profile.accountInfo')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.fullName')}</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="input-field"
                  required
                  disabled={isInactive}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.email')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  required
                  disabled={isInactive}
                />
              </div>
              <button
                type="submit"
                disabled={loading || isInactive}
                className="btn-primary inline-flex items-center gap-2"
              >
                <FiSave /> {loading ? t('common.loading') : t('common.save')}
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiLock className="text-primary-500" /> {t('profile.changePassword')}
            </h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.currentPassword')}</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="input-field"
                  required
                  disabled={isInactive}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.newPassword')}</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="input-field"
                  required
                  disabled={isInactive}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('profile.confirmPassword')}</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="input-field"
                  required
                  disabled={isInactive}
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={passwordLoading || isInactive}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <FiLock /> {passwordLoading ? t('common.loading') : t('profile.changePassword')}
                </button>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                >
                  <FiHelpCircle size={16} />
                  {t('login.forgotPassword')}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;