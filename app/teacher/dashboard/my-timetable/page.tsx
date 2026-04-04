'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import TeacherTimetableView from '@/components/timetable/TeacherTimetableView';
import { getString } from '@/lib/type-utils';
import type { Staff } from '@/lib/supabase';

export default function MyTimetablePage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Staff | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('teacher');
    const role = sessionStorage.getItem('role');
    if (!raw || role !== 'teacher') {
      router.push('/login');
      return;
    }
    try {
      setTeacher(JSON.parse(raw) as Staff);
    } catch {
      router.push('/login');
    }
  }, [router]);

  if (!teacher) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  const schoolCode = getString(teacher.school_code);
  const teacherId = getString(teacher.id);
  if (!schoolCode || !teacherId) {
    return (
      <div className="p-6 text-center text-amber-800">
        Your profile is missing school or staff information. Please contact the administrator.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ECEDED] space-y-6 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4"
      >
        <div className="p-3 rounded-xl bg-white border border-[#E1E1DB] shadow-sm">
          <CalendarDays className="text-[#1e3a8a]" size={28} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">My Timetable</h1>
          <p className="text-[#64748B] text-sm sm:text-base mt-1 max-w-2xl">
            Your weekly teaching schedule from the school timetable (periods, classes, and subjects assigned to you).
          </p>
        </div>
      </motion.div>

      <TeacherTimetableView schoolCode={schoolCode} teacherId={teacherId} />
    </div>
  );
}
