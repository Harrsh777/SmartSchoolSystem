'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Palette, Save, Loader2, AlertCircle, CheckCircle, Search, ArrowLeft } from 'lucide-react';
import type { Staff } from '@/lib/supabase';
import { getSessionStaffOrTeacherProfile } from '@/lib/teacher-portal-client';

interface ClassOption {
  class: string;
  sections: string[];
}

interface StudentRow {
  id: string;
  admission_no: string;
  student_name: string;
  roll_number?: string | null;
}

interface SubjectCol {
  id: string;
  name: string;
}

interface TermRow {
  id: string;
  name: string;
  serial?: number;
}

interface StructureRow {
  id: string;
  name: string;
}

function compareRollNumbers(a?: string | null, b?: string | null): number {
  const sa = String(a ?? '').trim();
  const sb = String(b ?? '').trim();
  const na = parseInt(sa.replace(/\D/g, ''), 10);
  const nb = parseInt(sb.replace(/\D/g, ''), 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return sa.localeCompare(sb, undefined, { numeric: true });
}

export default function TeacherNonScholasticMarksPage() {
  const [schoolCode, setSchoolCode] = useState('');
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [allClassRows, setAllClassRows] = useState<Array<{ id: string; class: string; section: string }>>([]);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const [structures, setStructures] = useState<StructureRow[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState('');

  const [terms, setTerms] = useState<TermRow[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectCol[]>([]);
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>({});

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('teacher');
    if (!stored) {
      setLoadingMeta(false);
      return;
    }
    try {
      const t = JSON.parse(stored) as Staff & { school_code?: string };
      setTeacher(t);
      const code = String(t.school_code || '').trim();
      setSchoolCode(code);
      if (!code) setLoadingMeta(false);
    } catch {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    if (!schoolCode || !teacher?.id) return;
    const load = async () => {
      setLoadingMeta(true);
      try {
        const staffId = String(teacher.id);
        const emp = teacher.staff_id ? String(teacher.staff_id) : '';
        const ctRes = await fetch(
          `/api/classes/teacher?school_code=${encodeURIComponent(schoolCode)}&teacher_id=${encodeURIComponent(staffId)}${emp ? `&staff_id=${encodeURIComponent(emp)}` : ''}&array=true`
        );
        const ctJson = await ctRes.json();
        let rows = ctJson?.data;
        if (rows != null && !Array.isArray(rows)) rows = [rows];
        const classRows = (Array.isArray(rows) ? rows : []) as Array<{
          id: string;
          class: string;
          section: string;
        }>;

        const byClass = new Map<string, Set<string>>();
        for (const r of classRows) {
          const cn = String(r.class || '').trim();
          const sec = String(r.section || '').trim();
          if (!cn) continue;
          if (!byClass.has(cn)) byClass.set(cn, new Set());
          if (sec) byClass.get(cn)!.add(sec);
        }
        const opts: ClassOption[] = [...byClass.entries()]
          .map(([cls, sections]) => ({
            class: cls,
            sections: [...sections].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
          }))
          .sort((a, b) => a.class.localeCompare(b.class, undefined, { numeric: true }));

        setClassOptions(opts);
        setAllClassRows(
          classRows.map((r) => ({
            id: String(r.id),
            class: String(r.class || ''),
            section: String(r.section || ''),
          }))
        );

        const sRes = await fetch(`/api/term-structures?school_code=${encodeURIComponent(schoolCode)}`);
        const sJson = await sRes.json();
        if (sRes.ok && Array.isArray(sJson.data)) setStructures(sJson.data);
      } catch {
        setError('Failed to load your class teacher sections.');
      } finally {
        setLoadingMeta(false);
      }
    };
    void load();
  }, [schoolCode, teacher]);

  useEffect(() => {
    if (!selectedClassName || !selectedSection) {
      setSelectedClassId('');
      return;
    }
    const row = allClassRows.find(
      (c) =>
        String(c.class).trim().toLowerCase() === selectedClassName.trim().toLowerCase() &&
        String(c.section).trim().toLowerCase() === selectedSection.trim().toLowerCase()
    );
    setSelectedClassId(row?.id || '');
  }, [allClassRows, selectedClassName, selectedSection]);

  useEffect(() => {
    setSelectedTermId('');
    setTerms([]);
    if (!selectedStructureId || !selectedClassId) return;
    const loadTerms = async () => {
      const res = await fetch(
        `/api/exam-terms/for-class?school_code=${encodeURIComponent(schoolCode)}&structure_id=${encodeURIComponent(selectedStructureId)}&class_id=${encodeURIComponent(selectedClassId)}`
      );
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) setTerms(json.data);
      else setTerms([]);
    };
    void loadTerms();
  }, [schoolCode, selectedStructureId, selectedClassId]);

  const fetchRoster = useCallback(
    async (classId: string, termId: string | null) => {
      const qs = new URLSearchParams({
        school_code: schoolCode,
        class_id: classId,
        scholastic_scope: 'non_scholastic_only',
      });
      if (termId) qs.set('term_id', termId);
      const res = await fetch(`/api/non-scholastic-marks?${qs}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.hint || 'Failed to load');
      }
      return json.data as {
        students: StudentRow[];
        subjects: SubjectCol[];
        grades: Record<string, string>;
      };
    },
    [schoolCode]
  );

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSubjects([]);
      setGrades({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingRoster(true);
      setError('');
      try {
        const payload = await fetchRoster(selectedClassId, null);
        if (cancelled) return;
        const st = [...(payload.students || [])].sort((a, b) =>
          compareRollNumbers(a.roll_number, b.roll_number)
        );
        setStudents(st);
        setSubjects(payload.subjects || []);
        setGrades({});
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setStudents([]);
          setSubjects([]);
          setGrades({});
        }
      } finally {
        if (!cancelled) setLoadingRoster(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, fetchRoster]);

  useEffect(() => {
    if (!selectedClassId || !selectedTermId) {
      if (selectedClassId && !selectedTermId) setGrades({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingGrades(true);
      setError('');
      try {
        const payload = await fetchRoster(selectedClassId, selectedTermId);
        if (cancelled) return;
        const st = [...(payload.students || [])].sort((a, b) =>
          compareRollNumbers(a.roll_number, b.roll_number)
        );
        setStudents(st);
        setSubjects(payload.subjects || []);
        const next: Record<string, Record<string, string>> = {};
        for (const row of st) {
          next[row.id] = {};
          for (const sub of payload.subjects || []) {
            const key = `${row.id}:${sub.id}`;
            const g = payload.grades?.[key];
            if (g) next[row.id][sub.id] = g;
          }
        }
        setGrades(next);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoadingGrades(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, selectedTermId, fetchRoster]);

  const availableSections = useMemo(() => {
    if (!selectedClassName) return [];
    return classOptions.find((c) => c.class === selectedClassName)?.sections || [];
  }, [classOptions, selectedClassName]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [...students].sort((a, b) => compareRollNumbers(a.roll_number, b.roll_number));
    return students
      .filter(
        (s) =>
          s.student_name.toLowerCase().includes(q) ||
          String(s.admission_no || '').toLowerCase().includes(q) ||
          String(s.roll_number || '').toLowerCase().includes(q)
      )
      .sort((a, b) => compareRollNumbers(a.roll_number, b.roll_number));
  }, [students, searchQuery]);

  const setGrade = (studentId: string, subjectId: string, value: string) => {
    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedTermId || !schoolCode) {
      setError('Select class, section, exam structure, and term before saving.');
      return;
    }
    const profile = getSessionStaffOrTeacherProfile();
    const addedBy = profile?.id || '';
    if (!addedBy) {
      setError('Your session could not be verified. Please log in again.');
      return;
    }
    if (subjects.length === 0) {
      setError(
        'No non-scholastic subjects for this class. Map subjects with category “Non-Scholastic” in Add/Modify Classes.'
      );
      return;
    }
    if (students.length === 0) {
      setError('No students in this class section.');
      return;
    }

    const entries: Array<{ student_id: string; subject_id: string; grade: string | null }> = [];
    for (const st of students) {
      for (const sub of subjects) {
        const g = (grades[st.id]?.[sub.id] ?? '').trim();
        entries.push({
          student_id: st.id,
          subject_id: sub.id,
          grade: g === '' ? null : g,
        });
      }
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/non-scholastic-marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          class_id: selectedClassId,
          term_id: selectedTermId,
          added_by: addedBy,
          teacher_class_teacher_only: true,
          entries,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || json.hint || 'Save failed');
        return;
      }
      setSuccess(
        `Saved ${json.count ?? entries.length} cell(s). These grades appear on report cards when Part II (co-scholastic) is enabled in the template.`
      );
      setTimeout(() => setSuccess(''), 6000);
      const payload = await fetchRoster(selectedClassId, selectedTermId);
      const st = [...(payload.students || [])].sort((a, b) =>
        compareRollNumbers(a.roll_number, b.roll_number)
      );
      setStudents(st);
      setSubjects(payload.subjects || []);
      const next: Record<string, Record<string, string>> = {};
      for (const row of st) {
        next[row.id] = {};
        for (const sub of payload.subjects || []) {
          const key = `${row.id}:${sub.id}`;
          const g = payload.grades?.[key];
          if (g) next[row.id][sub.id] = g;
        }
      }
      setGrades(next);
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const showGradeGrid = Boolean(selectedClassId && selectedTermId);

  if (!teacher || !schoolCode) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-600">
        <p>Please log in as a teacher to access this page.</p>
      </div>
    );
  }

  if (loadingMeta) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-emerald-600" size={36} />
      </div>
    );
  }

  if (classOptions.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-12 p-6 bg-white rounded-xl border border-amber-200 text-center">
        <Palette className="mx-auto text-amber-600 mb-3" size={40} />
        <h1 className="text-lg font-semibold text-gray-900">Non-Scholastic Marks</h1>
        <p className="text-sm text-gray-600 mt-2">
          You are not assigned as a class teacher for any section. Only class teachers can enter non-scholastic
          grades here.
        </p>
        <Link href="/teacher/dashboard" className="inline-block mt-4 text-emerald-700 hover:underline text-sm">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-700 flex items-center justify-center">
              <Palette className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Non-Scholastic Marks</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Class teachers only: choose a section you teach, then a term. Enter grades for subjects marked
                Non-Scholastic in the class. Shown on report cards when the template includes Part II
                (co-scholastic).
              </p>
            </div>
          </div>
          <Link
            href="/teacher/dashboard/marks"
            className="inline-flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <ArrowLeft size={16} />
            Scholastic marks entry
          </Link>
        </div>
      </motion.div>

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-green-600" size={20} />
          <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
          <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      <Card className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
            <select
              value={selectedClassName}
              onChange={(e) => {
                setSelectedClassName(e.target.value);
                setSelectedSection('');
                setSelectedStructureId('');
                setSelectedTermId('');
              }}
              className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Select class</option>
              {classOptions.map((c) => (
                <option key={c.class} value={c.class}>
                  {c.class}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedStructureId('');
                setSelectedTermId('');
              }}
              disabled={!selectedClassName}
              className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:opacity-50"
            >
              <option value="">Select section</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Exam structure
            </label>
            <select
              value={selectedStructureId}
              onChange={(e) => {
                setSelectedStructureId(e.target.value);
                setSelectedTermId('');
              }}
              disabled={!selectedClassId}
              className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:opacity-50"
            >
              <option value="">Select structure</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term</label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              disabled={!selectedStructureId || !selectedClassId}
              className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:opacity-50"
            >
              <option value="">Select term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.serial != null ? `${t.serial}. ` : ''}
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedClassName && selectedSection && !selectedClassId && (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
            No class row found for this combination. Ask admin to verify your class teacher assignment.
          </p>
        )}
        {selectedStructureId && terms.length === 0 && selectedClassId && (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
            No terms for this structure and class. Check exam term mappings in admin.
          </p>
        )}
        {loadingRoster && selectedClassId && !selectedTermId && (
          <div className="mt-4 flex items-center gap-2 text-emerald-700">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm">Loading roster…</span>
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          {!showGradeGrid ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedClassId
                ? 'Select exam structure and term to open the grade grid.'
                : 'Select class and section first.'}
            </p>
          ) : loadingGrades ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Enter grades (by roll number)</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[160px] sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full sm:w-56"
                    />
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={saving || loadingGrades || subjects.length === 0 || students.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="mr-2" size={18} />
                        Save grades
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {subjects.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 py-6 text-center text-sm">
                  No non-scholastic subjects for this class. Map subjects with category &quot;Non-Scholastic&quot; in
                  Add/Modify Classes.
                </p>
              ) : filteredStudents.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 py-6 text-center text-sm">
                  No students match your search.
                </p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-3 font-semibold text-gray-900 dark:text-white sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 min-w-[56px]">
                          Roll
                        </th>
                        <th className="text-left p-3 font-semibold text-gray-900 dark:text-white sticky left-14 bg-gray-50 dark:bg-gray-800 z-10 min-w-[200px]">
                          Student
                        </th>
                        {subjects.map((sub) => (
                          <th
                            key={sub.id}
                            className="p-3 font-semibold text-gray-900 dark:text-white text-center min-w-[100px]"
                          >
                            {sub.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((st) => (
                        <tr
                          key={st.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-800/50"
                        >
                          <td className="p-3 sticky left-0 bg-white dark:bg-gray-900 z-10 border-r border-gray-100 dark:border-gray-800 font-mono text-gray-700 dark:text-gray-300">
                            {st.roll_number?.toString().trim() || '—'}
                          </td>
                          <td className="p-3 sticky left-14 bg-white dark:bg-gray-900 z-10 border-r border-gray-100 dark:border-gray-800">
                            <div className="font-medium text-gray-900 dark:text-white">{st.student_name}</div>
                            <div className="text-xs text-gray-500">{st.admission_no}</div>
                          </td>
                          {subjects.map((sub) => (
                            <td key={sub.id} className="p-2 text-center align-middle">
                              <input
                                type="text"
                                maxLength={8}
                                placeholder="—"
                                value={grades[st.id]?.[sub.id] ?? ''}
                                onChange={(e) => setGrade(st.id, sub.id, e.target.value)}
                                disabled={loadingGrades}
                                className="w-full max-w-[88px] mx-auto px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
