import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import socket from '../services/socket';
import toast from 'react-hot-toast';
import { FiMessageSquare, FiTrash2, FiSend } from 'react-icons/fi';

interface Reply {
  id: number;
  content: string;
  userId: number;
  user: { fullName: string; profilePicture?: string };
  createdAt: string;
}

interface Discussion {
  id: number;
  title: string;
  content: string;
  userId: number;
  user: { fullName: string; profilePicture?: string };
  createdAt: string;
  replies: Reply[];
}

interface DiscussionsProps {
  projectId: string;
  archived?: boolean;
}

const Discussions = ({ projectId, archived = false }: DiscussionsProps) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [replyContents, setReplyContents] = useState<{ [key: number]: string }>({});
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchDiscussions();
  }, [projectId]);

  useEffect(() => {
    socket.on('discussionCreated', (discussion: Discussion) => {
      if (discussion.projectId === parseInt(projectId)) {
        setDiscussions(prev => [discussion, ...prev]);
        toast.success(t('discussions.createdNotification'));
      }
    });
    socket.on('replyAdded', (reply: Reply & { discussionId: number }) => {
      setDiscussions(prev => prev.map(d =>
        d.id === reply.discussionId ? { ...d, replies: [...d.replies, reply] } : d
      ));
    });
    return () => {
      socket.off('discussionCreated');
      socket.off('replyAdded');
    };
  }, [projectId]);

  const fetchDiscussions = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/discussions`);
      // التأكد من أن replies مصفوفة وليست undefined
      const discussionsWithReplies = res.data.map((d: any) => ({
        ...d,
        replies: d.replies || []
      }));
      setDiscussions(discussionsWithReplies);
    } catch {
      toast.error(t('discussions.fetchError'));
    }
  };

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      await api.post(`/projects/${projectId}/discussions`, {
        title: newTitle,
        content: newContent,
      });
      setNewTitle('');
      setNewContent('');
      setShowForm(false);
      toast.success(t('discussions.createSuccess'));
    } catch {
      toast.error(t('discussions.createError'));
    }
  };

  const handleAddReply = async (discussionId: number) => {
    const content = replyContents[discussionId];
    if (!content?.trim()) return;
    try {
      await api.post(`/discussions/${discussionId}/replies`, { content });
      setReplyContents(prev => ({ ...prev, [discussionId]: '' }));
    } catch {
      toast.error(t('discussions.replyError'));
    }
  };

  const handleDeleteDiscussion = async (id: number) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await api.delete(`/discussions/${id}`);
      setDiscussions(prev => prev.filter(d => d.id !== id));
      toast.success(t('discussions.deleteSuccess'));
    } catch {
      toast.error(t('discussions.deleteError'));
    }
  };

  const handleDeleteReply = async (replyId: number, discussionId: number) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await api.delete(`/replies/${replyId}`);
      setDiscussions(prev => prev.map(d =>
        d.id === discussionId ? { ...d, replies: d.replies.filter(r => r.id !== replyId) } : d
      ));
      toast.success(t('discussions.deleteSuccess'));
    } catch {
      toast.error(t('discussions.deleteError'));
    }
  };

  return (
    <div className="space-y-4">
      {!archived && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition"
          >
            <FiMessageSquare /> {t('discussions.newDiscussion')}
          </button>
        </div>
      )}

      {!archived && showForm && (
        <form onSubmit={handleCreateDiscussion} className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg space-y-3">
          <input
            type="text"
            placeholder={t('discussions.titlePlaceholder')}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="input-field"
          />
          <textarea
            placeholder={t('discussions.contentPlaceholder')}
            rows={3}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="input-field"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              {t('discussions.create')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {discussions.length === 0 ? (
        <p className="text-center text-gray-500 py-8">{t('discussions.noDiscussions')}</p>
      ) : (
        discussions.map(discussion => (
          <div key={discussion.id} className="bg-white dark:bg-dark-200 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-dark-100">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{discussion.title}</h3>
                <p className="text-sm text-gray-500 mb-2">
                  {discussion.user.fullName} • {new Date(discussion.createdAt).toLocaleString()}
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-4">{discussion.content}</p>
              </div>
              {(user?.id === discussion.userId || user?.role === 'admin') && !archived && (
                <button onClick={() => handleDeleteDiscussion(discussion.id)} className="text-red-500 hover:text-red-600">
                  <FiTrash2 size={18} />
                </button>
              )}
            </div>

            {/* الردود */}
            <div className="mr-6 space-y-3">
              {(discussion.replies || []).map(reply => (
                <div key={reply.id} className="bg-gray-50 dark:bg-dark-100 p-3 rounded-lg flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-500">{reply.user.fullName} • {new Date(reply.createdAt).toLocaleString()}</p>
                    <p className="text-sm mt-1">{reply.content}</p>
                  </div>
                  {(user?.id === reply.userId || user?.role === 'admin') && !archived && (
                    <button onClick={() => handleDeleteReply(reply.id, discussion.id)} className="text-red-500 hover:text-red-600">
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!archived && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder={t('discussions.replyPlaceholder')}
                  value={replyContents[discussion.id] || ''}
                  onChange={(e) => setReplyContents({ ...replyContents, [discussion.id]: e.target.value })}
                  className="flex-1 input-field"
                />
                <button
                  onClick={() => handleAddReply(discussion.id)}
                  className="btn-primary inline-flex items-center gap-1"
                >
                  <FiSend size={16} /> {t('discussions.reply')}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Discussions;