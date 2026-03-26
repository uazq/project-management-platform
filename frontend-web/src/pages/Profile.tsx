import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiLock, FiCamera, FiSave, FiHelpCircle } from 'react-icons/fi';

const Profile = () => {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', formData);
      setUser(res.data);
      toast.success(t('profile.updateSuccess'));
    } catch {
      toast.error(t('profile.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('profile.passwordMismatch'));
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
    } catch {
      toast.error(t('profile.passwordError'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // إنشاء رابط الصورة مع التأكد من وجود شرطة مائلة
  const imageUrl = user?.profilePicture 
    ? `http://localhost:5000${user.profilePicture.startsWith('/') ? user.profilePicture : '/' + user.profilePicture}`
    : null;

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
                  onError={() => {
                    console.error('Failed to load profile image:', imageUrl);
                    setImageError(true);
                  }}
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
            <div className="mt-4 w-full bg-gray-50 dark:bg-dark-100 p-4 rounded-xl text-sm">
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
                />
              </div>
              <button
                type="submit"
                disabled={loading}
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
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={passwordLoading}
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