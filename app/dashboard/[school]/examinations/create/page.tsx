'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, ArrowRight, Check, Calendar, BookOpen, Users, FileText, Save } from 'lucide-react';

interface ClassData {
  id: string;
  class: string;
  section: string;
  academic_year?: string;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface SelectedClass {
  classId: string;
  className: string;
  sections: string[];
}

interface ClassSubject {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjects: Array<{
    subject_id: string;
    subject_name: string;
    max_marks: number;
    pass_marks: number;
    weightage: number;
  }>;
}

interface ExamSchedule {
  classId: string;
  sectionId: string;
  subjectId: string;
  exam_date: string;
  start_time: string;
  end_time: string;
}

export default function CreateExaminationPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 1: Exam Metadata
  const [examMetadata, setExamMetadata] = useState({
    exam_name: '',
    academic_year: new Date().getFullYear().toString(),
    start_date: '',
    end_date: '',
    description: '',
  });

  // Step 2: Class Mapping
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<SelectedClass[]>([]);

  // Step 3: Subject Mapping
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);

  // Step 4: Schedule
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  // createdExamId removed - not used
  // const [createdExamId, setCreatedExamId] = useState<string | null>(null);

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

  // Step 1: Validate and Save Metadata
  const handleStep1Next = () => {
    const newErrors: Record<string, string> = {};
    
    if (!examMetadata.exam_name.trim()) {
      newErrors.exam_name = 'Exam name is required';
    }
    if (!examMetadata.academic_year.trim()) {
      newErrors.academic_year = 'Academic year is required';
    }
    if (!examMetadata.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!examMetadata.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (examMetadata.start_date && examMetadata.end_date) {
      const start = new Date(examMetadata.start_date);
      const end = new Date(examMetadata.end_date);
      if (end < start) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setCurrentStep(2);
    }
  };

  // Step 2: Class Selection
  const handleClassToggle = (classId: string, className: string) => {
    setSelectedClasses(prev => {
      const existing = prev.find(c => c.classId === classId);
      if (existing) {
        return prev.filter(c => c.classId !== classId);
      } else {
        // Get all sections for this class
        const classSections = classes
          .filter(c => c.id === classId)
          .map(c => ({ id: c.id, name: c.section }));
        
        return [...prev, {
          classId,
          className,
          sections: classSections.map(s => s.id),
        }];
      }
    });
  };

  const handleSectionToggle = (classId: string, sectionId: string) => {
    setSelectedClasses(prev => prev.map(c => {
      if (c.classId === classId) {
        const sections = c.sections.includes(sectionId)
          ? c.sections.filter(s => s !== sectionId)
          : [...c.sections, sectionId];
        return { ...c, sections };
      }
      return c;
    }));
  };

  const handleStep2Next = () => {
    if (selectedClasses.length === 0) {
      setErrors({ class_selection: 'Please select at least one class' });
      return;
    }
    
    // Initialize class subjects for step 3
    const newClassSubjects: ClassSubject[] = [];
    selectedClasses.forEach(selectedClass => {
      selectedClass.sections.forEach(sectionId => {
        const section = classes.find(c => c.id === sectionId);
        if (section) {
          newClassSubjects.push({
            classId: selectedClass.classId,
            className: selectedClass.className,
            sectionId: section.id,
            sectionName: section.section,
            subjects: [],
          });
        }
      });
    });
    setClassSubjects(newClassSubjects);
    setCurrentStep(3);
  };

  // Step 3: Subject Mapping
  const handleSubjectAdd = (classSubjectIndex: number, subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    setClassSubjects(prev => prev.map((cs, idx) => {
      if (idx === classSubjectIndex) {
        const exists = cs.subjects.find(s => s.subject_id === subjectId);
        if (exists) return cs;
        
        return {
          ...cs,
          subjects: [...cs.subjects, {
            subject_id: subjectId,
            subject_name: subject.name,
            max_marks: 100,
            pass_marks: 33,
            weightage: 0,
          }],
        };
      }
      return cs;
    }));
  };

  const handleSelectAllSubjects = (classSubjectIndex: number) => {
    setClassSubjects(prev => prev.map((cs, idx) => {
      if (idx === classSubjectIndex) {
        // Get all subjects that are not already added
        const availableSubjects = subjects.filter(s => 
          !cs.subjects.find(existing => existing.subject_id === s.id)
        );
        
        // Add all available subjects with default values
        const newSubjects = availableSubjects.map(subject => ({
          subject_id: subject.id,
          subject_name: subject.name,
          max_marks: 100,
          pass_marks: 33,
          weightage: 0,
        }));
        
        return {
          ...cs,
          subjects: [...cs.subjects, ...newSubjects],
        };
      }
      return cs;
    }));
  };

  const handleSubjectRemove = (classSubjectIndex: number, subjectIndex: number) => {
    setClassSubjects(prev => prev.map((cs, idx) => {
      if (idx === classSubjectIndex) {
        return {
          ...cs,
          subjects: cs.subjects.filter((_, sIdx) => sIdx !== subjectIndex),
        };
      }
      return cs;
    }));
  };

  const handleSubjectChange = (
    classSubjectIndex: number,
    subjectIndex: number,
    field: 'max_marks' | 'pass_marks' | 'weightage',
    value: number
  ) => {
    setClassSubjects(prev => prev.map((cs, idx) => {
      if (idx === classSubjectIndex) {
        return {
          ...cs,
          subjects: cs.subjects.map((s, sIdx) => {
            if (sIdx === subjectIndex) {
              return { ...s, [field]: value };
            }
            return s;
          }),
        };
      }
      return cs;
    }));
  };

  const handleStep3Next = () => {
    // Validate all classes have at least one subject
    const hasEmpty = classSubjects.some(cs => cs.subjects.length === 0);
    if (hasEmpty) {
      setErrors({ subjects: 'All classes must have at least one subject' });
      return;
    }

    // Validate max marks > pass marks
    const invalidMarks = classSubjects.some(cs =>
      cs.subjects.some(s => s.pass_marks >= s.max_marks)
    );
    if (invalidMarks) {
      setErrors({ marks: 'Pass marks must be less than max marks' });
      return;
    }

    // Initialize schedules for step 4
    const newSchedules: ExamSchedule[] = [];
    classSubjects.forEach(cs => {
      cs.subjects.forEach(subject => {
        newSchedules.push({
          classId: cs.classId,
          sectionId: cs.sectionId,
          subjectId: subject.subject_id,
          exam_date: '',
          start_time: '',
          end_time: '',
        });
      });
    });
    setExamSchedules(newSchedules);
    setCurrentStep(4);
  };

  // Step 4: Schedule
  const handleScheduleChange = (
    index: number,
    field: 'exam_date' | 'start_time' | 'end_time',
    value: string
  ) => {
    setExamSchedules(prev => prev.map((s, idx) => {
      if (idx === index) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleStep4Submit = async () => {
    // Validate all schedules
    const incomplete = examSchedules.some(s => !s.exam_date || !s.start_time || !s.end_time);
    if (incomplete) {
      setErrors({ schedule: 'Please complete all exam schedules' });
      return;
    }

    // Validate time
    const invalidTime = examSchedules.some(s => {
      if (!s.start_time || !s.end_time) return false;
      return s.start_time >= s.end_time;
    });
    if (invalidTime) {
      setErrors({ schedule: 'End time must be after start time' });
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      // Get current user
      const currentUser = sessionStorage.getItem('staff');
      let createdBy = null;
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          createdBy = userData.id;
        } catch {
          // Ignore
        }
      }

      // Create exam via API
      const response = await fetch('/api/examinations/v2/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          exam_name: examMetadata.exam_name,
          academic_year: examMetadata.academic_year,
          start_date: examMetadata.start_date,
          end_date: examMetadata.end_date,
          description: examMetadata.description || null,
          class_mappings: selectedClasses,
          class_subjects: classSubjects,
          schedules: examSchedules,
          created_by: createdBy,
        }),
      });

      // Be resilient: if API returns non-JSON (e.g. Next error page), show it instead of logging {}
      const raw = await response.text();
      let result: Record<string, unknown> = {};
      try {
        result = raw ? JSON.parse(raw) : {};
      } catch {
        result = { error: raw || `Request failed with status ${response.status}` };
      }

      if (response.ok && result.data) {
        const data = result.data as { class_mappings_count?: number; subject_mappings_count?: number; schedules_count?: number };
        console.log('Examination created:', result.data);
        alert(`Examination created successfully! Created ${data.class_mappings_count || 0} class mappings, ${data.subject_mappings_count || 0} subject mappings, and ${data.schedules_count || 0} schedules.`);
        router.push(`/dashboard/${schoolCode}/examinations/dashboard`);
      } else {
        const errorMessage = String(result.error ?? 'Failed to create examination');
        const errorDetails = result.details ? `\nDetails: ${String(result.details)}` : '';
        const errorHint = result.hint ? `\nHint: ${String(result.hint)}` : '';
        console.error('Examination creation failed:', result);
        alert(`${errorMessage}${errorDetails}${errorHint}`);
        setErrors({ submit: errorMessage });
      }
    } catch (error) {
      console.error('Error creating examination:', error);
      setErrors({ submit: 'Failed to create examination. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, title: 'Exam Details', icon: FileText },
    { number: 2, title: 'Map Classes', icon: Users },
    { number: 3, title: 'Map Subjects', icon: BookOpen },
    { number: 4, title: 'Schedule Exams', icon: Calendar },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A7A95] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5A7A95] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Examination</h1>
          <p className="text-gray-600">Follow the steps to create a new examination</p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            
            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-[#5A7A95] text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={24} />
                    ) : (
                      <StepIcon size={24} />
                    )}
                  </div>
                  <p className={`mt-2 text-sm font-medium ${
                    isActive ? 'text-[#5A7A95]' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6">
            {/* Step 1: Exam Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Exam Details</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={examMetadata.exam_name}
                    onChange={(e) => setExamMetadata(prev => ({ ...prev, exam_name: e.target.value }))}
                    placeholder="e.g., Mid Term Exam, Final Exam"
                    className={errors.exam_name ? 'border-red-500' : ''}
                  />
                  {errors.exam_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.exam_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={examMetadata.academic_year}
                    onChange={(e) => setExamMetadata(prev => ({ ...prev, academic_year: e.target.value }))}
                    placeholder="e.g., 2024-2025"
                    className={errors.academic_year ? 'border-red-500' : ''}
                  />
                  {errors.academic_year && (
                    <p className="mt-1 text-sm text-red-600">{errors.academic_year}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={examMetadata.start_date}
                      onChange={(e) => setExamMetadata(prev => ({ ...prev, start_date: e.target.value }))}
                      className={errors.start_date ? 'border-red-500' : ''}
                    />
                    {errors.start_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={examMetadata.end_date}
                      onChange={(e) => setExamMetadata(prev => ({ ...prev, end_date: e.target.value }))}
                      className={errors.end_date ? 'border-red-500' : ''}
                    />
                    {errors.end_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={examMetadata.description}
                    onChange={(e) => setExamMetadata(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add any additional information about this examination"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A95] focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleStep1Next}>
                    Next: Map Classes
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Map Classes */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Classes & Sections</h2>
                
                {errors.class_selection && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{errors.class_selection}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {Array.from(new Set(classes.map(c => c.class))).map(className => {
                    const classItems = classes.filter(c => c.class === className);
                    const selectedClass = selectedClasses.find(sc => sc.className === className);
                    
                    return (
                      <div key={className} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!selectedClass}
                              onChange={() => handleClassToggle(
                                classItems[0].id,
                                className
                              )}
                              className="w-5 h-5 text-[#5A7A95] rounded focus:ring-[#5A7A95]"
                            />
                            <span className="text-lg font-semibold text-gray-900">
                              Class {className}
                            </span>
                          </label>
                        </div>
                        
                        {selectedClass && (
                          <div className="ml-7 mt-3 space-y-2">
                            <p className="text-sm text-gray-600 mb-2">Select Sections:</p>
                            <div className="flex flex-wrap gap-2">
                              {classItems.map(section => (
                                <label
                                  key={section.id}
                                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedClass.sections.includes(section.id)}
                                    onChange={() => handleSectionToggle(selectedClass.classId, section.id)}
                                    className="w-4 h-4 text-[#5A7A95] rounded focus:ring-[#5A7A95]"
                                  />
                                  <span className="text-sm text-gray-700">Section {section.section}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft size={18} className="mr-2" />
                    Previous
                  </Button>
                  <Button onClick={handleStep2Next}>
                    Next: Map Subjects
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Map Subjects */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Map Subjects & Marks</h2>
                
                {(errors.subjects || errors.marks) && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{errors.subjects || errors.marks}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {classSubjects.map((cs, csIndex) => (
                    <div key={`${cs.classId}-${cs.sectionId}`} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Class {cs.className} - Section {cs.sectionName}
                      </h3>
                      
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Add Subject
                          </label>
                          {subjects.filter(s => !cs.subjects.find(sub => sub.subject_id === s.id)).length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectAllSubjects(csIndex)}
                              className="text-xs"
                            >
                              Select All Subjects
                            </Button>
                          )}
                        </div>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSubjectAdd(csIndex, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A95] focus:border-transparent"
                        >
                          <option value="">Select a subject...</option>
                          {subjects
                            .filter(s => !cs.subjects.find(sub => sub.subject_id === s.id))
                            .map(subject => (
                              <option key={subject.id} value={subject.id}>
                                {subject.name}
                              </option>
                            ))}
                        </select>
                        {subjects.filter(s => !cs.subjects.find(sub => sub.subject_id === s.id)).length === 0 && (
                          <p className="mt-2 text-sm text-gray-500">All subjects have been added</p>
                        )}
                      </div>

                      {cs.subjects.length > 0 && (
                        <div className="space-y-3">
                          {cs.subjects.map((subject, sIndex) => (
                            <div
                              key={subject.subject_id}
                              className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-gray-900">{subject.subject_name}</span>
                                <button
                                  onClick={() => handleSubjectRemove(csIndex, sIndex)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Max Marks</label>
                                  <Input
                                    type="number"
                                    value={subject.max_marks}
                                    onChange={(e) => handleSubjectChange(csIndex, sIndex, 'max_marks', parseInt(e.target.value) || 0)}
                                    min="1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Pass Marks</label>
                                  <Input
                                    type="number"
                                    value={subject.pass_marks}
                                    onChange={(e) => handleSubjectChange(csIndex, sIndex, 'pass_marks', parseInt(e.target.value) || 0)}
                                    min="0"
                                    max={subject.max_marks - 1}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Weightage (%)</label>
                                  <Input
                                    type="number"
                                    value={subject.weightage}
                                    onChange={(e) => handleSubjectChange(csIndex, sIndex, 'weightage', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    max="100"
                                    step="0.1"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft size={18} className="mr-2" />
                    Previous
                  </Button>
                  <Button onClick={handleStep3Next}>
                    Next: Schedule Exams
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Schedule */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Schedule Examinations</h2>
                
                {errors.schedule && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{errors.schedule}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {examSchedules.map((schedule, index) => {
                    const classSubject = classSubjects.find(
                      cs => cs.classId === schedule.classId && cs.sectionId === schedule.sectionId
                    );
                    const subject = classSubject?.subjects.find(s => s.subject_id === schedule.subjectId);
                    
                    return (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <div className="mb-3">
                          <span className="font-semibold text-gray-900">
                            Class {classSubject?.className} - Section {classSubject?.sectionName} - {subject?.subject_name}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Exam Date</label>
                            <Input
                              type="date"
                              value={schedule.exam_date}
                              onChange={(e) => handleScheduleChange(index, 'exam_date', e.target.value)}
                              min={examMetadata.start_date}
                              max={examMetadata.end_date}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                            <Input
                              type="time"
                              value={schedule.start_time}
                              onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">End Time</label>
                            <Input
                              type="time"
                              value={schedule.end_time}
                              onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(3)}>
                    <ArrowLeft size={18} className="mr-2" />
                    Previous
                  </Button>
                  <Button onClick={handleStep4Submit} disabled={saving}>
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
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
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
