'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Users,
  BookOpen,
  Info,
  X,
} from 'lucide-react';

interface ExamClassMapping {
  class_id: string;
  class?: { id: string; class: string; section: string };
}

interface SubjectMapping {
  class_id?: string;
  subject_id: string;
  max_marks?: number;
  subject?: { id: string; name: string };
}

interface Exam {
  id: string;
  exam_name: string;
  academic_year?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  class_mappings?: ExamClassMapping[];
  subject_mappings?: SubjectMapping[];
}

interface RosterStudent {
  id: string;
  admission_no: string;
  student_name?: string;
  first_name?: string;
  last_name?: string;
  roll_number?: string;
}

type UploadResult = {
  ok?: boolean;
  saved_count?: number;
  skipped_empty_marks?: number;
  failed?: Array<{ excel_row: number; reason: string; student_id?: string; admission_no?: string }>;
  message?: string;
  error?: string;
  code?: string;
};

function isBulkMarksModalError(result: UploadResult): boolean {
  return Boolean(result.error) && result.saved_count === undefined;
}

/** Short title + plain-language hint for staff; API text kept as fallback in detail. */
function getFriendlyBulkMarksModalCopy(result: UploadResult): { title: string; hint?: string } {
  if (!isBulkMarksModalError(result)) {
    return { title: result.message || 'Done' };
  }
  const code = result.code;
  const api = (result.error || '').trim();

  switch (code) {
    case 'EXCEL_SUBJECT_MISMATCH':
      return {
        title: 'This Excel file doesn’t match the subject you selected',
        hint:
          api ||
          'The spreadsheet is for a different subject than the one you chose above. In Step 1 pick the correct subject, download that template, fill marks, then upload.',
      };
    case 'EXCEL_MAX_MARKS_MISMATCH':
      return {
        title: 'The “maximum marks” in the file don’t match this exam',
        hint:
          api ||
          'Download a new template and do not change the Subject or Maximum marks rows at the top — only the Marks column.',
      };
    case 'INVALID_TEMPLATE_META':
      return {
        title: 'The top of your Excel file is wrong or incomplete',
        hint:
          api ||
          'Your sheet should list Subject and Maximum marks above the student table. Download the template again from this page.',
      };
    case 'INVALID_TEMPLATE_HEADERS':
      return {
        title: 'The column headers in the table don’t match the template',
        hint:
          api ||
          'Don’t rename, remove, or reorder columns. Download the template again and edit only the Marks column.',
      };
    case 'EXAM_LOCKED':
      return {
        title: 'Marks can’t be entered for this exam anymore',
        hint: 'This exam is closed or locked for mark entry. Contact your administrator if you still need to add marks.',
      };
    case 'CLASS_MARKS_LOCKED':
      return {
        title: 'Marks are locked for this class',
        hint: 'Someone has already finalised or locked marks for this class. You’ll need an admin to unlock or change them.',
      };
    case 'SUBJECT_MISMATCH':
      return {
        title: 'This subject isn’t in the exam for this class',
        hint: 'Go back and choose a subject that is actually linked to this exam and class.',
      };
    case 'NO_STAFF_FOR_AUDIT':
      return {
        title: 'The school needs at least one staff record',
        hint: 'Marks must be linked to a staff member. Ask an admin to add an active staff profile for the school, or log in as a teacher to upload.',
      };
    default:
      if (/rate limit|too many uploads/i.test(api)) {
        return {
          title: 'Too many uploads in a short time',
          hint: 'Please wait about a minute and try again.',
        };
      }
      if (/template download|too many template/i.test(api)) {
        return {
          title: 'Too many template downloads',
          hint: 'Wait a minute, then download again.',
        };
      }
      return {
        title: 'We couldn’t finish that',
        hint: api || 'Please try again. If it keeps happening, contact support with a screenshot.',
      };
  }
}

type BulkActor = 'loading' | 'staff' | 'school' | 'none';

export default function DashboardBulkMarksUploadPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [staff, setStaff] = useState<Record<string, unknown> | null>(null);
  const [actor, setActor] = useState<BulkActor>('loading');
  const [exams, setExams] = useState<Exam[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rawStaff = sessionStorage.getItem('staff');
      if (rawStaff) {
        try {
          const s = JSON.parse(rawStaff) as Record<string, unknown>;
          if (s?.id) {
            if (!cancelled) {
              setStaff(s);
              setActor('staff');
            }
            return;
          }
        } catch {
          /* ignore */
        }
      }
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        const data = res.ok ? ((await res.json()) as { role?: string; school_code?: string }) : null;
        if (
          !cancelled &&
          data?.role === 'school' &&
          data.school_code &&
          String(data.school_code).toUpperCase() === schoolCode.toUpperCase()
        ) {
          setActor('school');
          return;
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setActor('none');
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolCode]);

  useEffect(() => {
    if (!schoolCode) return;
    void (async () => {
      try {
        setExamsLoading(true);
        const res = await fetch(
          `/api/examinations/v2/list?school_code=${encodeURIComponent(schoolCode)}`,
          { credentials: 'include' }
        );
        const json = await res.json();
        if (res.ok && json.data) {
          const rows = (json.data as Record<string, unknown>[]).map((e) => ({
            ...(e as object),
            exam_name: String((e as { exam_name?: string; name?: string }).exam_name || (e as { name?: string }).name || 'Exam'),
          })) as Exam[];
          setExams(rows);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setExamsLoading(false);
      }
    })();
  }, [schoolCode]);

  const classOptions = useMemo(() => {
    if (!selectedExam?.class_mappings) return [];
    return selectedExam.class_mappings;
  }, [selectedExam]);

  const subjectOptions = useMemo(() => {
    if (!selectedExam?.subject_mappings || !selectedClassId) return [];
    return selectedExam.subject_mappings.filter((sm) => sm.class_id === selectedClassId);
  }, [selectedExam, selectedClassId]);

  const selectedSubjectDetail = useMemo(() => {
    if (!selectedSubjectId) return null;
    const sm = subjectOptions.find((s) => s.subject_id === selectedSubjectId);
    if (!sm) return null;
    const name = sm.subject?.name || sm.subject_id;
    const max = sm.max_marks;
    return { name, maxMarks: max };
  }, [subjectOptions, selectedSubjectId]);

  const selectedClassMapping = useMemo(() => {
    return classOptions.find((cm) => cm.class_id === selectedClassId) ?? null;
  }, [classOptions, selectedClassId]);

  useEffect(() => {
    if (!schoolCode || !selectedClassId || !selectedClassMapping?.class) {
      setRoster([]);
      return;
    }
    const cls = String(selectedClassMapping.class.class ?? '').trim();
    const sec = String(selectedClassMapping.class.section ?? '').trim();
    if (!cls) {
      setRoster([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        setRosterLoading(true);
        const params = new URLSearchParams({
          school_code: schoolCode,
          class: cls,
          section: sec,
          status: 'active',
          sort_by: 'roll_number',
          sort_order: 'asc',
        });
        const res = await fetch(`/api/students?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(json.data)) {
          setRoster(json.data as RosterStudent[]);
        } else {
          setRoster([]);
        }
      } catch {
        if (!cancelled) setRoster([]);
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolCode, selectedClassId, selectedClassMapping]);

  useEffect(() => {
    setSelectedClassId('');
    setSelectedSubjectId('');
    setUploadResult(null);
    setFile(null);
  }, [selectedExam]);

  useEffect(() => {
    setSelectedSubjectId('');
    setUploadResult(null);
  }, [selectedClassId]);

  useEffect(() => {
    if (!uploadResult) {
      setFeedbackModalOpen(false);
      return;
    }
    setFeedbackModalOpen(true);
    if (isBulkMarksModalError(uploadResult)) {
      return undefined;
    }
    const t = window.setTimeout(() => setFeedbackModalOpen(false), 4000);
    return () => window.clearTimeout(t);
  }, [uploadResult]);

  const staffId = staff?.id != null ? String(staff.id) : '';
  const canAct = actor === 'school' || (actor === 'staff' && Boolean(staffId));

  const canDownload =
    schoolCode &&
    canAct &&
    selectedExam &&
    selectedClassId &&
    selectedSubjectId &&
    !downloading;

  const handleDownloadTemplate = async () => {
    if (!canDownload) return;
    setDownloading(true);
    setUploadResult(null);
    try {
      const q = new URLSearchParams({
        school_code: schoolCode,
        exam_id: selectedExam!.id,
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
      });
      if (actor === 'staff' && staffId) {
        q.set('entered_by', staffId);
      }
      const res = await fetch(`/api/examinations/marks/bulk-upload/template?${q}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setUploadResult({ error: j.error || res.statusText, message: j.hint });
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition');
      let name = 'marks_template.xlsx';
      const m = cd?.match(/filename="?([^";]+)"?/);
      if (m?.[1]) name = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setUploadResult({ error: 'Download failed' });
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !schoolCode || !canAct || !selectedExam || !selectedClassId || !selectedSubjectId) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('school_code', schoolCode);
      fd.set('exam_id', selectedExam.id);
      fd.set('class_id', selectedClassId);
      fd.set('subject_id', selectedSubjectId);
      if (actor === 'staff' && staffId) {
        fd.set('entered_by', staffId);
      }
      const res = await fetch('/api/examinations/marks/bulk-upload', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const j = (await res.json()) as UploadResult;
      if (!res.ok) {
        setUploadResult({
          ok: false,
          error: j.error || `Upload failed (${res.status})`,
          code: j.code,
          failed: j.failed,
        });
      } else {
        setUploadResult(j);
      }
    } catch (e) {
      console.error(e);
      setUploadResult({ error: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const backHref = `/dashboard/${schoolCode}/marks-entry`;

  if (actor === 'loading' || examsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-600">
        <div className="h-10 w-10 rounded-full border-2 border-[#5A7A95] border-t-transparent animate-spin" />
        <p className="text-sm">Loading examinations…</p>
      </div>
    );
  }

  if (actor === 'none') {
    return (
      <Card className="p-6 max-w-lg">
        <p className="text-gray-700 leading-relaxed">
          Sign in as school admin (dashboard) or as staff to use bulk upload. Your session could not be verified for
          this school.
        </p>
      </Card>
    );
  }

  const selectClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A95]/30 focus:border-[#5A7A95]';

  const showFailureDetails =
    uploadResult &&
    uploadResult.failed &&
    uploadResult.failed.length > 0 &&
    !feedbackModalOpen;

  const modalIsError = uploadResult ? isBulkMarksModalError(uploadResult) : false;
  const friendly = uploadResult ? getFriendlyBulkMarksModalCopy(uploadResult) : { title: '' };

  const feedbackModal =
    feedbackModalOpen &&
    uploadResult &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
        role="alertdialog"
        aria-modal="true"
        aria-live="assertive"
        aria-labelledby="bulk-marks-feedback-title"
        aria-describedby={modalIsError ? 'bulk-marks-feedback-hint' : undefined}
      >
        {modalIsError ? (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-hidden="true" />
        ) : (
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Dismiss"
            onClick={() => setFeedbackModalOpen(false)}
          />
        )}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="relative z-[1] w-full max-w-md rounded-2xl border border-gray-200/90 bg-white p-6 pt-14 shadow-2xl"
        >
          {modalIsError && (
            <button
              type="button"
              onClick={() => setFeedbackModalOpen(false)}
              className="absolute top-3 right-3 rounded-lg p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Close message"
            >
              <X size={20} strokeWidth={2.25} />
            </button>
          )}
          {modalIsError ? (
            <div className="flex gap-3 text-red-900 pr-2">
              <AlertCircle className="shrink-0 text-red-600 mt-0.5" size={24} />
              <div className="min-w-0">
                <p id="bulk-marks-feedback-title" className="font-semibold text-base leading-snug text-gray-900">
                  {friendly.title}
                </p>
                {friendly.hint && (
                  <p id="bulk-marks-feedback-hint" className="text-sm mt-3 text-red-900/90 leading-relaxed">
                    {friendly.hint}
                  </p>
                )}
                {uploadResult.code && (
                  <p className="text-[11px] mt-3 text-gray-400 font-mono break-all">Ref: {uploadResult.code}</p>
                )}
                <p className="text-xs text-gray-500 mt-4">Close this message with the X button when you’re done reading.</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 text-green-900">
              <CheckCircle className="shrink-0 text-green-600" size={24} />
              <div className="min-w-0">
                <p id="bulk-marks-feedback-title" className="font-semibold text-base leading-snug">
                  {friendly.title}
                </p>
                <p className="text-sm mt-2 text-green-800/95">
                  Saved: {uploadResult.saved_count ?? 0} · Skipped (empty marks): {uploadResult.skipped_empty_marks ?? 0}
                </p>
                {uploadResult.failed && uploadResult.failed.length > 0 && (
                  <p className="text-sm mt-3 text-amber-900 font-medium">
                    {uploadResult.failed.length} row(s) had errors — details appear below when this closes.
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-3">This message closes in 4 seconds, or tap outside to dismiss.</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>,
      document.body
    );

  return (
    <div className="w-full min-w-0 max-w-none space-y-8 pb-10">
      {feedbackModal}
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Back to mark entry
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border border-gray-200/80 bg-gradient-to-br from-slate-50 via-white to-[#5A7A95]/[0.06] px-6 py-7 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Bulk add marks</h1>
            <p className="text-gray-600 mt-2 max-w-4xl text-sm sm:text-[15px] leading-relaxed">
              Download an Excel file for one class and subject, edit only the <span className="font-medium text-gray-800">Marks</span> column, then upload. Rows are matched using{' '}
              <span className="font-medium text-gray-800">Student ID</span> and <span className="font-medium text-gray-800">Admission No</span> — not names alone.
            </p>
          </div>
          <div className="shrink-0 flex items-start gap-2 rounded-xl bg-white/90 border border-gray-200/90 px-3 py-2.5 text-xs text-gray-600 max-w-xs">
            <Info size={16} className="text-[#5A7A95] shrink-0 mt-0.5" />
            <span>The downloaded sheet includes subject name and maximum marks at the top. Do not remove the header row or identity columns.</span>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.05 }}>
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5A7A95]/12 text-sm font-bold text-[#4a6578]">
              1
            </span>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet size={22} className="text-[#5A7A95]" />
              Select exam, class, and subject
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-1">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Examination</label>
              <select
                className={selectClass}
                value={selectedExam?.id || ''}
                onChange={(e) => {
                  const ex = exams.find((x) => x.id === e.target.value) || null;
                  setSelectedExam(ex);
                }}
              >
                <option value="">Choose an exam…</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.exam_name}
                    {ex.academic_year ? ` (${ex.academic_year})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedExam && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Class</label>
                <select className={selectClass} value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                  <option value="">Choose class…</option>
                  {classOptions.map((cm) => (
                    <option key={cm.class_id} value={cm.class_id}>
                      Class {cm.class?.class} — Section {cm.class?.section}
                    </option>
                  ))}
                </select>
                {classOptions.length === 0 && (
                  <p className="text-sm text-amber-800 mt-2 flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    No classes are mapped to this exam.
                  </p>
                )}
              </div>
            )}

            {selectedClassId && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Subject</label>
                <select className={selectClass} value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>
                  <option value="">Choose subject…</option>
                  {subjectOptions.map((sm) => (
                    <option key={sm.subject_id} value={sm.subject_id}>
                      {sm.subject?.name || sm.subject_id}
                      {sm.max_marks != null ? ` (max ${sm.max_marks})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedSubjectDetail && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#5A7A95]/20 bg-[#5A7A95]/[0.07] px-4 py-3 text-sm">
              <BookOpen size={18} className="text-[#5A7A95]" />
              <span className="font-semibold text-gray-900">{selectedSubjectDetail.name}</span>
              {selectedSubjectDetail.maxMarks != null && (
                <span className="text-gray-600">
                  · Maximum marks <span className="font-mono font-medium text-gray-800">{selectedSubjectDetail.maxMarks}</span>
                </span>
              )}
              <span className="text-gray-500 text-xs sm:text-sm w-full sm:w-auto sm:ml-1">Included at the top of the Excel file.</span>
            </div>
          )}

          {selectedClassId && selectedClassMapping && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/90 p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-[#5A7A95]" />
                Students in this class ({roster.length}
                {rosterLoading ? '…' : ''})
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                These students appear in the Excel template. Student ID is used for upload matching; admission number and name are for your reference only.
              </p>
              {rosterLoading ? (
                <p className="text-sm text-gray-500 py-3 text-center">Loading students…</p>
              ) : roster.length === 0 ? (
                <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100/80 rounded-lg px-3 py-2.5">
                  No active students found for this class and section.
                </p>
              ) : (
                <div className="max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/95 text-gray-700 sticky top-0 z-[1] backdrop-blur-sm">
                      <tr>
                        <th className="text-left font-semibold px-3 py-2.5">Student name</th>
                        <th className="text-left font-semibold px-3 py-2.5">Admission no.</th>
                        <th className="text-left font-semibold px-3 py-2.5 w-[30%]">Student ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((s) => {
                        const displayName =
                          (s.student_name && String(s.student_name).trim()) ||
                          [s.first_name, s.last_name].filter(Boolean).join(' ').trim() ||
                          '—';
                        return (
                          <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50/80 transition-colors">
                            <td className="px-3 py-2 text-gray-900">{displayName}</td>
                            <td className="px-3 py-2 text-gray-800 font-mono text-xs">{s.admission_no ? String(s.admission_no) : '—'}</td>
                            <td className="px-3 py-2 text-gray-500 font-mono text-[11px] break-all">{s.id}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button type="button" onClick={() => void handleDownloadTemplate()} disabled={!canDownload} className="w-full sm:w-auto">
              <Download size={18} className="mr-2 inline" />
              {downloading ? 'Preparing…' : 'Download Excel template'}
            </Button>
            <p className="text-xs text-gray-500 sm:max-w-md leading-relaxed">
              The workbook lists enrolled students and any existing draft marks. The <strong className="font-medium text-gray-700">Marks</strong> sheet starts with subject and max marks, then the table — edit marks only.
            </p>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.08 }}>
        <Card className="p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5A7A95]/12 text-sm font-bold text-[#4a6578]">
              2
            </span>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Upload size={22} className="text-[#5A7A95]" />
              Upload filled file
            </h2>
          </div>

          <div className="relative">
            <input
              id="bulk-marks-file-input"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label
              htmlFor="bulk-marks-file-input"
              onDragEnter={(e) => {
                e.preventDefault();
                setFileDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setFileDragOver(true);
              }}
              onDragLeave={() => setFileDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setFileDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f && /\.xlsx$/i.test(f.name)) setFile(f);
              }}
              className={`block rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors cursor-pointer ${
                fileDragOver
                  ? 'border-[#5A7A95] bg-[#5A7A95]/[0.08]'
                  : 'border-gray-200 bg-gray-50/50 hover:border-[#5A7A95]/35 hover:bg-[#5A7A95]/[0.03]'
              }`}
            >
              <FileSpreadsheet className="mx-auto text-[#5A7A95] mb-2" size={28} />
              <p className="text-sm font-medium text-gray-800">
                {file ? file.name : 'Click to choose an .xlsx file'}
              </p>
              <p className="text-xs text-gray-500 mt-1">or drop your filled template here</p>
            </label>
          </div>

          <Button
            type="button"
            onClick={() => void handleUpload()}
            disabled={!file || !selectedExam || !selectedClassId || !selectedSubjectId || uploading}
            className="w-full sm:w-auto"
          >
            {uploading ? 'Processing…' : 'Upload & validate'}
          </Button>
          <p className="text-xs text-gray-500 leading-relaxed max-w-4xl">
            Allowed in Marks: numbers (0–max), or AB, NA, ML, EXEMPT. Empty cells are skipped. Uploading the same file again updates rows (upsert). Rate limit: 10 uploads per minute.
          </p>
        </Card>
      </motion.div>

      {showFailureDetails && uploadResult && (
        <Card className="p-6">
          <p className="text-sm font-semibold text-gray-900 mb-3">Row-level errors (not saved)</p>
          <div className="max-h-72 overflow-auto border border-gray-200 rounded-xl text-sm">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-[1]">
                <tr>
                  <th className="text-left p-2.5 font-semibold">Excel row</th>
                  <th className="text-left p-2.5 font-semibold">Reason</th>
                  <th className="text-left p-2.5 font-semibold">Student</th>
                </tr>
              </thead>
              <tbody>
                {uploadResult.failed!.map((f, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="p-2.5 font-mono">{f.excel_row}</td>
                    <td className="p-2.5 text-gray-800">{f.reason}</td>
                    <td className="p-2.5 text-gray-600 text-xs">
                      {f.student_id || '—'} {f.admission_no ? `/ ${f.admission_no}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
