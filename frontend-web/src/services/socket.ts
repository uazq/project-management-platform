import { io } from 'socket.io-client';

// الحصول على عنوان الخادم من متغير البيئة أو استخدام localhost
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// إنشاء اتصال WebSocket مع خيارات إعادة الاتصال
const socket = io(SOCKET_URL, {
  reconnection: true,                // تفعيل إعادة الاتصال
  reconnectionAttempts: 5,           // عدد المحاولات
  reconnectionDelay: 1000,            // تأخير البداية (ms)
  reconnectionDelayMax: 5000,         // أقصى تأخير (ms)
  timeout: 20000,                      // مهلة الاتصال
  autoConnect: true,                   // الاتصال تلقائياً
  transports: ['websocket', 'polling'] // وسائل النقل
});

// مراقبة حالة الاتصال (اختياري للتصحيح)
socket.on('connect', () => {
  console.log('✅ WebSocket متصل');
});

socket.on('disconnect', (reason) => {
  console.log('❌ WebSocket مفصول:', reason);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('🔄 تمت إعادة الاتصال بعد', attemptNumber, 'محاولات');
});

socket.on('reconnect_error', (error) => {
  console.error('⚠️ خطأ في إعادة الاتصال:', error);
});

socket.on('error', (error) => {
  console.error('❌ خطأ WebSocket:', error);
});

// دالة لتسجيل المستخدم في غرفته الخاصة
export const registerUser = (userId: number) => {
  if (socket && userId) {
    socket.emit('register-user', userId);
    console.log(`📡 تم تسجيل المستخدم ${userId} في WebSocket`);
  }
};

export default socket;