import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Task, User } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FiFileText, FiFile } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface ReportExportProps {
  projectName: string;
  tasks: Task[];
  members: User[];
}

const ReportExport = ({ projectName, tasks, members }: ReportExportProps) => {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t => t.status === 'overdue').length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const memberRows = members.map(m => {
    const memberTasks = tasks.filter(t => t.assigneeId === m.id);
    const completed = memberTasks.filter(t => t.status === 'completed').length;
    const total = memberTasks.length;
    const rate = total ? Math.round((completed / total) * 100) : 0;
    return [
      m.fullName,
      total.toString(),
      completed.toString(),
      (total - completed).toString(),
      `${rate}%`
    ];
  });

  const exportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      
      // عنوان التقرير
      doc.setFontSize(18);
      doc.text('Project Report', 14, 22);
      
      // معلومات المشروع
      doc.setFontSize(12);
      doc.text(`Project Name: ${projectName}`, 14, 32);
      doc.text(`Total Tasks: ${totalTasks}`, 14, 40);
      doc.text(`Completed Tasks: ${completedTasks}`, 14, 48);
      doc.text(`Overdue Tasks: ${overdueTasks}`, 14, 56);
      doc.text(`Completion Rate: ${completionRate}%`, 14, 64);

      // جدول أداء الأعضاء
      autoTable(doc, {
        startY: 70,
        head: [['Member', 'Total Tasks', 'Completed', 'Pending', 'Rate']],
        body: memberRows,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] },
      });

      doc.save(`${projectName}_report.pdf`);
      toast.success(t('export.pdfSuccess'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('export.pdfError'));
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // ورقة الملخص
      const summaryData = [
        ['Project Report'],
        ['Project Name', projectName],
        ['Total Tasks', totalTasks],
        ['Completed Tasks', completedTasks],
        ['Overdue Tasks', overdueTasks],
        ['Completion Rate', `${completionRate}%`],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Overview');

      // ورقة أداء الأعضاء
      const memberSheetData = [
        ['Member', 'Total Tasks', 'Completed', 'Pending', 'Rate'],
        ...memberRows
      ];
      const memberSheet = XLSX.utils.aoa_to_sheet(memberSheetData);
      XLSX.utils.book_append_sheet(wb, memberSheet, 'Members');

      XLSX.writeFile(wb, `${projectName}_report.xlsx`);
      toast.success(t('export.excelSuccess'));
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error(t('export.excelError'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportPDF}
        disabled={exporting}
        className="btn-secondary inline-flex items-center gap-1 text-sm"
      >
        <FiFileText size={16} /> {exporting ? t('common.loading') : t('export.pdf')}
      </button>
      <button
        onClick={exportExcel}
        disabled={exporting}
        className="btn-secondary inline-flex items-center gap-1 text-sm"
      >
        <FiFile size={16} /> {exporting ? t('common.loading') : t('export.excel')}
      </button>
    </div>
  );
};

export default ReportExport;