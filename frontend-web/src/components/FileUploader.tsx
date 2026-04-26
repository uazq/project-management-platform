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
    maxSize: 20 * 1024 * 1024,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar']
    }
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
        isDragActive
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
      }`}
    >
      <input {...getInputProps()} />
      <FiUploadCloud className="mx-auto text-4xl text-gray-400 mb-2" />
      {uploading ? (
        <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
      ) : isDragActive ? (
        <p className="text-primary-600 dark:text-primary-400">{t('file.dragActive')}</p>
      ) : (
        <div>
          <p className="text-gray-600 dark:text-gray-300 mb-1">{t('file.dragAndDrop')}</p>
          <p className="text-xs text-gray-500">{t('file.acceptedFormats')}</p>
          <p className="text-xs text-gray-400 mt-1">(حد أقصى 20 ميجابايت لكل ملف)</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;