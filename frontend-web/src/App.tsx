import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './store/authStore';
import socket from './services/socket';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import toast from 'react-hot-toast';
import TagsManagement from './pages/TagsManagement';
import Status from './pages/Status';
import PublicProject from './pages/PublicProject';

// تحميل الصفحات بشكل كسول
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectForm = lazy(() => import('./pages/ProjectForm'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const Profile = lazy(() => import('./pages/Profile'));
const Users = lazy(() => import('./pages/Users'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const Notifications = lazy(() => import('./pages/Notifications'));

// مكون عرض أثناء التحميل
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

function App() {
  const { token, user, logout } = useAuthStore();
  const { t } = useTranslation();

  // الاستماع لحدث تعطيل المستخدم من WebSocket
  useEffect(() => {
    const handleUserDeactivated = (data: { message: string }) => {
      console.log('Received userDeactivated event:', data);
      toast.error(data.message || t('auth.accountDeactivated'));
      logout(); // تسجيل الخروج فوراً
    };

    socket.on('userDeactivated', handleUserDeactivated);

    // تسجيل المستخدم الحالي في غرفته الخاصة
    if (user) {
      socket.emit('register-user', user.id);
    }

    return () => {
      socket.off('userDeactivated', handleUserDeactivated);
    };
  }, [user, logout, t]);

  return (
    <BrowserRouter>
      <Toaster position="top-left" reverseOrder={false} />
      <Routes>
        {/* صفحات عامة (غير محمية) – يمكن للجميع الوصول إليها */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/status" element={
  <PrivateRoute>
    <Layout>
      <Status />
    </Layout>
  </PrivateRoute>
} />
<Route path="/public/project/:token" element={<PublicProject />} />


        {/* صفحات محمية (تتطلب مصادقة) */}
        <Route path="/" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/profile" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Profile />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/users" element={
          <PrivateRoute requiredRole={['admin']}>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Users />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />

      <Route path="/tags" element={
  <PrivateRoute requiredRole={['admin']}>
    <Layout>
      <TagsManagement />
    </Layout>
  </PrivateRoute>
} />




        <Route path="/projects" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Projects />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/projects/new" element={
          <PrivateRoute requiredRole={['admin', 'project_manager']}>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <ProjectForm />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/projects/:id/edit" element={
          <PrivateRoute requiredRole={['admin', 'project_manager']}>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <ProjectForm />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/projects/:id" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <ProjectDetails />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/activities" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <ActivityLog />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/notifications" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Notifications />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />

        {/* أي مسار غير معروف يعيد إلى الصفحة الرئيسية */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;