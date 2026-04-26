import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '../store/notificationStore';
import { Notification } from '../services/notificationService';
import { FiBell, FiCheckCircle, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import Skeleton from '../components/Skeleton';

const Notifications = () => {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // تحميل الإشعارات عند تغيير الفلتر أو أول مرة
  useEffect(() => {
    loadNotifications(true);
    loadUnreadCount();
  }, [filter, loadNotifications, loadUnreadCount]);

  // تحميل المزيد عند التمرير
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadNotifications();
    }
  };

  const handleMarkRead = async (id: number) => {
    await markAsRead(id);
    if (filter === 'unread') {
      // إذا كنا في وضع "غير مقروءة فقط"، نعيد تحميل القائمة
      loadNotifications(true);
    }
    loadUnreadCount();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    if (filter === 'unread') {
      loadNotifications(true);
    }
    loadUnreadCount();
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('common.confirmDelete'))) {
      await deleteNotification(id);
      loadUnreadCount();
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('task')) return '📌';
    if (type.includes('comment')) return '💬';
    if (type.includes('file')) return '📎';
    if (type.includes('member')) return '👤';
    if (type.includes('project')) return '📁';
    return '🔔';
  };

  // تصفية الإشعارات حسب الاختيار (لأن الـ API يعيد الكل، نقوم بالتصفية المحلية)
  const displayedNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  if (loading && notifications.length === 0) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('notification.title')}
          {unreadCount > 0 && (
            <span className="mr-2 text-sm bg-red-500 text-white px-2 py-0.5 rounded-full">
              {unreadCount} {t('notification.unread')}
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 dark:bg-dark-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-sm transition ${filter === 'all' ? 'bg-white dark:bg-dark-200 shadow' : ''}`}
            >
              {t('common.all')}
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-md text-sm transition ${filter === 'unread' ? 'bg-white dark:bg-dark-200 shadow' : ''}`}
            >
              {t('notification.unread')}
            </button>
          </div>
          <button
            onClick={handleMarkAllRead}
            className="btn-primary inline-flex items-center gap-1 text-sm"
            disabled={unreadCount === 0}
          >
            <FiCheckCircle size={16} /> {t('notification.markAllRead')}
          </button>
        </div>
      </div>

      <div className="card">
        {displayedNotifications.length === 0 ? (
          <div className="text-center py-12">
            <FiBell className="mx-auto text-4xl text-gray-400 mb-2" />
            <p className="text-gray-500">{t('notification.noNotifications')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition ${
                  notif.isRead
                    ? 'bg-white dark:bg-dark-200 border-gray-200 dark:border-dark-100'
                    : 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      if (!notif.isRead) handleMarkRead(notif.id);
                      if (notif.projectId) window.location.href = `/projects/${notif.projectId}`;
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getTypeIcon(notif.type)}</span>
                      <p className={`text-sm ${!notif.isRead && 'font-semibold text-gray-900 dark:text-white'}`}>
                        {notif.message}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="p-1 text-blue-500 hover:bg-blue-100 rounded"
                        title={t('notification.markRead')}
                      >
                        <FiCheckCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded"
                      title={t('common.delete')}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="text-primary-600 hover:underline text-sm flex items-center gap-1 mx-auto"
                >
                  {loading ? t('common.loading') : t('common.loadMore')}
                  {!loading && <FiRefreshCw size={14} />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;