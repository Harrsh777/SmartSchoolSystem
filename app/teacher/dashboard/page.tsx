'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { GraduationCap, Users, UserCheck, Calendar, FileText, Bell, Settings, Search, Mail, Phone, MapPin, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { Staff, Student, Exam, ExamSchedule, Notice, Class } from '@/lib/supabase';

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<Array<Exam & { schedules?: ExamSchedule[] }>>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Settings state
  const [settingsData, setSettingsData] = useState({
    phone: '',
    email: '',
    address: '',
    qualification: '',
    experience_years: 0,
  });
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');
  const [studentSectionFilter, setStudentSectionFilter] = useState('');

  useEffect(() => {
    // Check if teacher is logged in
    const storedTeacher = sessionStorage.getItem('teacher');
    const role = sessionStorage.getItem('role');

    if (!storedTeacher || role !== 'teacher') {
      router.push('/login');
      return;
    }

    try {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      setSettingsData({
        phone: teacherData.phone || '',
        email: teacherData.email || '',
        address: teacherData.address || '',
        qualification: teacherData.qualification || '',
        experience_years: teacherData.experience_years || 0,
      });
      fetchDashboardData(teacherData);
    } catch (err) {
      console.error('Error parsing teacher data:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Check if settings have changed
    if (teacher) {
      const changed = 
        settingsData.phone !== (teacher.phone || '') ||
        settingsData.email !== (teacher.email || '') ||
        settingsData.address !== (teacher.address || '') ||
        settingsData.qualification !== (teacher.qualification || '') ||
        settingsData.experience_years !== (teacher.experience_years || 0);
      setSettingsChanged(changed);
    }
  }, [settingsData, teacher]);

  const fetchDashboardData = async (teacherData: Staff) => {
    try {
      // Fetch students
      const studentsResponse = await fetch(`/api/students?school_code=${teacherData.school_code}`);
      const studentsResult = await studentsResponse.json();
      if (studentsResponse.ok && studentsResult.data) {
        setStudents(studentsResult.data);
      }

      // Fetch staff
      const staffResponse = await fetch(`/api/staff?school_code=${teacherData.school_code}`);
      const staffResult = await staffResponse.json();
      if (staffResponse.ok && staffResult.data) {
        setStaff(staffResult.data);
      }

      // Fetch classes
      const classesResponse = await fetch(`/api/classes?school_code=${teacherData.school_code}`);
      const classesResult = await classesResponse.json();
      if (classesResponse.ok && classesResult.data) {
        setClasses(classesResult.data);
      }

      // Fetch upcoming exams
      const examsResponse = await fetch(`/api/examinations?school_code=${teacherData.school_code}`);
      const examsResult = await examsResponse.json();
      
      if (examsResponse.ok && examsResult.data) {
        const today = new Date().toISOString().split('T')[0];
        const upcoming = examsResult.data
          .filter((exam: Exam) => {
            return (exam.status === 'scheduled' || exam.status === 'active') && exam.end_date >= today;
          })
          .slice(0, 5);
        
        const examsWithSchedules = await Promise.all(
          upcoming.map(async (exam: Exam) => {
            const schedulesResponse = await fetch(
              `/api/examinations/${exam.id}/schedules?school_code=${teacherData.school_code}`
            );
            const schedulesResult = await schedulesResponse.json();
            
            return {
              ...exam,
              schedules: schedulesResult.data || [],
            };
          })
        );
        
        setUpcomingExams(examsWithSchedules);
      }

      // Fetch notices
      const noticesResponse = await fetch(
        `/api/communication/notices?school_code=${teacherData.school_code}&status=Active&category=all&priority=all`
      );
      const noticesResult = await noticesResponse.json();
      
      if (noticesResponse.ok && noticesResult.data) {
        setNotices(noticesResult.data.slice(0, 10));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const handleSaveSettings = async () => {
    if (!teacher || !settingsChanged) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/staff/${teacher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: teacher.school_code,
          phone: settingsData.phone,
          email: settingsData.email,
          address: settingsData.address,
          qualification: settingsData.qualification,
          experience_years: settingsData.experience_years,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // Update teacher in session storage
        const updatedTeacher = { ...teacher, ...result.data };
        sessionStorage.setItem('teacher', JSON.stringify(updatedTeacher));
        setTeacher(updatedTeacher);
        setSettingsChanged(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(result.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !teacher) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch = !studentSearch || 
      student.student_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.admission_no.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesClass = !studentClassFilter || student.class === studentClassFilter;
    const matchesSection = !studentSectionFilter || student.section === studentSectionFilter;
    return matchesSearch && matchesClass && matchesSection;
  });

  // Get unique classes and sections for filters
  const uniqueClasses = [...new Set(students.map(s => s.class).filter(Boolean))].sort();
  const uniqueSections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();

  return (
    <div className="space-y-8">
      {/* Students Section */}
      <section id="students" className="scroll-mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <GraduationCap className="text-blue-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Students</h2>
          </div>

          <Card>
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    type="text"
                    placeholder="Search by name or admission number..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={studentClassFilter}
                  onChange={(e) => setStudentClassFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <select
                  value={studentSectionFilter}
                  onChange={(e) => setStudentSectionFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">All Sections</option>
                  {uniqueSections.map((sec) => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 text-lg">No students found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Admission No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{student.student_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.admission_no}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.class || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.section || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {student.status || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </section>

      {/* Staff Section */}
      <section id="staff" className="scroll-mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="text-green-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Staff</h2>
          </div>

          <Card>
            {staff.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 text-lg">No staff members found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Full Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Staff ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {staff.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{member.full_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{member.staff_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{member.role}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{member.department || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{member.phone || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </section>

      {/* Classes Section */}
      <section id="classes" className="scroll-mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserCheck className="text-purple-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Classes</h2>
          </div>

          <Card>
            {classes.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 text-lg">No classes found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Students</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {classes.map((cls) => (
                      <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{cls.class}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{cls.section}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {(cls as any).student_count || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {(cls as any).teacher_name || 'Not assigned'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </section>

      {/* Attendance Section */}
      <section id="attendance" className="scroll-mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="text-orange-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>
          </div>

          <Card>
            <div className="text-center py-12">
              <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg mb-2">Attendance module will be enabled soon</p>
              <p className="text-gray-500 text-sm">This feature is coming in a future update</p>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Calendar Section */}
      <section id="calendar" className="scroll-mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Calendar className="text-indigo-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Academic Calendar</h2>
          </div>

          <Card>
            <div className="text-center py-12">
              <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg mb-2">Academic calendar coming soon</p>
              <p className="text-gray-500 text-sm">Your school will update the academic calendar here</p>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Examinations Section */}
      <section id="examinations" className="scroll-mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="text-red-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Examinations</h2>
          </div>

          {upcomingExams.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 text-lg mb-2">No upcoming examinations</p>
                <p className="text-gray-500 text-sm">Exam schedules will appear here when available</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingExams.map((exam) => (
                <Card key={exam.id} hover>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{exam.name}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {formatDate(exam.start_date)} - {formatDate(exam.end_date)}
                      </p>
                      
                      {exam.schedules && exam.schedules.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Exam Schedule:</p>
                          {exam.schedules.map((schedule) => (
                            <div key={schedule.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-gray-900">{schedule.subject}</p>
                                  <p className="text-sm text-gray-600">
                                    {schedule.class}-{schedule.section} • {formatDate(schedule.exam_date)} • {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                  </p>
                                </div>
                                {schedule.room && (
                                  <div className="text-sm text-gray-500">
                                    Room: {schedule.room}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* Communication Section */}
      <section id="communication" className="scroll-mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Bell className="text-pink-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Notices & Announcements</h2>
          </div>

          {notices.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Bell className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 text-lg mb-2">No notices available</p>
                <p className="text-gray-500 text-sm">Important announcements will appear here</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {notices.map((notice) => (
                <Card key={notice.id} hover>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(notice.priority)}`}>
                            {notice.priority} Priority
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {notice.category}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{notice.title}</h3>
                        <p className="text-gray-700 whitespace-pre-wrap mb-3">{notice.content}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock size={16} />
                          <span>
                            {notice.publish_at ? formatDate(notice.publish_at) : 'Recently posted'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* Settings Section */}
      <section id="settings" className="scroll-mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Settings className="text-gray-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
          </div>

          <Card>
            <div className="space-y-6">
              {/* Read-only fields */}
              <div className="grid md:grid-cols-2 gap-6 pb-6 border-b border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID</label>
                  <Input value={teacher.staff_id} disabled className="bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <Input value={teacher.role} disabled className="bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <Input value={teacher.department || 'N/A'} disabled className="bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
                  <Input value={teacher.date_of_joining ? formatDate(teacher.date_of_joining) : 'N/A'} disabled className="bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                  <Input value={teacher.employment_type || 'N/A'} disabled className="bg-gray-50" />
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Editable Information</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="tel"
                        value={settingsData.phone}
                        onChange={(e) => setSettingsData({ ...settingsData, phone: e.target.value })}
                        className="pl-10"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="email"
                        value={settingsData.email}
                        onChange={(e) => setSettingsData({ ...settingsData, email: e.target.value })}
                        className="pl-10"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                    <Input
                      type="text"
                      value={settingsData.qualification}
                      onChange={(e) => setSettingsData({ ...settingsData, qualification: e.target.value })}
                      placeholder="Enter qualification"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                    <Input
                      type="number"
                      value={settingsData.experience_years}
                      onChange={(e) => setSettingsData({ ...settingsData, experience_years: parseInt(e.target.value) || 0 })}
                      placeholder="Enter years of experience"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                    <Textarea
                      value={settingsData.address}
                      onChange={(e) => setSettingsData({ ...settingsData, address: e.target.value })}
                      className="pl-10"
                      rows={3}
                      placeholder="Enter address"
                    />
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                {saveSuccess && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 size={20} />
                    <span className="text-sm font-medium">Profile updated successfully!</span>
                  </div>
                )}
                <div className="ml-auto">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={!settingsChanged || saving}
                    className="min-w-[120px]"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}
