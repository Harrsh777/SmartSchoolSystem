'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  FileBarChart,
  Download,
  Filter,
  TrendingUp,
  Users,
  BookOpen,
  Calendar,
  Award,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'attendance' | 'comparative' | 'summary';
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export default function ReportsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    class: '',
    section: '',
    exam: '',
    startDate: '',
    endDate: '',
  });

  const reports: Report[] = [
    {
      id: 'performance',
      name: 'Student Performance Report',
      description: 'Detailed performance analysis for individual students',
      type: 'performance',
      icon: TrendingUp,
    },
    {
      id: 'class-performance',
      name: 'Class Performance Report',
      description: 'Overall class performance and statistics',
      type: 'performance',
      icon: BarChart3,
    },
    {
      id: 'subject-wise',
      name: 'Subject-wise Performance',
      description: 'Performance breakdown by subject',
      type: 'performance',
      icon: PieChart,
    },
    {
      id: 'comparative',
      name: 'Comparative Report',
      description: 'Compare performance across exams or classes',
      type: 'comparative',
      icon: LineChart,
    },
    {
      id: 'attendance',
      name: 'Attendance Report',
      description: 'Student attendance statistics and trends',
      type: 'attendance',
      icon: Calendar,
    },
    {
      id: 'summary',
      name: 'Summary Report',
      description: 'Overall academic summary and insights',
      type: 'summary',
      icon: FileBarChart,
    },
  ];

  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];
  const exams = [
    { id: '1', name: 'Unit Test 1', academic_year: '2024-2025' },
    { id: '2', name: 'Mid Term Exam', academic_year: '2024-2025' },
  ];

  const handleGenerateReport = (reportId: string) => {
    setSelectedReport(reportId);
    // TODO: Implement report generation
    console.log('Generating report:', reportId, filters);
  };

  const handleDownload = (reportId: string) => {
    // TODO: Implement download
    console.log('Downloading report:', reportId);
  };

  const getReportColor = (type: string) => {
    switch (type) {
      case 'performance': return 'from-blue-500 to-blue-600';
      case 'attendance': return 'from-green-500 to-green-600';
      case 'comparative': return 'from-purple-500 to-purple-600';
      case 'summary': return 'from-orange-500 to-orange-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <FileBarChart className="text-white" size={24} />
            </div>
            Reports
          </h1>
          <p className="text-gray-600">Generate and view examination reports</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
          className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-500" />
          <h3 className="text-lg font-bold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <BookOpen size={14} className="inline mr-1" />
              Class
            </label>
            <select
              value={filters.class}
              onChange={(e) => setFilters({ ...filters, class: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Section
            </label>
            <select
              value={filters.section}
              onChange={(e) => setFilters({ ...filters, section: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Sections</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar size={14} className="inline mr-1" />
              Examination
            </label>
            <select
              value={filters.exam}
              onChange={(e) => setFilters({ ...filters, exam: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Examinations</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Start Date
            </label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              End Date
            </label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, index) => {
          const Icon = report.icon;
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-xl transition-all">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getReportColor(report.type)} flex items-center justify-center mb-4`}>
                  <Icon className="text-white" size={28} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{report.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleGenerateReport(report.id)}
                    className="flex-1 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                  >
                    Generate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(report.id)}
                    className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
                  >
                    <Download size={16} />
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Report Preview/Results */}
      {selectedReport && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {reports.find(r => r.id === selectedReport)?.name}
            </h3>
            <Button
              variant="outline"
              onClick={() => setSelectedReport(null)}
              className="border-gray-300"
            >
              Close
            </Button>
          </div>
          <div className="text-center py-12">
            <FileBarChart size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">Report preview will appear here</p>
            <p className="text-sm text-gray-400 mt-1">Backend integration pending</p>
          </div>
        </Card>
      )}
    </div>
  );
}



