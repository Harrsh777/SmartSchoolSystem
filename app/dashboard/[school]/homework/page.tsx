'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Image,
  Download,
  Users,
  Calendar,
} from 'lucide-react';

interface AcademicYear {
  id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface DiaryEntry {
  id: string;
  title: string;
  content: string | null;
  type: 'HOMEWORK' | 'ANNOUNCEMENT' | 'HOLIDAY' | 'OTHER';
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

export default function DigitalDiaryPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingDiary, setEditingDiary] = useState<DiaryEntry | null>(null);
  const [diaryType, setDiaryType] = useState<'HOMEWORK' | 'ANNOUNCEMENT' | 'HOLIDAY' | 'OTHER'>('HOMEWORK');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAcademicYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedYear) {
      fetchDiaries();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, schoolCode, page]);

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch(`/api/fees/academic-years?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setAcademicYears(result.data);
        const current = result.data.find((y: AcademicYear) => y.is_current);
        setSelectedYear(current || result.data[0] || null);
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiaries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
        page: page.toString(),
        limit: '20',
      });
      if (selectedYear) params.append('academic_year_id', selectedYear.id);

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
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
      });
      if (selectedYear) params.append('academic_year_id', selectedYear.id);

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
        return 'bg-blue-100 text-blue-800';
      case 'ANNOUNCEMENT':
        return 'bg-green-100 text-green-800';
      case 'HOLIDAY':
        return 'bg-yellow-100 text-yellow-800';
      case 'OTHER':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !selectedYear) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <BookOpen size={32} />
            Digital Diary
          </h1>
          <p className="text-gray-600">Manage homework, announcements, holidays, and notices</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Academic Year Selector and Action Buttons */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Academic Year</label>
            <select
              value={selectedYear?.id || ''}
              onChange={(e) => {
                const year = academicYears.find((y) => y.id === e.target.value);
                setSelectedYear(year || null);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[200px]"
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year_name}
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
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              Homework
            </Button>
            <Button
              onClick={() => {
                setDiaryType('ANNOUNCEMENT');
                setEditingDiary(null);
                setShowModal(true);
              }}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              Announcement
            </Button>
            <Button
              onClick={() => {
                setDiaryType('HOLIDAY');
                setEditingDiary(null);
                setShowModal(true);
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              Holiday
            </Button>
            <Button
              onClick={() => {
                setDiaryType('OTHER');
                setEditingDiary(null);
                setShowModal(true);
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              Others
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-blue-800 flex items-center justify-center">
            <BookOpen className="text-white" size={32} />
          </div>
          <div>
            <p className="text-3xl font-bold">{totalCount}</p>
            <p className="text-blue-100 text-sm">Total Diaries</p>
          </div>
        </div>
      </Card>

      {/* Diary List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
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
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
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

              {/* Classes & Sections */}
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

              {/* Read Count */}
              {diary.type !== 'HOLIDAY' && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                  <Users size={16} />
                  <span>
                    {diary.read_count} / {diary.total_targets} READ
                  </span>
                </div>
              )}

              {/* Attachments */}
              {diary.diary_attachments && diary.diary_attachments.length > 0 && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                  {diary.diary_attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      {att.file_type === 'PDF' ? (
                        <FileText size={16} />
                      ) : (
                        <Image size={16} />
                      )}
                      <span className="text-xs">{att.file_name}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Created Time */}
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
            <BookOpen size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">No diary entries found</p>
            <p>Click the buttons above to create a new diary entry.</p>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <DiaryModal
          schoolCode={schoolCode}
          academicYearId={selectedYear?.id}
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

// Diary Modal Component
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
  defaultType: 'HOMEWORK' | 'ANNOUNCEMENT' | 'HOLIDAY' | 'OTHER';
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [classes, setClasses] = useState<Array<{ class: string; section?: string }>>([]);
  const [selectedTargets, setSelectedTargets] = useState<Array<{ class_name: string; section_name?: string }>>([]);
  const [attachments, setAttachments] = useState<Array<{ file_name: string; file_url: string; file_type: string; file_size?: number }>>([]);
  const [formData, setFormData] = useState({
    title: diary?.title || '',
    content: diary?.content || '',
    type: diary?.type || defaultType,
    mode: diary?.mode || 'GENERAL',
  });

  useEffect(() => {
    fetchClasses();
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        // Group by class and section
        const classMap = new Map<string, Set<string>>();
        result.data.forEach((item: { class?: string; section?: string }) => {
          if (item.class) {
            if (!classMap.has(item.class)) {
              classMap.set(item.class, new Set());
            }
            if (item.section) {
              classMap.get(item.class)!.add(item.section);
            }
          }
        });

        const classList: Array<{ class: string; section?: string }> = [];
        classMap.forEach((sections, className) => {
          if (sections.size > 0) {
            sections.forEach((section) => {
              classList.push({ class: className, section });
            });
          } else {
            classList.push({ class: className });
          }
        });

        setClasses(classList);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('school_code', schoolCode);

      const response = await fetch('/api/diary/upload', {
        method: 'POST',
        body: formData,
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

  const toggleTarget = (className: string, sectionName?: string) => {
    const key = `${className}-${sectionName || ''}`;
    const exists = selectedTargets.some(
      (t) => t.class_name === className && (t.section_name || '') === (sectionName || '')
    );

    if (exists) {
      setSelectedTargets((prev) =>
        prev.filter((t) => !(t.class_name === className && (t.section_name || '') === (sectionName || '')))
      );
    } else {
      setSelectedTargets((prev) => [...prev, { class_name: className, section_name: sectionName }]);
    }
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
          academic_year_id: academicYearId,
          ...formData,
          targets: selectedTargets,
          attachments: attachments,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        onClose();
      } else {
        alert(result.error || `Failed to ${diary ? 'update' : 'create'} diary entry`);
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
            <h2 className="text-2xl font-bold text-black">
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
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Diary Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="HOMEWORK">Homework</option>
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Diary Mode
              </label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value as typeof formData.mode })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="GENERAL">General</option>
                <option value="SUBJECT_WISE">Subject-wise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Classes & Sections <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {classes.map((cls, idx) => {
                    const key = `${cls.class}-${cls.section || ''}`;
                    const isSelected = selectedTargets.some(
                      (t) => t.class_name === cls.class && (t.section_name || '') === (cls.section || '')
                    );
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleTarget(cls.class, cls.section)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cls.class}{cls.section ? `-${cls.section}` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Instruction (Rich Text)</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y"
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
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  disabled={uploading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploading} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? 'Saving...' : uploading ? 'Uploading...' : diary ? 'Update' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}



