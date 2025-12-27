'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import type { Staff } from '@/lib/supabase';

interface AttendanceRecord {
  staff_id: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'holiday';
  check_in_time?: string;
  check_out_time?: string;
  remarks?: string;
}

export default function StaffAttendancePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [filterDepartment, setFilterDepartment] = useState('all');

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (attendanceDate && staff.length > 0) {
      fetchAttendanceForDate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceDate, schoolCode, staff.length]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setStaff(result.data);
        // Initialize attendance records
        const initialRecords: Record<string, AttendanceRecord> = {};
        result.data.forEach((member: Staff) => {
          initialRecords[member.id!] = {
            staff_id: member.id!,
            status: 'present',
          };
        });
        setAttendanceRecords(initialRecords);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForDate = async () => {
    try {
      const response = await fetch(
        `/api/attendance/staff?school_code=${schoolCode}&date=${attendanceDate}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        const records: Record<string, AttendanceRecord> = {};
        interface StaffAttendanceRecord {
          staff_id: string;
          status: string;
          check_in_time?: string;
          check_out_time?: string;
          remarks?: string;
          [key: string]: unknown;
        }
        result.data.forEach((record: StaffAttendanceRecord) => {
          records[record.staff_id] = {
            staff_id: record.staff_id,
            status: record.status,
            check_in_time: record.check_in_time,
            check_out_time: record.check_out_time,
            remarks: record.remarks,
          };
        });
        setAttendanceRecords(records);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const handleStatusChange = (staffId: string, status: AttendanceRecord['status']) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        staff_id: staffId,
        status,
      },
    }));
  };

  const handleTimeChange = (staffId: string, field: 'check_in_time' | 'check_out_time', value: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        staff_id: staffId,
        [field]: value,
      },
    }));
  };

  const handleRemarksChange = (staffId: string, remarks: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        staff_id: staffId,
        remarks,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.values(attendanceRecords);
      
      const response = await fetch('/api/attendance/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          attendance_date: attendanceDate,
          attendance_records: records,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Successfully saved attendance for ${records.length} staff members`);
      } else {
        alert(result.error || 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStaff = staff.filter(member => {
    if (filterDepartment === 'all') return true;
    return member.department === filterDepartment;
  });

  const uniqueDepartments = Array.from(new Set(staff.map(s => s.department).filter(Boolean))).sort();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'half_day':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'leave':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'holiday':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Staff Attendance</h1>
            <p className="text-gray-600">Mark daily attendance for staff members</p>
          </div>
        </div>
      </div>

      {/* Date and Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Attendance Date
            </label>
            <Input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </div>
          <div className="md:w-64">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Department
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </Card>

      {/* Attendance Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Staff Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Staff ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Check In</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Check Out</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => {
                const record = attendanceRecords[member.id!] || {
                  staff_id: member.id!,
                  status: 'present' as const,
                };
                
                return (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-black">{member.full_name}</div>
                      <div className="text-sm text-gray-500">{member.role}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{member.staff_id}</td>
                    <td className="py-3 px-4 text-gray-700">{member.department || '-'}</td>
                    <td className="py-3 px-4">
                      <select
                        value={record.status}
                        onChange={(e) => handleStatusChange(member.id!, e.target.value as AttendanceRecord['status'])}
                        className={`px-3 py-1 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black ${getStatusColor(record.status)}`}
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="half_day">Half Day</option>
                        <option value="leave">Leave</option>
                        <option value="holiday">Holiday</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <Input
                        type="time"
                        value={record.check_in_time || ''}
                        onChange={(e) => handleTimeChange(member.id!, 'check_in_time', e.target.value)}
                        className="w-32"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Input
                        type="time"
                        value={record.check_out_time || ''}
                        onChange={(e) => handleTimeChange(member.id!, 'check_out_time', e.target.value)}
                        className="w-32"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Input
                        type="text"
                        value={record.remarks || ''}
                        onChange={(e) => handleRemarksChange(member.id!, e.target.value)}
                        placeholder="Remarks"
                        className="w-full"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary Stats */}
      {filteredStaff.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-2xl font-bold text-black">
                  {Object.values(attendanceRecords).filter(r => r.status === 'present').length}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-red-500 p-3 rounded-lg">
                <XCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-black">
                  {Object.values(attendanceRecords).filter(r => r.status === 'absent').length}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <Clock className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Late</p>
                <p className="text-2xl font-bold text-black">
                  {Object.values(attendanceRecords).filter(r => r.status === 'late').length}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-black">{filteredStaff.length}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

