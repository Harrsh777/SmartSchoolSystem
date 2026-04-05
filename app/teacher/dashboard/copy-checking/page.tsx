'use client';

import { useEffect, useState } from 'react';
import type { Staff } from '@/lib/supabase';
import CopyCheckingPage from '@/app/dashboard/[school]/copy-checking/page';
import Card from '@/components/ui/Card';
import { ClipboardCheck } from 'lucide-react';

function resolveSlotClassId(slot: {
  class?: { id?: string } | null;
  class_id?: string | null;
  class_reference?: { class_id?: string } | null;
}): string | null {
  if (slot.class?.id) return String(slot.class.id).trim();
  if (slot.class_id) return String(slot.class_id).trim();
  const ref = slot.class_reference;
  if (ref && typeof ref === 'object' && ref.class_id) return String(ref.class_id).trim();
  return null;
}

function buildTeachingSubjectsByClassId(
  slots: Array<{
    class?: { id?: string } | null;
    class_id?: string | null;
    class_reference?: { class_id?: string } | null;
    subject?: { id?: string } | null;
    subject_id?: string | null;
  }>
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const slot of slots) {
    const cid = resolveSlotClassId(slot);
    const sid = slot.subject?.id ?? slot.subject_id;
    if (!cid || !sid) continue;
    const k = String(cid).trim();
    const sub = String(sid).trim();
    if (!out[k]) out[k] = [];
    if (!out[k].includes(sub)) out[k].push(sub);
  }
  return out;
}

export default function TeacherCopyCheckingWrapper() {
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [allowedClassIds, setAllowedClassIds] = useState<string[]>([]);
  const [classTeacherClassIds, setClassTeacherClassIds] = useState<string[]>([]);
  const [teachingSubjectsByClassId, setTeachingSubjectsByClassId] = useState<
    Record<string, string[]>
  >({});
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
          if (ctData != null && !Array.isArray(ctData)) ctData = [ctData];
          const ctRows = Array.isArray(ctData) ? ctData : [];
          const ctIds = ctRows
            .map((c: { id?: string }) => c.id)
            .filter((id): id is string => Boolean(id));

          setClassTeacherClassIds(ctIds);

          const slotsRes = await fetch(
            `/api/timetable/slots?school_code=${encodeURIComponent(code)}&teacher_id=${encodeURIComponent(teacherId)}`
          );
          const slotsJson = await slotsRes.json();
          const slots = Array.isArray(slotsJson?.data) ? slotsJson.data : [];
          const teachingMap = buildTeachingSubjectsByClassId(slots);

          setTeachingSubjectsByClassId(teachingMap);

          const union = new Set<string>([...ctIds, ...Object.keys(teachingMap)]);
          setAllowedClassIds(Array.from(union));
        } catch {
          setAllowedClassIds([]);
          setClassTeacherClassIds([]);
          setTeachingSubjectsByClassId({});
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

  if (allowedClassIds.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <ClipboardCheck className="text-muted-foreground" size={40} />
            <h1 className="text-2xl font-bold text-gray-900">Copy Checking</h1>
            <p className="text-sm text-gray-600">
              You are not assigned as a class teacher and have no classes on your timetable. Copy
              checking is available when you teach at least one class section or are a class teacher.
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
      classTeacherClassIds={classTeacherClassIds}
      teachingSubjectsByClassId={teachingSubjectsByClassId}
      teacherCopyScoped
    />
  );
}
