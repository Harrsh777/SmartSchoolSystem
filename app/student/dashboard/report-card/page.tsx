'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Award, FileText, Eye, Download, Loader2 } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

interface ReportCardItem {
  id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  section: string;
  academic_year: string;
  created_at: string;
  sent_at: string;
}

export default function StudentReportCardPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [reportCards, setReportCards] = useState<ReportCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      try {
        const studentData = JSON.parse(storedStudent);
        setStudent(studentData);
        fetchReportCards(studentData);
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchReportCards = async (studentData: Student) => {
    const schoolCode = getString(studentData.school_code);
    const studentId = getString(studentData.id);
    if (!schoolCode || !studentId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        `/api/marks/report-card/student?school_code=${encodeURIComponent(schoolCode)}&student_id=${encodeURIComponent(studentId)}`
      );
      const data = await res.json();
      setReportCards(Array.isArray(data.data) ? data.data : []);
    } catch {
      setReportCards([]);
    } finally {
      setLoading(false);
    }
  };

  const viewUrl = (id: string) => {
    if (!student) return `/api/marks/report-card/${id}`;
    const sid = getString(student.id);
    return `/api/marks/report-card/${id}?student_id=${encodeURIComponent(sid)}&_t=${Date.now()}`;
  };

  const handleView = (id: string) => {
    window.open(viewUrl(id), '_blank', 'noopener,noreferrer');
  };

  const handleDownload = (item: ReportCardItem) => {
    const url = viewUrl(item.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_card_${(item.student_name || '').replace(/\s+/g, '_')}_${(item.academic_year || '').replace(/\s+/g, '_')}.html`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#1e3a8a] mx-auto mb-4" />
          <p className="text-gray-600">Loading report cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <Award className="text-white" size={24} />
            </div>
            Report Card
          </h1>
          <p className="text-gray-600 mt-1">
            Report cards sent to you by the school. View or download them here.
          </p>
        </div>
      </motion.div>

      <Card className="overflow-hidden">
        {reportCards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 px-6 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="text-gray-400" size={40} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No report cards yet</h2>
            <p className="text-gray-500 max-w-sm mx-auto">
              When your teacher sends your report card, it will appear here. Check back after results are published.
            </p>
          </motion.div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reportCards.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-gray-50/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    Report Card — {item.academic_year || 'Academic Year'}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Sent on {item.sent_at ? new Date(item.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(item.id)}
                    className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a]/10"
                  >
                    <Eye size={18} className="mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(item)}
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  >
                    <Download size={18} className="mr-2" />
                    Download
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
