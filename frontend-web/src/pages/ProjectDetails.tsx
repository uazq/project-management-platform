import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import socket from '../services/socket';
import { Project, Task, User, Comment, File as ProjectFile, Tag } from '../types';
import toast from 'react-hot-toast';
import {
  FiEdit, FiTrash2, FiPlus, FiDownload, FiUpload,
  FiX, FiCalendar, FiUsers, FiFileText, FiMessageSquare,
  FiBarChart2, FiCheckCircle, FiClock, FiAlertCircle, FiPlay,
  FiFolder, FiArchive, FiShare2
} from 'react-icons/fi';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import FileUploader from '../components/FileUploader';
import Discussions from '../components/Discussions';
import Skeleton from '../components/Skeleton';
import ReportExport from '../components/ReportExport';
import TagSelector from '../components/TagSelector';

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'members' | 'files' | 'comments' | 'discussions' | 'reports'>('overview');

  // بيانات للمهام
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newComment, setNewComment] = useState('');

  // حالة إضافة مهمة
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assigneeId: ''
  });

  // حالة إضافة عضو
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  // حالة التبويب الحالي للمهام
  const [taskStatusTab, setTaskStatusTab] = useState<'not_started' | 'in_progress' | 'completed' | 'overdue'>('not_started');

  // بيانات المخطط الخطي
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // حالات الوسوم
  const [projectTags, setProjectTags] = useState<Tag[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [taskTags, setTaskTags] = useState<{ [taskId: number]: Tag[] }>({});

  // حالات المشاركة
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    if (id) fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data);
      setTasks(res.data.tasks || []);
      setMembers(res.data.members?.map((m: any) => m.user) || []);
      setComments(res.data.comments || []);
      setFiles(res.data.files || []);
      setProjectTags(res.data.tags?.map((pt: any) => pt.tag) || []);
      
      const taskTagsMap: { [key: number]: Tag[] } = {};
      res.data.tasks?.forEach((task: any) => {
        taskTagsMap[task.id] = task.tags?.map((tt: any) => tt.tag) || [];
      });
      setTaskTags(taskTagsMap);
    } catch {
      toast.error(t('project.fetchError'));
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  // WebSocket للتحديث الفوري (كما هو موجود)
  useEffect(() => {
    if (!id) return;
    socket.emit('join-project', id);

    const handleTaskCreated = (task: Task) => {
      if (task.projectId === parseInt(id)) {
        setTasks(prev => [...prev, task]);
        toast.success(t('task.createdNotification'));
      }
    };
    const handleTaskUpdated = (task: Task) => {
      if (task.projectId === parseInt(id)) {
        setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      }
    };
    const handleTaskStatusChanged = ({ id: taskId, status }: { id: number; status: string }) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as any } : t));
    };
    const handleTaskDeleted = ({ id: taskId }: { id: number }) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    };
    const handleCommentAdded = (comment: Comment) => {
      if (comment.projectId === parseInt(id)) setComments(prev => [comment, ...prev]);
    };
    const handleFileUploaded = (file: ProjectFile) => {
      if (file.projectId === parseInt(id)) setFiles(prev => [...prev, file]);
    };

    socket.on('taskCreated', handleTaskCreated);
    socket.on('taskUpdated', handleTaskUpdated);
    socket.on('taskStatusChanged', handleTaskStatusChanged);
    socket.on('taskDeleted', handleTaskDeleted);
    socket.on('commentAdded', handleCommentAdded);
    socket.on('fileUploaded', handleFileUploaded);

    return () => {
      socket.off('taskCreated', handleTaskCreated);
      socket.off('taskUpdated', handleTaskUpdated);
      socket.off('taskStatusChanged', handleTaskStatusChanged);
      socket.off('taskDeleted', handleTaskDeleted);
      socket.off('commentAdded', handleCommentAdded);
      socket.off('fileUploaded', handleFileUploaded);
    };
  }, [id]);

  // جلب المستخدمين المتاحين للإضافة
  useEffect(() => {
    if (showAddMember && (user?.role === 'admin' || user?.role === 'project_manager')) {
      const fetchAvailable = async () => {
        try {
          const res = await api.get('/users');
          setAvailableUsers(res.data.filter((u: User) => !members.some(m => m.id === u.id)));
        } catch {
          toast.error(t('member.fetchError'));
        }
      };
      fetchAvailable();
    }
  }, [showAddMember, members, user]);

  // إضافة مهمة جديدة
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newTask,
        assigneeId: newTask.assigneeId ? parseInt(newTask.assigneeId) : null
      };
      const res = await api.post(`/projects/${id}/tasks`, payload);
      setTasks(prev => [...prev, res.data]);
      setShowTaskModal(false);
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assigneeId: '' });
      toast.success(t('task.addSuccess'));
    } catch {
      toast.error(t('task.addError'));
    }
  };

  // تغيير حالة مهمة
  const handleStatusChange = useCallback(async (taskId: number, newStatus: string) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
      toast.success(t('task.statusUpdateSuccess'));
    } catch (error: any) {
      console.error('Status change error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || t('task.statusUpdateError'));
    }
  }, [t]);

  // حذف مهمة
  const handleDeleteTask = useCallback(async (taskId: number) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success(t('task.deleteSuccess'));
    } catch {
      toast.error(t('task.deleteError'));
    }
  }, [t]);

  // إضافة عضو
  const handleAddMember = async () => {
    if (!selectedUserId) return;
    try {
      await api.post(`/projects/${id}/members`, { userId: parseInt(selectedUserId) });
      const newMember = availableUsers.find(u => u.id === parseInt(selectedUserId));
      if (newMember) {
        setMembers(prev => [...prev, newMember]);
        setAvailableUsers(prev => prev.filter(u => u.id !== parseInt(selectedUserId)));
      }
      setShowAddMember(false);
      setSelectedUserId('');
      toast.success(t('member.addSuccess'));
    } catch {
      toast.error(t('member.addError'));
    }
  };

  // إزالة عضو
  const handleRemoveMember = async (userId: number) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.id !== userId));
      toast.success(t('member.removeSuccess'));
    } catch {
      toast.error(t('member.removeError'));
    }
  };

  // رفع ملف
  const handleFileUpload = async (files: File[]) => {
    setUploading(true);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    try {
      const res = await api.post(`/projects/${id}/files`, formData);
      setFiles(prev => [...prev, ...res.data]);
      toast.success(t('file.uploadSuccess'));
    } catch {
      toast.error(t('file.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  // حذف ملف
  const handleDeleteFile = async (fileId: number) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await api.delete(`/files/${fileId}`);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success(t('file.deleteSuccess'));
    } catch {
      toast.error(t('file.deleteError'));
    }
  };

  // إضافة تعليق
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/projects/${id}/comments`, { content: newComment });
      setComments(prev => [res.data, ...prev]);
      setNewComment('');
      toast.success(t('comment.addSuccess'));
    } catch {
      toast.error(t('comment.addError'));
    }
  };

  // حذف تعليق
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await api.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success(t('comment.deleteSuccess'));
    } catch {
      toast.error(t('comment.deleteError'));
    }
  };

  // أرشفة / إلغاء أرشفة المشروع
  const handleArchive = async () => {
    if (!confirm(t('archive.confirmArchive'))) return;
    try {
      await api.patch(`/projects/${id}/archive`);
      toast.success(t('archive.archiveSuccess'));
      fetchProject();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('archive.archiveError'));
    }
  };

  const handleUnarchive = async () => {
    if (!confirm(t('archive.confirmUnarchive'))) return;
    try {
      await api.patch(`/projects/${id}/unarchive`);
      toast.success(t('archive.unarchiveSuccess'));
      fetchProject();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('archive.unarchiveError'));
    }
  };

  // مشاركة المشروع
  const handleShare = async () => {
    try {
      const res = await api.post(`/projects/${id}/share`, {});
      setShareLink(res.data.shareUrl);
      setShareModalOpen(true);
    } catch (error) {
      toast.error(t('share.error'));
    }
  };

  // جلب بيانات المخطط الخطي
  const fetchTimeline = async () => {
    setLoadingTimeline(true);
    try {
      const res = await api.get(`/projects/${id}/timeline`);
      setTimelineData(res.data);
    } catch (error) {
      console.error('Failed to load timeline');
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchTimeline();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="flex gap-2 border-b overflow-x-auto">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-10 w-24" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!project) return <div className="text-center py-10">{t('project.notFound')}</div>;

  const isManager = user?.role === 'admin' || project.createdBy === user?.id;

  const tabs = [
    { id: 'overview', label: t('common.overview'), icon: FiFolder },
    { id: 'tasks', label: t('common.tasks'), icon: FiCheckCircle },
    { id: 'members', label: t('common.members'), icon: FiUsers },
    { id: 'files', label: t('common.files'), icon: FiUpload },
    { id: 'comments', label: t('common.comments'), icon: FiMessageSquare },
    { id: 'discussions', label: t('discussions.title'), icon: FiMessageSquare },
    { id: 'reports', label: t('common.reports'), icon: FiBarChart2 },
  ];

  const taskStatusTabs = [
    { id: 'not_started', label: t('task.not_started'), icon: FiClock },
    { id: 'in_progress', label: t('task.in_progress'), icon: FiPlay },
    { id: 'completed', label: t('task.completed'), icon: FiCheckCircle },
    { id: 'overdue', label: t('task.overdue'), icon: FiAlertCircle },
  ];

  return (
    <div className="space-y-6">
      {/* رأس المشروع */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
              {project.archived && (
                <span className="badge bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {t('archive.archived')}
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{project.description}</p>
            
            {/* قسم الوسوم للمشروع */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tag.title')}</h3>
                {isManager && !project.archived && (
                  <button
                    onClick={() => setShowTagSelector(!showTagSelector)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    {showTagSelector ? t('common.cancel') : t('tag.add')}
                  </button>
                )}
              </div>
              <TagSelector
                selectedTags={projectTags}
                onAddTag={async (tag) => {
                  try {
                    await api.post(`/projects/${id}/tags`, { tagId: tag.id });
                    setProjectTags([...projectTags, tag]);
                    toast.success(t('tag.addSuccess'));
                  } catch (error) {
                    toast.error(t('tag.addError'));
                  }
                }}
                onRemoveTag={async (tagId) => {
                  try {
                    await api.delete(`/projects/${id}/tags/${tagId}`);
                    setProjectTags(projectTags.filter(t => t.id !== tagId));
                    toast.success(t('tag.removeSuccess'));
                  } catch (error) {
                    toast.error(t('tag.removeError'));
                  }
                }}
                disabled={project.archived || !isManager}
              />
            </div>

            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1 text-gray-500">
                <FiCalendar /> {t('project.startDate')}: {new Date(project.startDate).toLocaleDateString()}
              </span>
              {project.endDate && (
                <span className="flex items-center gap-1 text-gray-500">
                  <FiCalendar /> {t('project.endDate')}: {new Date(project.endDate).toLocaleDateString()}
                </span>
              )}
              <span className={`badge ${
                project.status === 'active' ? 'badge-success' :
                project.status === 'completed' ? 'badge-info' : 'badge-warning'
              }`}>
                {project.status === 'active' ? t('project.active') :
                 project.status === 'completed' ? t('project.completed') : t('project.suspended')}
              </span>
            </div>
          </div>
          {isManager && (
            <div className="flex gap-2">
              {project.archived ? (
                <button
                  onClick={handleUnarchive}
                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                  title={t('archive.unarchive')}
                >
                  <FiArchive size={20} />
                </button>
              ) : (
                <button
                  onClick={handleArchive}
                  className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg"
                  title={t('archive.archive')}
                >
                  <FiArchive size={20} />
                </button>
              )}
              <Link
                to={`/projects/${id}/edit`}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                title={t('common.edit')}
              >
                <FiEdit size={20} />
              </Link>
              <button
                onClick={async () => {
                  if (!confirm(t('common.confirmDelete'))) return;
                  try {
                    await api.delete(`/projects/${id}`);
                    toast.success(t('project.deleteSuccess'));
                    navigate('/projects');
                  } catch (error: any) {
                    toast.error(error.response?.data?.message || t('project.deleteError'));
                  }
                }}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                title={t('common.delete')}
              >
                <FiTrash2 size={20} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg"
                title={t('share.title')}
              >
                <FiShare2 size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* تبويبات الصفحة الرئيسية */}
      <div className="border-b border-gray-200 dark:border-dark-100 overflow-x-auto">
        <nav className="flex space-x-8 space-x-reverse min-w-max px-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* محتوى التبويبات */}
      <div className="card">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('project.overview')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">{t('project.startDate')}</p>
                <p className="font-medium">{new Date(project.startDate).toLocaleDateString()}</p>
              </div>
              {project.endDate && (
                <div className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">{t('project.endDate')}</p>
                  <p className="font-medium">{new Date(project.endDate).toLocaleDateString()}</p>
                </div>
              )}
              <div className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">{t('common.tasks')}</p>
                <p className="font-medium">{tasks.length}</p>
              </div>
              <div className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">{t('common.members')}</p>
                <p className="font-medium">{members.length}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('task.title')}</h2>
              {isManager && !project.archived && (
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <FiPlus size={16} /> {t('task.newTask')}
                </button>
              )}
            </div>

            {showTaskModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-md w-full p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{t('task.newTask')}</h3>
                    <button onClick={() => setShowTaskModal(false)} className="text-gray-500 hover:text-gray-700">
                      <FiX size={24} />
                    </button>
                  </div>
                  <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('task.taskTitle')}</label>
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('task.description')}</label>
                      <textarea
                        rows={3}
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">{t('task.priority')}</label>
                        <select
                          value={newTask.priority}
                          onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                          className="input-field"
                        >
                          <option value="high">{t('task.high')}</option>
                          <option value="medium">{t('task.medium')}</option>
                          <option value="low">{t('task.low')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">{t('task.dueDate')}</label>
                        <input
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                          className="input-field"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('task.assignee')}</label>
                      <select
                        value={newTask.assigneeId}
                        onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                        className="input-field"
                      >
                        <option value="">{t('task.unassigned')}</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.fullName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <button type="submit" className="btn-primary">
                        {t('common.add')}
                      </button>
                      <button type="button" onClick={() => setShowTaskModal(false)} className="btn-secondary">
                        {t('common.cancel')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="border-b border-gray-200 dark:border-dark-100">
              <nav className="flex space-x-4 space-x-reverse">
                {taskStatusTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setTaskStatusTab(tab.id)}
                    className={`py-2 px-3 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
                      taskStatusTab === tab.id
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="space-y-3">
              {tasks.filter(t => t.status === taskStatusTab).length === 0 ? (
                <p className="text-center text-gray-500 py-4">{t('common.noData')}</p>
              ) : (
                tasks.filter(t => t.status === taskStatusTab).map(task => (
                  <div key={task.id} className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg border border-gray-200 dark:border-dark-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                        
                        {/* وسوم المهمة */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(taskTags[task.id] || []).map(tag => (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 text-xs rounded-full"
                              style={{ backgroundColor: tag.color || '#e2e8f0', color: '#1e293b' }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>

                        {isManager && !project.archived && (
                          <div className="mt-2">
                            <TagSelector
                              selectedTags={taskTags[task.id] || []}
                              onAddTag={async (tag) => {
                                try {
                                  await api.post(`/tasks/${task.id}/tags`, { tagId: tag.id });
                                  setTaskTags({
                                    ...taskTags,
                                    [task.id]: [...(taskTags[task.id] || []), tag]
                                  });
                                  toast.success(t('tag.addSuccess'));
                                } catch (error) {
                                  toast.error(t('tag.addError'));
                                }
                              }}
                              onRemoveTag={async (tagId) => {
                                try {
                                  await api.delete(`/tasks/${task.id}/tags/${tagId}`);
                                  setTaskTags({
                                    ...taskTags,
                                    [task.id]: (taskTags[task.id] || []).filter(t => t.id !== tagId)
                                  });
                                  toast.success(t('tag.removeSuccess'));
                                } catch (error) {
                                  toast.error(t('tag.removeError'));
                                }
                              }}
                              disabled={project.archived || !isManager}
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          <span className={`badge ${
                            task.priority === 'high' ? 'badge-danger' :
                            task.priority === 'medium' ? 'badge-warning' : 'badge-success'
                          }`}>
                            {t(`task.${task.priority}`)}
                          </span>
                          <span>{t('task.assignee')}: {task.assignee?.fullName || t('task.unassigned')}</span>
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <FiClock size={12} /> {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const canChange = !project.archived && (
                            user?.role === 'admin' ||
                            isManager ||
                            task.assigneeId === user?.id
                          );
                          if (canChange) {
                            return (
                              <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                className="p-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                              >
                                <option value="not_started">{t('task.not_started')}</option>
                                <option value="in_progress">{t('task.in_progress')}</option>
                                <option value="completed">{t('task.completed')}</option>
                                <option value="overdue">{t('task.overdue')}</option>
                              </select>
                            );
                          } else {
                            return (
                              <span className={`px-3 py-1 text-sm rounded-full ${
                                task.status === 'not_started' ? 'bg-gray-200 text-gray-700' :
                                task.status === 'in_progress' ? 'bg-blue-200 text-blue-700' :
                                task.status === 'completed' ? 'bg-green-200 text-green-700' :
                                'bg-red-200 text-red-700'
                              }`}>
                                {t(`task.${task.status}`)}
                              </span>
                            );
                          }
                        })()}
                        {isManager && !project.archived && (
                          <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
                            <FiTrash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('member.title')}</h2>
              {isManager && !project.archived && (
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  <FiPlus size={16} /> {t('member.addMember')}
                </button>
              )}
            </div>

            {showAddMember && (
              <div className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 input-field"
                >
                  <option value="">{t('member.selectUser')}</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.username})</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={handleAddMember} className="btn-primary">
                    {t('common.add')}
                  </button>
                  <button onClick={() => setShowAddMember(false)} className="btn-secondary">
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    {member.profilePicture ? (
                      <img src={`http://localhost:5000${member.profilePicture}`} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold">
                        {member.fullName[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{member.fullName}</p>
                      <p className="text-xs text-gray-500">{member.username}</p>
                    </div>
                  </div>
                  {member.id === project.createdBy && (
                    <span className="badge badge-info">{t('member.projectManager')}</span>
                  )}
                  {isManager && member.id !== project.createdBy && !project.archived && (
                    <button onClick={() => handleRemoveMember(member.id)} className="text-red-500 hover:text-red-600">
                      <FiTrash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {members.length === 0 && <p className="text-center text-gray-500 col-span-full py-4">{t('member.noMembers')}</p>}
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            {!project.archived && (
              <FileUploader onUpload={handleFileUpload} uploading={uploading} />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-100 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{file.fileName}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`http://localhost:5000/api/files/${file.id}/download`} className="p-1.5 text-primary-600 hover:bg-primary-100 rounded">
                      <FiDownload size={16} />
                    </a>
                    {!project.archived && (user?.id === file.uploadedBy || isManager) && (
                      <button onClick={() => handleDeleteFile(file.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded">
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {files.length === 0 && <p className="text-center text-gray-500 col-span-full py-4">{t('file.noFiles')}</p>}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-4">
            {!project.archived && (
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('comment.addComment')}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 input-field"
                />
                <button type="submit" className="btn-primary">
                  {t('comment.post')}
                </button>
              </form>
            )}
            <div className="space-y-3">
              {comments.map(comment => (
                <div key={comment.id} className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {comment.user?.profilePicture ? (
                        <img src={`http://localhost:5000${comment.user.profilePicture}`} className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-xs">
                          {comment.user?.fullName?.[0] || '?'}
                        </div>
                      )}
                      <span className="font-medium text-sm">{comment.user?.fullName}</span>
                      <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    {!project.archived && (user?.id === comment.userId || isManager) && (
                      <button onClick={() => handleDeleteComment(comment.id)} className="text-red-500 hover:text-red-600">
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-sm">{comment.content}</p>
                </div>
              ))}
              {comments.length === 0 && <p className="text-center text-gray-500 py-4">{t('comment.noComments')}</p>}
            </div>
          </div>
        )}

        {activeTab === 'discussions' && (
          <Discussions projectId={id!} archived={project.archived} />
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('report.title')}</h2>
              <ReportExport
                projectName={project.name}
                tasks={tasks}
                members={members}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
                <p className="text-sm text-primary-600 dark:text-primary-400">{t('report.totalTasks')}</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <div className="bg-secondary-50 dark:bg-secondary-900/20 p-4 rounded-lg">
                <p className="text-sm text-secondary-600 dark:text-secondary-400">{t('report.completedTasks')}</p>
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'completed').length}</p>
              </div>
              <div className="bg-accent-50 dark:bg-accent-900/20 p-4 rounded-lg">
                <p className="text-sm text-accent-600 dark:text-accent-400">{t('report.overdueTasks')}</p>
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'overdue').length}</p>
              </div>
            </div>

            <div className="card">
              <h3 className="font-medium mb-4">{t('report.timeline')}</h3>
              {loadingTimeline ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="completed" stroke="#10B981" name={t('report.completed')} strokeWidth={2} />
                    <Line type="monotone" dataKey="created" stroke="#3B82F6" name={t('report.created')} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg">
              <h3 className="font-medium mb-3">{t('report.tasksByStatus')}</h3>
              <div className="space-y-2">
                {['not_started', 'in_progress', 'completed', 'overdue'].map(status => {
                  const count = tasks.filter(t => t.status === status).length;
                  const percentage = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t(`task.${status}`)}</span>
                        <span>{count} {t('report.tasksCount')} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            status === 'not_started' ? 'bg-gray-400' :
                            status === 'in_progress' ? 'bg-primary-500' :
                            status === 'completed' ? 'bg-secondary-500' : 'bg-accent-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg">
              <h3 className="font-medium mb-3">{t('report.memberPerformance')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-sm text-gray-500 border-b">
                      <th className="py-2 text-right">{t('common.member')}</th>
                      <th className="py-2 text-right">{t('report.totalTasks')}</th>
                      <th className="py-2 text-right">{t('report.completedTasks')}</th>
                      <th className="py-2 text-right">{t('report.percentage')}</th>
                     </tr>
                  </thead>
                  <tbody>
                    {members.map(member => {
                      const memberTasks = tasks.filter(t => t.assigneeId === member.id);
                      const completed = memberTasks.filter(t => t.status === 'completed').length;
                      const total = memberTasks.length;
                      const percentage = total ? Math.round((completed / total) * 100) : 0;
                      return (
                        <tr key={member.id} className="border-b">
                          <td className="py-2">{member.fullName}</td>
                          <td className="py-2">{total}</td>
                          <td className="py-2">{completed}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-sm">{percentage}%</span>
                              <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${percentage}%` }} />
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
          </div>
        )}
      </div>

      {/* مودال مشاركة المشروع */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">{t('share.title')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('share.description')}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 input-field"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  toast.success(t('share.copied'));
                }}
                className="btn-primary"
              >
                {t('share.copy')}
              </button>
            </div>
            <button
              onClick={() => setShareModalOpen(false)}
              className="mt-4 w-full btn-secondary"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;