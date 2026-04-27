import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await api.get(`/projects/${id}`);
        setProject(res.data);
      } catch (error) {
        console.error('Error fetching project:', error);
        toast.error(t('project.fetchError'));
        navigate('/projects');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProject();
  }, [id, navigate, t]);

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!project) return <div className="text-center py-10">{t('project.notFound')}</div>;

  return (
    <div className="space-y-6">
      <div className="card">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-gray-600 mt-2">{project.description}</p>
          <div className="mt-4 text-sm text-gray-500">
            Status: {project.status} | Start: {new Date(project.startDate).toLocaleDateString()}
            {project.endDate && ` | End: ${new Date(project.endDate).toLocaleDateString()}`}
          </div>
        </div>
      </div>
      <div className="card text-center py-10 text-gray-500">
        Project details page is being restored.
      </div>
    </div>
  );
};

export default ProjectDetails;