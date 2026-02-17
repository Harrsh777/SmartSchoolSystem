'use client';

import { useEffect, useState } from 'react';
import type { Staff } from '@/lib/supabase';
import CopyCheckingPage from '@/app/dashboard/[school]/copy-checking/page';
import Card from '@/components/ui/Card';
import { ClipboardCheck } from 'lucide-react';

export default function TeacherCopyCheckingWrapper() {
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [allowedClassIds, setAllowedClassIds] = useState<string[]>([]);
  const [allowedSubjectIds, setAllowedSubjectIds] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (!storedTeacher) {
      setSchoolCode(null);
      setChecked(true);
      return;
    }
    try {
      const teacher = JSON.parse(storedTeacher) as Staff & { school_code?: string };
      const code = teacher.school_code;
      const teacherId = teacher.id ? String(teacher.id) : '';
      const staffId = teacher.staff_id ? String(teacher.staff_id) : '';
      if (!code || !teacherId) {
        setSchoolCode(code || null);
        setChecked(true);
        return;
      }

      (async () => {
        try {
          const ctRes = await fetch(
            `/api/classes/teacher?school_code=${encodeURIComponent(code)}&teacher_id=${encodeURIComponent(teacherId)}${staffId ? `&staff_id=${encodeURIComponent(staffId)}` : ''}&array=true`
          );
          const ctJson = await ctRes.json();
          let ctData = ctJson?.data;
          // Normalize: API may return single object when one class; ensure we always have an array
          if (ctData != null && !Array.isArray(ctData)) ctData = [ctData];
          const isClassTeacher = Array.isArray(ctData) && ctData.length > 0;

          if (isClassTeacher) {
            const ids = (ctData as { id?: string }[]).map((c) => c.id).filter((id): id is string => Boolean(id));
            setAllowedClassIds(ids);
            setAllowedSubjectIds([]);
          } else {
            const slotsRes = await fetch(
              `/api/timetable/slots?school_code=${encodeURIComponent(code)}&teacher_id=${encodeURIComponent(teacherId)}`
            );
            const slotsJson = await slotsRes.json();
            const slots = Array.isArray(slotsJson?.data) ? slotsJson.data : [];
            const classIds = new Set<string>();
            const subjectIds = new Set<string>();
            for (const slot of slots) {
              const cid = slot.class?.id ?? slot.class_id;
              if (cid && String(cid).trim()) classIds.add(String(cid).trim());
              const sid = slot.subject?.id ?? slot.subject_id;
              if (sid && String(sid).trim()) subjectIds.add(String(sid).trim());
            }
            setAllowedClassIds(Array.from(classIds));
            setAllowedSubjectIds(Array.from(subjectIds));
          }
        } catch {
          setAllowedClassIds([]);
          setAllowedSubjectIds([]);
        }
        setSchoolCode(code);
        setChecked(true);
      })();
    } catch {
      setSchoolCode(null);
      setChecked(true);
    }
  }, []);

  if (!checked) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto mb-4" />
          <p className="text-emerald-700 font-medium">Loading copy checking module...</p>
        </div>
      </div>
    );
  }

  if (!schoolCode) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <ClipboardCheck className="text-emerald-700" size={40} />
            <h1 className="text-2xl font-bold text-gray-900">Copy Checking</h1>
            <p className="text-sm text-gray-600">
              Unable to determine your school. Please make sure you are logged in as a teacher.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Teacher is not assigned to any class (not class teacher, and no timetable slots)
  if (allowedClassIds.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <ClipboardCheck className="text-muted-foreground" size={40} />
            <h1 className="text-2xl font-bold text-gray-900">Copy Checking</h1>
            <p className="text-sm text-gray-600">
              You are not assigned to any class. Copy checking is available only when you are a class teacher or are assigned to classes in the timetable.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <CopyCheckingPage
      schoolCodeOverride={schoolCode}
      allowedClassIds={allowedClassIds}
      allowedSubjectIds={allowedSubjectIds.length > 0 ? allowedSubjectIds : undefined}
    />
  );
}

