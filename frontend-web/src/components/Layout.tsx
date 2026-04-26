import { ReactNode, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { 
  FiHome, FiFolder, FiUsers, FiUser, FiLogOut, 
  FiMenu, FiX, FiBell, FiMoon, FiSun, FiClock, FiGlobe,
  FiCheckCircle, FiUserX, FiTag
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import socket from '../services/socket';
import SearchBar from './SearchBar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuthStore();
  const { unreadCount, loadUnreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
 // const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) loadUnreadCount();
  }, [user, loadUnreadCount]);

  useEffect(() => {
  const handleNewNotification = () => loadUnreadCount();
  socket.on('new_notification', handleNewNotification);
  return () => socket.off('new_notification', handleNewNotification);
}, [loadUnreadCount]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: t('common.dashboard'), icon: FiHome },
    { path: '/projects', label: t('common.projects'), icon: FiFolder },
    { path: '/my-tasks', label: t('myTasks.title'), icon: FiCheckCircle },
    { path: '/activities', label: t('common.activities'), icon: FiClock },
    { path: '/profile', label: t('common.profile'), icon: FiUser },
    { path: '/users', label: t('common.users'), icon: FiUsers, adminOnly: true },
    { path: '/tags', label: t('tag.management'), icon: FiTag, adminOnly: true },
    { path: '/admin/approvals', label: t('admin.approvals'), icon: FiCheckCircle, adminOnly: true },
    { path: '/admin/removal-requests', label: t('removal.title'), icon: FiUserX, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-200 dark:to-dark-300 flex">
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-72 bg-white dark:bg-dark-100 shadow-xl transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:shadow-soft
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-6 h-20 border-b border-gray-100 dark:border-dark-200">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg"></div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                {t('common.appName')}
              </span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <FiX size={24} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            {navLinks.map(link => {
              if (link.adminOnly && user?.role !== 'admin') return null;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                    isActive(link.path)
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-200'
                  }`}
                >
                  <link.icon size={20} className="ml-3" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-100 dark:border-dark-200 p-4">
            <div className="flex items-center gap-3">
              {user?.profilePicture ? (
                <img src={`http://localhost:5000${user.profilePicture}`} className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-500" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold ring-2 ring-primary-500">
                  {user?.fullName?.[0] || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{user?.fullName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition" title={t('common.logout')}>
                <FiLogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white dark:bg-dark-100 shadow-sm lg:hidden">
          <div className="flex items-center justify-between px-4 h-16">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <FiMenu size={24} />
            </button>
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              {t('common.appName')}
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full transition">
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <button onClick={() => changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full">
                <FiGlobe size={20} />
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full">
                {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
              </button>
            </div>
          </div>
          <div className="px-4 pb-2">
            <SearchBar />
          </div>
        </header>

        <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-white dark:bg-dark-100 border-b border-gray-100 dark:border-dark-200">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {navLinks.find(l => isActive(l.path))?.label || ''}
          </h1>
          <div className="flex items-center gap-4">
            <SearchBar />
            <button onClick={() => changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full transition">
              <FiGlobe size={20} />
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full transition">
              {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button>
            <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full transition">
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <main className="flex-1 p-6 lg:p-8 animate-fade-in">
          {children}
        </main>

        <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-dark-200">
          © {new Date().getFullYear()} {t('common.appName')}. {t('common.rights')}
        </footer>
      </div>
    </div>
  );
};

export default Layout;