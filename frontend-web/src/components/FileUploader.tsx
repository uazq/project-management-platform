import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { FiUploadCloud } from 'react-icons/fi';

interface FileUploaderProps {
  onUpload: (files: File[]) => void;
  uploading?: boolean;
}

const FileUploader = ({ onUpload, uploading }: FileUploaderProps) => {
  const { t } = useTranslation();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    multiple: true,
    accept: {
      'image/*': [],
      'application/pdf': [],
      'application/msword': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
      'application/vnd.ms-excel': [],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
        isDragActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
      }`}
    >
      <input {...getInputProps()} />
      <FiUploadCloud className="mx-auto text-4xl text-gray-400 mb-2" />
      {uploading ? (
        <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
      ) : isDragActive ? (
        <p className="text-blue-600 dark:text-blue-400">{t('file.dragActive')}</p>
      ) : (
        <div>
          <p className="text-gray-600 dark:text-gray-300 mb-1">{t('file.dragAndDrop')}</p>
          <p className="text-xs text-gray-500">{t('file.acceptedFormats')}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;