import {
  FiFile,
  FiImage,
  FiFileText,
  FiFileMinus,
  FiFilePlus,
} from 'react-icons/fi';

export const getFileIcon = (fileName: string, className: string = 'text-gray-500') => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
      return <FiImage className={className} />;
    case 'pdf':
      return <FiFileText className={className} />;
    case 'doc':
    case 'docx':
      return <FiFileText className={className} />;
    case 'xls':
    case 'xlsx':
      return <FiFileMinus className={className} />;
    case 'txt':
      return <FiFilePlus className={className} />;
    default:
      return <FiFile className={className} />;
  }
};