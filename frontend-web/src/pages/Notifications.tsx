import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import socket from '../services/socket';
import { FiBell, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import Skeleton from '../components/Skeleton';

interface Notification {
  id: string;
  type: string;
  message: string;
  projectId?: number;
  timestamp: Date;
  read: boolean;
}

const Notifications = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // تحميل من localStorage
    const saved = localStorage.getItem('notifications');
    if (saved) setNotifications(JSON.parse(saved));
    setLoading(false);

    // الاستماع للإشعارات الجديدة
    const handleNew = (data: any, type: string, defaultMsg: string) => {
      const notif: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        message: data.message || defaultMsg,
        projectId: data.projectId,
        timestamp: new Date(),
        read: false,
      };
      setNotifications(prev => {
        const updated = [notif, ...prev].slice(0, 50);
        localStorage.setItem('notifications', JSON.stringify(updated));
        return updated;
      });
    };

    socket.on('taskCreated', (d: any) => handleNew(d, 'taskCreated', '📌 ' + t('notification.taskCreated')));
    socket.on('taskUpdated', (d: any) => handleNew(d, 'taskUpdated', '✏️ ' + t('notification.taskUpdated')));
    socket.on('taskStatusChanged', (d: any) => handleNew(d, 'taskStatusChanged', `✅ ${t('notification.taskStatusChanged')} ${d.title || ''}`));
    socket.on('taskDeleted', (d: any) => handleNew(d, 'taskDeleted', '🗑️ ' + t('notification.taskDeleted')));
    socket.on('commentAdded', (d: any) => handleNew(d, 'commentAdded', '💬 ' + t('notification.commentAdded')));
    socket.on('memberAdded', (d: any) => handleNew(d, 'memberAdded', '👤 ' + t('notification.memberAdded')));
    socket.on('fileUploaded', (d: any) => handleNew(d, 'fileUploaded', '📎 ' + t('notification.fileUploaded')));

    return () => {
      socket.off('taskCreated');
      socket.off('taskUpdated');
      socket.off('taskStatusChanged');
      socket.off('taskDeleted');
      socket.off('commentAdded');
      socket.off('memberAdded');
      socket.off('fileUploaded');
    };
  }, [t]);

  const markAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAll = () => {
    if (confirm(t('common.confirmDelete'))) {
      setNotifications([]);
      localStorage.removeItem('notifications');
    }
  };

  const markRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('notification.title')}</h1>
        <div className="flex gap-2">
          <button onClick={markAllRead} className="btn-primary inline-flex items-center gap-1 text-sm">
            <FiCheckCircle size={16} /> {t('notification.markAllRead')}
          </button>
          <button onClick={clearAll} className="btn-secondary inline-flex items-center gap-1 text-sm">
            <FiXCircle size={16} /> {t('common.clear')}
          </button>
        </div>
      </div>

      <div className="card">
        {notifications.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('notification.noNotifications')}</p>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition ${
                  notif.read
                    ? 'bg-white dark:bg-dark-200 border-gray-200 dark:border-dark-100'
                    : 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                }`}
                onClick={() => {
                  markRead(notif.id);
                  if (notif.projectId) window.location.href = `/projects/${notif.projectId}`;
                }}
              >
                <p className={`text-sm ${!notif.read && 'font-semibold text-gray-900 dark:text-white'}`}>
                  {notif.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notif.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;