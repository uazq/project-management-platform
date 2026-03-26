import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Tag } from '../types';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import Skeleton from '../components/Skeleton';

const TagsManagement = () => {
  const { t } = useTranslation();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#e2e8f0');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags');
      setTags(res.data);
    } catch {
      toast.error(t('tag.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTagName.trim()) {
      toast.error(t('tag.nameRequired'));
      return;
    }
    try {
      const res = await api.post('/tags', { name: newTagName.trim(), color: newTagColor });
      setTags([...tags, res.data]);
      setNewTagName('');
      setNewTagColor('#e2e8f0');
      setShowForm(false);
      toast.success(t('tag.createSuccess'));
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error(t('tag.alreadyExists'));
      } else {
        toast.error(t('tag.createError'));
      }
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) {
      toast.error(t('tag.nameRequired'));
      return;
    }
    try {
      const res = await api.put(`/tags/${id}`, { name: editName.trim(), color: editColor });
      setTags(tags.map(tag => (tag.id === id ? res.data : tag)));
      setEditingId(null);
      toast.success(t('tag.updateSuccess'));
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error(t('tag.alreadyExists'));
      } else {
        toast.error(t('tag.updateError'));
      }
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(t('tag.confirmDelete', { name }))) return;
    try {
      await api.delete(`/tags/${id}`);
      setTags(tags.filter(tag => tag.id !== id));
      toast.success(t('tag.deleteSuccess'));
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error(t('tag.deleteInUse'));
      } else {
        toast.error(t('tag.deleteError'));
      }
    }
  };

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('tag.management')}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <FiPlus /> {t('tag.newTag')}
        </button>
      </div>

      {/* نموذج إضافة وسم جديد */}
      {showForm && (
        <div className="card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">{t('tag.name')}</label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="input-field"
                placeholder={t('tag.namePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('tag.color')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-500">{newTagColor}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="btn-primary px-4 py-2">
                {t('common.create')}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* جدول الوسوم */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-100">
            <thead className="bg-gray-50 dark:bg-dark-100">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('tag.name')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('tag.color')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
              {tags.map(tag => (
                <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-dark-100 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === tag.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field w-40"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color || '#e2e8f0' }}
                        />
                        {tag.name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === tag.id ? (
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-10 h-8 rounded border cursor-pointer"
                      />
                    ) : (
                      <span className="font-mono text-sm">{tag.color || '—'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === tag.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(tag.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          {t('common.save')}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(tag.id);
                            setEditName(tag.name);
                            setEditColor(tag.color || '#e2e8f0');
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id, tag.name)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {tags.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    {t('tag.noTags')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TagsManagement;