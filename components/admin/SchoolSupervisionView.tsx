'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import {
  Building2,
  Users,
  User,
  GraduationCap,
  FileText,
  DollarSign,
  BookOpen,
  Shield,
} from 'lucide-react';
import type { AcceptedSchool } from '@/lib/supabase';

interface SchoolSupervisionViewProps {
  acceptedSchools: AcceptedSchool[];
}

interface SchoolData {
  school: {
    school_name: string;
    school_code: string;
    school_email?: string;
    school_phone?: string;
  };
  statistics: {
    students: { total: number; active: number };
    staff: { total: number };
    classes: { total: number };
    examinations: { total: number };
    fees: { total: number; totalAmount: number };
    library: { totalBooks: number };
    transport: { totalRoutes: number };
    communications: { total: number };
  };
  data: {
    students: Array<{ id: string; admission_no: string; student_name: string; class: string; section: string }>;
    staff: Array<{ id: string; staff_id: string; full_name: string; role?: string }>;
    classes: Array<{ id: string; class: string; section: string; academic_year?: string }>;
    examinations: Array<{ id: string; name: string; exam_type?: string; class?: { class: string; section: string } }>;
    fees: Array<unknown>;
    subjects: Array<unknown>;
    roles: Array<unknown>;
    permissions: Array<unknown>;
    libraryBooks: Array<unknown>;
    transportRoutes: Array<unknown>;
    communications: Array<unknown>;
  };
}

