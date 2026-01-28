'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FileCheck, Download, Calendar, Users, CheckCircle, XCircle, Filter } from 'lucide-react';

interface StaffMember {
  id: string;
  staff_id: string;
  full_name: string;
  role: string;
  department: string;
}

// AttendanceRecord interface removed - not used

interface StaffAttendanceSummary {
  staff: StaffMember;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  totalDays: number;
  attendancePercentage: number;
}

interface SchoolInfo {
  school_name: string;
  school_code: string;
}

export default function StudentAttendanceReportPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [period, setPeriod] = useState<7 | 30 | 60>(30);
  const [staffSummaries, setStaffSummaries] = useState<StaffAttendanceSummary[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch school info
      const schoolResponse = await fetch(`/api/schools/accepted`);
      const schoolResult = await schoolResponse.json();
      if (schoolResponse.ok && schoolResult.data) {
        const school = schoolResult.data.find((s: SchoolInfo) => s.school_code === schoolCode);
        if (school) {
          setSchoolInfo(school);
        }
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - period);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch all staff
      const staffResponse = await fetch(`/api/staff?school_code=${schoolCode}`);
      const staffResult = await staffResponse.json();
      
      if (!staffResponse.ok || !staffResult.data) {
        throw new Error('Failed to fetch staff');
      }

      const staffMembers: StaffMember[] = staffResult.data;

      // Fetch attendance for all staff in date range
      const attendanceResponse = await fetch(
        `/api/attendance/staff?school_code=${schoolCode}&start_date=${startDateStr}&end_date=${endDateStr}`
      );
      const attendanceResult = await attendanceResponse.json();
      
      if (!attendanceResponse.ok) {
        throw new Error('Failed to fetch attendance');
      }

      const attendanceRecords: Record<string, unknown>[] = attendanceResult.data || [];

      // Calculate summaries for each staff member
      const summaries: StaffAttendanceSummary[] = staffMembers.map((staff) => {
        const staffAttendance = attendanceRecords.filter(
          (record: Record<string, unknown>) => {
            // Handle both direct staff_id and nested staff object from Supabase
            const staffObj = record.staff as Record<string, unknown> | undefined;
            const recordStaffId = record.staff_id || staffObj?.id;
            return String(recordStaffId) === staff.id;
          }
        );

        const present = staffAttendance.filter((r) => r.status === 'present').length;
        const absent = staffAttendance.filter((r) => r.status === 'absent').length;
        const late = staffAttendance.filter((r) => r.status === 'late').length;
        const halfDay = staffAttendance.filter((r) => r.status === 'half_day').length;
        const leave = staffAttendance.filter((r) => r.status === 'leave').length;
        const totalDays = staffAttendance.length;
        const attendancePercentage = totalDays > 0 ? (present / totalDays) * 100 : 0;

        return {
          staff,
          present,
          absent,
          late,
          halfDay,
          leave,
          totalDays,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        };
      });

      // Sort by attendance percentage (descending)
      summaries.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
      
      setStaffSummaries(summaries);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - period);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const response = await fetch(
        `/api/reports/staff-attendance-marking?school_code=${schoolCode}&start_date=${startDateStr}&end_date=${endDateStr}&period=${period}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `staff_attendance_report_${schoolCode}_${period}days.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const filteredSummaries = staffSummaries.filter((summary) => {
    const query = searchQuery.toLowerCase();
    return (
      summary.staff.full_name.toLowerCase().includes(query) ||
      summary.staff.staff_id.toLowerCase().includes(query) ||
      summary.staff.role.toLowerCase().includes(query) ||
      summary.staff.department.toLowerCase().includes(query)
    );
  });

  const totalStaff = filteredSummaries.length;
  const avgAttendance = totalStaff > 0
    ? Math.round(
        (filteredSummaries.reduce((sum, s) => sum + s.attendancePercentage, 0) / totalStaff) * 100
      ) / 100
    : 0;
  const totalPresent = filteredSummaries.reduce((sum, s) => sum + s.present, 0);
  const totalAbsent = filteredSummaries.reduce((sum, s) => sum + s.absent, 0);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <FileCheck size={32} />
            Staff Attendance Marking Report
          </h1>
          <p className="text-gray-600">View staff attendance marking reports</p>
        </div>
        <span className="px-3 py-1 bg-orange-100 text-orange-600 text-sm font-semibold rounded">
          PRO
        </span>
      </motion.div>

      {/* Filters and Stats */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter size={20} className="text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Period:</span>
              <div className="flex gap-2">
                {[7, 30, 60].map((days) => (
                  <button
                    key={days}
                    onClick={() => setPeriod(days as 7 | 30 | 60)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      period === days
                        ? 'bg-[#1e3a8a] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Last {days} Days
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleDownload}
              disabled={downloading || loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download size={18} className="mr-2" />
              {downloading ? 'Generating...' : 'Download Report'}
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, staff ID, role, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            />
            <Users size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Staff</p>
                  <p className="text-2xl font-bold text-[#1e3a8a]">{totalStaff}</p>
                </div>
                <Users className="text-[#1e3a8a]" size={32} />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Present</p>
                  <p className="text-2xl font-bold text-green-600">{totalPresent}</p>
                </div>
                <CheckCircle className="text-green-600" size={32} />
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Absent</p>
                  <p className="text-2xl font-bold text-red-600">{totalAbsent}</p>
                </div>
                <XCircle className="text-red-600" size={32} />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Attendance</p>
                  <p className="text-2xl font-bold text-purple-600">{avgAttendance}%</p>
                </div>
                <Calendar className="text-purple-600" size={32} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Report Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading attendance data...</p>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="text-center py-12">
            <FileCheck className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">No staff found</p>
            <p className="text-gray-500 text-sm mt-2">
              {searchQuery ? 'Try adjusting your search query' : 'No staff members available'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Staff ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Present</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Absent</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Late</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Half Day</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Leave</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Days</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Attendance %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSummaries.map((summary, index) => (
                  <motion.tr
                    key={summary.staff.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{summary.staff.staff_id}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-gray-900">{summary.staff.full_name}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{summary.staff.role}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{summary.staff.department}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {summary.present}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {summary.absent}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {summary.late}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {summary.halfDay}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {summary.leave}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">{summary.totalDays}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              summary.attendancePercentage >= 90
                                ? 'bg-green-500'
                                : summary.attendancePercentage >= 75
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(summary.attendancePercentage, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            summary.attendancePercentage >= 90
                              ? 'text-green-600'
                              : summary.attendancePercentage >= 75
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {summary.attendancePercentage}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
