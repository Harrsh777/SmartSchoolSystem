'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Loader2, AlertTriangle, CheckCircle, ArrowLeft, Users, Save } from 'lucide-react';

interface AcademicYearRow {
  id: string;
  year_name: string;
}

interface ClassRow {
  class: string;
  section: string;
  academic_year: string;
}

interface StudentRow {
  id: string;
  admission_no: string | null;
  student_name: string | null;
  class: string;
  section: string;
  academic_year: string;
}

type StudentAction = 'promote' | 'repeat' | 'left_school';

interface StudentPromotionRow extends StudentRow {
  action: StudentAction;
  to_year: string;
  target_class: string;
  target_section: string;
}

export default function PromotionEnginePage({ params }: { params: Promise<{ school: string }> }) {
  const { school: schoolCode } = use(params);
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [currentYear, setCurrentYear] = useState('');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('');
  const [students, setStudents] = useState<StudentPromotionRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchYears = useCallback(async () => {
    if (!schoolCode) return;
    try {
      const res = await fetch(`/api/academic-year-management/years?school_code=${encodeURIComponent(schoolCode)}`);
      const data = await res.json();
      if (res.ok && data.data) setYears(Array.isArray(data.data) ? data.data : []);
      else setYears([]);
    } catch {
      setYears([]);
    }
  }, [schoolCode]);

  const fetchClasses = useCallback(async () => {
    if (!schoolCode || !currentYear) return;
    setLoadingClasses(true);
    try {
      const res = await fetch(`/api/classes?school_code=${encodeURIComponent(schoolCode)}&academic_year=${encodeURIComponent(currentYear)}`);
      const data = await res.json();
      if (res.ok && data.data && Array.isArray(data.data)) {
        setClasses(data.data);
        const classes = data.data as ClassRow[];
        const uniqueClasses = Array.from(new Set(classes.map((c) => c.class).filter(Boolean))).sort();
        setClassOptions(uniqueClasses);
        setSectionOptions([]);
        setSelectedClass('');
        setSelectedSection('');
      } else {
        setClasses([]);
        setClassOptions([]);
        setSectionOptions([]);
      }
    } catch {
      setClasses([]);
      setClassOptions([]);
      setSectionOptions([]);
    } finally {
      setLoadingClasses(false);
    }
  }, [schoolCode, currentYear]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  useEffect(() => {
    if (currentYear) fetchClasses();
    else {
      setClassOptions([]);
      setSectionOptions([]);
      setClasses([]);
      setSelectedClass('');
      setSelectedSection('');
    }
  }, [currentYear, fetchClasses]);

  useEffect(() => {
    if (!selectedClass || !classes.length) {
      setSectionOptions([]);
      setSelectedSection('');
      return;
    }
    const sections = Array.from(new Set(classes.filter((c) => c.class === selectedClass).map((c) => c.section).filter(Boolean))).sort();
    setSectionOptions(sections);
    if (!sections.includes(selectedSection)) setSelectedSection('');
  }, [selectedClass, classes]);

  const loadStudents = async () => {
    if (!schoolCode || !currentYear || !selectedClass) {
      setError('Select current academic year and class.');
      return;
    }
    setLoadingStudents(true);
    setError('');
    setStudents([]);
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
        academic_year: currentYear,
        class: selectedClass,
      });
      if (selectedSection) params.set('section', selectedSection);
      const res = await fetch(`/api/students?${params}&status=active`);
      const data = await res.json();
      if (res.ok && data.data && Array.isArray(data.data)) {
        const list = data.data as StudentRow[];
        setStudents(
          list.map((s) => ({
            ...s,
            action: 'promote' as StudentAction,
            to_year: newAcademicYear || (years[0]?.year_name ?? ''),
            target_class: '',
            target_section: '',
          }))
        );
      } else {
        setStudents([]);
      }
    } catch {
      setError('Failed to load students.');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const updateStudent = (studentId: string, updates: Partial<StudentPromotionRow>) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, ...updates } : s))
    );
  };

  const handleSave = async () => {
    if (!schoolCode || !currentYear || students.length === 0) {
      setError('Load students first and ensure at least one student.');
      return;
    }
    const actions = students.map((s) => {
      const toYear = s.to_year || newAcademicYear;
      if (s.action === 'left_school') {
        return {
          student_id: s.id,
          action: 'left_school',
          to_year: toYear,
          current_class: s.class,
          current_section: s.section,
        };
      }
      if (s.action === 'repeat') {
        return {
          student_id: s.id,
          action: 'repeat',
          to_year: toYear,
          current_class: s.class,
          current_section: s.section,
        };
      }
      return {
        student_id: s.id,
        action: 'promote',
        to_year: toYear,
        target_class: s.target_class || s.class,
        target_section: s.target_section || s.section,
        current_class: s.class,
        current_section: s.section,
      };
    });
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/academic-year-management/promotion/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          from_year: currentYear,
          actions,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Saved. Enrollments created: ${data.data?.enrollments_created ?? 0}. Students updated: ${data.data?.students_updated ?? 0}. They will appear in the new classes/sections.`);
        setStudents([]);
        setTimeout(() => setSuccess(''), 6000);
      } else {
        setError(data.error || 'Save failed');
      }
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const base = schoolCode ? `/dashboard/${schoolCode}/academic-year-management` : '';
  const defaultToYear = newAcademicYear || years[0]?.year_name || '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Link href={base} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold text-[#0F172A]">Promotion Engine</h1>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-800">
          <AlertTriangle size={18} />
          {error}
          <button type="button" onClick={() => setError('')} className="ml-auto underline">Dismiss</button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2 text-sm text-green-800">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      <Card className="p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg shadow-sm">
        <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Select class and load students</h2>
        <p className="text-xs text-[#64748B] mb-4">
          Choose the <strong>current (ending) academic year</strong>, then <strong>class</strong> and <strong>section</strong>. Load students to set where each is promoted (or repeat / left school), then Save. Students will appear in the new classes and sections.
        </p>
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div>
            <label className="block text-xs text-[#64748B] mb-1">Current academic year</label>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(e.target.value)}
              className="border border-[#E5E7EB] rounded px-3 py-2 text-sm min-w-[140px]"
            >
              <option value="">Select</option>
              {years.map((y) => (
                <option key={y.id || y.year_name} value={y.year_name}>{y.year_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#64748B] mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={!currentYear || loadingClasses}
              className="border border-[#E5E7EB] rounded px-3 py-2 text-sm min-w-[120px]"
            >
              <option value="">Select</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#64748B] mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass}
              className="border border-[#E5E7EB] rounded px-3 py-2 text-sm min-w-[100px]"
            >
              <option value="">All</option>
              {sectionOptions.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#64748B] mb-1">New academic year (default)</label>
            <select
              value={newAcademicYear}
              onChange={(e) => setNewAcademicYear(e.target.value)}
              className="border border-[#E5E7EB] rounded px-3 py-2 text-sm min-w-[140px]"
            >
              <option value="">Select</option>
              {years.map((y) => (
                <option key={y.id || y.year_name} value={y.year_name}>{y.year_name}</option>
              ))}
            </select>
          </div>
          <Button
            variant="secondary"
            onClick={loadStudents}
            disabled={loadingStudents || !currentYear || !selectedClass}
          >
            {loadingStudents ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            Load students
          </Button>
        </div>
      </Card>

      {students.length > 0 && (
        <Card className="p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Students — set promotion / repeat / left school</h2>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[70vh] border border-[#E5E7EB] rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#F8FAFC] z-10">
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 px-2 text-[#64748B] font-medium">Name</th>
                  <th className="text-left py-2 px-2 text-[#64748B] font-medium">Admission No</th>
                  <th className="text-left py-2 px-2 text-[#64748B] font-medium">Class / Section</th>
                  <th className="text-left py-2 px-2 text-[#64748B] font-medium">Promoted to class</th>
                  <th className="text-left py-2 px-2 text-[#64748B] font-medium">Promoted to section</th>
                  <th className="text-left py-2 px-2 text-[#64748B] font-medium">New academic year</th>
                  <th className="text-left py-2 px-2 text-[#64748B] font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-[#E5E7EB]">
                    <td className="py-2 px-2 text-[#0F172A]">{s.student_name || s.admission_no || '-'}</td>
                    <td className="py-2 px-2 text-[#64748B]">{s.admission_no ?? '-'}</td>
                    <td className="py-2 px-2 text-[#64748B]">{s.class} / {s.section}</td>
                    <td className="py-2 px-2">
                      <Input
                        value={s.target_class}
                        onChange={(e) => updateStudent(s.id, { target_class: e.target.value })}
                        placeholder="Class"
                        className="w-24"
                        disabled={s.action !== 'promote'}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        value={s.target_section}
                        onChange={(e) => updateStudent(s.id, { target_section: e.target.value })}
                        placeholder="Section"
                        className="w-24"
                        disabled={s.action !== 'promote'}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={s.to_year || defaultToYear}
                        onChange={(e) => updateStudent(s.id, { to_year: e.target.value })}
                        className="border border-[#E5E7EB] rounded px-2 py-1 text-xs min-w-[100px]"
                      >
                        {years.map((y) => (
                          <option key={y.id || y.year_name} value={y.year_name}>{y.year_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={s.action}
                        onChange={(e) =>
                          updateStudent(s.id, {
                            action: e.target.value as StudentAction,
                            target_class: e.target.value === 'promote' ? s.target_class : '',
                            target_section: e.target.value === 'promote' ? s.target_section : '',
                          })
                        }
                        className="border border-[#E5E7EB] rounded px-2 py-1 text-xs"
                      >
                        <option value="promote">Promote</option>
                        <option value="repeat">Repeat class</option>
                        <option value="left_school">Left school</option>
                      </select>
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
