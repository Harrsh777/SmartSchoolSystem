'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { GraduationCap, Search } from 'lucide-react';
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <GraduationCap className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Students</h1>
            <p className="text-gray-600">View all students in the school</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search by name, admission number, class, or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">
              {searchQuery ? 'No students found matching your search' : 'No students found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Admission No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Parent Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student, index) => {
                  const studentId = getString(student.id) || `student-${index}`;
                  const admissionNo = getString(student.admission_no);
                  const studentName = getString(student.student_name);
                  const studentClass = getString(student.class);
                  const section = getString(student.section);
                  const parentName = getString(student.parent_name);
                  return (
                    <tr
                      key={studentId}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{admissionNo || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{studentName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{studentClass || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{section || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{parentName || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Student detail drawer */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 flex justify-end"
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="w-full max-w-xl h-full bg-white shadow-2xl border-l border-gray-200 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {getString(selectedStudent.student_name) || 'Student Details'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Adm. No: {getString(selectedStudent.admission_no) || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  Close
                </button>
              </div>

              <div className="p-6 space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
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

                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
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
                          ? new Date(getString((selectedStudent as Student & { dob?: string }).dob) as string).toLocaleDateString()
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

                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
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

                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
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

                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
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
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
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
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
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

