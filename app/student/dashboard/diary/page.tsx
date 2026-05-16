'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import {
  BookOpen,
  Calendar,
  User,
  Clock,
  Paperclip,
  ChevronRight,
} from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';
import { SubmissionStatusChip } from '@/components/digital-diary/SubmissionStatusChip';
import {
  StudentDiarySubmitPanel,
  type StudentDiaryItem,
} from '@/components/digital-diary/StudentDiarySubmitPanel';
import type { SubmissionChip } from '@/components/digital-diary/types';
import { createClient } from '@supabase/supabase-js';

function dueCountdown(dueAt: string | null | undefined): { label: string; urgent: boolean } {
  if (!dueAt) return { label: '', urgent: false };
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff < 0) return { label: 'Past due', urgent: true };
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return { label: `${d}d left`, urgent: d < 2 };
  if (h > 0) return { label: `${h}h left`, urgent: true };
  return { label: `${Math.floor(diff / 60000)}m left`, urgent: true };
}

export default function StudentDiaryPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [diaries, setDiaries] = useState<StudentDiaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'HOMEWORK' | 'OTHER' | 'ASSIGNMENT' | 'NOTICE'>('all');
  const [activeDiary, setActiveDiary] = useState<StudentDiaryItem | null>(null);

  const fetchDiaries = useCallback(async (studentData: Student) => {
    try {
      setLoading(true);
      const schoolCode = getString(studentData.school_code);
      const studentId = getString(studentData.id);
      const className = getString(studentData.class);
      const section = getString(studentData.section);

      if (!schoolCode || !studentId || !className) {
        setDiaries([]);
        return;
      }

      const params = new URLSearchParams({
        school_code: schoolCode,
        student_id: studentId,
        class: className,
      });
      if (section) params.append('section', section);

      const response = await fetch(`/api/student/diary?${params.toString()}`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (response.ok && result.data) {
        setDiaries(result.data as StudentDiaryItem[]);
      } else {
        setDiaries([]);
      }
    } catch {
      setDiaries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent) as Student;
      setStudent(studentData);
      void fetchDiaries(studentData);
    } else {
      setLoading(false);
    }
  }, [fetchDiaries]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || diaries.length === 0) return;

    const supabase = createClient(url, key);
    const channel = supabase
      .channel('student-diary-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'diary_student_submissions' },
        () => {
          if (student) void fetchDiaries(student);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [diaries.length, student, fetchDiaries]);

  const filteredDiaries = useMemo(() => {
    return diaries.filter((d) => filter === 'all' || d.type === filter);
  }, [diaries, filter]);

  const markAsRead = async (diaryId: string) => {
    if (!student) return;
    const studentId = getString(student.id);
    if (!studentId) return;

    await fetch(`/api/diary/${diaryId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user_id: studentId, user_type: 'STUDENT' }),
    });
  };

  const openDiary = (diary: StudentDiaryItem) => {
    void markAsRead(diary.id);
    setActiveDiary(diary);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'HOMEWORK':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ASSIGNMENT':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'NOTICE':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <motion.div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading digital diary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <BookOpen className="text-primary" size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Digital Diary</h1>
            <p className="text-muted-foreground text-sm">Homework, assignments & class notices</p>
          </div>
        </div>
      </motion.div>

      <Card className="glass-card soft-shadow p-3 sticky top-16 z-10">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm"
        >
          <option value="all">All types</option>
          <option value="HOMEWORK">Homework</option>
          <option value="ASSIGNMENT">Assignments</option>
          <option value="NOTICE">Notices</option>
          <option value="OTHER">Announcements</option>
        </select>
      </Card>

      {filteredDiaries.length === 0 ? (
        <Card className="glass-card soft-shadow p-10 text-center">
          <BookOpen className="mx-auto mb-3 text-muted-foreground opacity-50" size={48} />
          <p className="text-muted-foreground">No entries yet. Check back when your teachers post work.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDiaries.map((diary) => {
            const countdown = dueCountdown(diary.due_at);
            const chip = (diary.submission_chip || 'NONE') as SubmissionChip;
            const needsAction =
              (diary.type === 'HOMEWORK' || diary.type === 'ASSIGNMENT') &&
              diary.submissions_allowed !== false &&
              chip !== 'Submitted' &&
              chip !== 'Late';

            return (
              <motion.button
                key={diary.id}
                type="button"
                onClick={() => openDiary(diary)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md ${
                  needsAction ? 'border-l-4 border-l-primary border-input bg-card' : 'border-input bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getTypeColor(diary.type)}`}
                      >
                        {diary.type}
                      </span>
                      <SubmissionStatusChip status={chip} />
                      {countdown.label ? (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            countdown.urgent ? 'bg-orange-100 text-orange-800' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Clock size={11} />
                          {countdown.label}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="font-semibold text-foreground line-clamp-2">{diary.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <User size={12} />
                      {diary.created_by || 'Teacher'}
                      <span className="mx-1">·</span>
                      <Calendar size={12} />
                      {diary.created_at ? new Date(diary.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground shrink-0 mt-1" size={20} />
                </div>
                {diary.attachments?.length ? (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Paperclip size={12} />
                    {diary.attachments.length} teacher attachment(s)
                  </p>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      )}

      {activeDiary ? (
        <StudentDiarySubmitPanel
          diary={activeDiary}
          open={Boolean(activeDiary)}
          onClose={() => setActiveDiary(null)}
          onSubmitted={() => {
            if (student) void fetchDiaries(student);
          }}
        />
      ) : null}
    </div>
  );
}
