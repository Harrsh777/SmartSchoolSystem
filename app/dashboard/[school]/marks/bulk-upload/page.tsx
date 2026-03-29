'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Users } from 'lucide-react';

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
  const [file, setFile] = useState<File | null>(null);
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
    return <div className="flex justify-center py-16 text-gray-600">Loading…</div>;
  }

  if (actor === 'none') {
    return (
      <Card className="p-6">
        <p className="text-gray-700">
          Sign in as school admin (dashboard) or as staff to use bulk upload. Your session could not be verified for
          this school.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href={backHref} className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 text-sm">
          <ArrowLeft size={16} />
          Back to mark entry
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bulk add marks</h1>
        <p className="text-gray-600 mt-1">
          Download an Excel snapshot for one class and subject, edit only the Marks column, then upload. Matching uses
          Student ID and Admission No — not names alone.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet size={22} className="text-[#5A7A95]" />
          1. Select exam, class, and subject
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Examination</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">Choose class…</option>
              {classOptions.map((cm) => (
                <option key={cm.class_id} value={cm.class_id}>
                  Class {cm.class?.class} — Section {cm.class?.section}
                </option>
              ))}
            </select>
            {classOptions.length === 0 && (
              <p className="text-sm text-amber-700 mt-1">No classes are mapped to this exam.</p>
            )}
          </div>
        )}

        {selectedClassId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
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

        {selectedClassId && selectedClassMapping && (
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-[#5A7A95]" />
              Students in this class ({roster.length}
              {rosterLoading ? '…' : ''})
            </h3>
            <p className="text-xs text-gray-600">
              These rows match the Excel template. Student ID is used for upload matching; admission no and name are
              shown for your reference.
            </p>
            {rosterLoading ? (
              <p className="text-sm text-gray-500 py-2">Loading students…</p>
            ) : roster.length === 0 ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                No active students found for this class and section.
              </p>
            ) : (
              <div className="max-h-56 overflow-auto rounded-md border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700 sticky top-0 z-[1]">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Student name</th>
                      <th className="text-left font-medium px-3 py-2">Admission no.</th>
                      <th className="text-left font-medium px-3 py-2 w-[28%]">Student ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => {
                      const displayName =
                        (s.student_name && String(s.student_name).trim()) ||
                        [s.first_name, s.last_name].filter(Boolean).join(' ').trim() ||
                        '—';
                      return (
                        <tr key={s.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-900">{displayName}</td>
                          <td className="px-3 py-2 text-gray-800 font-mono text-xs">
                            {s.admission_no ? String(s.admission_no) : '—'}
                          </td>
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

        <div className="pt-2 border-t border-gray-100">
          <Button type="button" onClick={() => void handleDownloadTemplate()} disabled={!canDownload}>
            <Download size={18} className="mr-2 inline" />
            {downloading ? 'Preparing…' : 'Download Excel template'}
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            The file lists enrolled students with current draft marks if any. Do not change ID, admission no, name,
            class, or section.
          </p>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Upload size={22} className="text-[#5A7A95]" />
          2. Upload filled file
        </h2>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="block w-full text-sm text-gray-600"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Button
          type="button"
          onClick={() => void handleUpload()}
          disabled={!file || !selectedExam || !selectedClassId || !selectedSubjectId || uploading}
        >
          {uploading ? 'Processing…' : 'Upload & validate'}
        </Button>
        <p className="text-xs text-gray-500">
          Allowed in Marks: numbers (0–max), or AB, NA, ML, EXEMPT. Empty cells are skipped. Same file uploaded twice
          updates rows (upsert). Rate limit: 10 uploads per minute.
        </p>
      </Card>

      {uploadResult && (
        <Card className="p-6">
          {uploadResult.error && uploadResult.saved_count === undefined && (
            <div className="flex gap-2 text-red-800 bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertCircle className="shrink-0" size={20} />
              <div>
                <p className="font-semibold">{uploadResult.error}</p>
                {uploadResult.code && <p className="text-sm mt-1 font-mono text-red-700">{uploadResult.code}</p>}
              </div>
            </div>
          )}
          {(uploadResult.ok || uploadResult.saved_count != null) && (
            <div className="space-y-3">
              <div className="flex gap-2 text-green-800 bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle className="shrink-0" size={20} />
                <div>
                  <p className="font-semibold">{uploadResult.message || 'Done'}</p>
                  <p className="text-sm mt-1">
                    Saved: {uploadResult.saved_count ?? 0} · Skipped (empty marks):{' '}
                    {uploadResult.skipped_empty_marks ?? 0}
                  </p>
                </div>
              </div>
              {uploadResult.failed && uploadResult.failed.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Row-level errors (not saved)</p>
                  <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg text-sm">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Excel row</th>
                          <th className="text-left p-2">Reason</th>
                          <th className="text-left p-2">Student</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.failed.map((f, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="p-2 font-mono">{f.excel_row}</td>
                            <td className="p-2 text-gray-800">{f.reason}</td>
                            <td className="p-2 text-gray-600 text-xs">
                              {f.student_id || '—'} {f.admission_no ? `/ ${f.admission_no}` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
