import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Tag } from '../types';
import { FiX, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface TagSelectorProps {
  selectedTags: Tag[];
  onAddTag: (tag: Tag) => void;
  onRemoveTag: (tagId: number) => void;
  disabled?: boolean;
}

const TagSelector = ({ selectedTags, onAddTag, onRemoveTag, disabled }: TagSelectorProps) => {
  const { t } = useTranslation();
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#e2e8f0');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllTags();
  }, []);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowCreateForm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // تركيز على حقل الإدخال عند فتح نموذج الإنشاء
  useEffect(() => {
    if (showCreateForm && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [showCreateForm]);

  const fetchAllTags = async () => {
    try {
      const res = await api.get('/tags');
      setAllTags(res.data);
    } catch (error) {
      console.error('Failed to load tags');
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error(t('tag.nameRequired'));
      return;
    }
    try {
      const res = await api.post('/tags', { name: newTagName.trim(), color: newTagColor });
      const newTag = res.data;
      setAllTags(prev => [...prev, newTag]);
      onAddTag(newTag);
      setNewTagName('');
      setShowCreateForm(false);
      setShowDropdown(false);
      toast.success(t('tag.createSuccess'));
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error(t('tag.alreadyExists'));
      } else {
        toast.error(t('tag.createError'));
      }
    }
  };

  const availableTags = allTags.filter(tag => !selectedTags.some(t => t.id === tag.id));
  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddTag = (tag: Tag) => {
    onAddTag(tag);
    setSearch('');
    setShowDropdown(false);
  };

  const handleRemoveTag = (tagId: number) => {
    onRemoveTag(tagId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* عرض الوسوم المحددة */}
      <div className="flex flex-wrap gap-1 mb-2">
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full"
            style={{ backgroundColor: tag.color || '#e2e8f0', color: '#1e293b' }}
          >
            {tag.name}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="hover:text-red-600"
              >
                <FiX size={14} />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* حقل البحث عن الوسوم + زر الإنشاء السريع */}
      {!disabled && (
        <div className="relative">
          <div className="flex gap-1">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t('tag.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => {
                  setShowDropdown(true);
                  setShowCreateForm(false);
                }}
                className="input-field text-sm pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(true);
                setShowDropdown(false);
              }}
              className="px-2 py-2 bg-gray-100 dark:bg-dark-100 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-200 transition"
              title={t('tag.createNew')}
            >
              <FiPlus size={16} />
            </button>
          </div>

          {/* قائمة الوسوم المتاحة */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-100 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
              {filteredTags.length === 0 ? (
                <div className="p-2 text-center text-gray-500 text-sm">{t('common.noData')}</div>
              ) : (
                filteredTags.map(tag => (
                  <button
                    key={tag.id}
                    className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-100 flex items-center gap-2"
                    onClick={() => handleAddTag(tag)}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color || '#e2e8f0' }}
                    />
                    {tag.name}
                  </button>
                ))
              )}
            </div>
          )}

          {/* نموذج إنشاء وسم جديد */}
          {showCreateForm && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-100 rounded-lg shadow-lg p-3 z-10">
              <div className="mb-2">
                <label className="block text-xs font-medium mb-1">{t('tag.name')}</label>
                <input
                  ref={createInputRef}
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="input-field text-sm"
                  placeholder={t('tag.namePlaceholder')}
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1">{t('tag.color')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <span className="text-xs text-gray-500">{t('tag.clickToChoose')}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleCreateTag}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  {t('common.create')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagSelector;