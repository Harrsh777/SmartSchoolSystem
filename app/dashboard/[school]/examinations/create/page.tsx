'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface ExamSubject {
  subject_id: string;
  max_marks: string;
}

export default function CreateExaminationPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  interface ClassData {
    id: string;
    class: string;
    section: string;
    [key: string]: unknown;
  }
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [formData, setFormData] = useState({
    class_id: '',
    name: '',
    exam_type: '',
  });
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, subjectsRes] = await Promise.all([
        fetch(`/api/classes?school_code=${schoolCode}`),
        fetch(`/api/timetable/subjects?school_code=${schoolCode}`),
      ]);

      const classesData = await classesRes.json();
      const subjectsData = await subjectsRes.json();

      if (classesRes.ok && classesData.data) {
        setClasses(classesData.data);
      }

      if (subjectsRes.ok && subjectsData.data) {
        setSubjects(subjectsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = () => {
    setExamSubjects([...examSubjects, { subject_id: '', max_marks: '' }]);
  };

  const handleRemoveSubject = (index: number) => {
    setExamSubjects(examSubjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (index: number, field: 'subject_id' | 'max_marks', value: string) => {
    const updated = [...examSubjects];
    updated[index] = { ...updated[index], [field]: value };
    setExamSubjects(updated);
    
    // Clear error for this field
    if (errors[`subject_${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`subject_${index}`];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.class_id) {
      newErrors.class_id = 'Please select a class';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Exam name is required';
    }

    if (examSubjects.length === 0) {
      newErrors.subjects = 'At least one subject is required';
    }

    examSubjects.forEach((es, index) => {
      if (!es.subject_id) {
        newErrors[`subject_${index}`] = 'Please select a subject';
      }
      if (!es.max_marks || parseInt(es.max_marks) <= 0) {
        newErrors[`max_marks_${index}`] = 'Max marks must be greater than 0';
      }
    });

    // Check for duplicate subjects
    const subjectIds = examSubjects.map(es => es.subject_id).filter(Boolean);
    const duplicates = subjectIds.filter((id, index) => subjectIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      newErrors.subjects = 'Duplicate subjects are not allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Get current staff from session storage
      const storedStaff = sessionStorage.getItem('staff');
      let createdBy: string | null = null;
      if (storedStaff) {
        try {
          const staffData = JSON.parse(storedStaff);
          createdBy = staffData.id || null;
        } catch {
          // Ignore parse errors
        }
      }

      if (!createdBy) {
        alert('Please log in to create examinations');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          class_id: formData.class_id,
          name: formData.name.trim(),
          exam_type: formData.exam_type || null,
          subjects: examSubjects.map(es => ({
            subject_id: es.subject_id,
            max_marks: parseInt(es.max_marks) || 0,
          })),
          created_by: createdBy,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Examination created successfully!');
        router.push(`/dashboard/${schoolCode}/examinations`);
      } else {
        alert(result.error || 'Failed to create examination');
      }
    } catch (error) {
      console.error('Error creating examination:', error);
      alert('Failed to create examination. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  const selectedSubjectIds = examSubjects.map(es => es.subject_id).filter(Boolean);
  // availableSubjects kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const availableSubjects = subjects.filter(s => !selectedSubjectIds.includes(s.id));

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
            onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Create Examination</h1>
            <p className="text-gray-600">Create a new examination for a class</p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-bold text-black mb-4">Basic Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, class_id: e.target.value }));
                      if (errors.class_id) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.class_id;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      errors.class_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select a class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        Class {cls.class} - Section {cls.section} ({cls.academic_year})
                      </option>
                    ))}
                  </select>
                  {errors.class_id && (
                    <p className="mt-1 text-sm text-red-500">{errors.class_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Exam Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, name: e.target.value }));
                      if (errors.name) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.name;
                          return newErrors;
                        });
                      }
                    }}
                    error={errors.name}
                    required
                    placeholder="e.g., Mid-Term Exam, Final Exam"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Exam Type
                  </label>
                  <Input
                    type="text"
                    value={formData.exam_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, exam_type: e.target.value }))}
                    placeholder="e.g., Unit Test, Mid-Term, Final"
                  />
                </div>
              </div>
            </div>

            {/* Subjects */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-black">Subjects & Max Marks</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSubject}
                >
                  <Plus size={16} className="mr-2" />
                  Add Subject
                </Button>
              </div>

              {errors.subjects && (
                <p className="text-sm text-red-500 mb-4">{errors.subjects}</p>
              )}

              {examSubjects.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 mb-4">No subjects added yet</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSubject}
                  >
                    <Plus size={16} className="mr-2" />
                    Add First Subject
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {examSubjects.map((examSubject, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Subject <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={examSubject.subject_id}
                            onChange={(e) => handleSubjectChange(index, 'subject_id', e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                              errors[`subject_${index}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          >
                            <option value="">Select subject</option>
                            {subjects.map(subject => (
                              <option
                                key={subject.id}
                                value={subject.id}
                                disabled={selectedSubjectIds.includes(subject.id) && examSubject.subject_id !== subject.id}
                              >
                                {subject.name}
                              </option>
                            ))}
                          </select>
                          {errors[`subject_${index}`] && (
                            <p className="mt-1 text-sm text-red-500">{errors[`subject_${index}`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Max Marks <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={examSubject.max_marks}
                            onChange={(e) => handleSubjectChange(index, 'max_marks', e.target.value)}
                            error={errors[`max_marks_${index}`]}
                            required
                            placeholder="e.g., 100"
                          />
                        </div>
                      </div>

                      {examSubjects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubject(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-6"
                          title="Remove subject"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {examSubjects.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Total Max Marks:</span>{' '}
                    {examSubjects.reduce((sum, es) => sum + (parseInt(es.max_marks) || 0), 0)}
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Create Examination
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

