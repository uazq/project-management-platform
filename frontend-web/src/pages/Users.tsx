import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { User } from '../types';
import toast from 'react-hot-toast';
import { 
  FiToggleLeft, FiToggleRight, FiSearch, FiTrash2, 
  FiMail, FiCalendar, FiDownload, FiFilter,
  FiChevronUp, FiChevronDown, FiUsers, FiUserCheck,
  FiUserX, FiShield
} from 'react-icons/fi';
import Skeleton from '../components/Skeleton';

const Users = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

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

  const exportToCSV = () => {
    const headers = ['Name', 'Username', 'Email', 'Role', 'Status', 'Joined'];
    const rows = filtered.map(u => [
      u.fullName,
      u.username,
      u.email,
      u.role,
      u.isActive ? 'Active' : 'Inactive',
      new Date(u.createdAt).toLocaleDateString()
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('users.exportSuccess'));
  };

  const filtered = useMemo(() => {
    let result = users.filter(u => {
      const matchesSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'inactive' && !u.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });

    result.sort((a, b) => {
      let aVal = '', bVal = '';
      if (sortBy === 'name') { aVal = a.fullName; bVal = b.fullName; }
      else if (sortBy === 'email') { aVal = a.email; bVal = b.email; }
      else { aVal = new Date(a.createdAt).getTime().toString(); bVal = new Date(b.createdAt).getTime().toString(); }
      if (sortOrder === 'asc') return aVal.localeCompare(bVal);
      else return bVal.localeCompare(aVal);
    });
    return result;
  }, [users, search, roleFilter, statusFilter, sortBy, sortOrder]);

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    admins: users.filter(u => u.role === 'admin').length,
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

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('users.title')}</h1>
        <button
          onClick={exportToCSV}
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          <FiDownload size={16} /> {t('users.export')}
        </button>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3 p-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <FiUsers className="text-blue-600 dark:text-blue-400 text-xl" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('users.totalUsers')}</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
            <FiUserCheck className="text-green-600 dark:text-green-400 text-xl" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('users.activeUsers')}</p>
            <p className="text-2xl font-bold">{stats.active}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <FiUserX className="text-red-600 dark:text-red-400 text-xl" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('users.inactiveUsers')}</p>
            <p className="text-2xl font-bold">{stats.inactive}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            <FiShield className="text-purple-600 dark:text-purple-400 text-xl" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('users.admins')}</p>
            <p className="text-2xl font-bold">{stats.admins}</p>
          </div>
        </div>
      </div>

      {/* شريط البحث والفلترة */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute right-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pr-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-200 dark:border-dark-100 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-100 transition flex items-center gap-2"
          >
            <FiFilter /> {t('common.filter')}
            {showFilters ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t">
            <div>
              <label className="block text-sm font-medium mb-1">{t('member.role')}</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input-field w-full"
              >
                <option value="all">{t('common.all')}</option>
                <option value="admin">{t('member.admin')}</option>
                <option value="project_manager">{t('member.project_manager')}</option>
                <option value="team_member">{t('member.team_member')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('common.status')}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field w-full"
              >
                <option value="all">{t('common.all')}</option>
                <option value="active">{t('common.active')}</option>
                <option value="inactive">{t('common.inactive')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('users.sortBy')}</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="input-field flex-1"
                >
                  <option value="name">{t('users.sortName')}</option>
                  <option value="email">{t('users.sortEmail')}</option>
                  <option value="date">{t('users.sortDate')}</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* عرض الجدول للشاشات الكبيرة */}
      <div className="hidden lg:block card overflow-hidden">
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
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200"
                            alt={user.fullName}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.fullName[0]}
                          </div>
                        )}
                        <div>
                          <Link to={`/users/${user.id}/details`} className="font-medium text-primary-600 hover:underline">
                            {user.fullName}
                          </Link>
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
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title={user.isActive ? t('common.deactivate') : t('common.activate')}
                        >
                          {user.isActive ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title={t('common.delete')}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {t('users.noUsers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* عرض البطاقات للشاشات المتوسطة والصغيرة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
        {filtered.map(user => {
          const imageUrl = user.profilePicture 
            ? `http://localhost:5000${user.profilePicture.startsWith('/') ? user.profilePicture : '/' + user.profilePicture}`
            : null;
          return (
            <div key={user.id} className="card p-4 space-y-3 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                    className="w-12 h-12 rounded-full object-cover"
                    alt={user.fullName}
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {user.fullName[0]}
                  </div>
                )}
                <div>
                  <Link to={`/users/${user.id}/details`} className="font-semibold text-primary-600 hover:underline">
                    {user.fullName}
                  </Link>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                <span className="flex items-center gap-1"><FiMail size={14} /> {user.email}</span>
                <span className="flex items-center gap-1"><FiCalendar size={14} /> {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  className="p-1 border border-gray-300 rounded text-sm"
                >
                  <option value="team_member">{t('member.team_member')}</option>
                  <option value="project_manager">{t('member.project_manager')}</option>
                  <option value="admin">{t('member.admin')}</option>
                </select>
                <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {user.isActive ? t('common.active') : t('common.inactive')}
                </span>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  onClick={() => handleToggleActive(user.id)}
                  className="text-blue-600 hover:text-blue-800"
                  title={user.isActive ? t('common.deactivate') : t('common.activate')}
                >
                  {user.isActive ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="text-red-600 hover:text-red-800"
                  title={t('common.delete')}
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">{t('users.noUsers')}</div>
        )}
      </div>
    </div>
  );
};

export default Users;