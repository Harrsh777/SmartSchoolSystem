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
  XCircle 
} from 'lucide-react';

export default function PasswordPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  interface LoginCredentials {
    students?: Array<{
      admission_no: string;
      password?: string;
      [key: string]: unknown;
    }>;
    staff?: Array<{
      staff_id: string;
      password?: string;
      [key: string]: unknown;
    }>;
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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Key size={32} />
            Login Credentials
          </h1>
          <p className="text-gray-600">View password status for students and staff</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleGenerateNewPasswords}
            disabled={generatingPasswords}
          >
            {generatingPasswords ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
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

      <Card>
        {loadingCredentials ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : loginCredentials ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{loginCredentials.summary?.totalStudents ?? 0}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Students with Password</p>
                <p className="text-2xl font-bold text-gray-900">{loginCredentials.summary?.studentsWithPassword ?? 0}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{loginCredentials.summary?.totalStaff ?? 0}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Staff with Password</p>
                <p className="text-2xl font-bold text-gray-900">{loginCredentials.summary?.staffWithPassword ?? 0}</p>
              </div>
            </div>

            {/* Students Table */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Students</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Admission No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                      {showPasswords && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Password</th>
                      )}
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Password Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loginCredentials.students && loginCredentials.students.length > 0 ? (
                      loginCredentials.students.map((student: LoginCredentials['students'][0]) => (
                        <tr key={student.admission_no} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{student.admission_no}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{student.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{student.class}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{student.section}</td>
                          {showPasswords && (
                            <td className="px-4 py-3 text-sm">
                              {student.password ? (
                                <div className="flex items-center gap-2">
                                  <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-900">
                                    {student.password}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(student.password);
                                      alert('Password copied to clipboard!');
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                    title="Copy password"
                                  >
                                    <Copy size={14} className="text-gray-600" />
                                  </button>
                                </div>
                              ) : student.hasPassword ? (
                                <span className="text-gray-500 text-xs italic">
                                  Password not stored in plain text
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">No password - Click &quot;Generate New Passwords&quot;</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm">
                            {student.hasPassword ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <CheckCircle className="size-3" />
                                Password Set
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                <XCircle className="size-3" />
                                No Password
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleResetStudentPassword(student.admission_no)}
                              disabled={resettingPassword === student.admission_no}
                              className="px-3 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              title="Reset Password"
                            >
                              {resettingPassword === student.admission_no ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600" />
                                  Resetting...
                                </>
                              ) : (
                                <>
                                  <Key size={12} />
                                  Reset
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={showPasswords ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                          No students found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Staff Table */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Staff</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Staff ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                      {showPasswords && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Password</th>
                      )}
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Password Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loginCredentials.staff && loginCredentials.staff.length > 0 ? (
                      loginCredentials.staff.map((member: LoginCredentials['staff'][0]) => (
                        <tr key={member.staff_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{member.staff_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{member.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{member.role}</td>
                          {showPasswords && (
                            <td className="px-4 py-3 text-sm">
                              {member.password ? (
                                <div className="flex items-center gap-2">
                                  <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-900">
                                    {member.password}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(member.password);
                                      alert('Password copied to clipboard!');
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                    title="Copy password"
                                  >
                                    <Copy size={14} className="text-gray-600" />
                                  </button>
                                </div>
                              ) : member.hasPassword ? (
                                <span className="text-gray-500 text-xs italic">
                                  Password not stored in plain text
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">No password - Click &quot;Generate New Passwords&quot;</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm">
                            {member.hasPassword ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <CheckCircle className="size-3" />
                                Password Set
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                <XCircle className="size-3" />
                                No Password
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleResetStaffPassword(member.staff_id)}
                              disabled={resettingPassword === member.staff_id}
                              className="px-3 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              title="Reset Password"
                            >
                              {resettingPassword === member.staff_id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600" />
                                  Resetting...
                                </>
                              ) : (
                                <>
                                  <Key size={12} />
                                  Reset
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={showPasswords ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                          No staff found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> {showPasswords 
                  ? 'Passwords shown here are retrieved from the database. Click "Hide Passwords" to hide them. Use the copy button to copy passwords to clipboard. Only passwords that were generated through the system are stored and can be viewed.'
                  : 'Click "Generate New Passwords" to create passwords for students without them. Click "Show Passwords" to view stored passwords from the database.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No login credentials data available
          </div>
        )}
      </Card>
    </div>
  );
}

