# Project Management Platform

## المتطلبات
- Node.js (v20+)
- PostgreSQL (v14+)

## التثبيت والتشغيل محلياً

### Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev