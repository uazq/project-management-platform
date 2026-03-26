import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { FiSearch, FiX, FiFolder, FiCheckCircle, FiMessageSquare } from 'react-icons/fi';

interface SearchResult {
  type: 'project' | 'task' | 'discussion';
  id: number;
  title: string;
  description?: string;
  projectId?: number;
  projectName?: string;
}

const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{part}</mark> : part
  );
};

const SearchBar = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'project') {
      navigate(`/projects/${result.id}`);
    } else {
      navigate(`/projects/${result.projectId}`);
    }
    setShowResults(false);
    setQuery('');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'project': return <FiFolder className="mt-1 text-blue-500" />;
      case 'task': return <FiCheckCircle className="mt-1 text-green-500" />;
      case 'discussion': return <FiMessageSquare className="mt-1 text-purple-500" />;
      default: return null;
    }
  };

  return (
    <div className="relative flex-1 max-w-md" ref={searchRef}>
      <div className="relative">
        <FiSearch className="absolute right-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder={t('common.search')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute left-2 top-2.5 text-gray-400 hover:text-gray-600">
            <FiX size={18} />
          </button>
        )}
      </div>
      {showResults && (query.length > 0 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((r, i) => (
                <div
                  key={i}
                  onClick={() => handleSelect(r)}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-start gap-3"
                >
                  {getIcon(r.type)}
                  <div>
                    <p className="font-medium">{highlightMatch(r.title, query)}</p>
                    <p className="text-xs text-gray-500">
                      {r.type === 'project' ? t('common.projects') :
                       r.type === 'task' ? t('common.tasks') : t('discussions.title')}
                      {r.projectName && ` • ${r.projectName}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">{t('common.noData')}</div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;