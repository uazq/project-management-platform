import app from './app';
import http from 'http';
import { Server } from 'socket.io';
import './jobs/archiveProjects'; 

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

(global as any).io = io;

io.on('connection', (socket) => {
  console.log('⚡ مستخدم متصل:', socket.id);

  // استقبال معرف المستخدم من العميل (بعد المصادقة)
  socket.on('register-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`Socket ${socket.id} joined user room ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 مستخدم مفصول:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});