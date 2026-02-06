'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Calendar, Download, ArrowLeft, Users, X } from 'lucide-react';

interface ClassOption {
  class: string;
  section: string;
  academic_year?: string;
}

interface AttendanceRow {
  attendance_date: string;
  student_name: string;
  admission_no: string;
  class: string;
  section: string;
  status: string;
  marked_by_name: string;
}

interface StudentSummary {
  student_name: string;
  admission_no: string;
  class: string;
  section: string;
  present: number;
  absent: number;
  other: number;
  totalMarked: number;
  percent: number | null;
}

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  };
}

export default function StudentAttendanceReportPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const defaultRange = useMemo(getDefaultDateRange, []);

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [reportRows, setReportRows] = useState<AttendanceRow[]>([]);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFrom, setDownloadFrom] = useState(defaultRange.from);
  const [downloadTo, setDownloadTo] = useState(defaultRange.to);
  const [downloadClass, setDownloadClass] = useState('');
  const [downloadSection, setDownloadSection] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const classList = useMemo(() => Array.from(new Set(classes.map((c) => c.class))).sort(), [classes]);
  const sectionList = useMemo(() => {
    if (!selectedClass) return [];
    return Array.from(new Set(classes.filter((c) => c.class === selectedClass).map((c) => c.section))).sort();
  }, [classes, selectedClass]);

  useEffect(() => {
    fetchClasses();
  }, [schoolCode]);

  useEffect(() => {
    if (schoolCode && selectedClass && selectedSection && fromDate && toDate) {
      fetchReport();
    } else {
      setReportRows([]);
    }
  }, [schoolCode, selectedClass, selectedSection, fromDate, toDate]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await res.json();
      if (res.ok && result.data) {
        const list = result.data.map((c: { class: string; section: string; academic_year?: string }) => ({
          class: c.class,
          section: c.section,
          academic_year: c.academic_year,
        }));
        setClasses(list);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
        from_date: fromDate,
        to_date: toDate,
        class: selectedClass,
        section: selectedSection,
      });
      const res = await fetch(`/api/students/attendance-report?${params}`);
      const result = await res.json();
      if (res.ok && result.data) {
        setReportRows(result.data);
      } else {
        setReportRows([]);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setReportRows([]);
    } finally {
      setLoading(false);
    }
  };

  const summaryByStudent = useMemo((): StudentSummary[] => {
    const byStudent = new Map<string, { name: string; admission_no: string; class: string; section: string; present: number; absent: number; other: number }>();
    reportRows.forEach((row) => {
      const key = `${row.student_name}|${row.admission_no}|${row.class}|${row.section}`;
      const existing = byStudent.get(key);
      const present = row.status === 'present' ? 1 : 0;
      const absent = row.status === 'absent' ? 1 : 0;
      const other = present || absent ? 0 : 1;
      if (existing) {
        existing.present += present;
        existing.absent += absent;
        existing.other += other;
      } else {
        byStudent.set(key, {
          name: row.student_name,
          admission_no: row.admission_no,
          class: row.class,
          section: row.section,
          present,
          absent,
          other,
        });
      }
    });
    return Array.from(byStudent.values()).map((s) => {
      const total = s.present + s.absent + s.other;
      return {
        student_name: s.name,
        admission_no: s.admission_no,
        class: s.class,
        section: s.section,
        present: s.present,
        absent: s.absent,
        other: s.other,
        totalMarked: total,
        percent: total > 0 ? Math.round((s.present / total) * 10000) / 100 : null,
      };
    });
  }, [reportRows]);

  const handleDownload = async () => {
    setDownloadError('');
    if (!downloadFrom || !downloadTo) {
      setDownloadError('Please select From and To dates.');
      return;
    }
    if (new Date(downloadFrom) > new Date(downloadTo)) {
      setDownloadError('From date must be before or equal to To date.');
      return;
    }
    if (!downloadClass || !downloadSection) {
      setDownloadError('Please select Class and Section.');
      return;
    }

    setDownloading(true);
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
        from_date: downloadFrom,
        to_date: downloadTo,
        class: downloadClass,
        section: downloadSection,
      });
      const res = await fetch(`/api/students/attendance-report?${params}`);
      const result = await res.json();
      if (!res.ok) {
        setDownloadError(result.error || 'Failed to fetch report.');
        return;
      }
      const data = (result.data || []) as AttendanceRow[];
      const headers = ['Date', 'Student Name', 'Admission No', 'Class', 'Section', 'Status', 'Marked By'];
      const escapeCsv = (val: unknown) => {
        const s = String(val ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const lines = [headers.join(','), ...data.map((row) => [row.attendance_date, row.student_name, row.admission_no, row.class, row.section, row.status, row.marked_by_name || 'N/A'].map(escapeCsv).join(','))];
      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `student_attendance_${downloadClass}_${downloadSection}_${downloadFrom}_to_${downloadTo}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      setShowDownloadModal(false);
    } catch (err) {
      setDownloadError('Failed to download. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/dashboard/${schoolCode}/students`)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="text-indigo-600" size={28} />
              Student Attendance Report
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Filter by class and section to view attendance
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setDownloadFrom(fromDate);
            setDownloadTo(toDate);
            setDownloadClass(selectedClass);
            setDownloadSection(selectedSection);
            setShowDownloadModal(true);
            setDownloadError('');
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Download size={18} className="mr-2" />
          Download
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
            >
              <option value="">Select class</option>
              {classList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-w-[120px] disabled:opacity-50"
            >
              <option value="">Select section</option>
              {sectionList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full min-w-[140px]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full min-w-[140px]" />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : !selectedClass || !selectedSection ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Users size={48} className="mb-3 text-gray-300" />
            <p className="font-medium">Select class and section</p>
            <p className="text-sm mt-1">Choose class and section above to view attendance.</p>
          </div>
        ) : summaryByStudent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Calendar size={48} className="mb-3 text-gray-300" />
            <p className="font-medium">No attendance data</p>
            <p className="text-sm mt-1">No marked attendance for this class/section in the selected date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Admission No</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Present</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Absent</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Other</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Total Marked</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {summaryByStudent.map((row) => (
                  <tr key={`${row.student_name}-${row.admission_no}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.student_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.admission_no}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{row.present}</td>
                    <td className="px-4 py-3 text-right text-red-600">{row.absent}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.other}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.totalMarked}</td>
                    <td className="px-4 py-3 text-right">
                      {row.percent != null ? (
                        <span className={`inline-flex px-2 py-1 rounded-lg text-sm font-semibold ${
                          row.percent >= 90 ? 'bg-green-100 text-green-800' :
                          row.percent >= 75 ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {row.percent}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !downloading && setShowDownloadModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Download Report</h2>
              <button type="button" onClick={() => !downloading && setShowDownloadModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Select date range, class and section to download the student attendance report (CSV).</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From date</label>
                  <Input type="date" value={downloadFrom} onChange={(e) => setDownloadFrom(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To date</label>
                  <Input type="date" value={downloadTo} onChange={(e) => setDownloadTo(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  value={downloadClass}
                  onChange={(e) => { setDownloadClass(e.target.value); setDownloadSection(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select class</option>
                  {classList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  value={downloadSection}
                  onChange={(e) => setDownloadSection(e.target.value)}
                  disabled={!downloadClass}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">Select section</option>
                  {downloadClass ? Array.from(new Set(classes.filter((c) => c.class === downloadClass).map((c) => c.section))).sort().map((s) => (
                    <option key={s} value={s}>{s}</option>
                  )) : null}
                </select>
              </div>
            </div>
            {downloadError && <p className="mt-2 text-sm text-red-600">{downloadError}</p>}
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowDownloadModal(false)} disabled={downloading}>Cancel</Button>
              <Button onClick={handleDownload} disabled={downloading || !downloadFrom || !downloadTo || !downloadClass || !downloadSection} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {downloading ? 'Downloading...' : 'Download CSV'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
