import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Project } from '../types';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiSearch, FiFilter, FiArchive } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';

const Projects = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const canCreateProject = user?.role === 'admin' || user?.role === 'project_manager';
  const canEditDelete = canCreateProject; // نفس الشرط

  useEffect(() => {
    fetchProjects();
  }, [showArchived]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const url = showArchived ? '/projects?archived=true' : '/projects?archived=false';
      const res = await api.get(url);
      const formattedProjects = res.data.map((p: any) => ({
        ...p,
        tags: p.tags?.map((pt: any) => pt.tag) || []
      }));
      setProjects(formattedProjects);
    } catch {
      toast.error(t('projects.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success(t('projects.deleteSuccess'));
      fetchProjects();
    } catch {
      toast.error(t('projects.deleteError'));
    }
  }, [t, fetchProjects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {showArchived ? t('archive.archivedProjects') : t('projects.title')}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-4 py-2 rounded-lg transition ${
              !showArchived
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
                : 'bg-gray-200 dark:bg-dark-200 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('common.active')}
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-4 py-2 rounded-lg transition ${
              showArchived
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
                : 'bg-gray-200 dark:bg-dark-200 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('archive.archived')}
          </button>
          {!showArchived && canCreateProject && (
            <Link to="/projects/new" className="btn-primary inline-flex items-center gap-2">
              <FiPlus /> {t('projects.newProject')}
            </Link>
          )}
        </div>
      </div>

      {!showArchived && (
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute right-3 top-3 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pr-10"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-200 dark:border-dark-300 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-200 transition flex items-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <FiFilter /> {t('common.filter')}
            </button>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-300">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t('common.status')}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field w-full sm:w-64"
              >
                <option value="all">{t('common.all')}</option>
                <option value="active">{t('project.active')}</option>
                <option value="completed">{t('project.completed')}</option>
                <option value="suspended">{t('project.suspended')}</option>
              </select>
            </div>
          )}
        </div>
      )}

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 card">
          <p className="text-gray-500 dark:text-gray-400">
            {showArchived ? t('archive.noArchived') : t('projects.noProjects')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <div key={project.id} className="card hover:shadow-medium transition group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                  {project.archived && (
                    <span className="badge bg-gray-200 text-gray-700 dark:bg-dark-200 dark:text-gray-400 flex items-center gap-1">
                      <FiArchive size={12} /> {t('archive.archived')}
                    </span>
                  )}
                </div>
                <span className={`badge ${
                  project.status === 'active' ? 'badge-success' :
                  project.status === 'completed' ? 'badge-info' : 'badge-warning'
                }`}>
                  {project.status === 'active' ? t('project.active') :
                   project.status === 'completed' ? t('project.completed') : t('project.suspended')}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{project.description}</p>
              
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 mb-2">
                  {project.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="px-2 py-0.5 text-xs rounded-full"
                      style={{ backgroundColor: tag.color || '#e2e8f0', color: '#1e293b' }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>{t('projects.tasksCount', { count: project._count?.tasks || 0 })}</span>
                <span>{t('projects.membersCount', { count: project._count?.members || 0 })}</span>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-dark-200">
                <Link to={`/projects/${project.id}`} className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition" title={t('common.view')}>
                  <FiEye />
                </Link>
                {!project.archived && canEditDelete && (
                  <>
                    <Link to={`/projects/${project.id}/edit`} className="p-2 text-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-900/30 rounded-lg transition" title={t('common.edit')}>
                      <FiEdit />
                    </Link>
                    <button onClick={() => handleDelete(project.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition" title={t('common.delete')}>
                      <FiTrash2 />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;