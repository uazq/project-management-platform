import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { FiClock, FiFolder, FiCheckCircle, FiMessageSquare, FiPaperclip, FiUsers } from 'react-icons/fi';
import Skeleton from '../components/Skeleton';

interface Activity {
  id: number;
  action: string;
  entityType: string;
  details: any;
  createdAt: string;
  user: { fullName: string; profilePicture?: string };
  projectId?: number;
}

const ActivityLog = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'projects' | 'tasks' | 'comments' | 'files'>('all');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activities');
      setActivities(res.data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (action: string) => {
    if (action.includes('PROJECT')) return <FiFolder className="text-primary-500" />;
    if (action.includes('TASK')) return <FiCheckCircle className="text-secondary-500" />;
    if (action.includes('COMMENT')) return <FiMessageSquare className="text-accent-500" />;
    if (action.includes('FILE')) return <FiPaperclip className="text-yellow-500" />;
    if (action.includes('MEMBER')) return <FiUsers className="text-indigo-500" />;
    return <FiClock className="text-gray-500" />;
  };

  const getActionText = (act: Activity) => {
    switch (act.action) {
      case 'CREATE_PROJECT': return t('activity.createdProject', { name: act.details?.name });
      case 'CREATE_TASK': return t('activity.createdTask', { title: act.details?.title });
      case 'UPDATE_TASK_STATUS': return t('activity.updatedTaskStatus', { title: act.details?.title, status: act.details?.newStatus });
      case 'ADD_COMMENT': return t('activity.addedComment', { content: act.details?.content });
      case 'UPLOAD_FILE': return t('activity.uploadedFile', { name: act.details?.fileName });
      case 'ADD_MEMBER': return t('activity.addedMember');
      case 'REMOVE_MEMBER': return t('activity.removedMember');
      default: return act.action;
    }
  };

  const filtered = activities.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'projects') return a.entityType === 'Project';
    if (filter === 'tasks') return a.entityType === 'Task';
    if (filter === 'comments') return a.entityType === 'Comment';
    if (filter === 'files') return a.entityType === 'File';
    return true;
  });

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('activity.title')}</h1>

      <div className="flex flex-wrap gap-2">
        {(['all', 'projects', 'tasks', 'comments', 'files'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm transition ${
              filter === f
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {t(`activity.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('activity.noActivities')}</p>
        ) : (
          <div className="space-y-4">
            {filtered.map(act => (
              <div key={act.id} className="flex gap-4 border-b border-gray-100 dark:border-dark-100 pb-4 last:border-0">
                <div className="mt-1 text-2xl">{getIcon(act.action)}</div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{act.user?.fullName}</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">{getActionText(act)}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(act.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;