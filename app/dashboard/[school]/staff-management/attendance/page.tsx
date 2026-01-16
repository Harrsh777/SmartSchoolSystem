'use client';

import { use, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Calendar, CheckCircle, Filter, Search, Save } from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'holiday';

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
  const [saveSuccess, setSaveSuccess] = useState(false);
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
          status: AttendanceStatus;
          check_in_time?: string | null;
          check_out_time?: string | null;
          remarks?: string | null;
          [key: string]: unknown;
        }
        result.data.forEach((record: StaffAttendanceRecord) => {
          // staff_id in attendance table is UUID (staff.id)
          const staffUuid = record.staff_id;
          existingAttendance[staffUuid] = record.status;
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
        alert('Please mark attendance for at least one staff member');
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
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchExistingAttendance();
      } else {
        const errorMessage = result.error || 'Failed to save attendance';
        const errorDetails = result.details ? `: ${result.details}` : '';
        console.error('Attendance error response:', result);
        console.error('Response status:', response.status);
        alert(`${errorMessage}${errorDetails}`);
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert(`Failed to save attendance: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      case 'late':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white';
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
      late: 0,
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
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Calendar size={32} />
            Staff Attendance
          </h1>
          <p className="text-gray-600">View and manage staff attendance</p>
        </div>
      </motion.div>

      {/* Success Alert */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm"
          >
            <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
            <span className="font-medium">
              Staff attendance has been marked successfully for {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}!
            </span>
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{counts.present}</p>
            <p className="text-sm text-gray-600 mt-1">Present</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{counts.absent}</p>
            <p className="text-sm text-gray-600 mt-1">Absent</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{counts.late}</p>
            <p className="text-sm text-gray-600 mt-1">Late</p>
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Check In</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Check Out</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No staff found
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
                          {(['present', 'absent', 'late', 'half_day', 'leave', 'holiday'] as AttendanceStatus[]).map((status) => (
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
