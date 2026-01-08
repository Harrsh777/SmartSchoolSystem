'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  FileText,
  Search,
  Download,
  Printer,
  Eye,
  Filter,
  Users,
  BookOpen,
  Calendar,
  Loader2
} from 'lucide-react';

interface ReportCard {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class: string;
  section: string;
  exam_name: string;
  academic_year: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string;
  status: 'generated' | 'pending';
}

export default function ReportCardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedExam, setSelectedExam] = useState('');

  // Mock data
  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];
  const exams = [
    { id: '1', name: 'Unit Test 1', academic_year: '2024-2025' },
    { id: '2', name: 'Mid Term Exam', academic_year: '2024-2025' },
  ];

  const mockReportCards: ReportCard[] = [
    {
      id: '1',
      student_id: '1',
      student_name: 'John Doe',
      admission_no: 'STU001',
      class: '10',
      section: 'A',
      exam_name: 'Mid Term Exam',
      academic_year: '2024-2025',
      total_marks: 500,
      obtained_marks: 425,
      percentage: 85,
      grade: 'A',
      status: 'generated',
    },
    {
      id: '2',
      student_id: '2',
      student_name: 'Jane Smith',
      admission_no: 'STU002',
      class: '10',
      section: 'A',
      exam_name: 'Mid Term Exam',
      academic_year: '2024-2025',
      total_marks: 500,
      obtained_marks: 380,
      percentage: 76,
      grade: 'B+',
      status: 'generated',
    },
  ];

  useEffect(() => {
    // TODO: Fetch report cards based on filters
    setReportCards(mockReportCards);
  }, [selectedClass, selectedSection, selectedExam]);

  const handleGenerate = async () => {
    setLoading(true);
    // TODO: Implement API call
    setTimeout(() => {
      setLoading(false);
      alert('Report cards generated successfully!');
    }, 1000);
  };

  const handlePreview = (id: string) => {
    // TODO: Implement preview
    console.log('Preview report card:', id);
  };

  const handleDownload = (id: string) => {
    // TODO: Implement download
    console.log('Download report card:', id);
  };

  const handlePrint = (id: string) => {
    // TODO: Implement print
    console.log('Print report card:', id);
  };

  const filteredReportCards = reportCards.filter(card =>
    card.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.admission_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800 border-green-200';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
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
              <FileText className="text-white" size={24} />
            </div>
            Report Card
          </h1>
          <p className="text-gray-600">Generate and manage student report cards</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={loading || !selectedClass || !selectedSection || !selectedExam}
            className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText size={18} className="mr-2" />
                Generate Report Cards
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <BookOpen size={14} className="inline mr-1" />
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
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
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
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
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Examinations</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students..."
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Report Cards List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Admission No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Class-Section</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Examination</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Marks</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Percentage</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Grade</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReportCards.map((card, index) => (
                <motion.tr
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{card.admission_no}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{card.student_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{card.class}-{card.section}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{card.exam_name}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                    {card.obtained_marks} / {card.total_marks}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-gray-900">
                    {card.percentage}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getGradeColor(card.grade)}`}>
                      {card.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      card.status === 'generated' 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}>
                      {card.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handlePreview(card.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownload(card.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handlePrint(card.id)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Print"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Empty State */}
      {filteredReportCards.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No report cards found</p>
            <p className="text-sm text-gray-400 mt-1">
              {selectedClass && selectedSection && selectedExam 
                ? 'Generate report cards for the selected criteria'
                : 'Select class, section, and examination to view report cards'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}



