'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  CheckCircle, 
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Input from '@/components/ui/Input';

export default function PasswordPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  
  interface StudentCredential {
    admission_no: string;
    password?: string;
    name?: string;
    class?: string;
    section?: string;
    hasPassword?: boolean;
    [key: string]: unknown;
  }

  interface StaffCredential {
    staff_id: string;
    password?: string;
    name?: string;
    role?: string;
    hasPassword?: boolean;
    [key: string]: unknown;
  }

  interface LoginCredentials {
    students?: StudentCredential[];
    staff?: StaffCredential[];
    summary?: {
      totalStudents?: number;
      studentsWithPassword?: number;
      totalStaff?: number;
      staffWithPassword?: number;
    };
    [key: string]: unknown;
  }
  
  const [loginCredentials, setLoginCredentials] = useState<LoginCredentials | null>(null);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [generatingPasswords, setGeneratingPasswords] = useState(false);
  // passwordsGenerated kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [passwordsGenerated, setPasswordsGenerated] = useState(false);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  
  // Search and pagination states
  const [studentSearch, setStudentSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [passwordStatusFilter, setPasswordStatusFilter] = useState<'all' | 'with' | 'without'>('all');

  useEffect(() => {
    fetchLoginCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchLoginCredentials = async () => {
    try {
      setLoadingCredentials(true);
      const response = await fetch(`/api/dashboard/login-credentials?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setLoginCredentials(result.data);
        // Reset password state when fetching fresh data
        setPasswordsGenerated(false);
        setShowPasswords(false);
      }
    } catch (err) {
      console.error('Error fetching login credentials:', err);
    } finally {
      setLoadingCredentials(false);
    }
  };

  const handleGenerateNewPasswords = async () => {
    if (!confirm('This will create a new password for each student who doesn\'t have one. Do you want to continue?')) {
      return;
    }
    
    setGeneratingPasswords(true);
    try {
      const response = await fetch('/api/dashboard/login-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          school_code: schoolCode, 
          include_passwords: true,
          regenerate_all: false,
        }),
      });
      const result = await response.json();
      if (response.ok && result.data) {
        setLoginCredentials(result.data);
        setPasswordsGenerated(true);
        interface StudentWithPassword {
          password?: string;
          [key: string]: unknown;
        }
        alert(`Passwords generated successfully! ${result.data.students.filter((s: StudentWithPassword) => s.password).length} new passwords created.`);
      } else {
        alert(`Error: ${result.error || 'Failed to generate passwords'}`);
      }
    } catch (err) {
      console.error('Error generating passwords:', err);
      alert('An error occurred while generating passwords. Please try again.');
    } finally {
      setGeneratingPasswords(false);
    }
  };

  const handleShowPasswords = async () => {
    if (!showPasswords) {
      // Fetch passwords from database (don't generate new ones)
      setGeneratingPasswords(true);
      try {
        const response = await fetch(`/api/dashboard/login-credentials?school_code=${schoolCode}&include_passwords=true`);
        const result = await response.json();
        if (response.ok && result.data) {
          setLoginCredentials(result.data);
          setShowPasswords(true);
        } else {
          alert(`Error: ${result.error || 'Failed to fetch passwords'}`);
        }
      } catch (err) {
        console.error('Error fetching passwords:', err);
        alert('An error occurred while fetching passwords. Please try again.');
      } finally {
        setGeneratingPasswords(false);
      }
    } else {
      setShowPasswords(false);
    }
  };

  const handleResetStudentPassword = async (admissionNo: string) => {
    if (!confirm(`Are you sure you want to reset the password for this student? The password will be set to "student123".`)) {
      return;
    }

    try {
      setResettingPassword(admissionNo);
      const response = await fetch('/api/students/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          school_code: schoolCode,
          admission_no: admissionNo,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Password reset successfully!\n\nStudent: ${result.data.student_name}\nAdmission No: ${result.data.admission_no}\n\nNew Password: ${result.data.password}\n\nPlease save this password securely.`);
        // Refresh login credentials to show the new password
        await fetchLoginCredentials();
        if (showPasswords) {
          await handleShowPasswords();
        }
      } else {
        alert(`Error: ${result.error || result.details || 'Failed to reset password'}`);
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      alert('An error occurred while resetting password. Please try again.');
    } finally {
      setResettingPassword(null);
    }
  };

  const handleResetStaffPassword = async (staffId: string) => {
    if (!confirm(`Are you sure you want to reset the password for this staff member? A new password will be generated and displayed.`)) {
      return;
    }

    try {
      setResettingPassword(staffId);
      const response = await fetch('/api/staff/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          school_code: schoolCode,
          staff_id: staffId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Password reset successfully!\n\nStaff: ${result.data.staff_name}\nStaff ID: ${result.data.staff_id}\n\nNew Password: ${result.data.password}\n\nPlease save this password securely. The staff member can change it from their dashboard.`);
        // Refresh login credentials to show the new password
        await fetchLoginCredentials();
        if (showPasswords) {
          await handleShowPasswords();
        }
      } else {
        alert(`Error: ${result.error || result.details || 'Failed to reset password'}`);
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      alert('An error occurred while resetting password. Please try again.');
    } finally {
      setResettingPassword(null);
    }
  };

  // Filter and paginate students
  const filteredStudents = loginCredentials?.students?.filter((student: StudentCredential) => {
    const matchesSearch = 
      student.admission_no?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.class?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.section?.toLowerCase().includes(studentSearch.toLowerCase());
    
    const matchesFilter = 
      passwordStatusFilter === 'all' ||
      (passwordStatusFilter === 'with' && student.hasPassword) ||
      (passwordStatusFilter === 'without' && !student.hasPassword);
    
    return matchesSearch && matchesFilter;
  }) || [];

  const studentStartIndex = (studentPage - 1) * itemsPerPage;
  const studentEndIndex = studentStartIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(studentStartIndex, studentEndIndex);
  const totalStudentPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // Filter and paginate staff
  const filteredStaff = loginCredentials?.staff?.filter((member: StaffCredential) => {
    const matchesSearch = 
      member.staff_id?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      member.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      member.role?.toLowerCase().includes(staffSearch.toLowerCase());
    
    const matchesFilter = 
      passwordStatusFilter === 'all' ||
      (passwordStatusFilter === 'with' && member.hasPassword) ||
      (passwordStatusFilter === 'without' && !member.hasPassword);
    
    return matchesSearch && matchesFilter;
  }) || [];

  const staffStartIndex = (staffPage - 1) * itemsPerPage;
  const staffEndIndex = staffStartIndex + itemsPerPage;
  const paginatedStaff = filteredStaff.slice(staffStartIndex, staffEndIndex);
  const totalStaffPages = Math.ceil(filteredStaff.length / itemsPerPage);

  // Reset pages when search changes
  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, passwordStatusFilter]);

  useEffect(() => {
    setStaffPage(1);
  }, [staffSearch, passwordStatusFilter]);

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] mb-2 flex items-center gap-3">
            <Key size={32} className="text-[#2F6FED]" />
            Login Credentials
          </h1>
          <p className="text-[#64748B]">View password status for students and staff</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleGenerateNewPasswords}
            disabled={generatingPasswords}
            className="border-[#2F6FED] text-[#2F6FED] hover:bg-[#EAF1FF]"
          >
            {generatingPasswords ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#2F6FED] mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Key size={18} className="mr-2" />
                Generate New Passwords
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleShowPasswords}
            disabled={generatingPasswords}
            className="border-[#2F6FED] text-[#2F6FED] hover:bg-[#EAF1FF]"
          >
            {showPasswords ? (
              <>
                <EyeOff size={18} className="mr-2" />
                Hide Passwords
              </>
            ) : (
              <>
                <Eye size={18} className="mr-2" />
                Show Passwords
              </>
            )}
          </Button>
        </div>
      </motion.div>

      <Card className="bg-white">
        {loadingCredentials ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6FED]" />
          </div>
        ) : loginCredentials ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#E0F2FE] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#64748B] mb-1">Total Students</p>
                <p className="text-2xl font-bold text-[#0F172A]">{loginCredentials.summary?.totalStudents ?? 0}</p>
              </div>
              <div className="bg-[#DCFCE7] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#64748B] mb-1">Students with Password</p>
                <p className="text-2xl font-bold text-[#0F172A]">{loginCredentials.summary?.studentsWithPassword ?? 0}</p>
              </div>
              <div className="bg-[#EAF1FF] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#64748B] mb-1">Total Staff</p>
                <p className="text-2xl font-bold text-[#0F172A]">{loginCredentials.summary?.totalStaff ?? 0}</p>
              </div>
              <div className="bg-[#FFEDD5] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#64748B] mb-1">Staff with Password</p>
                <p className="text-2xl font-bold text-[#0F172A]">{loginCredentials.summary?.staffWithPassword ?? 0}</p>
              </div>
            </div>

            {/* Students Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-[#0F172A]">
                  Students ({filteredStudents.length})
                </h4>
                <div className="flex items-center gap-3">
                  <select
                    value={passwordStatusFilter}
                    onChange={(e) => setPasswordStatusFilter(e.target.value as 'all' | 'with' | 'without')}
                    className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6FED] focus:border-transparent"
                  >
                    <option value="all">All</option>
                    <option value="with">With Password</option>
                    <option value="without">Without Password</option>
                  </select>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" size={18} />
                  <Input
                    type="text"
                    placeholder="Search students by admission no, name, class, or section..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-10 border-[#E5E7EB] focus:ring-[#2F6FED]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Admission No</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Name</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Class</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Section</th>
                      {showPasswords && (
                        <th className="px-3 py-2.5 text-left text-xs font-semibold">Password</th>
                      )}
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Status</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] bg-white">
                    {paginatedStudents.length > 0 ? (
                      paginatedStudents.map((student: StudentCredential) => (
                        <tr key={student.admission_no} className="hover:bg-[#F1F5F9] transition-colors">
                          <td className="px-3 py-2 text-xs text-[#0F172A] font-medium">{student.admission_no}</td>
                          <td className="px-3 py-2 text-xs text-[#0F172A]">{student.name}</td>
                          <td className="px-3 py-2 text-xs text-[#64748B]">{student.class}</td>
                          <td className="px-3 py-2 text-xs text-[#64748B]">{student.section}</td>
                          {showPasswords && (
                            <td className="px-3 py-2 text-xs">
                              {student.password ? (
                                <div className="flex items-center gap-1.5">
                                  <code className="px-2 py-0.5 bg-[#F1F5F9] rounded text-xs font-mono text-[#0F172A] max-w-[120px] truncate">
                                    {student.password}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(student.password || '');
                                      alert('Password copied to clipboard!');
                                    }}
                                    className="p-1 hover:bg-[#E5E7EB] rounded transition-colors"
                                    title="Copy password"
                                  >
                                    <Copy size={12} className="text-[#64748B]" />
                                  </button>
                                </div>
                              ) : student.hasPassword ? (
                                <span className="text-[#64748B] text-xs italic">
                                  Encrypted
                                </span>
                              ) : (
                                <span className="text-[#64748B] text-xs">No password</span>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-2 text-xs">
                            {student.hasPassword ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#DCFCE7] text-[#22C55E] rounded-full text-xs font-medium">
                                <CheckCircle className="size-3" />
                                Set
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F1F5F9] text-[#64748B] rounded-full text-xs font-medium">
                                <XCircle className="size-3" />
                                None
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <button
                              onClick={() => handleResetStudentPassword(student.admission_no)}
                              disabled={resettingPassword === student.admission_no}
                              className="px-2 py-1 text-xs bg-[#FFEDD5] hover:bg-[#F97316] hover:text-white text-[#F97316] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              title="Reset Password"
                            >
                              {resettingPassword === student.admission_no ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#F97316]" />
                                </>
                              ) : (
                                <>
                                  <Key size={10} />
                                  Reset
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={showPasswords ? 7 : 6} className="px-4 py-8 text-center text-[#64748B] text-sm">
                          {studentSearch ? 'No students found matching your search' : 'No students found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalStudentPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-[#64748B]">
                    Showing {studentStartIndex + 1} to {Math.min(studentEndIndex, filteredStudents.length)} of {filteredStudents.length} students
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStudentPage(prev => Math.max(1, prev - 1))}
                      disabled={studentPage === 1}
                      className="p-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F1F5F9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[#64748B]"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-[#0F172A] px-3">
                      Page {studentPage} of {totalStudentPages}
                    </span>
                    <button
                      onClick={() => setStudentPage(prev => Math.min(totalStudentPages, prev + 1))}
                      disabled={studentPage === totalStudentPages}
                      className="p-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F1F5F9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[#64748B]"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Staff Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-[#0F172A]">
                  Staff ({filteredStaff.length})
                </h4>
              </div>
              
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" size={18} />
                  <Input
                    type="text"
                    placeholder="Search staff by ID, name, or role..."
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    className="pl-10 border-[#E5E7EB] focus:ring-[#2F6FED]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Staff ID</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Name</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Role</th>
                      {showPasswords && (
                        <th className="px-3 py-2.5 text-left text-xs font-semibold">Password</th>
                      )}
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Status</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] bg-white">
                    {paginatedStaff.length > 0 ? (
                      paginatedStaff.map((member: StaffCredential) => (
                        <tr key={member.staff_id} className="hover:bg-[#F1F5F9] transition-colors">
                          <td className="px-3 py-2 text-xs text-[#0F172A] font-medium">{member.staff_id}</td>
                          <td className="px-3 py-2 text-xs text-[#0F172A]">{member.name}</td>
                          <td className="px-3 py-2 text-xs text-[#64748B]">{member.role}</td>
                          {showPasswords && (
                            <td className="px-3 py-2 text-xs">
                              {member.password ? (
                                <div className="flex items-center gap-1.5">
                                  <code className="px-2 py-0.5 bg-[#F1F5F9] rounded text-xs font-mono text-[#0F172A] max-w-[120px] truncate">
                                    {member.password}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(member.password || '');
                                      alert('Password copied to clipboard!');
                                    }}
                                    className="p-1 hover:bg-[#E5E7EB] rounded transition-colors"
                                    title="Copy password"
                                  >
                                    <Copy size={12} className="text-[#64748B]" />
                                  </button>
                                </div>
                              ) : member.hasPassword ? (
                                <span className="text-[#64748B] text-xs italic">
                                  Encrypted
                                </span>
                              ) : (
                                <span className="text-[#64748B] text-xs">No password</span>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-2 text-xs">
                            {member.hasPassword ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#DCFCE7] text-[#22C55E] rounded-full text-xs font-medium">
                                <CheckCircle className="size-3" />
                                Set
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F1F5F9] text-[#64748B] rounded-full text-xs font-medium">
                                <XCircle className="size-3" />
                                None
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <button
                              onClick={() => handleResetStaffPassword(member.staff_id)}
                              disabled={resettingPassword === member.staff_id}
                              className="px-2 py-1 text-xs bg-[#FFEDD5] hover:bg-[#F97316] hover:text-white text-[#F97316] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              title="Reset Password"
                            >
                              {resettingPassword === member.staff_id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#F97316]" />
                                </>
                              ) : (
                                <>
                                  <Key size={10} />
                                  Reset
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={showPasswords ? 6 : 5} className="px-4 py-8 text-center text-[#64748B] text-sm">
                          {staffSearch ? 'No staff found matching your search' : 'No staff found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalStaffPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-[#64748B]">
                    Showing {staffStartIndex + 1} to {Math.min(staffEndIndex, filteredStaff.length)} of {filteredStaff.length} staff
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStaffPage(prev => Math.max(1, prev - 1))}
                      disabled={staffPage === 1}
                      className="p-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F1F5F9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[#64748B]"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-[#0F172A] px-3">
                      Page {staffPage} of {totalStaffPages}
                    </span>
                    <button
                      onClick={() => setStaffPage(prev => Math.min(totalStaffPages, prev + 1))}
                      disabled={staffPage === totalStaffPages}
                      className="p-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F1F5F9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[#64748B]"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#E0F2FE] border border-[#E5E7EB] rounded-lg p-4">
              <p className="text-sm text-[#0F172A]">
                <strong className="text-[#2F6FED]">Note:</strong> {showPasswords 
                  ? 'Passwords shown here are retrieved from the database. Click "Hide Passwords" to hide them. Use the copy button to copy passwords to clipboard. Only passwords that were generated through the system are stored and can be viewed.'
                  : 'Click "Generate New Passwords" to create passwords for students without them. Click "Show Passwords" to view stored passwords from the database.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-[#64748B]">
            No login credentials data available
          </div>
        )}
      </Card>
    </div>
  );
}

