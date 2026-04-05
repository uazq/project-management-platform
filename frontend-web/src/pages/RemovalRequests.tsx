import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiXCircle, FiUser, FiFolder } from 'react-icons/fi';
import Skeleton from '../components/Skeleton';

interface RemovalRequest {
  id: number;
  projectId: number;
  project: { id: number; name: string };
  userId: number;
  user: { fullName: string; username: string; email: string };
  requestedBy: number;
  requester: { fullName: string; username: string };
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const RemovalRequests = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<RemovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const res = await api.get(`/projects/removal-requests?status=${filter}`);
      setRequests(res.data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(t('removal.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.patch(`/projects/removal-requests/${id}`, { action });
      toast.success(action === 'approve' ? t('removal.approvedSuccess') : t('removal.rejectedSuccess'));
      fetchRequests();
    } catch (error) {
      console.error('Action error:', error);
      toast.error(t('removal.actionError'));
    }
  };

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('removal.title')}</h1>

      <div className="flex flex-wrap gap-2">
        {['pending', 'approved', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              filter === status
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
            }`}
          >
            {t(`removal.${status}`)}
          </button>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500">{t('removal.noRequests')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="card p-4 hover:shadow-md transition">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FiFolder className="text-primary-500" />
                    <span className="font-semibold">{req.project.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <FiUser className="text-gray-500" />
                    <span><span className="font-medium">{req.user.fullName}</span> (@{req.user.username})</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 dark:bg-dark-100 p-2 rounded">
                    <span className="font-medium">{t('removal.reason')}:</span> {req.reason}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('removal.requestedBy')}: {req.requester.fullName} (@{req.requester.username}) • {new Date(req.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {req.status === 'pending' && (
                    <>
                      <button onClick={() => handleAction(req.id, 'approve')} className="btn-primary inline-flex items-center gap-1 text-sm">
                        <FiCheckCircle size={16} /> {t('removal.approve')}
                      </button>
                      <button onClick={() => handleAction(req.id, 'reject')} className="btn-secondary inline-flex items-center gap-1 text-sm">
                        <FiXCircle size={16} /> {t('removal.reject')}
                      </button>
                    </>
                  )}
                  {req.status === 'approved' && <span className="badge badge-success">{t('removal.approved')}</span>}
                  {req.status === 'rejected' && <span className="badge badge-danger">{t('removal.rejected')}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RemovalRequests;