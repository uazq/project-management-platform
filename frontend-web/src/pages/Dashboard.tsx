import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { 
  FiFolder, FiCheckCircle, FiClock, FiUsers,
  FiTrendingUp, FiBarChart2, FiDownload
} from 'react-icons/fi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import Skeleton from '../components/Skeleton';
import OnboardingModal from '../components/OnboardingModal';
import { getFileIcon } from '../utils/fileIcons';

interface DashboardStats {
  projects: { active: number; completed: number; suspended: number; total: number };
  tasks: { total: number; completed: number; pending: number; overdue: number };
  projectProgress: { id: number; name: string; progress: number }[];
  memberStats: { fullName: string; completedTasks: number; totalTasks: number }[];
}

interface RecentFile {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string;
  size: number;
  uploadedBy: number;
  uploader: { fullName: string };
  project?: { id: number; name: string };
  task?: { id: number; title: string; projectId: number };
  uploadedAt: string;
}

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (error) {
        console.error('Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchRecentFiles = async () => {
      setLoadingFiles(true);
      try {
        const res = await api.get('/files/recent');
        setRecentFiles(res.data);
      } catch (error) {
        console.error('Failed to load recent files');
      } finally {
        setLoadingFiles(false);
      }
    };
    fetchRecentFiles();
  }, []);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('onboardingSeen');
    if (!hasSeenOnboarding && user?.createdAt) {
      const createdDate = new Date(user.createdAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 3600);
      if (hoursDiff < 24) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const projectStatusData = [
    { name: t('project.active'), value: stats?.projects.active || 0, color: '#8B5CF6' },
    { name: t('project.completed'), value: stats?.projects.completed || 0, color: '#EC4899' },
    { name: t('project.suspended'), value: stats?.projects.suspended || 0, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* الترحيب */}
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="p-3 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl text-white shadow-lg">
          <FiTrendingUp className="text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.welcome', { name: user?.fullName })}
        </h1>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
            <FiFolder className="text-primary-600 dark:text-primary-400 text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.totalProjects')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.projects.total}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="p-3 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl">
            <FiCheckCircle className="text-secondary-600 dark:text-secondary-400 text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.completedTasks')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.tasks.completed}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="p-3 bg-accent-100 dark:bg-accent-900/30 rounded-xl">
            <FiClock className="text-accent-600 dark:text-accent-400 text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.overdueTasks')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.tasks.overdue}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <FiUsers className="text-purple-600 dark:text-purple-400 text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.activeProjects')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.projects.active}</p>
          </div>
        </div>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <FiBarChart2 className="text-primary-500" />
            {t('dashboard.projectsProgress')}
          </h2>
          {stats?.projectProgress?.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.projectProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#6B7280" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#6B7280" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px' }} />
                <Bar dataKey="progress" fill="#8B5CF6" name={t('dashboard.progress')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('common.noData')}</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('dashboard.projectsDistribution')}</h2>
          {projectStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('common.noData')}</p>
          )}
        </div>
      </div>

      {/* تقدم المشاريع */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('dashboard.projectsProgress')}</h2>
        {stats?.projectProgress?.length ? (
          <div className="space-y-4">
            {stats.projectProgress.map(proj => (
              <div key={proj.id} className="animate-fade-in">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{proj.name}</span>
                  <span className="text-gray-600 dark:text-gray-400">{proj.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-dark-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-500" style={{ width: `${proj.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('common.noData')}</p>
        )}
      </div>

      {/* أداء الأعضاء */}
      {stats?.memberStats?.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('dashboard.memberPerformance')}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-200">
              <thead className="bg-gray-50 dark:bg-dark-200">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('common.member')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('dashboard.completedTasks')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('dashboard.totalTasks')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('dashboard.percentage')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-200">
                {stats.memberStats.map((member, idx) => {
                  const percentage = member.totalTasks ? Math.round((member.completedTasks / member.totalTasks) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-dark-200 transition duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                        {member.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-right">
                        {member.completedTasks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-right">
                        {member.totalTasks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center justify-end gap-2">
                          <span className="w-12 text-right">{percentage}%</span>
                          <div className="w-20 bg-gray-200 dark:bg-dark-300 rounded-full h-2">
                            <div className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* الملفات الحديثة - تظهر لجميع الأدوار (أدمن، مدير، عضو) */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('file.recent')}</h2>
        {loadingFiles ? (
          <Skeleton className="h-32 w-full" />
        ) : recentFiles.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('file.noFiles')}</p>
        ) : (
          <div className="space-y-3">
            {recentFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-200 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-300 transition">
                <div className="flex items-center gap-3">
                  {getFileIcon(file.fileName, 'text-xl text-primary-500')}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{file.fileName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {file.project?.name || file.task?.project?.name} • {file.uploader.fullName}
                    </p>
                  </div>
                </div>
                <a
                  href={`http://localhost:5000/api/files/${file.id}/download`}
                  className="p-1 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded transition"
                  download
                >
                  <FiDownload size={16} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {showOnboarding && (
        <OnboardingModal onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem('onboardingSeen', 'true');
        }} />
      )}
    </div>
  );
};

export default Dashboard;