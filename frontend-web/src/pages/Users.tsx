import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { User } from '../types';
import toast from 'react-hot-toast';
import { FiToggleLeft, FiToggleRight, FiSearch, FiTrash2 } from 'react-icons/fi';
import Skeleton from '../components/Skeleton';

const Users = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch {
      toast.error(t('users.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      const res = await api.patch(`/users/${userId}/toggle-active`);
      const { isActive } = res.data;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive } : u));
      toast.success(t('users.toggleSuccess'));
    } catch {
      toast.error(t('users.toggleError'));
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success(t('users.deleteSuccess'));
    } catch {
      toast.error(t('users.deleteError'));
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await api.put(`/users/${userId}`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      toast.success(t('users.roleSuccess'));
    } catch {
      toast.error(t('users.roleError'));
    }
  };

  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('users.title')}</h1>

      <div className="relative max-w-md">
        <FiSearch className="absolute right-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pr-10"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-100">
            <thead className="bg-gray-50 dark:bg-dark-100">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.user')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.email')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('member.role')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
              {filtered.map(user => {
                // إنشاء رابط الصورة مع التأكد من وجود شرطة مائلة
                const imageUrl = user.profilePicture 
                  ? `http://localhost:5000${user.profilePicture.startsWith('/') ? user.profilePicture : '/' + user.profilePicture}`
                  : null;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-dark-100 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            onError={(e) => {
                              console.error('Failed to load image:', imageUrl);
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                const fallback = document.createElement('div');
                                fallback.className = 'w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-sm';
                                fallback.textContent = user.fullName[0];
                                parent.prepend(fallback);
                              }
                            }}
                            className="w-8 h-8 rounded-full object-cover"
                            alt={user.fullName}
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-sm">
                            {user.fullName[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-xs text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="p-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm"
                      >
                        <option value="team_member">{t('member.team_member')}</option>
                        <option value="project_manager">{t('member.project_manager')}</option>
                        <option value="admin">{t('member.admin')}</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(user.id)}
                          className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition"
                          title={user.isActive ? t('common.deactivate') : t('common.activate')}
                        >
                          {user.isActive ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition">
                          <FiTrash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-4">{t('users.noUsers')}</p>
        )}
      </div>
    </div>
  );
};

export default Users;