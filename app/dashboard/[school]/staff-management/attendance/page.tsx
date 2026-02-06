'use client';

import { use, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Calendar, CheckCircle, Filter, Search, Save, CalendarOff, Users } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave' | 'holiday';

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
  role: string;
  department: string;
}

// AttendanceRecord interface removed as it's not used

export default function StaffAttendancePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [checkInTimes, setCheckInTimes] = useState<Record<string, string>>({});
  const [checkOutTimes, setCheckOutTimes] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showPunch, setShowPunch] = useState(false);
  const [, setSaveSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isMarked, setIsMarked] = useState(false);

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedDate) {
      fetchExistingAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, schoolCode]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setStaff(result.data);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    try {
      const response = await fetch(
        `/api/attendance/staff?school_code=${schoolCode}&date=${selectedDate}`
      );
      const result = await response.json();

      if (response.ok && result.data) {
        const existingAttendance: Record<string, AttendanceStatus> = {};
        const existingCheckIn: Record<string, string> = {};
        const existingCheckOut: Record<string, string> = {};
        const existingRemarks: Record<string, string> = {};

        interface StaffAttendanceRecord {
          staff_id: string;
          status: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          remarks?: string | null;
          [key: string]: unknown;
        }
        result.data.forEach((record: StaffAttendanceRecord) => {
          // staff_id in attendance table is UUID (staff.id); map 'late' to 'present' since Late was removed
          const staffUuid = record.staff_id;
          const status = (record.status === 'late' ? 'present' : record.status) as AttendanceStatus;
          existingAttendance[staffUuid] = status;
          if (record.check_in_time) {
            existingCheckIn[staffUuid] = record.check_in_time;
          }
          if (record.check_out_time) {
            existingCheckOut[staffUuid] = record.check_out_time;
          }
          if (record.remarks) {
            existingRemarks[staffUuid] = record.remarks;
          }
        });

        setAttendance(existingAttendance);
        setCheckInTimes(existingCheckIn);
        setCheckOutTimes(existingCheckOut);
        setRemarks(existingRemarks);
        setIsMarked(result.data.length > 0);
      }
    } catch (err) {
      console.error('Error fetching existing attendance:', err);
    }
  };

  const handleStatusChange = (staffId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [staffId]: status }));
  };

  const handleBulkAction = (status: AttendanceStatus) => {
    const filteredStaff = getFilteredStaff();
    const bulkAttendance: Record<string, AttendanceStatus> = {};
    filteredStaff.forEach((member) => {
      bulkAttendance[member.id] = status;
    });
    setAttendance(prev => ({ ...prev, ...bulkAttendance }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      // Check if there are any attendance records to save
      if (Object.keys(attendance).length === 0) {
        setToast({ message: 'Please mark attendance for at least one staff member', type: 'error' });
        setTimeout(() => setToast(null), 5000);
        setSaving(false);
        return;
      }

      const attendanceRecords = Object.entries(attendance).map(([staffId, status]) => {
        return {
          staff_id: staffId,
          status,
          check_in_time: checkInTimes[staffId] || null,
          check_out_time: checkOutTimes[staffId] || null,
          remarks: remarks[staffId] || null,
        };
      });

      const endpoint = '/api/attendance/staff';
      // Use PUT for bulk upsert

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          attendance_date: selectedDate,
          attendance_records: attendanceRecords,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsMarked(true);
        setSaveSuccess(true);
        setToast({
          message: `Attendance saved successfully for ${new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
          type: 'success',
        });
        setTimeout(() => setSaveSuccess(false), 3000);
        setTimeout(() => setToast(null), 5000);
        fetchExistingAttendance();
      } else {
        const errorMessage = result.error || 'Failed to save attendance';
        const errorDetails = result.details ? ` ${result.details}` : '';
        setToast({ message: `${errorMessage}${errorDetails}`.trim(), type: 'error' });
        setTimeout(() => setToast(null), 6000);
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
      setToast({
        message: `Failed to save attendance: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error',
      });
      setTimeout(() => setToast(null), 6000);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'absent':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'half_day':
        return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'leave':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'holiday':
        return 'bg-purple-500 hover:bg-purple-600 text-white';
      default:
        return 'bg-gray-200 hover:bg-gray-300 text-gray-700';
    }
  };

  const getStatusCounts = () => {
    const filtered = getFilteredStaff();
    const counts = {
      present: 0,
      absent: 0,
      half_day: 0,
      leave: 0,
      holiday: 0,
      unmarked: 0,
    };

    filtered.forEach((member) => {
      const status = attendance[member.id];
      if (status) {
        counts[status as keyof typeof counts]++;
      } else {
        counts.unmarked++;
      }
    });

    return counts;
  };

  const getFilteredStaff = () => {
    return staff.filter((member) => {
      const matchesSearch = 
        member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.staff_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDepartment = selectedDepartment === 'all' || member.department === selectedDepartment;
      
      return matchesSearch && matchesDepartment;
    });
  };

  const departments = Array.from(new Set(staff.map(s => s.department).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff...</p>
        </div>
      </div>
    );
  }

  const filteredStaff = getFilteredStaff();
  const counts = getStatusCounts();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Calendar size={32} />
            Staff Attendance
          </h1>
          <p className="text-gray-600">View and manage staff attendance</p>
        </div>
        <Button
          onClick={() => handleBulkAction('holiday')}
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
        >
          <CalendarOff size={18} />
          Mark Holiday
        </Button>
      </motion.div>

      {/* Fixed toast: always visible on save success/error */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 max-w-md rounded-xl shadow-lg border flex items-start gap-3 p-4"
            style={{
              backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
              borderColor: toast.type === 'success' ? '#bbf7d0' : '#fecaca',
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">!</span>
            )}
            <p
              className={`text-sm font-medium ${toast.type === 'success' ? 'text-green-800' : 'text-red-800'}`}
            >
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto text-gray-500 hover:text-gray-700 p-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Selection and Stats */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-gray-400" size={20} />
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{counts.present}</p>
            <p className="text-sm text-gray-600 mt-1">Present</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{counts.absent}</p>
            <p className="text-sm text-gray-600 mt-1">Absent</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{counts.half_day}</p>
            <p className="text-sm text-gray-600 mt-1">Half Day</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{counts.leave}</p>
            <p className="text-sm text-gray-600 mt-1">Leave</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{counts.holiday}</p>
            <p className="text-sm text-gray-600 mt-1">Holiday</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{counts.unmarked}</p>
            <p className="text-sm text-gray-600 mt-1">Unmarked</p>
          </div>
        </div>
      </Card>

      {/* Filters and Bulk Actions */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <Search className="text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search by name, ID, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={20} />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowPunch(!showPunch)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showPunch
                  ? 'bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm font-medium">Punch</span>
              {showPunch && <span className="text-xs">(Check In/Out shown)</span>}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('present')}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
            >
              Mark All Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('absent')}
              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
            >
              Mark All Absent
            </Button>
          </div>
        </div>
      </Card>

      {/* Attendance Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Staff ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Department</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                {showPunch && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Check In</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Check Out</th>
                  </>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={showPunch ? 8 : 6} className="px-4 py-4">
                    <EmptyState
                      icon={Users}
                      title="No staff found"
                      description="Select a department or add staff in Staff Management to mark attendance."
                      compact
                    />
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const currentStatus = attendance[member.id] || null;
                  return (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">{member.staff_id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{member.role}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{member.department || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {(['present', 'absent', 'half_day', 'leave', 'holiday'] as AttendanceStatus[]).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(member.id, status)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                currentStatus === status
                                  ? getStatusColor(status)
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                            >
                              {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                          ))}
                        </div>
                      </td>
                      {showPunch && (
                        <>
                          <td className="px-4 py-3 text-sm">
                            <Input
                              type="time"
                              value={checkInTimes[member.id] || ''}
                              onChange={(e) => setCheckInTimes(prev => ({ ...prev, [member.id]: e.target.value }))}
                              className="w-32"
                              disabled={currentStatus === 'absent' || currentStatus === 'leave' || currentStatus === 'holiday'}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Input
                              type="time"
                              value={checkOutTimes[member.id] || ''}
                              onChange={(e) => setCheckOutTimes(prev => ({ ...prev, [member.id]: e.target.value }))}
                              className="w-32"
                              disabled={currentStatus === 'absent' || currentStatus === 'leave' || currentStatus === 'holiday'}
                            />
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm">
                        <Input
                          type="text"
                          placeholder="Remarks..."
                          value={remarks[member.id] || ''}
                          onChange={(e) => setRemarks(prev => ({ ...prev, [member.id]: e.target.value }))}
                          className="w-48"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || filteredStaff.length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save Attendance
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
