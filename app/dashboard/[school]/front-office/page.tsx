'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  DoorOpen, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar,
  ArrowLeft,
  RefreshCw,
  User,
  Phone,
  FileText,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  Shield,
  History,
  LogOut,
  LogIn,
  Download,
  Printer
} from 'lucide-react';
import { getGatePassSlipHtml, printHtml } from '@/lib/print-utils';

interface GatePass {
  id: string;
  person_type: string;
  person_name: string;
  class?: string;
  section?: string;
  pass_type: string;
  reason: string;
  date: string;
  time_out: string;
  expected_return_time?: string;
  actual_return_time?: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'closed';
  approved_by_name?: string;
  created_at: string;
  marked_returned_at?: string;
  student?: {
    id: string;
    student_name: string;
    admission_no: string;
    class: string;
    section: string;
  };
}

interface Visitor {
  id: string;
  visitor_name: string;
  phone_number?: string;
  purpose_of_visit: string;
  person_to_meet: string;
  visit_date: string;
  time_in: string;
  time_out?: string;
  status: 'IN' | 'OUT';
  created_at: string;
  marked_out_at?: string;
}

export default function FrontOfficeDashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Data
  const [pendingGatePasses, setPendingGatePasses] = useState<GatePass[]>([]);
  const [activeGatePasses, setActiveGatePasses] = useState<GatePass[]>([]);
  const [closedGatePasses, setClosedGatePasses] = useState<GatePass[]>([]);
  const [visitorsIn, setVisitorsIn] = useState<Visitor[]>([]);
  const [visitorsOut, setVisitorsOut] = useState<Visitor[]>([]);
  const [stats, setStats] = useState({
    pending_count: 0,
    active_count: 0,
    visitors_in_count: 0,
    closed_count: 0,
    visitors_out_count: 0,
  });

  // Success/Error messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, selectedDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await fetch(
        `/api/front-office/dashboard?school_code=${schoolCode}&date=${selectedDate}`
      );
      const result = await response.json();

      if (response.ok && result.data) {
        setPendingGatePasses(result.data.pending_gate_passes || []);
        setActiveGatePasses(result.data.active_gate_passes || []);
        setClosedGatePasses(result.data.closed_gate_passes || []);
        setVisitorsIn(result.data.visitors_in || []);
        setVisitorsOut(result.data.visitors_out || []);
        setStats(result.data.statistics || {
          pending_count: 0,
          active_count: 0,
          visitors_in_count: 0,
          closed_count: 0,
          visitors_out_count: 0,
        });
      } else {
        setErrorMessage(result.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setErrorMessage('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Helper function to get staff ID (from session or fetch default admin/principal)
  const getStaffId = async (): Promise<string | null> => {
    const storedStaff = sessionStorage.getItem('staff');
    if (storedStaff) {
      try {
        const staffData = JSON.parse(storedStaff);
        return staffData.id || null;
      } catch {
        // Ignore parse error
      }
    }

    // If no staff in session (accessing from main dashboard), fetch default admin/principal
    try {
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data && Array.isArray(result.data) && result.data.length > 0) {
        // Try to find principal or admin first
        const principal = result.data.find((s: { role?: string; id: string }) => 
          s.role && (
            s.role.toLowerCase().includes('principal') || 
            s.role.toLowerCase().includes('admin')
          )
        );
        // If no principal/admin, use the first staff member
        const defaultStaff = principal || result.data[0];
        if (defaultStaff && defaultStaff.id) {
          return defaultStaff.id;
        }
      }
    } catch (err) {
      console.error('Error fetching default staff:', err);
    }
    return null;
  };

  const handleApproveGatePass = async (id: string) => {
    if (!confirm('Are you sure you want to approve this gate pass request?')) {
      return;
    }

    try {
      setErrorMessage('');
      setSuccessMessage('');

      // Get staff ID (from session or fetch default)
      const staffId = await getStaffId();
      if (!staffId) {
        setErrorMessage('Unable to identify user. Please try again.');
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-staff-id': staffId,
      };

      const response = await fetch(`/api/gate-pass/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: 'approved',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Gate pass approved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchDashboardData();
      } else {
        setErrorMessage(result.error || 'Failed to approve gate pass');
      }
    } catch (err) {
      console.error('Error approving gate pass:', err);
      setErrorMessage('Failed to approve gate pass. Please try again.');
    }
  };

  const handleRejectGatePass = async (id: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setErrorMessage('');
      setSuccessMessage('');

      // Get staff ID (from session or fetch default)
      const staffId = await getStaffId();
      if (!staffId) {
        setErrorMessage('Unable to identify user. Please try again.');
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-staff-id': staffId,
      };

      const response = await fetch(`/api/gate-pass/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: 'rejected',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Gate pass rejected.');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchDashboardData();
      } else {
        setErrorMessage(result.error || 'Failed to reject gate pass');
      }
    } catch (err) {
      console.error('Error rejecting gate pass:', err);
      setErrorMessage('Failed to reject gate pass. Please try again.');
    }
  };

  const handleMarkReturned = async (id: string) => {
    if (!confirm('Mark this gate pass as returned (closed)?')) {
      return;
    }

    try {
      setErrorMessage('');
      setSuccessMessage('');

      const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
      
      // Get staff ID (from session or fetch default)
      const staffId = await getStaffId();
      if (!staffId) {
        setErrorMessage('Unable to identify user. Please try again.');
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-staff-id': staffId,
      };

      const response = await fetch(`/api/gate-pass/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: 'closed',
          actual_return_time: currentTime,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Gate pass marked as returned.');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchDashboardData();
      } else {
        setErrorMessage(result.error || 'Failed to mark gate pass as returned');
      }
    } catch (err) {
      console.error('Error marking gate pass as returned:', err);
      setErrorMessage('Failed to mark gate pass as returned. Please try again.');
    }
  };

  const handleMarkVisitorOut = async (id: string) => {
    if (!confirm('Mark this visitor as OUT (left campus)?')) {
      return;
    }

    try {
      setErrorMessage('');
      setSuccessMessage('');

      // Get staff ID (from session or fetch default)
      const staffId = await getStaffId();
      if (!staffId) {
        setErrorMessage('Unable to identify user. Please try again.');
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-staff-id': staffId,
      };

      const response = await fetch(`/api/visitors/${id}/mark-out`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Visitor marked as OUT.');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchDashboardData();
      } else {
        setErrorMessage(result.error || 'Failed to mark visitor as OUT');
      }
    } catch (err) {
      console.error('Error marking visitor out:', err);
      setErrorMessage('Failed to mark visitor as OUT. Please try again.');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'N/A';
    return timeStr.substring(0, 5);
  };

  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return 'N/A';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPassTypeLabel = (type: string) => {
    switch (type) {
      case 'early_leave':
        return 'Early Leave';
      case 'late_entry':
        return 'Late Entry';
      case 'half_day':
        return 'Half Day';
      default:
        return type;
    }
  };

  const handlePrintGatePass = (gatePass: GatePass) => {
    const html = getGatePassSlipHtml({
      id: gatePass.id,
      person_type: gatePass.person_type,
      person_name: gatePass.person_name,
      class: gatePass.class,
      section: gatePass.section,
      pass_type: gatePass.pass_type,
      reason: gatePass.reason,
      date: gatePass.date,
      time_out: gatePass.time_out,
      expected_return_time: gatePass.expected_return_time,
      actual_return_time: gatePass.actual_return_time,
      approved_by_name: gatePass.approved_by_name,
      status: gatePass.status,
    });
    printHtml(html, `Gate Pass - ${gatePass.person_name}`);
  };

  const handleDownloadGatePass = async (gatePass: GatePass) => {
    try {
      const res = await fetch(`/api/gate-pass/${gatePass.id}/download-pdf`);
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const name = (gatePass.person_name || 'GatePass').replace(/[^a-zA-Z0-9\s.-]/g, '').trim() || 'GatePass';
      const filename = match ? match[1].trim() : `${name} Gate Pass.pdf`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Download PDF error:', err);
      setErrorMessage('Failed to download PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Shield className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Front Office Dashboard</h1>
              <p className="text-gray-600 text-sm">View and approve gate passes and manage visitors</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm"
            >
              <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/${schoolCode}`)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={20} />
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-800 font-medium">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Filter */}
      <Card className="p-5 bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
            <Calendar className="text-blue-600" size={20} />
            <label className="text-sm font-semibold text-gray-700">Date:</label>
          </div>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-56 border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
          />
          <div className="ml-auto text-sm text-gray-600 font-medium">
            {formatDate(selectedDate)}
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Gate Passes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Clock className="text-white" size={28} />
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-amber-700">{stats.pending_count}</div>
                <div className="text-xs text-amber-600 font-medium mt-1">Requests</div>
              </div>
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">Pending Requests</h3>
            <p className="text-sm text-gray-600">Awaiting Approval</p>
            <div className="mt-4 pt-4 border-t border-amber-200">
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <TrendingUp size={14} />
                <span>Requires immediate attention</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Active Gate Passes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg">
                <CheckCircle className="text-white" size={28} />
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-emerald-700">{stats.active_count}</div>
                <div className="text-xs text-emerald-600 font-medium mt-1">Active</div>
              </div>
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">Active Passes</h3>
            <p className="text-sm text-gray-600">Approved/Active</p>
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <DoorOpen size={14} />
                <span>Currently on campus</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Visitors IN */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                <Users className="text-white" size={28} />
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-blue-700">{stats.visitors_in_count}</div>
                <div className="text-xs text-blue-600 font-medium mt-1">On Campus</div>
              </div>
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">Visitors IN</h3>
            <p className="text-sm text-gray-600">Currently on Campus</p>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <LogIn size={14} />
                <span>Active visitors</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {loading ? (
        <Card className="p-12 bg-white shadow-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading dashboard data...</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Gate Passes */}
          <Card className="p-6 bg-white shadow-xl border-gray-100">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Clock className="text-amber-600" size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Pending Gate Pass Requests</h2>
              </div>
              <span className="px-4 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-bold shadow-sm">
                {pendingGatePasses.length}
              </span>
            </div>

            {pendingGatePasses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-gray-400" size={40} />
                </div>
                <p className="text-gray-600 font-medium text-lg">No pending requests</p>
                <p className="text-gray-500 text-sm mt-2">All gate pass requests have been processed</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {pendingGatePasses.map((gatePass, index) => (
                  <motion.div
                    key={gatePass.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 bg-gradient-to-br from-white to-amber-50/30 border-2 border-amber-200 rounded-xl hover:border-amber-300 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {gatePass.person_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-1">{gatePass.person_name}</h3>
                        {(gatePass.student || (gatePass.class && gatePass.section)) && (
                          <p className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md inline-block">
                            {gatePass.student?.class || gatePass.class} {gatePass.student?.section || gatePass.section}
                          </p>
                        )}
                      </div>
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold border border-amber-200">
                        Pending
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className="text-gray-500 text-xs mb-1">Type</p>
                        <p className="font-semibold text-gray-900">{getPassTypeLabel(gatePass.pass_type)}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className="text-gray-500 text-xs mb-1">Time Out</p>
                        <p className="font-semibold text-gray-900">{formatTime(gatePass.time_out)}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3 col-span-2">
                        <p className="text-gray-500 text-xs mb-1">Reason</p>
                        <p className="font-semibold text-gray-900">{gatePass.reason}</p>
                      </div>
                      {gatePass.expected_return_time && (
                        <div className="bg-white/60 rounded-lg p-3 col-span-2">
                          <p className="text-gray-500 text-xs mb-1">Expected Return</p>
                          <p className="font-semibold text-blue-600">{formatTime(gatePass.expected_return_time)}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-amber-200">
                      <Button
                        onClick={() => handleApproveGatePass(gatePass.id)}
                        className="flex-1 min-w-0 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md"
                        size="sm"
                      >
                        <CheckCircle2 size={16} className="mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectGatePass(gatePass.id)}
                        variant="outline"
                        className="flex-1 min-w-0 border-red-300 text-red-700 hover:bg-red-50 shadow-sm"
                        size="sm"
                      >
                        <XCircle size={16} className="mr-2" />
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadGatePass(gatePass)}
                        className="border-gray-300"
                        title="Download gate pass"
                      >
                        <Download size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintGatePass(gatePass)}
                        className="border-gray-300"
                        title="Print gate pass"
                      >
                        <Printer size={14} />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>

          {/* Active Gate Passes */}
          <Card className="p-6 bg-white shadow-xl border-gray-100">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="text-emerald-600" size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Active Gate Passes</h2>
              </div>
              <span className="px-4 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-sm font-bold shadow-sm">
                {activeGatePasses.length}
              </span>
            </div>

            {activeGatePasses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <DoorOpen className="text-gray-400" size={40} />
                </div>
                <p className="text-gray-600 font-medium text-lg">No active gate passes</p>
                <p className="text-gray-500 text-sm mt-2">No one is currently on gate pass</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {activeGatePasses.map((gatePass, index) => (
                  <motion.div
                    key={gatePass.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-200 rounded-xl hover:border-emerald-300 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {gatePass.person_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-1">{gatePass.person_name}</h3>
                        {(gatePass.student || (gatePass.class && gatePass.section)) && (
                          <p className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md inline-block">
                            {gatePass.student?.class || gatePass.class} {gatePass.student?.section || gatePass.section}
                          </p>
                        )}
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200">
                        {gatePass.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className="text-gray-500 text-xs mb-1">Type</p>
                        <p className="font-semibold text-gray-900">{getPassTypeLabel(gatePass.pass_type)}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className="text-gray-500 text-xs mb-1">Time Out</p>
                        <p className="font-semibold text-gray-900">{formatTime(gatePass.time_out)}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3 col-span-2">
                        <p className="text-gray-500 text-xs mb-1">Reason</p>
                        <p className="font-semibold text-gray-900">{gatePass.reason}</p>
                      </div>
                      {gatePass.expected_return_time && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-gray-500 text-xs mb-1">Expected Return</p>
                          <p className="font-semibold text-blue-600">{formatTime(gatePass.expected_return_time)}</p>
                        </div>
                      )}
                      {gatePass.approved_by_name && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-gray-500 text-xs mb-1">Approved By</p>
                          <p className="font-semibold text-gray-900">{gatePass.approved_by_name}</p>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-emerald-200 flex flex-wrap items-center gap-2">
                        {(gatePass.status === 'approved' || gatePass.status === 'active') && (
                          <Button
                            onClick={() => handleMarkReturned(gatePass.id)}
                            className="flex-1 min-w-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                            size="sm"
                          >
                            <CheckCircle size={16} className="mr-2" />
                            Mark Returned
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadGatePass(gatePass)}
                          title="Download gate pass"
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintGatePass(gatePass)}
                          title="Print gate pass"
                        >
                          <Printer size={14} />
                        </Button>
                      </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Visitors IN */}
      <Card className="p-6 bg-white shadow-xl border-gray-100">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <LogIn className="text-blue-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Visitors Currently on Campus</h2>
          </div>
          <span className="px-4 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-bold shadow-sm">
            {visitorsIn.length}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading visitors...</p>
          </div>
        ) : visitorsIn.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <User className="text-gray-400" size={40} />
            </div>
            <p className="text-gray-600 font-medium text-lg">No visitors currently on campus</p>
            <p className="text-gray-500 text-sm mt-2">All visitors have checked out</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Visitor</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Purpose</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Meeting</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Time In</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visitorsIn.map((visitor, index) => (
                  <motion.tr
                    key={visitor.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                          {visitor.visitor_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{visitor.visitor_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone size={14} />
                        {visitor.phone_number || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{visitor.purpose_of_visit}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{visitor.person_to_meet}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock size={14} />
                        {formatTime(visitor.time_in)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Button
                        onClick={() => handleMarkVisitorOut(visitor.id)}
                        className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md"
                        size="sm"
                      >
                        <LogOut size={16} className="mr-2" />
                        Mark OUT
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Closed Gate Passes (History) */}
        <Card className="p-6 bg-white shadow-xl border-gray-100">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <History className="text-gray-600" size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Closed Gate Passes</h2>
            </div>
            <span className="px-4 py-1.5 bg-gray-100 text-gray-800 rounded-full text-sm font-bold shadow-sm">
              {closedGatePasses.length}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-gray-600 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading history...</p>
            </div>
          ) : closedGatePasses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="text-gray-400" size={40} />
              </div>
              <p className="text-gray-600 font-medium text-lg">No closed gate passes</p>
              <p className="text-gray-500 text-sm mt-2">No history for the last week</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {closedGatePasses.map((gatePass, index) => (
                <motion.div
                  key={gatePass.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold shadow-sm">
                      {gatePass.person_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{gatePass.person_name}</h3>
                      {(gatePass.student || (gatePass.class && gatePass.section)) && (
                        <p className="text-xs text-gray-600 mt-1">
                          {gatePass.student?.class || gatePass.class} {gatePass.student?.section || gatePass.section}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                      closed
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 font-semibold text-gray-900">{getPassTypeLabel(gatePass.pass_type)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Time Out:</span>
                      <span className="ml-2 font-semibold text-gray-900">{formatTime(gatePass.time_out)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Reason:</span>
                      <span className="ml-2 font-semibold text-gray-900">{gatePass.reason}</span>
                    </div>
                    {gatePass.actual_return_time && (
                      <div>
                        <span className="text-gray-500">Returned:</span>
                        <span className="ml-2 font-semibold text-emerald-600">{formatTime(gatePass.actual_return_time)}</span>
                      </div>
                    )}
                    {gatePass.marked_returned_at && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Closed At:</span>
                        <span className="ml-2 font-semibold text-gray-900">{formatDateTime(gatePass.marked_returned_at)}</span>
                      </div>
                    )}
                    {gatePass.approved_by_name && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Approved By:</span>
                        <span className="ml-2 font-semibold text-gray-900">{gatePass.approved_by_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadGatePass(gatePass)}
                      title="Download gate pass"
                    >
                      <Download size={14} className="mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintGatePass(gatePass)}
                      title="Print gate pass"
                    >
                      <Printer size={14} className="mr-1" />
                      Print
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Visitors History (OUT) */}
        <Card className="p-6 bg-white shadow-xl border-gray-100">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <LogOut className="text-gray-600" size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Visitors History</h2>
            </div>
            <span className="px-4 py-1.5 bg-gray-100 text-gray-800 rounded-full text-sm font-bold shadow-sm">
              {visitorsOut.length}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-gray-600 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading history...</p>
            </div>
          ) : visitorsOut.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <User className="text-gray-400" size={40} />
              </div>
              <p className="text-gray-600 font-medium text-lg">No visitor history</p>
              <p className="text-gray-500 text-sm mt-2">No visitors have left in the last week</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {visitorsOut.map((visitor, index) => (
                <motion.div
                  key={visitor.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold shadow-sm">
                      {visitor.visitor_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{visitor.visitor_name}</h3>
                      {visitor.phone_number && (
                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                          <Phone size={12} />
                          {visitor.phone_number}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                      OUT
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Purpose:</span>
                      <span className="ml-2 font-semibold text-gray-900">{visitor.purpose_of_visit}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Time In:</span>
                      <span className="ml-2 font-semibold text-gray-900">{formatTime(visitor.time_in)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Person to Meet:</span>
                      <span className="ml-2 font-semibold text-gray-900">{visitor.person_to_meet}</span>
                    </div>
                    {visitor.time_out && (
                      <div>
                        <span className="text-gray-500">Time Out:</span>
                        <span className="ml-2 font-semibold text-emerald-600">{formatTime(visitor.time_out)}</span>
                      </div>
                    )}
                    {visitor.marked_out_at && (
                      <div>
                        <span className="text-gray-500">Left At:</span>
                        <span className="ml-2 font-semibold text-gray-900">{formatDateTime(visitor.marked_out_at)}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
