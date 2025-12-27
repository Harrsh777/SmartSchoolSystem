'use client';

import { use, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  Download, 
  Users, 
  UserCheck, 
  DollarSign, 
  FileText,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';

export default function ReportsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (reportType: string) => {
    setDownloading(reportType);
    try {
      const response = await fetch(`/api/reports/${reportType}?school_code=${schoolCode}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${reportType}_report.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const reportOptions = [
    {
      id: 'staff',
      title: 'Staff Information',
      description: 'Download complete staff details including personal information, roles, and contact details',
      icon: UserCheck,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
    {
      id: 'financial',
      title: 'Financial Information',
      description: 'Download fee collection reports, payment history, and financial summaries',
      icon: DollarSign,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      id: 'student',
      title: 'Student Information',
      description: 'Download complete student details including admission info, class, and parent details',
      icon: Users,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    },
    {
      id: 'marks',
      title: 'Marks Information',
      description: 'Download student marks and examination results',
      icon: FileText,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Reports</h1>
          <p className="text-gray-600">Download comprehensive reports in CSV format</p>
        </div>
      </motion.div>

      {/* Report Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportOptions.map((option, index) => {
          const Icon = option.icon;
          const isDownloading = downloading === option.id;
          
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <div className="flex flex-col h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 ${option.color} rounded-lg`}>
                      <Icon className="text-white" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {option.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-200">
                    <Button
                      onClick={() => handleDownload(option.id)}
                      disabled={isDownloading}
                      className={`w-full ${option.color} ${option.hoverColor} text-white`}
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 size={18} className="mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download size={18} className="mr-2" />
                          Download Report
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="text-blue-600 flex-shrink-0 mt-1" size={20} />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">About Reports</h4>
              <p className="text-sm text-blue-800">
                All reports are downloaded in CSV format, which can be opened in Excel, Google Sheets, or any spreadsheet application. 
                Reports include all relevant data and can be filtered, sorted, and analyzed as needed.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

