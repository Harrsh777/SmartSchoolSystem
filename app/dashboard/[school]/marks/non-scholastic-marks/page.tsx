'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Palette, Save, Loader2, AlertCircle, CheckCircle, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

export default function NonScholasticMarksPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);

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

  const buildClassOptionsFromRows = useCallback(
    (rows: Array<{ id: string; class: string; section: string }>): ClassOption[] => {
      const grouped = new Map<string, Set<string>>();
      for (const row of rows) {
        const className = String(row.class || '').trim();
        const sectionName = String(row.section || '').trim();
        if (!className || !sectionName) continue;
        if (!grouped.has(className)) grouped.set(className, new Set<string>());
        grouped.get(className)!.add(sectionName);
      }
      return Array.from(grouped.entries())
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map(([className, sections]) => ({
          class: className,
          sections: Array.from(sections).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
          ),
        }));
    },
    []
  );

  useEffect(() => {
    const load = async () => {
      setLoadingMeta(true);
      try {
        const [cAll, sRes] = await Promise.all([
          fetch(`/api/classes?school_code=${encodeURIComponent(schoolCode)}`),
          fetch(`/api/term-structures?school_code=${encodeURIComponent(schoolCode)}`),
        ]);
        const cAllJson = await cAll.json();
        const sJson = await sRes.json();
        if (cAll.ok && Array.isArray(cAllJson.data)) {
          const rows = cAllJson.data as Array<{ id: string; class: string; section: string }>;
          setAllClassRows(rows);
          setClassOptions(buildClassOptionsFromRows(rows));
        } else {
          setAllClassRows([]);
          setClassOptions([]);
        }
        if (sRes.ok && Array.isArray(sJson.data)) setStructures(sJson.data);
      } catch {
        setError('Failed to load filters');
      } finally {
        setLoadingMeta(false);
      }
    };
    load();
  }, [schoolCode, buildClassOptionsFromRows]);

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
    loadTerms();
  }, [schoolCode, selectedStructureId, selectedClassId]);

  const fetchRoster = useCallback(
    async (classId: string, termId: string | null) => {
      const qs = new URLSearchParams({
        school_code: schoolCode,
        class_id: classId,
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
        setStudents(payload.students || []);
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
      if (selectedClassId && !selectedTermId) {
        setGrades({});
      }
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingGrades(true);
      setError('');
      try {
        const payload = await fetchRoster(selectedClassId, selectedTermId);
        if (cancelled) return;
        setStudents(payload.students || []);
        setSubjects(payload.subjects || []);
        const next: Record<string, Record<string, string>> = {};
        for (const st of payload.students || []) {
          next[st.id] = {};
          for (const sub of payload.subjects || []) {
            const key = `${st.id}:${sub.id}`;
            const g = payload.grades?.[key];
            if (g) next[st.id][sub.id] = g;
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
    if (!q) return students;
    return students.filter(
      (s) =>
        s.student_name.toLowerCase().includes(q) ||
        String(s.admission_no || '').toLowerCase().includes(q) ||
        String(s.roll_number || '').toLowerCase().includes(q)
    );
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
    if (!selectedClassId || !selectedTermId) {
      setError('Select class, section, exam structure, and term before saving.');
      return;
    }
    if (subjects.length === 0) {
      setError(
        'No co-scholastic subjects for this class. Map subjects in Add/Modify Classes — use category “Non-Scholastic” for arts/activities, or leave category unset (anything except “Scholastic” appears here).'
      );
      return;
    }
    if (students.length === 0) {
      setError('No students matched this class/section. Check spelling and student status (active).');
      return;
    }

    const role = sessionStorage.getItem('role');
    const storedSchool = sessionStorage.getItem('school');
    const adminAuthenticated = sessionStorage.getItem('admin_authenticated') === '1';

    let addedBy: string | null = null;
    const storedStaff = sessionStorage.getItem('staff');
    if (storedStaff) {
      try {
        const staffData = JSON.parse(storedStaff);
        addedBy = staffData.id || null;
      } catch {
        /* ignore */
      }
    }
    if (!addedBy) {
      const storedTeacher = sessionStorage.getItem('teacher');
      if (storedTeacher) {
        try {
          const teacherData = JSON.parse(storedTeacher);
          addedBy = teacherData.id || null;
        } catch {
          /* ignore */
        }
      }
    }
    if (!addedBy && storedSchool) {
      try {
        const schoolData = JSON.parse(storedSchool) as { principal_id?: string };
        addedBy = schoolData.principal_id || null;
      } catch {
        /* ignore */
      }
    }

    const isSchoolAdminSession =
      adminAuthenticated ||
      role === 'principal' ||
      role === 'admin' ||
      role === 'school';

    if (!addedBy && !isSchoolAdminSession) {
      setError('Please log in (school admin, staff, or teacher) to save.');
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
          entries,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || json.hint || 'Save failed');
        return;
      }
      setSuccess(`Saved ${json.count ?? entries.length} cell(s). Grades appear on report cards under Overall Marks (Part II).`);
      setTimeout(() => setSuccess(''), 5000);
      const payload = await fetchRoster(selectedClassId, selectedTermId);
      setGrades(() => {
        const next: Record<string, Record<string, string>> = {};
        for (const st of payload.students || []) {
          next[st.id] = {};
          for (const sub of payload.subjects || []) {
            const key = `${st.id}:${sub.id}`;
            const g = payload.grades?.[key];
            if (g) next[st.id][sub.id] = g;
          }
        }
        return next;
      });
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-[#5A7A95]" size={36} />
      </div>
    );
  }

  const showGradeGrid = Boolean(selectedClassId && selectedTermId);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card rounded-xl p-6 soft-shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#5A7A95] flex items-center justify-center">
              <Palette className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Non-Scholastic Marks</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Set class, section, exam structure, and term in one row, then enter grades below. Saved grades appear on report cards under Overall Marks
                (Part II).
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/${schoolCode}/marks`}
            className="inline-flex items-center gap-2 text-sm text-[#5A7A95] hover:underline"
          >
            <ArrowLeft size={16} />
            Marks dashboard
          </Link>
        </div>
      </motion.div>

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-green-600" size={20} />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <Card className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClassName}
              onChange={(e) => {
                setSelectedClassName(e.target.value);
                setSelectedSection('');
                setSelectedStructureId('');
                setSelectedTermId('');
              }}
              className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedStructureId('');
                setSelectedTermId('');
              }}
              disabled={!selectedClassName}
              className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam structure</label>
            <select
              value={selectedStructureId}
              onChange={(e) => {
                setSelectedStructureId(e.target.value);
                setSelectedTermId('');
              }}
              disabled={!selectedClassId}
              className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              disabled={!selectedStructureId || !selectedClassId}
              className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
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
          <p className="mt-4 text-sm text-amber-700">
            No class row found for this combination. Add it under Add/Modify Classes.
          </p>
        )}
        {selectedStructureId && terms.length === 0 && selectedClassId && (
          <p className="mt-4 text-sm text-amber-700">
            No terms for this structure and class-section. Check Exam Term Structure mappings.
          </p>
        )}
        {loadingRoster && selectedClassId && !selectedTermId && (
          <div className="mt-4 flex items-center gap-2 text-[#5A7A95]">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm">Loading class roster…</span>
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-6">
          {!showGradeGrid ? (
            <p className="text-sm text-gray-600">
              {selectedClassId
                ? 'Select exam structure and term to open the grade grid.'
                : 'Select class and section first, then structure and term.'}
            </p>
          ) : loadingGrades ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-[#5A7A95]" size={32} />
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-semibold text-gray-900">Enter grades</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[160px] sm:flex-none sm:min-w-0">
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
                <p className="text-gray-600 py-6 text-center text-sm">
                  No co-scholastic subjects for this class. Map subjects in Add/Modify Classes — use category &quot;Non-Scholastic&quot; for activities,
                  or leave category unset (only &quot;Scholastic&quot; is excluded).
                </p>
              ) : students.length === 0 ? (
                <p className="text-gray-600 py-6 text-center text-sm">
                  No active students matched this class/section (casing is ignored; status must be active).
                </p>
              ) : filteredStudents.length === 0 ? (
                <p className="text-gray-600 py-6 text-center text-sm">No students match your search.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left p-3 font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                          Student
                        </th>
                        {subjects.map((sub) => (
                          <th key={sub.id} className="p-3 font-semibold text-gray-900 text-center min-w-[100px]">
                            {sub.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((st) => (
                        <tr key={st.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                          <td className="p-3 sticky left-0 bg-white z-10 border-r border-gray-100">
                            <div className="font-medium text-gray-900">{st.student_name}</div>
                            <div className="text-xs text-gray-500">
                              {st.admission_no}
                              {st.roll_number ? ` · Roll ${st.roll_number}` : ''}
                            </div>
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
                                className="w-full max-w-[88px] mx-auto px-2 py-1.5 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-[#5A7A95] focus:border-transparent disabled:bg-gray-100"
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
