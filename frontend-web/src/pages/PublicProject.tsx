import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { FiCalendar, FiClock } from 'react-icons/fi';

interface PublicProjectData {
  project: {
    id: number;
    name: string;
    description: string;
    startDate: string;
    endDate?: string;
    status: string;
  };
  tasks: {
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate?: string;
  }[];
}

const PublicProject = () => {
  const { token } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState<PublicProjectData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicProject = async () => {
      try {
        const res = await api.get(`/public/project/${token}`);
        setData(res.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicProject();
  }, [token]);

  if (loading) return <div className="text-center py-20">{t('common.loading')}</div>;
  if (error || !data) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-red-600">{t('share.invalidLink')}</h1>
      </div>
    );
  }

  const { project, tasks } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{project.description}</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><FiCalendar /> {t('project.startDate')}: {new Date(project.startDate).toLocaleDateString()}</span>
            {project.endDate && <span className="flex items-center gap-1"><FiCalendar /> {t('project.endDate')}: {new Date(project.endDate).toLocaleDateString()}</span>}
            <span className={`badge ${
              project.status === 'active' ? 'badge-success' :
              project.status === 'completed' ? 'badge-info' : 'badge-warning'
            }`}>
              {project.status === 'active' ? t('project.active') :
               project.status === 'completed' ? t('project.completed') : t('project.suspended')}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">{t('common.tasks')}</h2>
          {tasks.length === 0 ? (
            <p className="text-gray-500">{t('common.noData')}</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, idx) => (
                <div key={idx} className="border-b pb-4 last:border-0">
                  <h3 className="font-medium">{task.title}</h3>
                  <p className="text-sm text-gray-600">{task.description}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    <span className={`badge ${
                      task.priority === 'high' ? 'badge-danger' :
                      task.priority === 'medium' ? 'badge-warning' : 'badge-success'
                    }`}>
                      {t(`task.${task.priority}`)}
                    </span>
                    <span className={`badge ${
                      task.status === 'not_started' ? 'bg-gray-200' :
                      task.status === 'in_progress' ? 'bg-blue-200' :
                      task.status === 'completed' ? 'bg-green-200' : 'bg-red-200'
                    }`}>
                      {t(`task.${task.status}`)}
                    </span>
                    {task.dueDate && (
                      <span className="flex items-center gap-1"><FiClock /> {new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProject;