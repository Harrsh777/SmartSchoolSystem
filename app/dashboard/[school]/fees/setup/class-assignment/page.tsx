'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Users, 
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  GraduationCap
} from 'lucide-react';

interface FeeComponent {
  id: string;
  component_name: string;
  default_amount: number;
  fee_type: string;
  is_optional: boolean;
  is_active?: boolean;
}

interface FeeSchedule {
  id: string;
  schedule_name: string;
  number_of_installments: number;
  academic_year: string;
}

interface ClassData {
  id: string;
  class: string;
  section: string;
}

interface Assignment {
  fee_component_id: string;
  amount: string;
  fee_schedule_id: string;
  discount_amount?: string;
  is_active: boolean;
}

export default function ClassFeeAssignmentPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [components, setComponents] = useState<FeeComponent[]>([]);
  const [schedules, setSchedules] = useState<FeeSchedule[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [studentCount, setStudentCount] = useState(0);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }, [schoolCode]);

  const fetchComponents = useCallback(async () => {
    try {
      const response = await fetch(`/api/fees/components?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setComponents(result.data.filter((c: FeeComponent) => c.is_active !== false));
      }
    } catch (error) {
      console.error('Error fetching components:', error);
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  const fetchSchedules = useCallback(async () => {
    try {
      const response = await fetch(`/api/fees/schedules?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setSchedules(result.data.filter((s: FeeSchedule) => s.academic_year === selectedAcademicYear || !selectedAcademicYear));
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  }, [schoolCode, selectedAcademicYear]);

  useEffect(() => {
    fetchClasses();
    fetchComponents();
    fetchSchedules();
  }, [fetchClasses, fetchComponents, fetchSchedules]);

  const fetchStudentCount = useCallback(async () => {
    if (!selectedClass) return;
    try {
      const response = await fetch(`/api/students?school_code=${schoolCode}&class_id=${selectedClass}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStudentCount(result.data.length || 0);
      }
    } catch (error) {
      console.error('Error fetching student count:', error);
    }
  }, [schoolCode, selectedClass]);

  const fetchAssignments = useCallback(async () => {
    if (!selectedClass || !selectedAcademicYear) return;
    
    try {
      const response = await fetch(`/api/fees/assignments?school_code=${schoolCode}&class_id=${selectedClass}&academic_year=${selectedAcademicYear}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        const assignmentsMap: Record<string, Assignment> = {};
        result.data.forEach((assignment: {
          fee_component_id?: string;
          amount?: number;
          fee_schedule_id?: string;
          discount_amount?: number;
          is_active?: boolean;
        }) => {
          if (assignment.fee_component_id) {
            assignmentsMap[assignment.fee_component_id] = {
              fee_component_id: assignment.fee_component_id,
              amount: assignment.amount?.toString() || '',
              fee_schedule_id: assignment.fee_schedule_id || '',
              discount_amount: assignment.discount_amount?.toString() || '',
              is_active: assignment.is_active !== false,
            };
          }
        });
        setAssignments(assignmentsMap);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  }, [schoolCode, selectedClass, selectedAcademicYear]);

  useEffect(() => {
    if (selectedClass && selectedAcademicYear) {
      fetchAssignments();
      fetchStudentCount();
    } else {
      setAssignments({});
      setStudentCount(0);
    }
  }, [selectedClass, selectedAcademicYear, fetchAssignments, fetchStudentCount]);

  useEffect(() => {
    if (selectedAcademicYear) {
      fetchSchedules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAcademicYear, schoolCode]);

  const handleAssignmentChange = (componentId: string, field: keyof Assignment, value: string | boolean) => {
    setAssignments(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        fee_component_id: componentId,
        [field]: value,
      } as Assignment,
    }));
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedAcademicYear) {
      setError('Please select a class and academic year');
      return;
    }

    const activeAssignments = Object.values(assignments).filter(a => a.is_active && a.fee_schedule_id && a.amount);
    
    if (activeAssignments.length === 0) {
      setError('Please assign at least one fee component with a schedule and amount');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const assignmentsToSave = activeAssignments.map(a => ({
        assignment_type: 'class',
        class_id: selectedClass,
        fee_component_id: a.fee_component_id,
        amount: parseFloat(a.amount) || 0,
        fee_schedule_id: a.fee_schedule_id,
        discount_amount: a.discount_amount ? parseFloat(a.discount_amount) : 0,
        is_active: true,
      }));

      const response = await fetch('/api/fees/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          academic_year: selectedAcademicYear,
          assignments: assignmentsToSave,
          generate_installments: true,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`Fee assignments saved successfully! Installments will be automatically generated for ${studentCount} students.`);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(result.error || result.details || 'Failed to save fee assignments');
      }
    } catch (err) {
      console.error('Error saving assignments:', err);
      setError('Failed to save fee assignments');
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear - 1}-${currentYear}`,
    `${currentYear + 1}-${currentYear + 2}`,
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Users className="text-[#2F6FED]" size={32} />
            Class Fee Assignment
          </h1>
          <p className="text-gray-600">Assign fee components to classes with amounts and schedules</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/fees/setup`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <CheckCircle size={20} />
            <span>{success}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Card */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => {
                setSelectedAcademicYear(e.target.value);
                setSelectedClass('');
                setAssignments({});
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
            >
              <option value="">Select Academic Year</option>
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setAssignments({});
              }}
              disabled={!selectedAcademicYear}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] disabled:bg-gray-100"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.class} - {cls.section}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Students Count</label>
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
              <GraduationCap size={18} className="text-gray-500" />
              <span className="text-gray-700 font-medium">{studentCount} students</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Assignments Table */}
      {selectedClass && selectedAcademicYear && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Fee Components Assignment</h2>
            <Button
              onClick={handleSave}
              disabled={saving || Object.values(assignments).filter(a => a.is_active && a.fee_schedule_id && a.amount).length === 0}
              className="bg-[#2F6FED] hover:bg-[#1E3A8A] text-white"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Save Assignments
                </>
              )}
            </Button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : components.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No fee components found. Please create fee components first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Component Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Default Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Override Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fee Schedule</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {components.map((component) => {
                    const assignment = assignments[component.id] || {
                      fee_component_id: component.id,
                      amount: component.default_amount?.toString() || '0',
                      fee_schedule_id: '',
                      discount_amount: '',
                      is_active: true,
                    };

                    return (
                      <tr key={component.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{component.component_name}</span>
                            {component.is_optional && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Optional</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 capitalize">{component.fee_type}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          ₹{component.default_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            value={assignment.amount}
                            onChange={(e) => handleAssignmentChange(component.id, 'amount', e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-32"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={assignment.fee_schedule_id}
                            onChange={(e) => handleAssignmentChange(component.id, 'fee_schedule_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] text-sm"
                          >
                            <option value="">Select Schedule</option>
                            {schedules
                              .filter(s => s.academic_year === selectedAcademicYear)
                              .map(schedule => (
                                <option key={schedule.id} value={schedule.id}>
                                  {schedule.schedule_name} ({schedule.number_of_installments} installments)
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={assignment.is_active}
                              onChange={(e) => handleAssignmentChange(component.id, 'is_active', e.target.checked)}
                              className="w-4 h-4 text-[#2F6FED] border-gray-300 rounded focus:ring-[#2F6FED]"
                            />
                            <span className="text-sm text-gray-700">Active</span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {!selectedClass && (
        <Card className="p-12 text-center">
          <p className="text-gray-500">Please select an academic year and class to assign fees</p>
        </Card>
      )}
    </div>
  );
}
