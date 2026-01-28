'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  X,
  FileText,
  Image as ImageIcon,
  Users,
  Calendar,
} from 'lucide-react';

interface AcademicYear {
  academic_year: string;
}

interface DiaryEntry {
  id: string;
  title: string;
  content: string | null;
  type: 'HOMEWORK' | 'OTHER';
  mode: 'GENERAL' | 'SUBJECT_WISE';
  created_at: string;
  diary_targets: Array<{
    id: string;
    class_name: string;
    section_name: string | null;
  }>;
  diary_attachments: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
  }>;
  read_count: number;
  total_targets: number;
}

export default function TeacherDigitalDiaryPage() {
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingDiary, setEditingDiary] = useState<DiaryEntry | null>(null);
  const [diaryType, setDiaryType] = useState<'HOMEWORK' | 'OTHER'>('HOMEWORK');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      try {
        const teacherData = JSON.parse(storedTeacher);
        const code = teacherData.school_code;
        if (code) {
          setSchoolCode(code);
          return;
        }
      } catch {
        // fall through
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (schoolCode) {
      fetchAcademicYears();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedYear && schoolCode) {
      fetchDiaries();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, schoolCode, page]);

  const fetchAcademicYears = async () => {
    if (!schoolCode) return;
    try {
      const response = await fetch(`/api/classes/academic-years?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        const years = result.data.map((year: string) => ({ academic_year: year }));
        setAcademicYears(years);
        if (years.length > 0) {
          setSelectedYear(years[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiaries = async () => {
    if (!schoolCode || !selectedYear) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
        page: page.toString(),
        limit: '20',
      });
      params.append('academic_year_id', selectedYear.academic_year);

      const response = await fetch(`/api/diary?${params}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setDiaries(result.data);
        setTotalPages(result.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching diaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!schoolCode || !selectedYear) return;
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
      });
      params.append('academic_year_id', selectedYear.academic_year);

      const response = await fetch(`/api/diary/stats?${params}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setTotalCount(result.data.total);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this diary entry?')) return;

    try {
      const response = await fetch(`/api/diary/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchDiaries();
        fetchStats();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete diary entry');
      }
    } catch (err) {
      console.error('Error deleting diary entry:', err);
      alert('Failed to delete diary entry. Please try again.');
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'HOMEWORK':
        return 'bg-emerald-100 text-emerald-800';
      case 'OTHER':
        return 'bg-emerald-700/20 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (schoolCode === null && !academicYears.length) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <BookOpen className="text-emerald-700" size={40} />
            <h1 className="text-2xl font-bold text-gray-900">Digital Diary</h1>
            <p className="text-sm text-gray-600">
              Unable to load school. Please ensure you are logged in as a teacher.
            </p>
            <Link href="/teacher/dashboard">
              <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                <ArrowLeft size={18} className="mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (loading && !selectedYear) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-emerald-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <BookOpen size={32} className="text-emerald-700" />
            Digital Diary
          </h1>
          <p className="text-gray-600">Give homework and notices to your classes</p>
        </div>
        <Link href="/teacher/dashboard">
          <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Academic Year Selector and Action Buttons */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Academic Year</label>
            <select
              value={selectedYear?.academic_year || ''}
              onChange={(e) => {
                const year = academicYears.find((y) => y.academic_year === e.target.value);
                setSelectedYear(year || null);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
            >
              {academicYears.map((year) => (
                <option key={year.academic_year} value={year.academic_year}>
                  {year.academic_year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setDiaryType('HOMEWORK');
                setEditingDiary(null);
                setShowModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus size={18} className="mr-2" />
              Homework
            </Button>
            <Button
              onClick={() => {
                setDiaryType('OTHER');
                setEditingDiary(null);
                setShowModal(true);
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Plus size={18} className="mr-2" />
              Others
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Card - Dark green */}
      <Card className="p-6 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-emerald-900/80 flex items-center justify-center">
            <BookOpen className="text-white" size={32} />
          </div>
          <div>
            <p className="text-3xl font-bold">{totalCount}</p>
            <p className="text-emerald-100 text-sm">Total Diaries</p>
          </div>
        </div>
      </Card>

      {/* Diary List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-emerald-600 border-t-transparent rounded-full"></div>
        </div>
      ) : diaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {diaries.map((diary) => (
            <Card key={diary.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{diary.title}</h3>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(diary.type)}`}>
                    {diary.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => {
                      setEditingDiary(diary);
                      setDiaryType(diary.type);
                      setShowModal(true);
                    }}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(diary.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {diary.diary_targets.map((target, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                    >
                      {target.class_name}{target.section_name ? `-${target.section_name}` : ''}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                <Users size={16} />
                <span>
                  {diary.read_count} / {diary.total_targets} READ
                </span>
              </div>

              {diary.diary_attachments && diary.diary_attachments.length > 0 && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                  {diary.diary_attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800"
                    >
                      {att.file_type === 'PDF' ? (
                        <FileText size={16} />
                      ) : (
                        <ImageIcon size={16} aria-hidden />
                      )}
                      <span className="text-xs">{att.file_name}</span>
                    </a>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={14} />
                <span>{formatTimeAgo(diary.created_at)}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <BookOpen size={48} className="mx-auto mb-4 text-emerald-600/60" />
            <p className="text-lg font-semibold mb-2">No diary entries found</p>
            <p>Click the buttons above to create a new homework or notice.</p>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-emerald-50 hover:border-emerald-300"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-emerald-50 hover:border-emerald-300"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && schoolCode && (
        <DiaryModal
          schoolCode={schoolCode}
          academicYearId={selectedYear?.academic_year}
          diary={editingDiary}
          defaultType={diaryType}
          onClose={() => {
            setShowModal(false);
            setEditingDiary(null);
            fetchDiaries();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

// Diary Modal - dark green theme
function DiaryModal({
  schoolCode,
  academicYearId,
  diary,
  defaultType,
  onClose,
}: {
  schoolCode: string;
  academicYearId?: string | null;
  diary: DiaryEntry | null;
  defaultType: 'HOMEWORK' | 'OTHER';
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [classes, setClasses] = useState<Array<{ id?: string; class: string; section?: string; academic_year?: string }>>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedTargets, setSelectedTargets] = useState<Array<{ class_name: string; section_name?: string }>>([]);
  const [attachments, setAttachments] = useState<Array<{ file_name: string; file_url: string; file_type: string; file_size?: number }>>([]);
  const [formData, setFormData] = useState({
    title: diary?.title || '',
    content: diary?.content || '',
    type: diary?.type || defaultType,
    mode: diary?.mode || 'GENERAL',
  });

  useEffect(() => {
    fetchAcademicYears();
    if (diary) {
      setSelectedTargets(
        diary.diary_targets.map((t) => ({
          class_name: t.class_name,
          section_name: t.section_name || undefined,
        }))
      );
      setAttachments(
        diary.diary_attachments.map((a) => ({
          file_name: a.file_name,
          file_url: a.file_url,
          file_type: a.file_type,
        }))
      );
      if (academicYearId) {
        setSelectedAcademicYear(academicYearId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedAcademicYear) {
      fetchClasses();
    } else {
      setClasses([]);
      setSelectedClass('');
      setAvailableSections([]);
      setSelectedSection('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAcademicYear]);

  useEffect(() => {
    if (selectedClass && classes.length > 0) {
      const sections = classes
        .filter((c) => c.class === selectedClass)
        .map((c) => c.section)
        .filter((s): s is string => !!s);
      const uniqueSections = Array.from(new Set(sections)).sort();
      setAvailableSections(uniqueSections);
      setSelectedSection('');
    } else {
      setAvailableSections([]);
      setSelectedSection('');
    }
  }, [selectedClass, classes]);

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch(`/api/classes/academic-years?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        const years = result.data.map((year: string) => ({ academic_year: year }));
        setAcademicYears(years);
        if (academicYearId) {
          const matchedYear = years.find((y: AcademicYear) => y.academic_year === academicYearId);
          setSelectedAcademicYear(matchedYear?.academic_year || years[0]?.academic_year || '');
        } else {
          setSelectedAcademicYear(years[0]?.academic_year || '');
        }
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      if (!selectedAcademicYear) {
        setClasses([]);
        return;
      }

      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        const filteredClasses = result.data.filter((item: { academic_year?: string }) => {
          return item.academic_year === selectedAcademicYear;
        });
        setClasses(filteredClasses);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('school_code', schoolCode);

      const response = await fetch('/api/diary/upload', {
        method: 'POST',
        body: form,
      });

      const result = await response.json();
      if (response.ok && result.data) {
        setAttachments((prev) => [...prev, result.data]);
      } else {
        alert(result.error || 'Failed to upload file');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddTarget = () => {
    if (!selectedClass) {
      alert('Please select a class');
      return;
    }

    const target = {
      class_name: selectedClass,
      section_name: selectedSection || undefined,
    };

    const exists = selectedTargets.some(
      (t) => t.class_name === target.class_name && (t.section_name || '') === (target.section_name || '')
    );

    if (exists) {
      alert('This class/section is already added');
      return;
    }

    setSelectedTargets((prev) => [...prev, target]);
    setSelectedClass('');
    setSelectedSection('');
  };

  const removeTarget = (index: number) => {
    setSelectedTargets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (selectedTargets.length === 0) {
      alert('Please select at least one class/section');
      return;
    }

    setSaving(true);
    try {
      const url = diary ? `/api/diary/${diary.id}` : '/api/diary';
      const method = diary ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          academic_year_id: selectedAcademicYear || academicYearId || null,
          ...formData,
          targets: selectedTargets,
          attachments: attachments,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        onClose();
      } else {
        const errorMsg = result.details
          ? `${result.error}: ${result.details}${result.hint ? ` (${result.hint})` : ''}`
          : result.error || `Failed to ${diary ? 'update' : 'create'} diary entry`;
        console.error('Diary creation error:', result);
        alert(errorMsg);
      }
    } catch (err) {
      console.error('Error saving diary entry:', err);
      alert(`Failed to ${diary ? 'update' : 'create'} diary entry. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-white rounded-lg shadow-xl my-8 max-h-[90vh] flex flex-col"
      >
        <Card className="m-0 flex flex-col h-full max-h-[90vh]">
          <div className="flex items-center justify-between mb-6 flex-shrink-0 px-6 pt-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {diary ? 'Edit Diary Entry' : 'Create Diary Entry'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Enter diary title"
                className="focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Diary Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="HOMEWORK">Homework</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Diary Mode</label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value as typeof formData.mode })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="GENERAL">General</option>
                <option value="SUBJECT_WISE">Subject-wise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => {
                  setSelectedAcademicYear(e.target.value);
                  setSelectedClass('');
                  setSelectedSection('');
                  setSelectedTargets([]);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="">Select Academic Year</option>
                {academicYears.map((year) => (
                  <option key={year.academic_year} value={year.academic_year}>
                    {year.academic_year}
                  </option>
                ))}
              </select>
            </div>

            {selectedAcademicYear && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setSelectedSection('');
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Select Class</option>
                      {Array.from(new Set(classes.map((c) => c.class))).sort().map((className) => (
                        <option key={className} value={className}>
                          {className}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Section</label>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      disabled={!selectedClass}
                    >
                      <option value="">All Sections (Whole Class)</option>
                      {availableSections.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddTarget}
                  disabled={!selectedClass}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Add Class/Section
                </Button>
              </div>
            )}

            {selectedTargets.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Selected Classes & Sections <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedTargets.map((target, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium"
                      >
                        {target.class_name}{target.section_name ? `-${target.section_name}` : ' (All Sections)'}
                        <button
                          type="button"
                          onClick={() => removeTarget(idx)}
                          className="text-emerald-600 hover:text-emerald-800"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Instruction (Rich Text)</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
                rows={4}
                placeholder="Enter instructions or content (HTML supported)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Attachments</label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  disabled={uploading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{att.file_name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 flex-shrink-0 sticky bottom-0 bg-white">
              <Button type="button" variant="outline" onClick={onClose} className="border-gray-300">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || uploading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? 'Saving...' : uploading ? 'Uploading...' : diary ? 'Update' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
