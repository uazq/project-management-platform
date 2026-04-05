import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { FiFolder, FiCheckCircle, FiClock, FiAlertCircle, FiUser, FiMail, FiCalendar } from 'react-icons/fi';
import Skeleton from '../components/Skeleton';

interface Member {
  id: number;
  fullName: string;
  username: string;
  email: string;
  profilePicture?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate?: string;
  _count: { tasks: number; members: number };
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  project: { id: number; name: string };
}

const MemberDetails = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [member, setMember] = useState<Member | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemberDetails = async () => {
      try {
        const res = await api.get(`/users/${id}/details`);
        setMember(res.data.member);
        setProjects(res.data.projects);
        setTasks(res.data.tasks);
        setStats(res.data.stats);
      } catch (error) {
        console.error('Failed to load member details');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchMemberDetails();
  }, [id]);

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!member) return <div className="text-center py-10">{t('member.notFound')}</div>;

  return (
    <div className="space-y-6">
      {/* بطاقة المعلومات الشخصية */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          <div>
            {member.profilePicture ? (
              <img
                src={`http://localhost:5000${member.profilePicture}`}
                className="w-32 h-32 rounded-full object-cover ring-4 ring-primary-500"
                alt={member.fullName}
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-4xl font-bold text-white">
                {member.fullName[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{member.fullName}</h1>
            <p className="text-gray-500">@{member.username}</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <FiMail className="text-gray-400" /> {member.email}
              </div>
              <div className="flex items-center gap-2">
                <FiUser className="text-gray-400" /> {t(`member.${member.role}`)}
              </div>
              <div className="flex items-center gap-2">
                <FiCalendar className="text-gray-400" /> {t('member.joined')}: {new Date(member.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${member.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {member.isActive ? t('common.active') : t('common.inactive')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card flex items-center gap-3">
            <FiCheckCircle className="text-green-500 text-2xl" />
            <div>
              <p className="text-sm text-gray-500">{t('member.totalTasks')}</p>
              <p className="text-2xl font-bold">{stats.totalTasks}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <FiCheckCircle className="text-blue-500 text-2xl" />
            <div>
              <p className="text-sm text-gray-500">{t('member.completedTasks')}</p>
              <p className="text-2xl font-bold">{stats.completedTasks}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <FiAlertCircle className="text-red-500 text-2xl" />
            <div>
              <p className="text-sm text-gray-500">{t('member.overdueTasks')}</p>
              <p className="text-2xl font-bold">{stats.overdueTasks}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <FiClock className="text-yellow-500 text-2xl" />
            <div>
              <p className="text-sm text-gray-500">{t('member.completionRate')}</p>
              <p className="text-2xl font-bold">{stats.completionRate}%</p>
            </div>
          </div>
        </div>
      )}

      {/* المشاريع التي شارك فيها */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiFolder className="text-primary-500" /> {t('member.projectsInvolved')}
        </h2>
        {projects.length === 0 ? (
          <p className="text-gray-500">{t('member.noProjects')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.map(project => (
              <Link key={project.id} to={`/projects/${project.id}`} className="block p-3 bg-gray-50 dark:bg-dark-100 rounded-lg hover:shadow transition">
                <h3 className="font-medium">{project.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-1">{project.description}</p>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{t('project.status')}: {t(`project.${project.status}`)}</span>
                  <span>{t('projects.tasksCount', { count: project._count.tasks })}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* المهام المسندة */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiCheckCircle className="text-secondary-500" /> {t('member.assignedTasks')}
        </h2>
        {tasks.length === 0 ? (
          <p className="text-gray-500">{t('member.noTasks')}</p>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-sm text-gray-600">{task.description}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                      <span>{t('task.priority')}: {t(`task.${task.priority}`)}</span>
                      <span>{t('task.status')}: {t(`task.${task.status}`)}</span>
                      {task.dueDate && <span>{t('task.dueDate')}: {new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <Link to={`/projects/${task.project.id}`} className="text-xs text-primary-600 hover:underline">
                    {task.project.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberDetails;