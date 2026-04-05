import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Task } from '../types';
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
      // جلب المهام المسندة للمستخدم الحالي
      const res = await api.get('/tasks?assigneeId=' + user?.id);
      setTasks(res.data);
    } catch {
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

      {/* أزرار التصفية */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'not_started', 'in_progress', 'completed', 'overdue'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm transition ${
              filter === f
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
            }`}
          >
            {t(`task.${f === 'all' ? 'all' : f}`)}
          </button>
        ))}
      </div>

      {/* قائمة المهام */}
      {filteredTasks.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500">{t('myTasks.noTasks')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map(task => (
            <div key={task.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg">{task.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    <span className={`badge ${
                      task.priority === 'high' ? 'badge-danger' :
                      task.priority === 'medium' ? 'badge-warning' : 'badge-success'
                    }`}>
                      {t(`task.${task.priority}`)}
                    </span>
                    <span>{t('task.project')}: {task.project?.name || '-'}</span>
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <FiClock size={12} /> {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className="p-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
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