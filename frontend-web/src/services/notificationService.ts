import api from './api';

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title?: string;
  message: string;
  entityType?: string;
  entityId?: number;
  projectId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// جلب إشعارات المستخدم الحالي
export const fetchNotifications = async (
  limit = 50,
  offset = 0,
  unreadOnly = false
): Promise<NotificationsResponse> => {
  const res = await api.get(
    `/notifications?limit=${limit}&offset=${offset}&unreadOnly=${unreadOnly}`
  );
  return res.data;
};

// جلب عدد الإشعارات غير المقروءة
export const fetchUnreadCount = async (): Promise<number> => {
  const res = await api.get('/notifications/unread-count');
  return res.data.count;
};

// تحديث إشعار كمقروء
export const markAsRead = async (id: number): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

// تحديث جميع الإشعارات كمقروءة
export const markAllAsRead = async (): Promise<void> => {
  await api.patch('/notifications/read-all');
};

// حذف إشعار
export const deleteNotification = async (id: number): Promise<void> => {
  await api.delete(`/notifications/${id}`);
};