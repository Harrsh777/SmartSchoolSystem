'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { ClipboardCheck, Calendar, User, CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

interface CopyCheckingRecord {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_color: string;
  work_date: string;
  work_type: string;
  status: string;
  remarks: string | null;
  topic: string | null;
  marked_by: string;
  marked_by_id: string | null;
  checked_date: string | null;
  created_at: string;
  updated_at: string;
}

export default function StudentCopyCheckingPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<CopyCheckingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'green' | 'yellow' | 'red' | 'not_marked' | 'absent'>('all');
  const [workTypeFilter, setWorkTypeFilter] = useState<'all' | 'class_work' | 'homework'>('all');

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchCopyChecking(studentData);
    }
  }, []);

  const fetchCopyChecking = async (studentData: Student) => {
    try {
      setLoading(true);
      const schoolCode = getString(studentData.school_code);
      const studentId = getString(studentData.id);
      
      if (!schoolCode || !studentId) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/student/copy-checking?school_code=${schoolCode}&student_id=${studentId}`
      );

      const result = await response.json();

      if (response.ok && result.data) {
        setRecords(result.data || []);
      } else {
        console.error('Error fetching copy checking:', result.error);
        setRecords([]);
      }
    } catch (error) {
      console.error('Error fetching copy checking:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'red':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'absent':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green':
        return <CheckCircle2 className="text-emerald-600" size={20} />;
      case 'yellow':
        return <AlertCircle className="text-yellow-600" size={20} />;
      case 'red':
        return <XCircle className="text-red-600" size={20} />;
      case 'absent':
        return <XCircle className="text-orange-600" size={20} />;
      default:
        return <Clock className="text-gray-600" size={20} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'green':
        return 'Copy Checked';
      case 'yellow':
        return 'Half Done';
      case 'red':
        return 'Incomplete';
      case 'absent':
        return 'Absent';
      default:
        return 'Not Marked';
    }
  };

  const filteredRecords = records.filter(record => {
    if (filter !== 'all' && record.status !== filter) return false;
    if (workTypeFilter !== 'all' && record.work_type !== workTypeFilter) return false;
    return true;
  });

  const stats = {
    total: records.length,
    green: records.filter(r => r.status === 'green').length,
    yellow: records.filter(r => r.status === 'yellow').length,
    red: records.filter(r => r.status === 'red').length,
    absent: records.filter(r => r.status === 'absent').length,
    not_marked: records.filter(r => r.status === 'not_marked').length,
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading copy checking records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ClipboardCheck className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Copy Checking</h1>
            <p className="text-muted-foreground">View your copy checking status across all subjects</p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="glass-card soft-shadow p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-emerald-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Excellent</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.green}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-yellow-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Needs Improvement</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.yellow}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-red-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Poor</p>
          <p className="text-2xl font-bold text-red-600">{stats.red}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-orange-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Absent</p>
          <p className="text-2xl font-bold text-orange-600">{stats.absent}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-gray-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Not Marked</p>
          <p className="text-2xl font-bold text-gray-600">{stats.not_marked}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card soft-shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Status Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="all">All Status</option>
              <option value="green">Copy Checked</option>
              <option value="yellow">Half Done</option>
              <option value="red">Incomplete</option>
              <option value="absent">Absent</option>
              <option value="not_marked">Not Marked</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Work Type</label>
            <select
              value={workTypeFilter}
              onChange={(e) => setWorkTypeFilter(e.target.value as typeof workTypeFilter)}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="all">All Types</option>
              <option value="class_work">Class Work</option>
              <option value="homework">Homework</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <Card className="glass-card soft-shadow">
          <div className="text-center py-12">
            <ClipboardCheck className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground text-lg">No copy checking records found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {records.length === 0 
                ? 'Your copy checking records will appear here once they are marked by teachers.'
                : 'No records match the selected filters.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card soft-shadow hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: record.subject_color }}
                      ></div>
                      <h3 className="text-lg font-semibold text-foreground">{record.subject_name}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        record.work_type === 'class_work' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {record.work_type === 'class_work' ? 'Class Work' : 'Homework'}
                      </span>
                    </div>
                    
                    {record.topic && (
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">Topic:</span> {record.topic}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>Work Date: {new Date(record.work_date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                      </div>
                      {record.checked_date && (
                        <div className="flex items-center gap-1">
                          <ClipboardCheck size={14} />
                          <span>Checked: {new Date(record.checked_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</span>
                        </div>
                      )}
                      {record.marked_by && record.status !== 'not_marked' && (
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          <span>By: {record.marked_by}</span>
                        </div>
                      )}
                    </div>

                    {record.remarks && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Remarks:</p>
                        <p className="text-sm text-foreground">{record.remarks}</p>
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 ${getStatusColor(record.status)}`}>
                    {getStatusIcon(record.status)}
                    <span className="text-xs font-bold uppercase">{getStatusLabel(record.status)}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
