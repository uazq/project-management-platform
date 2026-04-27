import { create } from 'zustand';
import { Notification, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '../services/notificationService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  loadNotifications: (reset?: boolean) => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  addRealtimeNotification: (notification: Notification) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  hasMore: true,

  loadNotifications: async (reset = false) => {
    const { notifications, loading, hasMore } = get();
    if (loading) return;
    if (reset) {
      set({ notifications: [], hasMore: true });
    }
    // ✅ استخدام hasMore بدلاً من _hasMore
    if (!get().hasMore && !reset) return;

    set({ loading: true });
    try {
      const offset = reset ? 0 : notifications.length;
      const res = await fetchNotifications(20, offset, false);
      const newList = res.data;
      
      if (reset) {
        set({ notifications: newList, hasMore: newList.length === 20, loading: false });
      } else {
        const existingIds = new Set(notifications.map(n => n.id));
        const uniqueNew = newList.filter(n => !existingIds.has(n.id));
        set((state) => ({
          notifications: [...state.notifications, ...uniqueNew],
          hasMore: newList.length === 20,
          loading: false,
        }));
      }
    } catch (error) {
      console.error('Failed to load notifications', error);
      set({ loading: false });
    }
  },

  loadUnreadCount: async () => {
    try {
      const count = await fetchUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to load unread count', error);
    }
  },

  markAsRead: async (id: number) => {
    try {
      await markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  },

  deleteNotification: async (id: number) => {
    try {
      await deleteNotification(id);
      set((state) => {
        const updated = state.notifications.filter((n) => n.id !== id);
        const newUnreadCount = updated.filter((n) => !n.isRead).length;
        return {
          notifications: updated,
          unreadCount: newUnreadCount,
        };
      });
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  },

  addRealtimeNotification: (notification: Notification) => {
    set((state) => {
      const exists = state.notifications.some(n => n.id === notification.id);
      if (exists) return state;
      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  reset: () => {
    set({ notifications: [], unreadCount: 0, loading: false, hasMore: true });
  },
}));