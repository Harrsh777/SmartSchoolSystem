/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Input from '@/components/ui/Input';
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  User,
  X,
  AlertCircle,
  BarChart2,
  Users,
  GraduationCap,
  Layers,
  Plus,
  FileText,
  Bell,
  Menu,
  Search,
  Briefcase,
  TrendingUp,
  Calendar,
  DollarSign,
  Activity,
  Sparkles,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AnimatePresence } from 'framer-motion';
import type {
  SchoolSignup,
  AcceptedSchool,
  RejectedSchool,
  AdminEmployee,
} from '@/lib/supabase';

type ViewMode =
  | 'overview'
  | 'schools'
  | 'students'
  | 'staff'
  | 'classes'
  | 'attendance'
  | 'exams'
  | 'fees'
  | 'communications'
  | 'employees'
  | 'signups';

interface OverviewSchoolRow {
  id: string;
  school_name: string;
  school_code: string;
  city: string;
  country: string;
  created_at?: string;
  students: number;
  staff: number;
  classes: number;
  exams: number;
  notices: number;
}

interface AdminOverview {
  totals: {
    schools: number;
    students: number;
    staff: number;
    classes: number;
    exams: number;
  };
  schools: OverviewSchoolRow[];
}

export default function AdminDashboard() {
  const [pendingSchools, setPendingSchools] = useState<SchoolSignup[]>([]);
  const [acceptedSchools, setAcceptedSchools] = useState<AcceptedSchool[]>([]);
  const [rejectedSchools, setRejectedSchools] = useState<RejectedSchool[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [rejectingSchoolId, setRejectingSchoolId] = useState<string | null>(null);
  const [acceptingSchoolId, setAcceptingSchoolId] = useState<string | null>(null);
  const [acceptingSchoolName, setAcceptingSchoolName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    email: '',
    school_ids: [] as string[],
  });
  const [employeeErrors, setEmployeeErrors] = useState<Record<string, string>>({});
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [newEmployeePassword, setNewEmployeePassword] = useState<string | null>(null);
  const [signupsViewMode, setSignupsViewMode] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  
  // Data states for admin views
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  
  // Filter states
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSchoolFilter, setStudentSchoolFilter] = useState('all');
  const [studentClassFilter, setStudentClassFilter] = useState('all');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffSchoolFilter, setStaffSchoolFilter] = useState('all');
  const [staffRoleFilter, setStaffRoleFilter] = useState('all');
  const [classSchoolFilter, setClassSchoolFilter] = useState('all');
  const [examSearch, setExamSearch] = useState('');
  const [examSchoolFilter, setExamSchoolFilter] = useState('all');
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // New dashboard data states
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [eventsData, setEventsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    fetchAllData();
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (viewMode === 'students') {
      fetchStudents();
    } else if (viewMode === 'staff') {
      fetchStaff();
    } else if (viewMode === 'classes') {
      fetchClasses();
    } else if (viewMode === 'exams') {
      fetchExams();
    }
  }, [viewMode]);

  // Separate useEffects for filter changes
  useEffect(() => {
    if (viewMode === 'students') {
      fetchStudents();
    }
  }, [studentSchoolFilter, studentClassFilter, studentSearch]);

  useEffect(() => {
    if (viewMode === 'staff') {
      fetchStaff();
    }
  }, [staffSchoolFilter, staffRoleFilter, staffSearch]);

  useEffect(() => {
    if (viewMode === 'classes') {
      fetchClasses();
    }
  }, [classSchoolFilter]);

  useEffect(() => {
    if (viewMode === 'exams') {
      fetchExams();
    }
  }, [examSchoolFilter, examSearch]);

  const fetchAllSchools = async () => {
    try {
      // Fetch pending schools
      const pendingResponse = await fetch('/api/schools?status=pending');
      const pendingResult = await pendingResponse.json();
      if (pendingResponse.ok) {
        setPendingSchools(pendingResult.data || []);
      }

      // Fetch accepted schools
      const acceptedResponse = await fetch('/api/schools/accepted');
      const acceptedResult = await acceptedResponse.json();
      if (acceptedResponse.ok) {
        setAcceptedSchools(acceptedResult.data || []);
      }

      // Fetch rejected schools
      const rejectedResponse = await fetch('/api/schools/rejected');
      const rejectedResult = await rejectedResponse.json();
      if (rejectedResponse.ok) {
        setRejectedSchools(rejectedResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch pending schools
      const pendingResponse = await fetch('/api/schools?status=pending');
      const pendingResult = await pendingResponse.json();
      if (pendingResponse.ok) {
        setPendingSchools(pendingResult.data || []);
      }

      // Fetch accepted schools
      const acceptedResponse = await fetch('/api/schools/accepted');
      const acceptedResult = await acceptedResponse.json();
      if (acceptedResponse.ok) {
        setAcceptedSchools(acceptedResult.data || []);
      }

      // Fetch rejected schools
      const rejectedResponse = await fetch('/api/schools/rejected');
      const rejectedResult = await rejectedResponse.json();
      if (rejectedResponse.ok) {
        setRejectedSchools(rejectedResult.data || []);
      }

      // Fetch overview
      const overviewResponse = await fetch('/api/admin/overview');
      const overviewResult = await overviewResponse.json();
      if (overviewResponse.ok && overviewResult.data) {
        setOverview(overviewResult.data);
      }

      // Fetch employees
      const employeesResponse = await fetch('/api/admin/employees');
      const employeesResult = await employeesResponse.json();
      if (employeesResponse.ok && employeesResult.data) {
        // Transform employee data to include schools count
        const transformedEmployees = employeesResult.data.map((emp: any) => ({
          ...emp,
          schools: emp.employee_schools?.map((es: any) => es.accepted_schools) || [],
        }));
        setEmployees(transformedEmployees);
      }

      // Fetch dashboard stats, financial, and events
      fetchDashboardStats();
      fetchFinancialData();
      fetchEventsData();
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('/api/admin/stats');
      const result = await response.json();
      if (response.ok && result.data) {
        setDashboardStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchFinancialData = async () => {
    try {
      setLoadingFinancial(true);
      const response = await fetch('/api/admin/financial');
      const result = await response.json();
      if (response.ok && result.data) {
        setFinancialData(result.data);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoadingFinancial(false);
    }
  };

  const fetchEventsData = async () => {
    try {
      setLoadingEvents(true);
      const response = await fetch('/api/admin/events');
      const result = await response.json();
      if (response.ok && result.data) {
        setEventsData(result.data);
      }
    } catch (error) {
      console.error('Error fetching events data:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const params = new URLSearchParams();
      if (studentSchoolFilter !== 'all') {
        params.append('school_code', studentSchoolFilter);
      }
      if (studentClassFilter !== 'all') {
        params.append('class', studentClassFilter);
      }
      if (studentSearch) {
        params.append('search', studentSearch);
      }
      const response = await fetch(`/api/admin/students?${params.toString()}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStudents(result.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchStaff = async () => {
    try {
      setLoadingStaff(true);
      const params = new URLSearchParams();
      if (staffSchoolFilter !== 'all') {
        params.append('school_code', staffSchoolFilter);
      }
      if (staffRoleFilter !== 'all') {
        params.append('role', staffRoleFilter);
      }
      if (staffSearch) {
        params.append('search', staffSearch);
      }
      const response = await fetch(`/api/admin/staff?${params.toString()}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStaff(result.data);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const params = new URLSearchParams();
      if (classSchoolFilter !== 'all') {
        params.append('school_code', classSchoolFilter);
      }
      const response = await fetch(`/api/admin/classes?${params.toString()}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchExams = async () => {
    try {
      setLoadingExams(true);
      const params = new URLSearchParams();
      if (examSchoolFilter !== 'all') {
        params.append('school_code', examSchoolFilter);
      }
      if (examSearch) {
        params.append('search', examSearch);
      }
      const response = await fetch(`/api/admin/exams?${params.toString()}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setExams(result.data);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoadingExams(false);
    }
  };

  const openAcceptModal = (id: string, schoolName: string) => {
    setAcceptingSchoolId(id);
    setAcceptingSchoolName(schoolName);
    setShowAcceptModal(true);
  };

  const handleApprove = async () => {
    if (!acceptingSchoolId) return;

    try {
      setUpdatingId(acceptingSchoolId);
      setShowAcceptModal(false);
      
      const response = await fetch(`/api/schools/${acceptingSchoolId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      const result = await response.json();

      if (response.ok) {
        await fetchAllSchools();
        // Show generated credentials
        const schoolCode = result.school_code || 'N/A';
        const password = result.password || 'Password generated';
        alert(`School approved successfully!\n\nSchool Code: ${schoolCode}\nPassword: ${password}\n\nPlease share these credentials with the school. They will need both to log in.`);
      } else {
        const errorMsg = result.error || 'Failed to approve school';
        const details = result.details ? `\n\nDetails: ${result.details}` : '';
        const hint = result.hint ? `\n\nHint: ${result.hint}` : '';
        alert(`${errorMsg}${details}${hint}`);
        console.error('Approval error:', result);
      }
    } catch (error) {
      console.error('Error approving school:', error);
      alert('An error occurred while approving the school');
    } finally {
      setUpdatingId(null);
      setAcceptingSchoolId(null);
      setAcceptingSchoolName('');
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingSchoolId(id);
    setRejectionReason('');
    setRejectionError('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectingSchoolId) return;

    if (!rejectionReason.trim()) {
      setRejectionError('Please provide a reason for rejection');
      return;
    }

    try {
      setUpdatingId(rejectingSchoolId);
      const response = await fetch(`/api/schools/${rejectingSchoolId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'rejected',
          rejection_reason: rejectionReason.trim()
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowRejectModal(false);
        setRejectingSchoolId(null);
        setRejectionReason('');
        await fetchAllSchools();
        alert(result.message || 'School rejected successfully');
      } else {
        setRejectionError(result.error || 'Failed to reject school');
      }
    } catch (error) {
      console.error('Error rejecting school:', error);
      setRejectionError('An error occurred while rejecting the school');
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = {
    pending: pendingSchools.length,
    accepted: acceptedSchools.length,
    rejected: rejectedSchools.length,
    total: pendingSchools.length + acceptedSchools.length + rejectedSchools.length,
  };

  const handleEmployeeInputChange = (field: string, value: string | string[]) => {
    setEmployeeForm((prev) => ({ ...prev, [field]: value }));
    if (employeeErrors[field]) {
      setEmployeeErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateEmployeeForm = () => {
    const errs: Record<string, string> = {};
    if (!employeeForm.full_name.trim()) {
      errs.full_name = 'Full name is required';
    }
    if (!employeeForm.school_ids.length) {
      errs.school_ids = 'Select at least one school';
    }
    setEmployeeErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateEmployee = async () => {
    if (!validateEmployeeForm()) return;

    setCreatingEmployee(true);
    setNewEmployeePassword(null);

    try {
      const response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeForm),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // Refresh employees
        const employeesResponse = await fetch('/api/admin/employees');
        const employeesResult = await employeesResponse.json();
        if (employeesResponse.ok && employeesResult.data) {
          // Transform employee data to include schools count
          const transformedEmployees = employeesResult.data.map((emp: any) => ({
            ...emp,
            schools: emp.employee_schools?.map((es: any) => es.accepted_schools) || [],
          }));
          setEmployees(transformedEmployees);
        }

        setNewEmployeePassword(result.password || null);
        // Don't close modal yet - show password first
        // User can close manually after copying password
      } else {
        alert(result.error || 'Failed to create employee');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Failed to create employee');
    } finally {
      setCreatingEmployee(false);
    }
  };

  const renderSchoolCard = (school: SchoolSignup | AcceptedSchool | RejectedSchool | any, isRejected = false) => {
    // Determine status from _status property (for all view) or from school properties
    const status = (school as any)._status || ('status' in school ? school.status : null) || (isRejected ? 'rejected' : 'accepted');
    const rejectionReason = (isRejected || status === 'rejected') && 'rejection_reason' in school ? school.rejection_reason : null;
    const isPending = status === 'pending';
    const isAccepted = status === 'accepted';
    const isRejectedStatus = status === 'rejected';

    return (
      <Card>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-2xl font-bold text-black">{school.school_name}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isAccepted
                    ? 'bg-green-100 text-green-800'
                    : isRejectedStatus
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isAccepted ? 'Approved' : isRejectedStatus ? 'Rejected' : 'Pending'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {school.school_code && (
                  <>
                    School Code: <span className="font-semibold text-gray-700">{school.school_code}</span>
                    {' • '}
                  </>
                )}
                Established: <span className="font-semibold text-gray-700">{school.established_year}</span>
                {' • '}
                Type: <span className="font-semibold text-gray-700">{school.school_type}</span>
                {' • '}
                Affiliation: <span className="font-semibold text-gray-700">{school.affiliation}</span>
              </p>
              {rejectionReason && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="text-red-600 mt-0.5" size={16} />
                    <div>
                      <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-700">{rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {(isPending || status === 'pending') && (
              <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openAcceptModal(school.id!, school.school_name)}
                              disabled={updatingId === school.id}
                            >
                              <CheckCircle size={18} className="mr-2" />
                              {updatingId === school.id ? 'Updating...' : 'Approve'}
                            </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openRejectModal(school.id!)}
                  disabled={updatingId === school.id}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle size={18} className="mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Address Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <MapPin size={16} className="mr-2" />
                Address
              </h4>
              <p className="text-gray-600 text-sm">
                {school.school_address}<br />
                {school.city}, {school.state} {school.zip_code}<br />
                {school.country}
              </p>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Mail size={16} className="mr-2" />
                Contact
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Mail size={14} className="mr-2 text-gray-400" />
                  {school.school_email}
                </div>
                <div className="flex items-center">
                  <Phone size={14} className="mr-2 text-gray-400" />
                  {school.school_phone}
                </div>
              </div>
            </div>

            {/* Principal Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <User size={16} className="mr-2" />
                Principal
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p className="font-medium text-gray-800">{school.principal_name}</p>
                <div className="flex items-center">
                  <Mail size={14} className="mr-2 text-gray-400" />
                  {school.principal_email}
                </div>
                <div className="flex items-center">
                  <Phone size={14} className="mr-2 text-gray-400" />
                  {school.principal_phone}
                </div>
              </div>
            </div>

            {/* Date Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                {isAccepted ? 'Approved Date' : isRejectedStatus ? 'Rejected Date' : 'Submission Date'}
              </h4>
              <p className="text-sm text-gray-600">
                {isAccepted && 'approved_at' in school && school.approved_at
                  ? new Date(school.approved_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : isRejectedStatus && 'rejected_at' in school && school.rejected_at
                  ? new Date(school.rejected_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'created_at' in school && school.created_at
                  ? new Date(school.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold text-black">
              EduYan Admin
            </Link>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <button
                onClick={fetchAllData}
                className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={20} />
              </button>
              <Link href="/" className="text-sm text-gray-600 hover:text-black">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Navigation */}
        <AnimatePresence>
          {(sidebarOpen || isDesktop) && (
            <>
              {/* Mobile Overlay */}
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                  className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                />
              )}

              {/* Sidebar */}
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                className="fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-70 bg-white border-r border-gray-200 z-50 lg:z-auto overflow-y-auto"
                style={{ width: '280px' }}
              >
                <nav className="p-4 space-y-1">
                  {[
                    { id: 'overview', label: 'Overview', icon: BarChart2 },
                    { id: 'schools', label: 'Schools', icon: Building2 },
                    { id: 'students', label: 'Students', icon: GraduationCap },
                    { id: 'staff', label: 'Staff', icon: Users },
                    { id: 'classes', label: 'Classes', icon: Layers },
                    { id: 'exams', label: 'Exams', icon: FileText },
                    { id: 'communications', label: 'Communications', icon: Bell },
                    { id: 'employees', label: 'Employees', icon: User },
                    { id: 'signups', label: 'Signups', icon: Clock },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = viewMode === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setViewMode(item.id as ViewMode);
                          setSidebarOpen(false);
                        }}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          active
                            ? 'bg-black text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0 bg-gray-50/50">
          {/* Top Header Section with Gradient */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600"
          >
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  x: [0, 50, 0],
                  y: [0, 30, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
                animate={{
                  scale: [1.2, 1, 1.2],
                  x: [0, -50, 0],
                  y: [0, -30, 0],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              />
            </div>

            <div className="relative z-10 p-6 sm:p-8 lg:p-10">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl sm:text-5xl font-bold text-white mb-2"
                  >
                    Admin Dashboard
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-indigo-100 text-lg"
                  >
                    School ERP Management System
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-4"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-white font-semibold">Super Admin</p>
                    <p className="text-indigo-200 text-sm">EduYan Platform</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center">
                    <User className="text-white" size={24} />
                  </div>
                  <div className="px-3 py-1.5 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-full">
                    <span className="text-green-100 text-xs font-medium flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Active
                    </span>
                  </div>
                  <Button
                    onClick={() => {
                      setShowEmployeeModal(true);
                      setNewEmployeePassword(null);
                    }}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30"
                  >
                    <Plus size={18} className="mr-2" />
                    Add Employee
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <div className="p-4 sm:p-6 lg:p-8">

          {/* School Overview Section - Premium Cards */}
          {viewMode === 'overview' && (
            <>
              <div className="mb-8">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold text-gray-900 mb-6"
                >
                  School Overview
                </motion.h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Students Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 opacity-10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                          <Users className="text-white" size={24} />
                        </div>
                        <TrendingUp className="text-blue-500" size={20} />
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Students</p>
                      {loading ? (
                        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-4xl font-bold text-gray-900"
                        >
                          {overview?.totals.students?.toLocaleString() ?? 0}
                        </motion.p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">Across all schools</p>
                    </div>
                  </motion.div>

                  {/* Total Staff Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-600 opacity-10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                          <Briefcase className="text-white" size={24} />
                        </div>
                        <TrendingUp className="text-green-500" size={20} />
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Staff</p>
                      {loading ? (
                        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-4xl font-bold text-gray-900"
                        >
                          {overview?.totals.staff?.toLocaleString() ?? 0}
                        </motion.p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">Teaching & non-teaching</p>
                    </div>
                  </motion.div>

                  {/* Active Classes Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 opacity-10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <Building2 className="text-white" size={24} />
                        </div>
                        <TrendingUp className="text-purple-500" size={20} />
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Active Classes</p>
                      {loading ? (
                        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-4xl font-bold text-gray-900"
                        >
                          {overview?.totals.classes?.toLocaleString() ?? 0}
                        </motion.p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">Currently running</p>
                    </div>
                  </motion.div>

                  {/* Attendance Rate Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400 to-orange-600 opacity-10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                          <Activity className="text-white" size={24} />
                        </div>
                        <TrendingUp className="text-amber-500" size={20} />
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Attendance Rate</p>
                      {loadingStats ? (
                        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-4xl font-bold text-gray-900"
                        >
                          {dashboardStats?.attendanceRate?.toFixed(1) ?? '87.5'}%
                        </motion.p>
                      )}
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${dashboardStats?.attendanceRate ?? 87.5}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </>
          )}

          {/* Student & Staff Overview Section */}
          {viewMode === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Students Overview Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-6">Students Overview</h3>
                {loadingStats ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Gender Distribution</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Male</span>
                            <span className="font-semibold text-gray-900">{dashboardStats?.genderStats?.malePercent ?? 0}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Female</span>
                            <span className="font-semibold text-gray-900">{dashboardStats?.genderStats?.femalePercent ?? 0}%</span>
                          </div>
                        </div>
                      </div>
                      {dashboardStats?.genderStats && (
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Male', value: dashboardStats.genderStats.male },
                                  { name: 'Female', value: dashboardStats.genderStats.female },
                                  { name: 'Other', value: dashboardStats.genderStats.other },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={50}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                <Cell fill="#3b82f6" />
                                <Cell fill="#ec4899" />
                                <Cell fill="#94a3b8" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">New Admissions</p>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            +{dashboardStats?.newAdmissions ?? 0} New
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">Last 3 days</p>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {dashboardStats?.newAdmissionsList && dashboardStats.newAdmissionsList.length > 0 ? (
                          dashboardStats.newAdmissionsList.map((admission: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm py-1">
                              <span className="text-gray-700">{admission.name || 'New Student'}</span>
                              <span className="text-gray-500 text-xs">
                                {admission.date ? new Date(admission.date).toLocaleDateString() : 'Today'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400">No new admissions</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Staff Overview Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-6">Staff Overview</h3>
                {loadingStats ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700">Teaching Staff</span>
                        <span className="font-bold text-gray-900">{dashboardStats?.staffBreakdown?.teaching ?? 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ 
                            width: dashboardStats?.staffBreakdown?.total 
                              ? `${(dashboardStats.staffBreakdown.teaching / dashboardStats.staffBreakdown.total) * 100}%` 
                              : '0%' 
                          }}
                          transition={{ duration: 1, delay: 0.6 }}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700">Non-Teaching Staff</span>
                        <span className="font-bold text-gray-900">{dashboardStats?.staffBreakdown?.nonTeaching ?? 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ 
                            width: dashboardStats?.staffBreakdown?.total 
                              ? `${(dashboardStats.staffBreakdown.nonTeaching / dashboardStats.staffBreakdown.total) * 100}%` 
                              : '0%' 
                          }}
                          transition={{ duration: 1, delay: 0.7 }}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full"
                        />
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Total Staff</span>
                        <span className="text-2xl font-bold text-gray-900">{dashboardStats?.staffBreakdown?.total ?? 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* Financial Management Section */}
          {viewMode === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Financial Management</h3>
                  <p className="text-sm text-gray-600 mt-1">School Earnings Overview</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">
                    Monthly
                  </button>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    Quarterly
                  </button>
                </div>
              </div>
              {loadingFinancial ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                    <p className="text-4xl font-bold text-gray-900">
                      ₹{financialData?.totalRevenue?.toLocaleString('en-IN') ?? '0'}
                    </p>
                  </div>
                  {financialData?.monthlyEarnings && financialData.monthlyEarnings.length > 0 && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financialData.monthlyEarnings}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="month" stroke="#6b7280" />
                          <YAxis stroke="#6b7280" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                            }}
                            formatter={(value: any) => `₹${value.toLocaleString('en-IN')}`}
                          />
                          <Bar 
                            dataKey="earnings" 
                            fill="url(#colorGradient)"
                            radius={[8, 8, 0, 0]}
                          >
                            <defs>
                              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                              </linearGradient>
                            </defs>
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Event Calendar Section */}
          {viewMode === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">Event Calendar</h3>
              {loadingEvents ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 35 }).map((_, idx) => {
                        const date = new Date();
                        date.setDate(date.getDate() - date.getDay() + idx);
                        const dateStr = date.toISOString().split('T')[0];
                        const event = eventsData?.allEvents?.find((e: any) => e.date === dateStr);
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        
                        let bgColor = 'bg-gray-50';
                        let textColor = 'text-gray-600';
                        let borderColor = '';
                        let dotColor = '';
                        
                        if (isToday) {
                          bgColor = 'bg-indigo-600';
                          textColor = 'text-white';
                        } else if (event) {
                          if (event.color === 'red') {
                            bgColor = 'bg-red-100';
                            textColor = 'text-red-700';
                            borderColor = 'border-red-300';
                            dotColor = 'bg-red-500';
                          } else if (event.color === 'green') {
                            bgColor = 'bg-green-100';
                            textColor = 'text-green-700';
                            borderColor = 'border-green-300';
                            dotColor = 'bg-green-500';
                          } else if (event.color === 'blue') {
                            bgColor = 'bg-blue-100';
                            textColor = 'text-blue-700';
                            borderColor = 'border-blue-300';
                            dotColor = 'bg-blue-500';
                          } else {
                            bgColor = 'bg-purple-100';
                            textColor = 'text-purple-700';
                            borderColor = 'border-purple-300';
                            dotColor = 'bg-purple-500';
                          }
                        }
                        
                        return (
                          <div
                            key={idx}
                            className={`aspect-square rounded-lg p-2 text-sm ${bgColor} ${textColor} ${borderColor ? `border ${borderColor}` : ''} hover:bg-opacity-80 transition-colors cursor-pointer`}
                          >
                            {date.getDate()}
                            {event && dotColor && (
                              <div className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1 mx-auto`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Upcoming Events</h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {eventsData?.upcomingEvents && eventsData.upcomingEvents.length > 0 ? (
                        eventsData.upcomingEvents.slice(0, 5).map((event: any, idx: number) => {
                          const dotColor = event.color === 'red' ? 'bg-red-500' : 
                                          event.color === 'green' ? 'bg-green-500' : 
                                          event.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500';
                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 flex-shrink-0`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-400">No upcoming events</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Main Content Sections */}
          {viewMode === 'overview' && overview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Schools Overview</h2>
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">School</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Students</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Staff</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Classes</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Exams</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Notices</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {overview.schools.map((school) => (
                        <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900">{school.school_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{school.school_code}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {school.city}, {school.country}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{school.students}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{school.staff}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{school.classes}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{school.exams}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{school.notices}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {(viewMode === 'schools' || viewMode === 'signups') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Signups + existing school cards reused here */}
              <div className="flex items-center space-x-2 mb-6">
                <button
                  onClick={() => setSignupsViewMode('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    signupsViewMode === 'all'
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Total
                </button>
                <button
                  onClick={() => setSignupsViewMode('pending')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    signupsViewMode === 'pending'
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setSignupsViewMode('accepted')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    signupsViewMode === 'accepted'
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setSignupsViewMode('rejected')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    signupsViewMode === 'rejected'
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Rejected
                </button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {loading ? (
                  <Card>
                    <div className="text-center py-12">
                      <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
                      <p className="text-gray-600">Loading schools...</p>
                    </div>
                  </Card>
                ) : (
                  <>
                    {signupsViewMode === 'all' && (
                <div className="space-y-4">
                  {/* Combine all schools with their statuses */}
                  {(() => {
                    const allSchools = [
                      ...pendingSchools.map(s => ({ ...s, _status: 'pending' as const, _source: 'pending' as const })),
                      ...acceptedSchools.map(s => ({ ...s, _status: 'accepted' as const, _source: 'accepted' as const })),
                      ...rejectedSchools.map(s => ({ ...s, _status: 'rejected' as const, _source: 'rejected' as const })),
                    ].sort((a, b) => {
                      // Sort by date (most recent first)
                      const dateA = a.created_at || (a as any).approved_at || (a as any).rejected_at || '';
                      const dateB = b.created_at || (b as any).approved_at || (b as any).rejected_at || '';
                      return new Date(dateB).getTime() - new Date(dateA).getTime();
                    });

                    if (allSchools.length === 0) {
                      return (
                        <Card>
                          <div className="text-center py-12">
                            <Building2 className="mx-auto mb-4 text-gray-400" size={48} />
                            <p className="text-gray-600 text-lg">No schools found</p>
                          </div>
                        </Card>
                      );
                    }

                    return allSchools.map((school, index) => {
                      const isRejected = school._status === 'rejected';
                      return (
                        <motion.div
                          key={`${school._source}-${school.id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          {renderSchoolCard(school, isRejected)}
                        </motion.div>
                      );
                    });
                  })()}
                </div>
              )}

              {signupsViewMode === 'pending' && (
                <div className="space-y-4">
                  {pendingSchools.length === 0 ? (
                    <Card>
                      <div className="text-center py-12">
                        <Clock className="mx-auto mb-4 text-gray-400" size={48} />
                        <p className="text-gray-600 text-lg">No pending schools</p>
                      </div>
                    </Card>
                  ) : (
                    pendingSchools.map((school, index) => (
                      <motion.div
                        key={school.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {renderSchoolCard(school)}
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {signupsViewMode === 'accepted' && (
                <div className="space-y-4">
                  {acceptedSchools.length === 0 ? (
                    <Card>
                      <div className="text-center py-12">
                        <CheckCircle className="mx-auto mb-4 text-gray-400" size={48} />
                        <p className="text-gray-600 text-lg">No accepted schools</p>
                      </div>
                    </Card>
                  ) : (
                    acceptedSchools.map((school, index) => (
                      <motion.div
                        key={school.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {renderSchoolCard(school)}
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {signupsViewMode === 'rejected' && (
                <div className="space-y-4">
                  {rejectedSchools.length === 0 ? (
                    <Card>
                      <div className="text-center py-12">
                        <XCircle className="mx-auto mb-4 text-gray-400" size={48} />
                        <p className="text-gray-600 text-lg">No rejected schools</p>
                      </div>
                    </Card>
                  ) : (
                    rejectedSchools.map((school, index) => (
                      <motion.div
                        key={school.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {renderSchoolCard(school, true)}
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
              </motion.div>
            </motion.div>
          )}

          {/* Students View */}
          {viewMode === 'students' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">All Students</h2>
                  <p className="text-gray-600 mt-1">View and manage students across all schools</p>
                </div>
              </div>

              {/* Filters */}
              <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type="text"
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={studentSchoolFilter}
                    onChange={(e) => setStudentSchoolFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="all">All Schools</option>
                    {acceptedSchools.map((school) => (
                      <option key={school.id} value={school.school_code}>
                        {school.school_name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={studentClassFilter}
                    onChange={(e) => setStudentClassFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="all">All Classes</option>
                    {Array.from(new Set(students.map(s => s.class))).sort().map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </Card>

              {/* Students Table */}
              {loadingStudents ? (
                <Card>
                  <div className="text-center py-12">
                    <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
                    <p className="text-gray-600">Loading students...</p>
                  </div>
                </Card>
              ) : students.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <GraduationCap className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-gray-600 text-lg">No students found</p>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Admission No</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">School</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class & Section</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Academic Year</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900">{student.student_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">{student.admission_no}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {student.accepted_schools?.school_name || student.school_code}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{student.class} - {student.section}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{student.academic_year}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {student.status || 'active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* Staff View */}
          {viewMode === 'staff' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">All Staff</h2>
                  <p className="text-gray-600 mt-1">View and manage staff across all schools</p>
                </div>
              </div>

              {/* Filters */}
              <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type="text"
                      placeholder="Search staff..."
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={staffSchoolFilter}
                    onChange={(e) => setStaffSchoolFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="all">All Schools</option>
                    {acceptedSchools.map((school) => (
                      <option key={school.id} value={school.school_code}>
                        {school.school_name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={staffRoleFilter}
                    onChange={(e) => setStaffRoleFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="all">All Roles</option>
                    {Array.from(new Set(staff.map(s => s.role))).sort().map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              </Card>

              {/* Staff Table */}
              {loadingStaff ? (
                <Card>
                  <div className="text-center py-12">
                    <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
                    <p className="text-gray-600">Loading staff...</p>
                  </div>
                </Card>
              ) : staff.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <Users className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-gray-600 text-lg">No staff found</p>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Staff ID</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">School</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Department</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {staff.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900">{member.full_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">{member.staff_id}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {member.accepted_schools?.school_name || member.school_code}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{member.role}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{member.department || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{member.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* Classes View */}
          {viewMode === 'classes' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">All Classes</h2>
                  <p className="text-gray-600 mt-1">View and manage classes across all schools</p>
                </div>
              </div>

              {/* Filters */}
              <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={classSchoolFilter}
                    onChange={(e) => setClassSchoolFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="all">All Schools</option>
                    {acceptedSchools.map((school) => (
                      <option key={school.id} value={school.school_code}>
                        {school.school_name}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>

              {/* Classes Table */}
              {loadingClasses ? (
                <Card>
                  <div className="text-center py-12">
                    <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
                    <p className="text-gray-600">Loading classes...</p>
                  </div>
                </Card>
              ) : classes.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <Layers className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-gray-600 text-lg">No classes found</p>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">School</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Academic Year</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Students</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class Teacher</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {classes.map((cls) => (
                          <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {cls.accepted_schools?.school_name || cls.school_code}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{cls.class}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{cls.section}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{cls.academic_year}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 font-semibold">{cls.student_count || 0}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {cls.staff?.full_name || 'Not assigned'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* Exams View */}
          {viewMode === 'exams' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">All Examinations</h2>
                  <p className="text-gray-600 mt-1">View and manage exams across all schools</p>
                </div>
              </div>

              {/* Filters */}
              <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type="text"
                      placeholder="Search exams..."
                      value={examSearch}
                      onChange={(e) => setExamSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={examSchoolFilter}
                    onChange={(e) => setExamSchoolFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="all">All Schools</option>
                    {acceptedSchools.map((school) => (
                      <option key={school.id} value={school.school_code}>
                        {school.school_name}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>

              {/* Exams Table */}
              {loadingExams ? (
                <Card>
                  <div className="text-center py-12">
                    <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
                    <p className="text-gray-600">Loading exams...</p>
                  </div>
                </Card>
              ) : exams.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <FileText className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-gray-600 text-lg">No exams found</p>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Exam Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">School</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Academic Year</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Start Date</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">End Date</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Schedules</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {exams.map((exam) => (
                          <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{exam.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {exam.accepted_schools?.school_name || exam.school_code}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{exam.academic_year}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(exam.start_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(exam.end_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{exam.schedule_count || 0}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                exam.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {exam.status || 'draft'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {viewMode === 'communications' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card>
                <div className="text-center py-12">
                  <Bell className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 text-lg">Communications management coming soon</p>
                  <p className="text-sm text-gray-500 mt-2">View all notices and announcements</p>
                </div>
              </Card>
            </motion.div>
          )}

          {viewMode === 'employees' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Internal Employees</h2>
              </div>
              {employees.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <User className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-gray-600 text-lg">No employees created yet</p>
                    <p className="text-sm text-gray-500 mt-2">Click "Add Employee" to create internal employees</p>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Employee ID</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Full Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Assigned Schools</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {employees.map((employee) => (
                          <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">{employee.emp_id}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{employee.full_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{employee.email || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {employee.schools?.length || 0} school(s)
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </motion.div>
          )}
          </div>
        </main>
      </div>

      {/* Accept Confirmation Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Accept School</h2>
              <button
                onClick={() => {
                  setShowAcceptModal(false);
                  setAcceptingSchoolId(null);
                  setAcceptingSchoolName('');
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                Do you want to accept <span className="font-semibold text-black">{acceptingSchoolName}</span>?
              </p>
              <p className="text-sm text-gray-500">
                A school code and password will be automatically generated for this school.
              </p>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAcceptModal(false);
                    setAcceptingSchoolId(null);
                    setAcceptingSchoolName('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleApprove}
                  disabled={updatingId === acceptingSchoolId}
                >
                  {updatingId === acceptingSchoolId ? 'Accepting...' : 'Yes, Accept School'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Reject School</h2>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingSchoolId(null);
                  setRejectionReason('');
                  setRejectionError('');
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                Please provide a reason for rejecting this school application.
              </p>
              
              <Textarea
                label="Rejection Reason"
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setRejectionError('');
                }}
                placeholder="Enter the reason for rejection..."
                error={rejectionError}
                required
              />

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingSchoolId(null);
                    setRejectionReason('');
                    setRejectionError('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleReject}
                  disabled={updatingId === rejectingSchoolId}
                >
                  {updatingId === rejectingSchoolId ? 'Rejecting...' : 'Reject School'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Add Employee</h2>
              <button
                onClick={() => {
                  setShowEmployeeModal(false);
                  setEmployeeForm({ full_name: '', email: '', school_ids: [] });
                  setEmployeeErrors({});
                  setNewEmployeePassword(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={employeeForm.full_name}
                  onChange={(e) => handleEmployeeInputChange('full_name', e.target.value)}
                  placeholder="Enter employee full name"
                  error={employeeErrors.full_name}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <Input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => handleEmployeeInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  error={employeeErrors.email}
                />
              </div>

              {/* School Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Schools <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Select one or more schools this employee can manage
                </p>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {acceptedSchools.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No accepted schools available. Please accept schools first.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {acceptedSchools.map((school) => (
                        <label
                          key={school.id}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={employeeForm.school_ids.includes(school.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleEmployeeInputChange('school_ids', [
                                  ...employeeForm.school_ids,
                                  school.id,
                                ]);
                              } else {
                                handleEmployeeInputChange(
                                  'school_ids',
                                  employeeForm.school_ids.filter((id) => id !== school.id)
                                );
                              }
                            }}
                            className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{school.school_name}</p>
                            <p className="text-sm text-gray-600">
                              {school.school_code} • {school.city}, {school.country}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {employeeErrors.school_ids && (
                  <p className="text-sm text-red-600 mt-2">{employeeErrors.school_ids}</p>
                )}
              </div>

              {/* Generated Password Display */}
              {newEmployeePassword && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 mb-2">
                    Employee created successfully!
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">Generated Password:</p>
                      <p className="text-lg font-mono font-bold text-black bg-white px-3 py-2 rounded border border-gray-300">
                        {newEmployeePassword}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600">
                      ⚠️ Please save this password securely. It will not be shown again.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowEmployeeModal(false);
                    setEmployeeForm({ full_name: '', email: '', school_ids: [] });
                    setEmployeeErrors({});
                    setNewEmployeePassword(null);
                  }}
                  disabled={creatingEmployee}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleCreateEmployee}
                  disabled={creatingEmployee}
                >
                  {creatingEmployee ? 'Creating...' : 'Create Employee'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