export default function SchoolSupervisionView({ acceptedSchools }: SchoolSupervisionViewProps) {
  const [selectedSchoolCode, setSelectedSchoolCode] = useState<string>('');
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSchoolData = useCallback(async () => {
    if (!selectedSchoolCode) return;
    
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/admin/schools/${selectedSchoolCode}/data`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setSchoolData(result.data);
      } else {
        setError(result.error || 'Failed to fetch school data');
      }
    } catch (err) {
      console.error('Error fetching school supervision data:', err);
      setError('Failed to load school data');
    } finally {
      setLoading(false);
    }
  }, [selectedSchoolCode]);

  useEffect(() => {
    if (selectedSchoolCode) {
      fetchSchoolData();
    }
  }, [selectedSchoolCode, fetchSchoolData]);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#2B2B2B] mb-4">School Supervision</h2>
        <p className="text-[#6B6B6B]">View comprehensive data for any school</p>
      </div>

      {/* School Selection */}
      <Card className="p-6">
        <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#2B2B2B] mb-2">
                    Select School
                  </label>
                  <select
                    value={selectedSchoolCode}
                    onChange={(e) => {
                      setSelectedSchoolCode(e.target.value);
                      setSchoolData(null);
                    }}
                    className="w-full px-4 py-2.5 border border-[#E1E1DB] bg-[#FFFFFF] text-[#2B2B2B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD66B]"
                  >
            <option value="">-- Select a school --</option>
            {acceptedSchools.map((school) => (
              <option key={school.id} value={school.school_code}>
                {school.school_name} ({school.school_code})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-[#FFF2C2] border border-[#E57373]">
          <p className="text-[#E57373]">{error}</p>
        </Card>
      )}

      {/* Loading State */}
      {loading ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FFF2C2] border-t-[#FFD66B] mx-auto mb-4"></div>
            <p className="text-[#6B6B6B]">Loading school data...</p>
          </div>
        </Card>
      ) : schoolData ? (
        <div className="space-y-6">
          {/* School Information */}
          <Card className="p-6 bg-[#FFF2C2]">
            <h3 className="text-xl font-bold text-[#2B2B2B] mb-4 flex items-center gap-2">
              <Building2 size={24} className="text-[#2B2B2B]" />
              School Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#6B6B6B]">School Name</p>
                <p className="font-semibold text-[#2B2B2B]">{schoolData.school.school_name}</p>
              </div>
              <div>
                <p className="text-sm text-[#6B6B6B]">School Code</p>
                <p className="font-semibold text-[#2B2B2B]">{schoolData.school.school_code}</p>
              </div>
              <div>
                <p className="text-sm text-[#6B6B6B]">Email</p>
                <p className="font-semibold text-[#2B2B2B]">{schoolData.school.school_email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-[#6B6B6B]">Phone</p>
                <p className="font-semibold text-[#2B2B2B]">{schoolData.school.school_phone || 'N/A'}</p>
              </div>
            </div>
          </Card>

          {/* Statistics */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-[#2B2B2B] mb-4">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#FFF2C2] rounded-lg">
                <p className="text-sm text-[#6B6B6B] mb-1">Students</p>
                <p className="text-2xl font-bold text-[#2B2B2B]">{schoolData.statistics.students.total}</p>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  Active: {schoolData.statistics.students.active}
                </p>
              </div>
              <div className="p-4 bg-[#FFF2C2] rounded-lg">
                <p className="text-sm text-[#6B6B6B] mb-1">Staff</p>
                <p className="text-2xl font-bold text-[#2B2B2B]">{schoolData.statistics.staff.total}</p>
              </div>
              <div className="p-4 bg-[#FFF2C2] rounded-lg">
                <p className="text-sm text-[#6B6B6B] mb-1">Classes</p>
                <p className="text-2xl font-bold text-[#2B2B2B]">{schoolData.statistics.classes.total}</p>
              </div>
              <div className="p-4 bg-[#FFF2C2] rounded-lg">
                <p className="text-sm text-[#6B6B6B] mb-1">Examinations</p>
                <p className="text-2xl font-bold text-[#2B2B2B]">{schoolData.statistics.examinations.total}</p>
              </div>
              <div className="p-4 bg-[#FFF2C2] rounded-lg">
                <p className="text-sm text-[#6B6B6B] mb-1">Fees Transactions</p>
                <p className="text-2xl font-bold text-[#2B2B2B]">{schoolData.statistics.fees.total}</p>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  Total: ₹{schoolData.statistics.fees.totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-[#FFF2C2] rounded-lg">
                <p className="text-sm text-[#6B6B6B] mb-1">Library Books</p>
                <p className="text-2xl font-bold text-[#2B2B2B]">{schoolData.statistics.library.totalBooks}</p>
              </div>
              <div className="p-4 bg-[#FFF2C2] rounded-lg">
                <p className="text-sm text-[#6B6B6B] mb-1">Transport Routes</p>
                <p className="text-2xl font-bold text-[#2B2B2B]">{schoolData.statistics.transport.totalRoutes}</p>
              </div>
              <div className="p-4 bg-[#FFF2C2] rounded-lg">
                <p className="text-sm text-[#6B6B6B] mb-1">Communications</p>
                <p className="text-2xl font-bold text-[#2B2B2B]">{schoolData.statistics.communications.total}</p>
              </div>
            </div>
          </Card>

          {/* Data Tables */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Students */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-[#2B2B2B] mb-4 flex items-center gap-2">
                <Users size={20} className="text-[#2B2B2B]" />
                Students ({schoolData.data.students.length})
              </h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F2F2EE] sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Admission #</th>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Name</th>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E1DB]">
                    {schoolData.data.students.slice(0, 50).map((student) => (
                      <tr key={student.id} className="hover:bg-[#FFF7DB]">
                        <td className="px-3 py-2 text-[#2B2B2B]">{student.admission_no}</td>
                        <td className="px-3 py-2 text-[#2B2B2B]">{student.student_name}</td>
                        <td className="px-3 py-2 text-[#2B2B2B]">{student.class} - {student.section}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {schoolData.data.students.length > 50 && (
                  <p className="text-xs text-[#6B6B6B] mt-2 text-center">
                    Showing first 50 of {schoolData.data.students.length} students
                  </p>
                )}
              </div>
            </Card>

            {/* Staff */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-[#2B2B2B] mb-4 flex items-center gap-2">
                <User size={20} className="text-[#2B2B2B]" />
                Staff ({schoolData.data.staff.length})
              </h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F2F2EE] sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Staff ID</th>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Name</th>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E1DB]">
                    {schoolData.data.staff.slice(0, 50).map((staff) => (
                      <tr key={staff.id} className="hover:bg-[#FFF7DB]">
                        <td className="px-3 py-2 text-[#2B2B2B]">{staff.staff_id}</td>
                        <td className="px-3 py-2 text-[#2B2B2B]">{staff.full_name}</td>
                        <td className="px-3 py-2 text-[#2B2B2B]">{staff.role || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {schoolData.data.staff.length > 50 && (
                  <p className="text-xs text-[#6B6B6B] mt-2 text-center">
                    Showing first 50 of {schoolData.data.staff.length} staff
                  </p>
                )}
              </div>
            </Card>

            {/* Classes */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-[#2B2B2B] mb-4 flex items-center gap-2">
                <GraduationCap size={20} className="text-[#2B2B2B]" />
                Classes ({schoolData.data.classes.length})
              </h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F2F2EE] sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Class</th>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Section</th>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Academic Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E1DB]">
                    {schoolData.data.classes.map((cls) => (
                      <tr key={cls.id} className="hover:bg-[#FFF7DB]">
                        <td className="px-3 py-2 text-[#2B2B2B]">{cls.class}</td>
                        <td className="px-3 py-2 text-[#2B2B2B]">{cls.section}</td>
                        <td className="px-3 py-2 text-[#2B2B2B]">{cls.academic_year || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Examinations */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-[#2B2B2B] mb-4 flex items-center gap-2">
                <FileText size={20} className="text-[#2B2B2B]" />
                Examinations ({schoolData.data.examinations.length})
              </h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F2F2EE] sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Name</th>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Type</th>
                      <th className="px-3 py-2 text-left text-[#2B2B2B]">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E1DB]">
                    {schoolData.data.examinations.slice(0, 50).map((exam) => (
                      <tr key={exam.id} className="hover:bg-[#FFF7DB]">
                        <td className="px-3 py-2 text-[#2B2B2B]">{exam.name}</td>
                        <td className="px-3 py-2 text-[#2B2B2B]">{exam.exam_type || 'N/A'}</td>
                        <td className="px-3 py-2 text-[#2B2B2B]">
                          {exam.class ? `${exam.class.class} - ${exam.class.section}` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {schoolData.data.examinations.length > 50 && (
                  <p className="text-xs text-[#6B6B6B] mt-2 text-center">
                    Showing first 50 of {schoolData.data.examinations.length} examinations
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Additional Data Sections */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Fees */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-[#2B2B2B] mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-[#2B2B2B]" />
                Fees
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-[#6B6B6B]">
                  Total Transactions: <span className="font-semibold text-[#2B2B2B]">{schoolData.data.fees.length}</span>
                </p>
                <p className="text-sm text-[#6B6B6B]">
                  Total Amount: <span className="font-semibold text-[#2B2B2B]">₹{schoolData.statistics.fees.totalAmount.toLocaleString()}</span>
                </p>
              </div>
            </Card>

            {/* Subjects */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-[#2B2B2B] mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-[#2B2B2B]" />
                Subjects
              </h3>
              <p className="text-sm text-[#6B6B6B]">
                Total Subjects: <span className="font-semibold text-[#2B2B2B]">{schoolData.data.subjects.length}</span>
              </p>
            </Card>

            {/* Roles & Permissions */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-[#2B2B2B] mb-4 flex items-center gap-2">
                <Shield size={20} className="text-[#2B2B2B]" />
                Roles & Permissions
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-[#6B6B6B]">
                  Total Roles: <span className="font-semibold text-[#2B2B2B]">{schoolData.data.roles.length}</span>
                </p>
                <p className="text-sm text-[#6B6B6B]">
                  Total Permissions: <span className="font-semibold text-[#2B2B2B]">{schoolData.data.permissions.length}</span>
                </p>
              </div>
            </Card>

            {/* Library */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-[#2B2B2B] mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-[#2B2B2B]" />
                Library
              </h3>
              <p className="text-sm text-[#6B6B6B]">
                Total Books: <span className="font-semibold text-[#2B2B2B]">{schoolData.data.libraryBooks.length}</span>
              </p>
            </Card>
          </div>
        </div>
      ) : selectedSchoolCode ? (
        <Card className="p-12">
          <div className="text-center">
            <Building2 className="mx-auto mb-4 text-[#9A9A9A]" size={48} />
            <p className="text-[#6B6B6B]">Select a school to view comprehensive information</p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

