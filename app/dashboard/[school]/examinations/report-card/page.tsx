'use client';

import { use, useState, useEffect, useMemo } from 'react';
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
  BookOpen,
  Calendar,
  Loader2
} from 'lucide-react';

interface ReportCard {
  student_id: string;
  student_name: string;
  admission_no: string;
  class: string;
  section: string;
  roll_number?: string;
  exam_id: string;
  exam_name: string;
  academic_year: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string;
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
  const [exams, setExams] = useState<Array<{ id: string; exam_name: string; academic_year?: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; class: string; section: string }>>([]);
  const [previewing, setPreviewing] = useState(false);
  const [, setPreviewUrl] = useState<string | null>(null);

  const sections = useMemo(() => {
    const set = new Set<string>();
    for (const c of classes) {
      if (c.section) set.add(c.section);
    }
    return Array.from(set).sort();
  }, [classes]);

  useEffect(() => {
    // Load filters data (exams + classes)
    const run = async () => {
      try {
        const [examsRes, classesRes] = await Promise.all([
          fetch(`/api/examinations/v2/list?school_code=${schoolCode}`),
          fetch(`/api/classes?school_code=${schoolCode}`),
        ]);
        const examsRaw = await examsRes.text();
        const classesRaw = await classesRes.text();
        const examsJson = examsRaw ? JSON.parse(examsRaw) : {};
        const classesJson = classesRaw ? JSON.parse(classesRaw) : {};

        if (examsRes.ok) {
          const list = Array.isArray(examsJson.data) ? examsJson.data : [];
          setExams(list.map((e: { id: string; exam_name?: string; name?: string; academic_year?: string }) => ({ id: e.id, exam_name: e.exam_name || e.name || 'Exam', academic_year: e.academic_year })));
        }
        if (classesRes.ok) {
          const list = Array.isArray(classesJson.data) ? classesJson.data : [];
          setClasses(list.map((c: { id: string; class: string; section: string }) => ({ id: c.id, class: c.class, section: c.section })));
        }
      } catch {
        // ignore filter bootstrap failures; page can still work partially
      }
    };
    run();
  }, [schoolCode]);

  const fetchReportCards = async () => {
    if (!selectedExam) {
      setReportCards([]);
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams({ school_code: schoolCode, exam_id: selectedExam });
      // NOTE: marks/view filters class & section in-memory; still pass them for client-side filtering later.
      const response = await fetch(`/api/marks/view?${qs.toString()}`);
      const raw = await response.text();
      const result = raw ? JSON.parse(raw) : {};
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load report cards');
      }

      const summaries = Array.isArray(result.data) ? result.data : [];
      const mapped: ReportCard[] = summaries.map((s: { student_id?: string; student?: { student_name?: string; admission_no?: string; roll_number?: string; class?: string; section?: string }; exam_id?: string; exam?: { exam_name?: string; academic_year?: string }; [key: string]: unknown }) => ({
        student_id: s.student_id,
        student_name: s.student?.student_name || 'N/A',
        admission_no: s.student?.admission_no || 'N/A',
        roll_number: s.student?.roll_number || undefined,
        class: s.student?.class || '',
        section: s.student?.section || '',
        exam_id: s.exam_id,
        exam_name: s.exam?.exam_name || 'Exam',
        academic_year: s.exam?.academic_year || '',
        total_marks: Number(s.total_max_marks ?? s.total_marks ?? 0),
        obtained_marks: Number(s.total_marks ?? 0),
        percentage: Number(s.percentage ?? 0),
        grade: String(s.grade ?? ''),
      }));
      setReportCards(mapped);
    } catch (e) {
      console.error(e);
      setReportCards([]);
      alert(e instanceof Error ? e.message : 'Failed to load report cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam]);

  const handleGenerate = async () => {
    // For single-exam report cards, PDF is generated on-demand per student.
    // This button just refreshes the list (to feel “production-ready”).
    await fetchReportCards();
  };

  const getPdfUrl = (card: ReportCard) =>
    `/api/marks/report-card?school_code=${encodeURIComponent(schoolCode)}&student_id=${encodeURIComponent(card.student_id)}&exam_id=${encodeURIComponent(card.exam_id)}`;

  const handlePreview = async (card: ReportCard) => {
    try {
      setPreviewing(true);
      setPreviewUrl(null);
      const res = await fetch(getPdfUrl(card));
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to generate PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to preview');
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownload = (card: ReportCard) => {
    // Let browser handle attachment filename from API headers
    window.location.href = getPdfUrl(card);
  };

  const handlePrint = async (card: ReportCard) => {
    try {
      setPreviewing(true);
      const res = await fetch(getPdfUrl(card));
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to generate PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) throw new Error('Popup blocked');
      // Give the PDF viewer time to load before printing
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch {
          // ignore
        }
      }, 700);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to print');
    } finally {
      setPreviewing(false);
    }
  };

  const filteredReportCards = reportCards.filter(card =>
    (card.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (card.admission_no || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredByClassSection = filteredReportCards.filter((c) => {
    if (selectedClass && c.class !== selectedClass) return false;
    if (selectedSection && c.section !== selectedSection) return false;
    return true;
  });

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
            disabled={loading || !selectedExam}
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
                Refresh List
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
              {[...new Set(classes.map((c) => c.class))].map(cls => (
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
              <option value="">Select Examination</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.exam_name} {exam.academic_year ? `(${exam.academic_year})` : ''}</option>
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
              {filteredByClassSection.map((card, index) => (
                <motion.tr
                  key={`${card.exam_id}_${card.student_id}`}
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
                      'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      generated
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handlePreview(card)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Preview"
                        disabled={previewing}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownload(card)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Download"
                        disabled={previewing}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handlePrint(card)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Print"
                        disabled={previewing}
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
      {filteredByClassSection.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No report cards found</p>
            <p className="text-sm text-gray-400 mt-1">
              {selectedExam
                ? 'No results for current filters'
                : 'Select an examination to view report cards'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}



