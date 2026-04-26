import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Task, Tag } from '../types';
import toast from 'react-hot-toast';
import { FiClock, FiCheckCircle, FiAlertCircle, FiPlay } from 'react-icons/fi';
import Skeleton from '../components/Skeleton';

const MyTasks = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed' | 'overdue'>('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/my-tasks');
      console.log('📋 My tasks response:', res.data);
      setTasks(res.data);
    } catch (error) {
      console.error('❌ Failed to fetch my tasks:', error);
      toast.error(t('task.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
      toast.success(t('task.statusUpdateSuccess'));
    } catch {
      toast.error(t('task.statusUpdateError'));
    }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('myTasks.title')}</h1>

      <div className="flex flex-wrap gap-2">
        {(['all', 'not_started', 'in_progress', 'completed', 'overdue'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm transition ${
              filter === f
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                : 'bg-gray-200 dark:bg-dark-200 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-300'
            }`}
          >
            {t(`task.${f === 'all' ? 'all' : f}`)}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">{t('myTasks.noTasks')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map(task => (
            <div key={task.id} className="card hover:shadow-md transition-all duration-200 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{task.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                  
                  {/* ✅ عرض الوسوم */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.tags.map((tag: Tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 text-xs rounded-full border border-gray-200 dark:border-gray-600"
                          style={{ backgroundColor: tag.color || '#e2e8f0', color: '#1e293b' }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    <span className={`badge ${
                      task.priority === 'high' ? 'badge-danger' :
                      task.priority === 'medium' ? 'badge-warning' : 'badge-success'
                    }`}>
                      {t(`task.${task.priority}`)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {t('myTasks.project')}: {task.project?.name || '-'}
                    </span>
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <FiClock size={12} /> {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className="p-1.5 text-sm border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-200 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="not_started">{t('task.not_started')}</option>
                    <option value="in_progress">{t('task.in_progress')}</option>
                    <option value="completed">{t('task.completed')}</option>
                    <option value="overdue">{t('task.overdue')}</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTasks;