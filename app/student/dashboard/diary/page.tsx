'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { BookOpen, Calendar, User, FileText, Download, CheckCircle2, Clock, Paperclip } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

interface DiaryEntry {
  id: string;
  title: string;
  content: string | null;
  type: string;
  mode: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_id: string | null;
  target_classes: string;
  attachments: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number | null;
  }>;
  is_read: boolean;
  academic_year_id: string | null;
}

export default function StudentDiaryPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'HOMEWORK' | 'OTHER' | 'ASSIGNMENT' | 'NOTICE'>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchDiaries(studentData);
    }
  }, []);

  const fetchDiaries = async (studentData: Student) => {
    try {
      setLoading(true);
      const schoolCode = getString(studentData.school_code);
      const studentId = getString(studentData.id);
      const className = getString(studentData.class);
      const section = getString(studentData.section);
      const academicYear = getString(studentData.academic_year);
      
      if (!schoolCode || !studentId || !className) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        school_code: schoolCode,
        student_id: studentId,
        class: className,
        academic_year: academicYear || '',
      });
      if (section) {
        params.append('section', section);
      }

      const response = await fetch(`/api/student/diary?${params.toString()}`);

      const result = await response.json();

      if (response.ok && result.data) {
        setDiaries(result.data || []);
      } else {
        console.error('Error fetching diaries:', result.error);
        setDiaries([]);
      }
    } catch (error) {
      console.error('Error fetching diaries:', error);
      setDiaries([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (diaryId: string) => {
    if (!student) return;

    try {
      const studentId = getString(student.id);
      if (!studentId) return;

      const response = await fetch(`/api/diary/${diaryId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: studentId,
          user_type: 'STUDENT',
        }),
      });

      if (response.ok) {
        // Update local state
        setDiaries(prevDiaries =>
          prevDiaries.map(diary =>
            diary.id === diaryId ? { ...diary, is_read: true } : diary
          )
        );
      }
    } catch (error) {
      console.error('Error marking diary as read:', error);
    }
  };

  const handleDiaryClick = (diary: DiaryEntry) => {
    if (!diary.is_read) {
      markAsRead(diary.id);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'HOMEWORK':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'OTHER':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ASSIGNMENT':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'NOTICE':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'HOMEWORK':
        return 'Homework';
      case 'OTHER':
        return 'Announcement';
      case 'ASSIGNMENT':
        return 'Assignment';
      case 'NOTICE':
        return 'Notice';
      default:
        return type;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDiaries = diaries.filter(diary => {
    if (filter !== 'all' && diary.type !== filter) return false;
    if (readFilter === 'read' && !diary.is_read) return false;
    if (readFilter === 'unread' && diary.is_read) return false;
    return true;
  });

  const stats = {
    total: diaries.length,
    homework: diaries.filter(d => d.type === 'HOMEWORK').length,
    announcements: diaries.filter(d => d.type === 'OTHER').length,
    unread: diaries.filter(d => !d.is_read).length,
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading digital diary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Digital Diary</h1>
            <p className="text-muted-foreground">View announcements and homework for your class</p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card soft-shadow p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-blue-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Homework</p>
          <p className="text-2xl font-bold text-blue-600">{stats.homework}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-purple-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Announcements</p>
          <p className="text-2xl font-bold text-purple-600">{stats.announcements}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-orange-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Unread</p>
          <p className="text-2xl font-bold text-orange-600">{stats.unread}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card soft-shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Type Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="all">All Types</option>
              <option value="HOMEWORK">Homework</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="OTHER">Announcements</option>
              <option value="NOTICE">Notice</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Read Status</label>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as typeof readFilter)}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="all">All</option>
              <option value="read">Read</option>
              <option value="unread">Unread</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Diary Entries */}
      {filteredDiaries.length === 0 ? (
        <Card className="glass-card soft-shadow">
          <div className="text-center py-12">
            <BookOpen className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground text-lg">No diary entries found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {diaries.length === 0 
                ? 'Your class announcements and homework will appear here once they are posted.'
                : 'No entries match the selected filters.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDiaries.map((diary) => (
            <motion.div
              key={diary.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleDiaryClick(diary)}
              className="cursor-pointer"
            >
              <Card className={`glass-card soft-shadow hover:shadow-md transition-all ${
                !diary.is_read ? 'border-l-4 border-primary' : ''
              }`}>
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{diary.title}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getTypeColor(diary.type)}`}>
                          {getTypeLabel(diary.type)}
                        </span>
                        {!diary.is_read && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{new Date(diary.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          <span>By: {diary.created_by}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText size={14} />
                          <span>For: {diary.target_classes}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {diary.is_read ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 size={18} />
                          <span className="text-xs font-medium">Read</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-orange-600">
                          <Clock size={18} />
                          <span className="text-xs font-medium">Unread</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  {diary.content && (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-foreground whitespace-pre-wrap">{diary.content}</p>
                    </div>
                  )}

                  {/* Attachments */}
                  {diary.attachments && diary.attachments.length > 0 && (
                    <div className="pt-4 border-t border-input">
                      <div className="flex items-center gap-2 mb-2">
                        <Paperclip size={16} className="text-muted-foreground" />
                        <p className="text-sm font-semibold text-foreground">Attachments ({diary.attachments.length})</p>
                      </div>
                      <div className="space-y-2">
                        {diary.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors group"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="p-2 bg-background rounded">
                              <FileText className="text-primary" size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                {attachment.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.file_size)} • {attachment.file_type}
                              </p>
                            </div>
                            <Download className="text-muted-foreground group-hover:text-primary transition-colors" size={18} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
