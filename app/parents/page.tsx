'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  demoStudent,
  demoAttendance,
  demoMarks,
  demoFees,
  demoExams,
  demoReportCard,
} from '@/lib/studentData';
import {
  User,
  Calendar,
  BookOpen,
  DollarSign,
  FileText,
  Award,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Phone,
  Mail,
} from 'lucide-react';

export default function ParentDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'child' | 'attendance' | 'marks' | 'fees' | 'exams' | 'report'>('overview');

  const attendanceStats = {
    total: demoAttendance.length,
    present: demoAttendance.filter(a => a.status === 'Present').length,
    absent: demoAttendance.filter(a => a.status === 'Absent').length,
    late: demoAttendance.filter(a => a.status === 'Late').length,
    percentage: Math.round((demoAttendance.filter(a => a.status === 'Present').length / demoAttendance.length) * 100),
  };

  const feeStats = {
    total: demoFees.reduce((sum, f) => sum + f.amount, 0),
    paid: demoFees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0),
    pending: demoFees.filter(f => f.status === 'Pending').reduce((sum, f) => sum + f.amount, 0),
  };

  const upcomingExams = demoExams.filter(e => e.status === 'Upcoming').slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold text-black">
              Edu<span className="text-gray-600">-Yan</span>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Parent Portal</span>
              <Link href="/" className="text-sm text-gray-600 hover:text-black">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Parent & Child Info Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="flex items-center space-x-6 mb-4 md:mb-0">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold backdrop-blur-sm">
                  {demoStudent.parentName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Welcome, {demoStudent.parentName}</h1>
                  <p className="text-emerald-100">Parent of {demoStudent.name}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-emerald-100">
                    <div className="flex items-center space-x-1">
                      <Mail size={16} />
                      <span>{demoStudent.parentEmail}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Phone size={16} />
                      <span>{demoStudent.parentPhone}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-emerald-100 mb-2">Child&apos;s Information</p>
                <p className="text-xl font-bold">{demoStudent.name}</p>
                <p className="text-sm text-emerald-100">Class {demoStudent.class}-{demoStudent.section} | Roll No: {demoStudent.rollNo}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Attendance</p>
                <p className="text-2xl font-bold text-black">{attendanceStats.percentage}%</p>
              </div>
            </div>
          </Card>
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Award className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overall Grade</p>
                <p className="text-2xl font-bold text-black">{demoReportCard.overallGrade}</p>
              </div>
            </div>
          </Card>
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-red-500 p-3 rounded-lg">
                <DollarSign className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Fees</p>
                <p className="text-2xl font-bold text-black">₹{(feeStats.pending / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </Card>
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-orange-500 p-3 rounded-lg">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Upcoming Exams</p>
                <p className="text-2xl font-bold text-black">{upcomingExams.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'child', label: 'Child Info', icon: User },
            { id: 'attendance', label: 'Attendance', icon: Calendar },
            { id: 'marks', label: 'Marks', icon: Award },
            { id: 'fees', label: 'Fees', icon: DollarSign },
            { id: 'exams', label: 'Exams', icon: FileText },
            { id: 'report', label: 'Report Card', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'child' | 'attendance' | 'marks' | 'fees' | 'exams' | 'report')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Attendance */}
            <Card>
              <h2 className="text-xl font-bold text-black mb-4">Recent Attendance</h2>
              <div className="space-y-2">
                {demoAttendance.slice(-5).map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {record.status === 'Present' && <CheckCircle className="text-green-500" size={20} />}
                      {record.status === 'Absent' && <XCircle className="text-red-500" size={20} />}
                      {record.status === 'Late' && <AlertCircle className="text-yellow-500" size={20} />}
                      <span className="font-medium text-black">
                        {new Date(record.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      record.status === 'Present' ? 'bg-green-100 text-green-800' :
                      record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Marks */}
            <Card>
              <h2 className="text-xl font-bold text-black mb-4">Recent Marks</h2>
              <div className="space-y-3">
                {demoMarks.slice(-3).map((mark, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-black">{mark.subject}</h3>
                        <p className="text-sm text-gray-600">{mark.examType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-black">{mark.marksObtained} / {mark.maxMarks}</p>
                        <p className="text-sm text-gray-600">Grade: {mark.grade}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Upcoming Exams */}
            <Card>
              <h2 className="text-xl font-bold text-black mb-4">Upcoming Exams</h2>
              <div className="space-y-3">
                {upcomingExams.map((exam) => (
                  <div key={exam.id} className="p-4 border border-gray-200 rounded-lg hover:border-black transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-black">{exam.subject}</h3>
                        <p className="text-sm text-gray-600 mt-1">{exam.examType}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span>{exam.time}</span>
                          <span>{exam.room}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {exam.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Fee Summary */}
            <Card>
              <h2 className="text-xl font-bold text-black mb-4">Fee Summary</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-black">₹{(feeStats.total / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-green-600">₹{(feeStats.paid / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-red-600">₹{(feeStats.pending / 1000).toFixed(0)}K</p>
                </div>
              </div>
              <Button variant="primary" className="w-full">
                View All Fees
              </Button>
            </Card>
          </div>
        )}

        {activeTab === 'child' && (
          <Card>
            <h2 className="text-2xl font-bold text-black mb-6">Child&apos;s Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Full Name</label>
                  <p className="text-lg font-semibold text-black">{demoStudent.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Roll Number</label>
                  <p className="text-lg font-semibold text-black">{demoStudent.rollNo}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Class & Section</label>
                  <p className="text-lg font-semibold text-black">Class {demoStudent.class}-{demoStudent.section}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Admission Date</label>
                  <p className="text-lg font-semibold text-black">
                    {new Date(demoStudent.admissionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <p className="text-lg font-semibold text-black">{demoStudent.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Phone</label>
                  <p className="text-lg font-semibold text-black">{demoStudent.phone}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Blood Group</label>
                  <p className="text-lg font-semibold text-black">{demoStudent.bloodGroup}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Address</label>
                  <p className="text-lg font-semibold text-black">{demoStudent.address}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'attendance' && (
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Attendance Records</h2>
              <div className="text-right">
                <p className="text-sm text-gray-600">Overall Attendance</p>
                <p className="text-2xl font-bold text-black">{attendanceStats.percentage}%</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{attendanceStats.present}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {demoAttendance.map((record, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          record.status === 'Present' ? 'bg-green-100 text-green-800' :
                          record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'marks' && (
          <Card>
            <h2 className="text-2xl font-bold text-black mb-6">Marks & Grades</h2>
            <div className="space-y-4">
              {demoMarks.map((mark, index) => (
                <div key={index} className="p-6 border border-gray-200 rounded-lg hover:border-black transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-black">{mark.subject}</h3>
                      <p className="text-sm text-gray-600 mt-1">{mark.examType}</p>
                      <div className="flex items-center space-x-6 mt-4">
                        <div>
                          <p className="text-sm text-gray-600">Marks</p>
                          <p className="text-xl font-bold text-black">{mark.marksObtained} / {mark.maxMarks}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Percentage</p>
                          <p className="text-xl font-bold text-black">{mark.percentage}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Grade</p>
                          <p className="text-xl font-bold text-black">{mark.grade}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="text-sm font-medium text-black">
                        {new Date(mark.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'fees' && (
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Fee Records</h2>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Pending</p>
                <p className="text-2xl font-bold text-red-600">₹{feeStats.pending.toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-4">
              {demoFees.map((fee) => (
                <div key={fee.id} className="p-6 border border-gray-200 rounded-lg hover:border-black transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-black">{fee.category}</h3>
                      <p className="text-2xl font-bold text-black mt-2">₹{fee.amount.toLocaleString()}</p>
                      <div className="flex items-center space-x-6 mt-4 text-sm">
                        <div>
                          <p className="text-gray-600">Due Date</p>
                          <p className="font-medium text-black">
                            {new Date(fee.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        {fee.paidDate && (
                          <div>
                            <p className="text-gray-600">Paid Date</p>
                            <p className="font-medium text-green-600">
                              {new Date(fee.paidDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        )}
                        {fee.receiptNo && (
                          <div>
                            <p className="text-gray-600">Receipt No</p>
                            <p className="font-medium text-black">{fee.receiptNo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                        fee.status === 'Paid' ? 'bg-green-100 text-green-800' :
                        fee.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {fee.status}
                      </span>
                      {fee.status === 'Pending' && (
                        <Button variant="primary" size="sm" className="mt-3 w-full">
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'exams' && (
          <Card>
            <h2 className="text-2xl font-bold text-black mb-6">Exam Schedule</h2>
            <div className="space-y-4">
              {demoExams.map((exam) => (
                <div key={exam.id} className="p-6 border border-gray-200 rounded-lg hover:border-black transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-black">{exam.subject}</h3>
                      <p className="text-sm text-gray-600 mt-1">{exam.examType}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="font-medium text-black">
                            {new Date(exam.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Time</p>
                          <p className="font-medium text-black">{exam.time}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Duration</p>
                          <p className="font-medium text-black">{exam.duration}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Room</p>
                          <p className="font-medium text-black">{exam.room}</p>
                        </div>
                      </div>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      exam.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {exam.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'report' && (
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-black">Report Card</h2>
                <p className="text-gray-600 mt-1">{demoReportCard.term} - {demoReportCard.academicYear}</p>
              </div>
              <Button variant="outline">
                <Download size={18} className="mr-2" />
                Download PDF
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 rounded-xl">
                <p className="text-sm opacity-90">Overall Percentage</p>
                <p className="text-4xl font-bold mt-2">{demoReportCard.overallPercentage}%</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-xl">
                <p className="text-sm opacity-90">Overall Grade</p>
                <p className="text-4xl font-bold mt-2">{demoReportCard.overallGrade}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-6 rounded-xl">
                <p className="text-sm opacity-90">Class Rank</p>
                <p className="text-4xl font-bold mt-2">#{demoReportCard.rank} / {demoReportCard.totalStudents}</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-black mb-4">Subject-wise Performance</h3>
              <div className="space-y-3">
                {demoReportCard.subjects.map((subject, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-black">{subject.subject}</h4>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {subject.grade}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600">Marks: {subject.marksObtained} / {subject.maxMarks}</span>
                      <span className="text-gray-600">Percentage: {subject.percentage}%</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${subject.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-black mb-4">Attendance Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Days</p>
                  <p className="text-2xl font-bold text-black">{demoReportCard.attendance.totalDays}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{demoReportCard.attendance.presentDays}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{demoReportCard.attendance.absentDays}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Percentage</p>
                  <p className="text-2xl font-bold text-blue-600">{demoReportCard.attendance.percentage}%</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

