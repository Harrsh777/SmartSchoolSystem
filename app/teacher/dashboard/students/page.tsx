'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { GraduationCap, Search, Users, X, ChevronRight } from 'lucide-react';
import type { Staff, Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

interface FeeItem {
  balance_due?: number;
  late_fee?: number;
  is_paid?: boolean;
  due_date?: string;
  fee_structure?: { name?: string };
  [key: string]: unknown;
}

interface TransportInfo {
  has_transport?: boolean;
  transport_type?: string;
  route?: { route_name?: string };
  vehicle?: { vehicle_number?: string; registration_number?: string };
  stops?: Array<{ stop_name?: string }>;
}

export default function AllStudentsPage() {
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [feesLoading, setFeesLoading] = useState(false);
  const [fees, setFees] = useState<FeeItem[] | null>(null);
  const [transportLoading, setTransportLoading] = useState(false);
  const [transport, setTransport] = useState<TransportInfo | null>(null);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchStudents(teacherData);
    }
  }, []);

  const fetchStudents = async (teacherData: Staff) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students?school_code=${teacherData.school_code}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStudents(result.data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    const studentName = getString(student.student_name).toLowerCase();
    const admissionNo = getString(student.admission_no).toLowerCase();
    const studentClass = getString(student.class).toLowerCase();
    const section = getString(student.section).toLowerCase();
    return (
      studentName.includes(query) ||
      admissionNo.includes(query) ||
      studentClass.includes(query) ||
      section.includes(query)
    );
  });

  // When drawer student changes, fetch fees + transport summary
  useEffect(() => {
    const loadExtras = async () => {
      if (!selectedStudent || !teacher) {
        setFees(null);
        setTransport(null);
        return;
      }
      const schoolCode = (teacher as Staff & { school_code?: string }).school_code;
      const studentId = getString(selectedStudent.id);
      if (!schoolCode || !studentId) return;

      try {
        setFeesLoading(true);
        const feesRes = await fetch(
          `/api/student/fees?school_code=${encodeURIComponent(schoolCode)}&student_id=${encodeURIComponent(studentId)}`
        );
        const feesJson = await feesRes.json();
        setFees(feesRes.ok && feesJson.data ? feesJson.data : []);
      } catch {
        setFees([]);
      } finally {
        setFeesLoading(false);
      }

      try {
        setTransportLoading(true);
        const trRes = await fetch(
          `/api/student/transport?school_code=${encodeURIComponent(schoolCode)}&student_id=${encodeURIComponent(studentId)}`
        );
        const trJson = await trRes.json();
        setTransport(trRes.ok && trJson.data ? (trJson.data as TransportInfo) : null);
      } catch {
        setTransport(null);
      } finally {
        setTransportLoading(false);
      }
    };

    void loadExtras();
  }, [selectedStudent, teacher]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#1e3a8a]/10 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="text-[#1e3a8a]" size={28} />
          </div>
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1e3a8a]/30 border-t-[#1e3a8a] mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Loading students...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
            <GraduationCap className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">All Students</h1>
            <p className="text-[#64748B] text-sm mt-0.5 flex items-center gap-1.5">
              <Users size={14} />
              {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'} in the school
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search + Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="overflow-hidden rounded-2xl border border-[#E2E8F0] shadow-sm bg-white">
          <div className="p-4 sm:p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={20} />
              <input
                type="text"
                placeholder="Search by name, admission number, class, or section..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all"
              />
              {searchQuery && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">
                  {filteredStudents.length} result{filteredStudents.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="text-[#94A3B8]" size={40} />
              </div>
              <p className="text-[#475569] font-medium">
                {searchQuery ? 'No students match your search' : 'No students found'}
              </p>
              <p className="text-sm text-[#64748B] mt-1">
                {searchQuery ? 'Try a different name, admission no, class, or section' : 'Students will appear here once added'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1e3a8a]/5 to-[#3B82F6]/5 border-b border-[#E2E8F0]">
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider hidden sm:table-cell">
                      Admission No
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider hidden md:table-cell">
                      Parent
                    </th>
                    <th className="w-10 sm:w-12 px-2 sm:px-4 py-4" aria-label="View" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredStudents.map((student, index) => {
                    const studentId = getString(student.id) || `student-${index}`;
                    const admissionNo = getString(student.admission_no);
                    const studentName = getString(student.student_name);
                    const studentClass = getString(student.class);
                    const section = getString(student.section);
                    const parentName = getString(student.parent_name);
                    const initial = (studentName || '?').charAt(0).toUpperCase();
                    return (
                      <motion.tr
                        key={studentId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(index * 0.02, 0.2) }}
                        onClick={() => setSelectedStudent(student)}
                        className="group hover:bg-[#F1F5F9]/80 cursor-pointer transition-colors"
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a8a]/15 to-[#3B82F6]/15 flex items-center justify-center text-[#1e3a8a] font-semibold text-sm shrink-0">
                              {initial}
                            </div>
                            <div>
                              <p className="font-semibold text-[#0F172A]">{studentName || 'N/A'}</p>
                              <p className="text-xs text-[#64748B] sm:hidden font-mono">{admissionNo || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                          <span className="font-mono text-sm text-[#64748B]">{admissionNo || '—'}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E0E7FF] text-[#3730A3] border border-[#C7D2FE]">
                            {studentClass || '—'} {section ? `· ${section}` : ''}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 hidden md:table-cell text-sm text-[#64748B]">
                          {parentName || '—'}
                        </td>
                        <td className="px-2 sm:px-4 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#E2E8F0] group-hover:bg-[#3B82F6] text-[#64748B] group-hover:text-white transition-colors">
                            <ChevronRight size={18} />
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Student detail drawer */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex justify-end"
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
              className="w-full max-w-lg sm:max-w-xl h-full bg-white shadow-2xl border-l border-[#E2E8F0] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 p-6 pb-4 border-b border-[#E2E8F0] bg-white/95 backdrop-blur flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-bold text-xl shrink-0">
                    {(getString(selectedStudent.student_name) || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-[#0F172A] truncate">
                      {getString(selectedStudent.student_name) || 'Student Details'}
                    </h2>
                    <p className="text-sm text-[#64748B] font-mono">
                      {getString(selectedStudent.admission_no) || 'N/A'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStudent(null)}
                  className="shrink-0 rounded-xl border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  aria-label="Close"
                >
                  <X size={20} />
                </Button>
              </div>

              <div className="p-6 space-y-6 flex-1">
                <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50 p-4">
                  <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                    Academic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Class</p>
                      <p className="font-medium text-gray-900">
                        {getString(selectedStudent.class) || 'N/A'}{' '}
                        {getString(selectedStudent.section) && `- ${getString(selectedStudent.section)}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Academic Year</p>
                      <p className="font-medium text-gray-900">
                        {getString((selectedStudent as Student & { academic_year?: string }).academic_year) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Roll No</p>
                      <p className="font-medium text-gray-900">
                        {getString((selectedStudent as Student & { roll_no?: string }).roll_no) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium text-gray-900">
                        {getString((selectedStudent as Student & { status?: string }).status) || 'Active'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50 p-4">
                  <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                    Personal Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Full Name</p>
                      <p className="font-medium text-gray-900">
                        {getString(selectedStudent.student_name) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Gender</p>
                      <p className="font-medium text-gray-900">
                        {getString((selectedStudent as Student & { gender?: string }).gender) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date of Birth</p>
                      <p className="font-medium text-gray-900">
                        {getString((selectedStudent as Student & { dob?: string }).dob)
                          ? new Date(getString((selectedStudent as Student & { dob?: string }).dob)).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Blood Group</p>
                      <p className="font-medium text-gray-900">
                        {getString((selectedStudent as Student & { blood_group?: string }).blood_group) || 'N/A'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50 p-4">
                  <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                    Contact & Address
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500">Phone</p>
                        <p className="font-medium text-gray-900">
                          {getString((selectedStudent as Student & { phone?: string }).phone) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">
                          {getString((selectedStudent as Student & { email?: string }).email) || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500">Address</p>
                      <p className="font-medium text-gray-900">
                        {getString((selectedStudent as Student & { address?: string }).address) || 'N/A'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50 p-4">
                  <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                    Parent / Guardian
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Parent Name</p>
                      <p className="font-medium text-gray-900">
                        {getString(selectedStudent.parent_name) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Parent Phone</p>
                      <p className="font-medium text-gray-900">
                          {getString((selectedStudent as Student & { parent_phone?: string }).parent_phone) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Parent Email</p>
                      <p className="font-medium text-gray-900">
                          {getString((selectedStudent as Student & { parent_email?: string }).parent_email) || 'N/A'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50 p-4">
                  <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                    Additional Information
                  </h3>
                  <div className="space-y-1 text-sm text-gray-900">
                    <p>
                      <span className="text-gray-500">Category:&nbsp;</span>
                      {getString((selectedStudent as Student & { category?: string }).category) || 'N/A'}
                    </p>
                    <p>
                      <span className="text-gray-500">Aadhaar:&nbsp;</span>
                      {getString((selectedStudent as Student & { aadhaar_no?: string }).aadhaar_no) || 'N/A'}
                    </p>
                  </div>
                </section>

                {/* Fees overview */}
                <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50 p-4">
                  <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                    Fees Overview
                  </h3>
                  {feesLoading ? (
                    <p className="text-sm text-gray-500">Loading fee details...</p>
                  ) : !fees || fees.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No fee records found for this student.
                    </p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      {(() => {
                        const totalBalance = fees.reduce(
                          (sum: number, f: FeeItem) => sum + Number(f.balance_due || 0),
                          0
                        );
                        const totalLate = fees.reduce(
                          (sum: number, f: FeeItem) => sum + Number(f.late_fee || 0),
                          0
                        );
                        const upcoming = [...fees].filter((f: FeeItem) => !f.is_paid).slice(0, 3);
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-gray-500">Outstanding balance</p>
                                <p className="font-semibold text-gray-900">
                                  ₹{(totalBalance + totalLate).toLocaleString('en-IN')}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Pending instalments</p>
                                <p className="font-semibold text-gray-900">
                                  {fees.filter((f: FeeItem) => !f.is_paid).length}
                                </p>
                              </div>
                            </div>
                            {upcoming.length > 0 && (
                              <div className="border border-gray-100 rounded-lg">
                                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-600">
                                  Upcoming fee items
                                </div>
                                <ul className="divide-y divide-gray-100">
                                  {upcoming.map((f: FeeItem, idx: number) => (
                                    <li key={idx} className="px-3 py-2 flex items-center justify-between text-xs">
                                      <div>
                                        <p className="font-medium text-gray-900">
                                          {f.fee_structure?.name || 'Fee'}
                                        </p>
                                        <p className="text-gray-500">
                                          Due:{' '}
                                          {f.due_date
                                            ? new Date(f.due_date).toLocaleDateString('en-IN')
                                            : 'N/A'}
                                        </p>
                                      </div>
                                      <p className="font-semibold text-gray-900">
                                        ₹{Number(f.total_due ?? f.balance_due ?? 0).toLocaleString('en-IN')}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </section>

                {/* Transport info */}
                <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50 p-4">
                  <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                    Transport
                  </h3>
                  {transportLoading ? (
                    <p className="text-sm text-gray-500">Loading transport info...</p>
                  ) : !transport || !transport.has_transport ? (
                    <p className="text-sm text-gray-500">
                      No transport assigned for this student.
                    </p>
                  ) : (
                    <div className="space-y-2 text-sm text-gray-900">
                      <p>
                        <span className="text-gray-500">Mode:&nbsp;</span>
                        {transport.transport_type ?? 'School Bus'}
                      </p>
                      {transport.route && (
                        <p>
                          <span className="text-gray-500">Route:&nbsp;</span>
                          {transport.route.route_name ?? ''}
                        </p>
                      )}
                      {transport.vehicle && (
                        <p>
                          <span className="text-gray-500">Vehicle:&nbsp;</span>
                          {transport.vehicle.vehicle_number ?? ''}{' '}
                          {transport.vehicle.registration_number
                            ? `(${transport.vehicle.registration_number})`
                            : ''}
                        </p>
                      )}
                      {transport.stops && transport.stops.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {transport.stops.length} stops on this route. First stop:{' '}
                          {transport.stops[0].stop_name ?? ''}
                          {transport.stops.length > 1
                            ? ` · Last stop: ${transport.stops[transport.stops.length - 1].stop_name ?? ''}`
                            : ''}
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

