'use client';

import { use, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import { 
  Download, 
  Users, 
  UserCheck, 
  DollarSign, 
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

      // Check if response is CSV
      if (!contentType.includes('text/csv') && !contentType.includes('application/octet-stream')) {
        // Might be JSON error even with 200 status
        try {
          const data = await response.json();
          if (data.error) {
            throw new Error(data.error || 'Invalid response format');
          }
        } catch {
          // Not JSON, continue with blob
        }
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Verify blob is not empty and is actually CSV-like
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
        
        if (response.ok && (contentType.includes('text/csv') || contentType.includes('application/octet-stream'))) {
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
      icon: DollarSign,
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
      gradient: 'from-indigo-500 to-violet-600',
      bgGradient: 'from-indigo-50 to-violet-100',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-700',
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
    <div className="space-y-6 pb-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg">
              <BarChart3 className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Reports Center</h1>
              <p className="text-gray-600 text-sm md:text-base">
                Download comprehensive reports in CSV format for analysis and record-keeping
              </p>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadAll}
            disabled={downloadingAll || !!downloading}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] hover:from-[#567C8D] hover:to-[#5A7A95] text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {downloadingAll ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Downloading All...</span>
              </>
            ) : (
              <>
                <DownloadCloud size={20} />
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
            className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl shadow-lg"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={20} />
              <p className="text-emerald-800 font-medium">{successMessage}</p>
            </div>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl shadow-lg"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-red-800 font-medium">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reportOptions.map((option, index) => {
          const Icon = option.icon;
          const isDownloading = downloading === option.id;
          const isCompleted = completedDownloads.has(option.id);
          
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Card className={`h-full overflow-hidden border-2 ${option.borderColor} bg-white hover:shadow-2xl transition-all duration-300 relative`}>
                {/* Gradient Background Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${option.bgGradient} opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />
                
                <div className="relative p-6 md:p-8">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-6">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}
                    >
                      <Icon size={28} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                            {option.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            {option.description}
                          </p>
                        </div>
                        {isCompleted && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex-shrink-0"
                          >
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="text-emerald-600" size={18} />
                            </div>
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Stats Badge */}
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 mb-4">
                        <Database size={14} className="text-gray-500" />
                        <span className="text-xs font-medium text-gray-700">{option.stats}</span>
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mb-6">
                    <div className="grid grid-cols-2 gap-2">
                      {option.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${option.gradient}`} />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Download Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDownload(option.id)}
                    disabled={isDownloading || downloadingAll}
                    className={`w-full bg-gradient-to-r ${option.gradient} hover:shadow-xl text-white px-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden group`}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Generating Report...</span>
                      </>
                    ) : (
                      <>
                        <Download size={20} />
                        <span>Download Report</span>
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                    
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </motion.button>
                </div>

                {/* Decorative corner accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${option.gradient} opacity-5 rounded-bl-full`} />
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200/50 overflow-hidden relative">
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
          
          <div className="relative p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Info className="text-white" size={24} />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="text-blue-600" size={22} />
                  About Reports
                </h4>
                <p className="text-gray-700 leading-relaxed mb-4">
                  All reports are downloaded in CSV format, which can be opened in Excel, Google Sheets, 
                  or any spreadsheet application. Reports include all relevant data and can be filtered, 
                  sorted, and analyzed as needed.
                </p>
                
                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {[
                    { icon: FileCheck, label: 'CSV Format', desc: 'Compatible with all spreadsheet apps' },
                    { icon: Database, label: 'Complete Data', desc: 'All relevant information included' },
                    { icon: Zap, label: 'Easy Analysis', desc: 'Filter, sort, and analyze easily' },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-white/60 dark:bg-[#2F4156]/60 backdrop-blur-sm rounded-lg border border-[#5A7A95]/30 dark:border-[#6B9BB8]/30"
                    >
                      <item.icon className="text-[#5A7A95] dark:text-[#6B9BB8] flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{item.label}</div>
                        <div className="text-xs text-gray-600">{item.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { icon: FileText, label: 'Report Types', value: '9', color: 'from-[#5A7A95] to-[#6B9BB8]' },
          { icon: Download, label: 'Download Format', value: 'CSV', color: 'from-[#6B9BB8] to-[#7DB5D3]' },
          { icon: Database, label: 'Data Coverage', value: '100%', color: 'from-[#567C8D] to-[#5A7A95]' },
          { icon: Sparkles, label: 'Always Updated', value: 'Real-time', color: 'from-[#5A7A95] to-[#6B9BB8]' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4 }}
            className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className="text-white" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-xs text-gray-600">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
