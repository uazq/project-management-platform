import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiXCircle, FiUser, FiFolder } from 'react-icons/fi';
import Skeleton from '../components/Skeleton';

interface PendingProject {
  id: number;
  name: string;
  description: string;
  creator: { fullName: string; username: string };
  createdAt: string;
}

interface PendingUser {
  id: number;
  fullName: string;
  username: string;
  email: string;
  createdAt: string;
}

const AdminApprovals = () => {
  const { t } = useTranslation();
  const [pendingProjects, setPendingProjects] = useState<PendingProject[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    fetchPendingProjects();
    fetchPendingUsers();
  }, []);

  const fetchPendingProjects = async () => {
    try {
      const res = await api.get('/projects/pending');
      setPendingProjects(res.data);
    } catch {
      toast.error(t('admin.fetchError'));
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await api.get('/users/pending');
      setPendingUsers(res.data);
    } catch {
      toast.error(t('admin.fetchError'));
    } finally {
      setLoadingUsers(false);
    }
  };

  const approveProject = async (id: number) => {
    try {
      await api.post(`/projects/${id}/approve`);
      toast.success(t('admin.projectApproved'));
      setPendingProjects(pendingProjects.filter(p => p.id !== id));
    } catch {
      toast.error(t('admin.approveError'));
    }
  };

  const approveUser = async (id: number) => {
    try {
      await api.post(`/users/${id}/approve`);
      toast.success(t('admin.userApproved'));
      setPendingUsers(pendingUsers.filter(u => u.id !== id));
    } catch {
      toast.error(t('admin.approveError'));
    }
  };

  if (loadingProjects && loadingUsers) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.approvals')}</h1>

      {/* المشاريع المعلقة */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiFolder className="text-primary-500" /> {t('admin.pendingProjects')}
        </h2>
        {loadingProjects ? (
          <Skeleton className="h-32 w-full" />
        ) : pendingProjects.length === 0 ? (
          <p className="text-gray-500">{t('admin.noPendingProjects')}</p>
        ) : (
          <div className="space-y-4">
            {pendingProjects.map(project => (
              <div key={project.id} className="border-b pb-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-gray-500">{project.description}</p>
                  <p className="text-xs text-gray-400">
                    {t('admin.createdBy')}: {project.creator.fullName} (@{project.creator.username})
                  </p>
                </div>
                <button
                  onClick={() => approveProject(project.id)}
                  className="btn-primary inline-flex items-center gap-1 text-sm"
                >
                  <FiCheckCircle size={16} /> {t('admin.approve')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* المستخدمون المعلقون */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiUser className="text-primary-500" /> {t('admin.pendingUsers')}
        </h2>
        {loadingUsers ? (
          <Skeleton className="h-32 w-full" />
        ) : pendingUsers.length === 0 ? (
          <p className="text-gray-500">{t('admin.noPendingUsers')}</p>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map(user => (
              <div key={user.id} className="border-b pb-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                <button
                  onClick={() => approveUser(user.id)}
                  className="btn-primary inline-flex items-center gap-1 text-sm"
                >
                  <FiCheckCircle size={16} /> {t('admin.approve')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApprovals;