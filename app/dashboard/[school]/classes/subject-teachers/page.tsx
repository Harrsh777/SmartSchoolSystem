'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { BookOpen, ArrowLeft, Search, User, X, Check, Loader2 } from 'lucide-react';

interface StaffMember {
  id: string;
  staff_id: string;
  full_name: string;
  role: string;
  department?: string;
  designation?: string;
  email?: string;
  phone?: string;
  subjects: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

export default function SubjectTeachersPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [staffRes, subjectsRes] = await Promise.all([
        fetch(`/api/staff-subjects?school_code=${schoolCode}`),
        fetch(`/api/timetable/subjects?school_code=${schoolCode}`),
      ]);

      const staffResult = await staffRes.json();
      const subjectsResult = await subjectsRes.json();

      if (staffRes.ok && staffResult.data) {
        setStaff(staffResult.data);
      } else {
        // If table doesn't exist, show helpful message
        const errorMsg = staffResult.error || 'Failed to load staff';
        if (errorMsg.includes('does not exist') || errorMsg.includes('relation') || staffResult.details?.includes('does not exist')) {
          setError('Staff-subject assignments table not found. The table will be created automatically when you assign your first subject to a staff member.');
          // Still show staff list with empty subjects
          const staffResponse = await fetch(`/api/staff?school_code=${schoolCode}`);
          const staffResult2 = await staffResponse.json();
          if (staffResponse.ok && staffResult2.data) {
            // Filter to teaching staff
            const teachingStaff = (staffResult2.data as Record<string, unknown>[]).filter(
              (s: Record<string, unknown>) =>
                ((s.role as string) || '').toLowerCase().includes('teacher') ||
                ((s.role as string) || '').toLowerCase().includes('principal') ||
                ((s.role as string) || '').toLowerCase().includes('head') ||
                ((s.role as string) || '').toLowerCase().includes('vice')
            );
            setStaff(teachingStaff.map((s: Record<string, unknown>): StaffMember => ({
              id: String(s.id || ''),
              staff_id: String(s.staff_id || ''),
              full_name: String(s.full_name || ''),
              role: String(s.role || ''),
              department: s.department ? String(s.department) : undefined,
              designation: s.designation ? String(s.designation) : undefined,
              email: s.email ? String(s.email) : undefined,
              phone: s.phone ? String(s.phone) : undefined,
              subjects: [],
            })));
          }
        } else {
          setError(errorMsg);
        }
      }

      if (subjectsRes.ok && subjectsResult.data) {
        setAllSubjects(subjectsResult.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setSelectedSubjectIds(new Set(staffMember.subjects.map((s) => s.id)));
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStaff(null);
    setSelectedSubjectIds(new Set());
    setError(null);
  };

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!selectedStaff) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/staff-subjects/${selectedStaff.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          subject_ids: Array.from(selectedSubjectIds),
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setSuccess('Subject assignments saved successfully!');
        // Update the staff member in the list
        setStaff((prev) =>
          prev.map((s) =>
            s.id === selectedStaff.id
              ? { ...s, subjects: result.data.subjects }
              : s
          )
        );
        setTimeout(() => {
          handleCloseModal();
        }, 1000);
      } else {
        setError(result.error || 'Failed to save assignments');
      }
    } catch (err) {
      console.error('Error saving assignments:', err);
      setError('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const filteredStaff = staff.filter((s) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(query) ||
      s.staff_id.toLowerCase().includes(query) ||
      s.role.toLowerCase().includes(query) ||
      (s.department && s.department.toLowerCase().includes(query)) ||
      s.subjects.some((subj) => subj.name.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/classes/overview`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
              <BookOpen size={32} />
              Subject Teachers
            </h1>
            <p className="text-gray-600">Assign subjects to teaching staff</p>
          </div>
        </div>
      </motion.div>

      {error && !showModal && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
        >
          {error}
        </motion.div>
      )}

      {success && !showModal && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg"
        >
          {success}
        </motion.div>
      )}

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search by name, staff ID, role, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <User size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold">No teaching staff found</p>
            <p className="text-sm">Try adjusting your search query</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((staffMember) => (
              <motion.div
                key={staffMember.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => handleOpenModal(staffMember)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:shadow-lg cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {staffMember.full_name}
                    </h3>
                    <p className="text-sm text-gray-600">{staffMember.staff_id}</p>
                    <p className="text-sm text-gray-500 mt-1">{staffMember.role}</p>
                    {staffMember.department && (
                      <p className="text-xs text-gray-400 mt-1">{staffMember.department}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 uppercase">
                      Subjects ({staffMember.subjects.length})
                    </span>
                  </div>
                  {staffMember.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {staffMember.subjects.slice(0, 3).map((subject) => (
                        <span
                          key={subject.id}
                          className="text-xs px-2 py-1 rounded-full text-white"
                          style={{ backgroundColor: subject.color || '#6B7280' }}
                        >
                          {subject.name}
                        </span>
                      ))}
                      {staffMember.subjects.length > 3 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                          +{staffMember.subjects.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No subjects assigned</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal for selecting subjects */}
      <AnimatePresence>
        {showModal && selectedStaff && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-1">
                      Assign Subjects
                    </h2>
                    <p className="text-gray-600">
                      Select subjects for <span className="font-semibold">{selectedStaff.full_name}</span>
                    </p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {error && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6">
                {allSubjects.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-semibold">No subjects available</p>
                    <p className="text-sm">Please add subjects first</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allSubjects.map((subject) => {
                      const isSelected = selectedSubjectIds.has(subject.id);
                      return (
                        <button
                          key={subject.id}
                          onClick={() => handleToggleSubject(subject.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div
                                className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                                style={{
                                  borderColor: isSelected ? subject.color : '#D1D5DB',
                                  backgroundColor: isSelected ? subject.color : 'transparent',
                                }}
                              >
                                {isSelected && <Check size={12} className="text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900">{subject.name}</p>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                <p className="text-sm text-gray-600">
                  {selectedSubjectIds.size} subject{selectedSubjectIds.size !== 1 ? 's' : ''} selected
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleCloseModal} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={18} className="mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Subjects'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
