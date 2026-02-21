'use client';

import { use, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import { 
  Download, 
  Users, 
  UserCheck, 
  IndianRupee, 
  FileText,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Database,
  Sparkles,
  ArrowRight,
  Zap,
  BarChart3,
  DownloadCloud,
  Info,
  FileCheck,
  Bus,
  CalendarDays,
  BookOpen,
  Clock,
  GraduationCap,
} from 'lucide-react';

export default function ReportsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedDownloads, setCompletedDownloads] = useState<Set<string>>(new Set());

  const handleDownload = async (reportType: string) => {
    setDownloading(reportType);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch(`/api/reports/${reportType}?school_code=${schoolCode}`, {
        method: 'GET',
      });

      // Check if response is JSON (error) or CSV (success)
      const contentType = response.headers.get('content-type') || '';
      
      if (!response.ok) {
        // Try to parse error message from JSON response
        let errorMessage = 'Failed to download report';
        try {
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = text || errorMessage;
          }
        } catch {
          // If parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Check if response is CSV or plain text (some APIs return "No data available" as text/csv)
      if (!contentType.includes('text/csv') && !contentType.includes('application/octet-stream') && !contentType.includes('text/plain')) {
        try {
          const data = await response.json();
          if (data.error) {
            throw new Error(data.error || 'Invalid response format');
          }
        } catch {
          // Not JSON, continue with blob
        }
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Report file is empty');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${reportType}_report.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setCompletedDownloads(prev => new Set(prev).add(reportType));
      setSuccessMessage(`${reportOptions.find(r => r.id === reportType)?.title} downloaded successfully!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Error downloading report:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to download report. Please try again.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    const reportTypes = reportOptions.map(r => r.id);
    let successCount = 0;
    let failCount = 0;
    
    for (const reportType of reportTypes) {
      try {
        setDownloading(reportType);
        const response = await fetch(`/api/reports/${reportType}?school_code=${schoolCode}`, {
          method: 'GET',
        });

        const contentType = response.headers.get('content-type') || '';
        
        if (response.ok && (contentType.includes('text/csv') || contentType.includes('application/octet-stream') || contentType.includes('text/plain'))) {
          const blob = await response.blob();
          
          if (blob.size === 0) {
            failCount++;
            continue;
          }
          
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = `${reportType}_report.csv`;
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1].replace(/['"]/g, '');
            }
          }
          
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          setCompletedDownloads(prev => new Set(prev).add(reportType));
          successCount++;
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          // Try to get error message
          try {
            if (contentType.includes('application/json')) {
              const errorData = await response.json();
              console.error(`Error downloading ${reportType}:`, errorData.error || errorData.details);
            }
          } catch {
            // Ignore parse errors
          }
          failCount++;
        }
      } catch (error) {
        console.error(`Error downloading ${reportType}:`, error);
        failCount++;
      }
    }
    
    setDownloading(null);
    setDownloadingAll(false);
    
    if (successCount > 0) {
      setSuccessMessage(`Successfully downloaded ${successCount} report${successCount > 1 ? 's' : ''}!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
    if (failCount > 0) {
      setErrorMessage(`${failCount} report${failCount > 1 ? 's' : ''} failed to download.`);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const reportOptions = [
    {
      id: 'staff',
      title: 'Staff Information',
      description: 'Download complete staff details including personal information, roles, and contact details',
      icon: UserCheck,
      gradient: 'from-[#5A7A95] to-[#6B9BB8]',
      bgGradient: 'from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#2F4156]',
      borderColor: 'border-[#5A7A95]/30 dark:border-[#6B9BB8]/30',
      textColor: 'text-[#5A7A95] dark:text-[#6B9BB8]',
      stats: 'All staff records',
      features: ['Personal details', 'Roles & positions', 'Contact information', 'Employment history'],
    },
    {
      id: 'financial',
      title: 'Financial Information',
      description: 'Download fee collection reports, payment history, and financial summaries',
      icon: IndianRupee,
      gradient: 'from-[#6B9BB8] to-[#7DB5D3]',
      bgGradient: 'from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#2F4156]',
      borderColor: 'border-[#6B9BB8]/30 dark:border-[#7DB5D3]/30',
      textColor: 'text-[#6B9BB8] dark:text-[#7DB5D3]',
      stats: 'Fee & payment data',
      features: ['Fee collections', 'Payment history', 'Financial summaries', 'Transaction records'],
    },
    {
      id: 'student',
      title: 'Student Information',
      description: 'Download complete student details including admission info, class, and parent details',
      icon: Users,
      gradient: 'from-[#567C8D] to-[#5A7A95]',
      bgGradient: 'from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#2F4156]',
      borderColor: 'border-[#567C8D]/30 dark:border-[#5A7A95]/30',
      textColor: 'text-[#567C8D] dark:text-[#5A7A95]',
      stats: 'Complete student records',
      features: ['Admission details', 'Class & section info', 'Parent contacts', 'Academic records'],
    },
    {
      id: 'marks',
      title: 'Marks Information',
      description: 'Download student marks and examination results',
      icon: FileText,
      gradient: 'from-[#5A7A95] to-[#6B9BB8]',
      bgGradient: 'from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#2F4156]',
      borderColor: 'border-[#5A7A95]/30 dark:border-[#6B9BB8]/30',
      textColor: 'text-[#5A7A95] dark:text-[#6B9BB8]',
      stats: 'Examination results',
      features: ['Exam marks', 'Subject scores', 'Grades & percentages', 'Result history'],
    },
    {
      id: 'transport',
      title: 'Transport Information',
      description: 'Download transport routes, vehicles, stops, and student assignments',
      icon: Bus,
      gradient: 'from-[#6B9BB8] to-[#7DB5D3]',
      bgGradient: 'from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#2F4156]',
      borderColor: 'border-[#6B9BB8]/30 dark:border-[#7DB5D3]/30',
      textColor: 'text-[#6B9BB8] dark:text-[#7DB5D3]',
      stats: 'Transport & routes data',
      features: ['Route details', 'Vehicle information', 'Student assignments', 'Stop locations'],
    },
    {
      id: 'timetable',
      title: 'Timetable Information',
      description: 'Download class timetables, period schedules, and teacher assignments',
      icon: CalendarDays,
      gradient: 'from-[#5A7A95] to-[#6B9BB8]',
      bgGradient: 'from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#2F4156]',
      borderColor: 'border-[#5A7A95]/30 dark:border-[#6B9BB8]/30',
      textColor: 'text-[#5A7A95] dark:text-[#6B9BB8]',
      stats: 'Schedule & timetable data',
      features: ['Class schedules', 'Period timings', 'Teacher assignments', 'Subject allocation'],
    },
    {
      id: 'library',
      title: 'Library Information',
      description: 'Download library books, transactions, borrowers, and inventory details',
      icon: BookOpen,
      gradient: 'from-[#5A7A95] to-[#6B9BB8]',
      bgGradient: 'from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#2F4156]',
      borderColor: 'border-[#5A7A95]/30 dark:border-[#6B9BB8]/30',
      textColor: 'text-[#5A7A95] dark:text-[#6B9BB8]',
      stats: 'Library & books data',
      features: ['Book catalog', 'Issue records', 'Borrower details', 'Inventory status'],
    },
    {
      id: 'examination',
      title: 'Examination Information',
      description: 'Download examination schedules, subjects, and examination details',
      icon: GraduationCap,
      gradient: 'from-[#6B9BB8] to-[#7DB5D3]',
      bgGradient: 'from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#2F4156]',
      borderColor: 'border-[#6B9BB8]/30 dark:border-[#7DB5D3]/30',
      textColor: 'text-[#6B9BB8] dark:text-[#7DB5D3]',
      stats: 'Exam & schedule data',
      features: ['Exam schedules', 'Subject details', 'Exam dates', 'Class-wise exams'],
    },
    {
      id: 'leave',
      title: 'Leave Information',
      description: 'Download staff and student leave requests, leave types, and leave history',
      icon: Clock,
      gradient: 'from-[#567C8D] to-[#5A7A95]',
      bgGradient: 'from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#2F4156]',
      borderColor: 'border-[#567C8D]/30 dark:border-[#5A7A95]/30',
      textColor: 'text-[#567C8D] dark:text-[#5A7A95]',
      stats: 'Leave & attendance data',
      features: ['Leave requests', 'Leave types', 'Approval status', 'Leave history'],
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a]">
      {/* Header Section - compact */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#1e293b]/90 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700/50 p-4 md:p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-md shrink-0">
              <BarChart3 className="text-white" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Reports Center</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Download comprehensive reports in CSV format for analysis and record-keeping
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadAll}
            disabled={downloadingAll || !!downloading}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] hover:from-[#567C8D] hover:to-[#5A7A95] text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
          >
            {downloadingAll ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Downloading All...</span>
              </>
            ) : (
              <>
                <DownloadCloud size={18} />
                <span>Download All Reports</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 dark:border-emerald-400 rounded-lg shadow"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" size={18} />
              <p className="text-emerald-800 dark:text-emerald-200 text-sm font-medium">{successMessage}</p>
            </div>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-lg shadow"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={18} />
              <p className="text-red-800 dark:text-red-200 text-sm font-medium">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Cards Grid - compact, 3 cols on xl */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reportOptions.map((option, index) => {
          const Icon = option.icon;
          const isDownloading = downloading === option.id;
          const isCompleted = completedDownloads.has(option.id);
          const isTimetable = option.id === 'timetable';
          const borderColor = isTimetable ? 'border-indigo-200 dark:border-indigo-800/50' : option.borderColor;
          const bgGradient = isTimetable ? 'from-indigo-50 to-violet-100 dark:from-indigo-900/20 dark:to-violet-900/20' : option.bgGradient;
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
              className="group"
            >
              <Card className={`h-full overflow-hidden border-2 ${borderColor} bg-white dark:bg-[#1e293b]/90 hover:shadow-xl transition-all duration-200 relative`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-0 group-hover:opacity-20 transition-opacity duration-200 pointer-events-none`} />
                <div className="relative p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center text-white shadow-md flex-shrink-0`}
                    >
                      <Icon size={20} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                          {option.title}
                        </h3>
                        {isCompleted && (
                          <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center shrink-0">
                            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={14} />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {option.description}
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/80 dark:bg-gray-800/80 rounded border border-gray-200 dark:border-gray-600 mt-2">
                        <Database size={12} className="text-gray-500 dark:text-gray-400 shrink-0" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{option.stats}</span>
                      </div>
                    </div>
                  </div>
                  <ul className="mb-3 space-y-1">
                    {option.features.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${option.gradient} shrink-0`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleDownload(option.id)}
                    disabled={isDownloading || downloadingAll}
                    className={`w-full bg-gradient-to-r ${option.gradient} hover:shadow-lg text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all relative`}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        <span>Download Report</span>
                        <ArrowRight size={16} className="opacity-80 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </motion.button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info Section - compact */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/80 dark:from-[#1e293b] dark:via-[#2F4156]/80 dark:to-[#1e293b] border border-blue-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow shrink-0">
                <Info className="text-white" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="text-blue-600 dark:text-blue-400" size={18} />
                  About Reports
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                  All reports download as CSV (Excel, Google Sheets compatible). Filter, sort, and analyze as needed.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { icon: FileCheck, label: 'CSV Format', desc: 'All spreadsheet apps' },
                    { icon: Database, label: 'Complete Data', desc: 'All relevant info' },
                    { icon: Zap, label: 'Easy Analysis', desc: 'Filter & sort' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-white/70 dark:bg-gray-800/50 rounded-lg border border-gray-200/80 dark:border-gray-700"
                    >
                      <item.icon className="text-[#5A7A95] dark:text-[#6B9BB8] shrink-0" size={16} />
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white text-xs">{item.label}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Stats - compact */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { icon: FileText, label: 'Report Types', value: '9', color: 'from-[#5A7A95] to-[#6B9BB8]' },
          { icon: Download, label: 'Format', value: 'CSV', color: 'from-[#6B9BB8] to-[#7DB5D3]' },
          { icon: Database, label: 'Coverage', value: '100%', color: 'from-[#567C8D] to-[#5A7A95]' },
          { icon: Sparkles, label: 'Updated', value: 'Real-time', color: 'from-[#5A7A95] to-[#6B9BB8]' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-[#1e293b]/90 rounded-lg p-3 border border-gray-200 dark:border-gray-700/50 shadow-sm hover:shadow transition-all"
          >
            <div className={`w-8 h-8 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center mb-2`}>
              <stat.icon className="text-white" size={16} />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
