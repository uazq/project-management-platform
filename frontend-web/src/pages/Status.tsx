import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';

const Status = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get('/status');
      setStatus(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('status.title')}</h1>
      <div className="card">
        {loading ? (
          <div className="text-center py-8">{t('common.loading')}</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{t('status.unavailable')}</div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4">
              {status?.services?.api === 'up' ? (
                <FiCheckCircle className="text-green-500" size={24} />
              ) : (
                <FiXCircle className="text-red-500" size={24} />
              )}
              <span className="font-medium">API</span>
              <span className={`badge ${status?.services?.api === 'up' ? 'badge-success' : 'badge-danger'}`}>
                {status?.services?.api === 'up' ? t('status.up') : t('status.down')}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              {status?.services?.database === 'connected' ? (
                <FiCheckCircle className="text-green-500" size={24} />
              ) : (
                <FiXCircle className="text-red-500" size={24} />
              )}
              <span className="font-medium">{t('status.database')}</span>
              <span className={`badge ${status?.services?.database === 'connected' ? 'badge-success' : 'badge-danger'}`}>
                {status?.services?.database === 'connected' ? t('status.connected') : t('status.disconnected')}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {t('status.lastChecked')}: {new Date(status.timestamp).toLocaleString()}
            </p>
            <button
              onClick={fetchStatus}
              className="mt-4 inline-flex items-center gap-2 text-sm text-primary-600 hover:underline"
            >
              <FiRefreshCw size={14} /> {t('status.refresh')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Status;