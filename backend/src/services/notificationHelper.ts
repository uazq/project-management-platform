import { Server } from 'socket.io';

// إرسال إشعار إلى جميع المستخدمين المتصلين (أو إلى غرف محددة)
export const sendNotification = (io: Server, notification: any) => {
  if (io) {
    io.emit('new_notification', notification);
  }
};