'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Search, DollarSign, CheckCircle, AlertCircle, Loader2, Receipt, Filter, Users, Calendar, FileText, TrendingUp, UserCheck } from 'lucide-react';

interface StudentFee {
  id: string;
  due_month: string;
  due_date: string;
  base_amount: number;
  paid_amount: number;
  adjustment_amount: number;
  balance_due: number;
  late_fee: number;
  total_due: number;
  status: string;
  fee_structure: {
    name: string;
    late_fee_type: string;
    late_fee_value: number;
    grace_period_days: number;
  };
}

interface Student {
  id: string;
  admission_no: string;
  student_name: string;
  class: string;
  section: string;
}

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
}

export default function PaymentCollectionPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(false);
  const [feesLoading, setFeesLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedCollector, setSelectedCollector] = useState<string>('');
  const [loadingStaff, setLoadingStaff] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const url = classFilter 
        ? `/api/students?school_code=${schoolCode}&class=${encodeURIComponent(classFilter)}`
        : `/api/students?school_code=${schoolCode}`;
      const response = await fetch(url);
      const result = await response.json();
      if (response.ok) {
        setStudents(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, classFilter]);

  useEffect(() => {
    fetchStudents();
    fetchStaff();
    // Try to set default collector from session storage
    const storedStaff = sessionStorage.getItem('staff');
    if (storedStaff) {
      try {
        const staffData = JSON.parse(storedStaff);
        if (staffData.staff_id) {
          setSelectedCollector(staffData.staff_id);
        }
      } catch {
        // Ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStudents]);

  const fetchStaff = useCallback(async () => {
    try {
      setLoadingStaff(true);
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok) {
        setStaffList(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  }, [schoolCode]);

  // Get unique classes for filter
  const uniqueClasses = Array.from(new Set(students.map(s => s.class))).sort((a, b) => {
    const numA = parseInt(a) || 0;
    const numB = parseInt(b) || 0;
    return numA - numB;
  });

  const handleStudentSelect = async (student: Student) => {
    setSelectedStudent(student);
    setStudentFees([]);
    setAllocations({});
    setPaymentAmount('');
    setError('');
    setSuccess('');

    try {
      setFeesLoading(true);
      const response = await fetch(`/api/v2/fees/students/${student.id}/fees?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok) {
        setStudentFees(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch student fees');
      }
    } catch (err) {
      setError('Failed to load student fees');
      console.error(err);
    } finally {
      setFeesLoading(false);
    }
  };

  const handleAllocationChange = (feeId: string, amount: number) => {
    const newAllocations = { ...allocations };
    if (amount > 0) {
      newAllocations[feeId] = amount;
    } else {
      delete newAllocations[feeId];
    }
    setAllocations(newAllocations);

    // Update total payment amount
    const total = Object.values(newAllocations).reduce((sum, amt) => sum + amt, 0);
    setPaymentAmount(total.toFixed(2));
  };

  const handleCollectPayment = async () => {
    if (!selectedStudent) return;

    const totalAllocated = Object.values(allocations).reduce((sum, amt) => sum + amt, 0);
    const paymentAmt = parseFloat(paymentAmount);

    if (paymentAmt <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (Math.abs(totalAllocated - paymentAmt) > 0.01) {
      setError('Total allocated amount must equal payment amount');
      return;
    }

    if (Object.keys(allocations).length === 0) {
      setError('Please allocate payment to at least one fee');
      return;
    }

    try {
      setCollecting(true);
      setError('');
      setSuccess('');

      if (!selectedCollector) {
        setError('Please select a collector');
        setCollecting(false);
        return;
      }

      const allocationArray = Object.entries(allocations).map(([student_fee_id, allocated_amount]) => ({
        student_fee_id,
        allocated_amount,
      }));

      const response = await fetch('/api/v2/fees/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-id': selectedCollector,
        },
        body: JSON.stringify({
          school_code: schoolCode,
          student_id: selectedStudent.id,
          amount: paymentAmt,
          payment_mode: paymentMode,
          reference_no: referenceNo.trim() || null,
          allocations: allocationArray,
          remarks: '',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Payment collected successfully! Receipt generated.');
        setSelectedStudent(null);
        setStudentFees([]);
        setAllocations({});
        setPaymentAmount('');
        setReferenceNo('');
        setTimeout(() => {
          setSuccess('');
          router.push(`/dashboard/${schoolCode}/fees/v2/dashboard`);
        }, 2000);
      } else {
        setError(result.error || 'Failed to collect payment');
      }
    } catch (err) {
      setError(`Failed to collect payment: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(err);
    } finally {
      setCollecting(false);
    }
  };

  const filteredStudents = students.filter(s =>
    (s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admission_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalDue = studentFees.reduce((sum, fee) => sum + fee.total_due, 0);
  const totalAllocated = Object.values(allocations).reduce((sum, amt) => sum + amt, 0);
  const totalPaid = studentFees.reduce((sum, fee) => sum + fee.paid_amount, 0);
  const totalLateFee = studentFees.reduce((sum, fee) => sum + fee.late_fee, 0);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      partial: 'bg-blue-100 text-blue-800 border-blue-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/dashboard`)}>
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <DollarSign size={28} className="text-indigo-600" />
              </div>
              Collect Payment
            </h1>
            <p className="text-gray-600">Collect fees from students and generate receipts</p>
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border-l-4 border-green-500 text-green-800 px-6 py-4 rounded-lg flex items-center gap-3 shadow-sm"
        >
          <CheckCircle size={24} className="text-green-600" />
          <div className="flex-1">
            <p className="font-semibold">{success}</p>
          </div>
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-l-4 border-red-500 text-red-800 px-6 py-4 rounded-lg flex items-center gap-3 shadow-sm"
        >
          <AlertCircle size={24} className="text-red-600" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Student Selection */}
        <Card className="xl:col-span-1 shadow-lg border-0">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Select Student</h2>
            </div>

            {/* Search and Filter */}
            <div className="space-y-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search by name or admission no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={18} />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none"
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map(cls => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students List */}
            <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users size={48} className="mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">No students found</p>
                  <p className="text-sm">Try adjusting your search or filter</p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <motion.div
                    key={student.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStudentSelect(student)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedStudent?.id === student.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-1">{student.student_name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="font-mono">{student.admission_no}</span>
                          <span className="text-gray-400">•</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded-md font-medium">
                            {student.class}-{student.section}
                          </span>
                        </div>
                      </div>
                      {selectedStudent?.id === student.id && (
                        <CheckCircle size={20} className="text-indigo-600 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Fee Details & Payment */}
        <Card className="xl:col-span-2 shadow-lg border-0">
          <div className="p-6">
            {selectedStudent ? (
              <>
                {/* Student Info Header */}
                <div className="mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedStudent.student_name}
                      </h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="font-mono font-medium">{selectedStudent.admission_no}</span>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                          {selectedStudent.class}-{selectedStudent.section}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {feesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    <span className="ml-3 text-gray-600">Loading fees...</span>
                  </div>
                ) : studentFees.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                      <FileText size={40} className="text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No fees found for this student</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Fees need to be generated from an active fee structure first.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-left max-w-lg mx-auto mb-6">
                      <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <AlertCircle size={18} />
                        To generate fees:
                      </p>
                      <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                        <li>Go to Fee Structures page</li>
                        <li>Activate the fee structure (if not already active)</li>
                        <li>Click &quot;Generate Student Fees&quot; button</li>
                        <li>Fees will then appear here</li>
                      </ol>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures`)}
                      className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    >
                      Go to Fee Structures
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-indigo-700">Total Due</span>
                          <TrendingUp size={18} className="text-indigo-600" />
                        </div>
                        <p className="text-2xl font-bold text-indigo-900">₹{totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-700">Total Paid</span>
                          <CheckCircle size={18} className="text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-green-900">₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      {totalLateFee > 0 && (
                        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-red-700">Late Fee</span>
                            <AlertCircle size={18} className="text-red-600" />
                          </div>
                          <p className="text-2xl font-bold text-red-900">₹{totalLateFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      )}
                    </div>

                    {/* Fees List */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FileText size={20} className="text-indigo-600" />
                        Outstanding Fees
                      </h3>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {studentFees.map((fee) => {
                          const allocated = allocations[fee.id] || 0;
                          const canAllocate = fee.total_due > 0;
                          const isOverdue = fee.status === 'overdue' || new Date(fee.due_date) < new Date();
                          
                          return (
                            <div
                              key={fee.id}
                              className={`p-5 rounded-xl border-2 transition-all ${
                                allocated > 0
                                  ? 'border-indigo-300 bg-indigo-50 shadow-md'
                                  : isOverdue
                                  ? 'border-red-200 bg-red-50/50'
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-bold text-gray-900">{fee.fee_structure.name}</h4>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(fee.status)}`}>
                                      {fee.status.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar size={14} />
                                      <span>Due: {new Date(fee.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-2xl font-bold text-gray-900 mb-1">
                                    ₹{fee.total_due.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                  {fee.late_fee > 0 && (
                                    <p className="text-xs text-red-600 font-medium">+ Late Fee: ₹{fee.late_fee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                  )}
                                </div>
                              </div>

                              {/* Fee Breakdown */}
                              <div className="grid grid-cols-3 gap-3 mb-4 text-sm bg-gray-50 rounded-lg p-3">
                                <div>
                                  <span className="text-gray-600">Base Amount:</span>
                                  <p className="font-semibold text-gray-900">₹{fee.base_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Paid:</span>
                                  <p className="font-semibold text-green-600">₹{fee.paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Balance:</span>
                                  <p className="font-semibold text-gray-900">₹{fee.balance_due.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                              </div>

                              {canAllocate && (
                                <div className="pt-3 border-t border-gray-200">
                                  <div className="flex items-center gap-3">
                                    <Input
                                      type="number"
                                      placeholder="Amount to allocate"
                                      value={allocated > 0 ? allocated : ''}
                                      onChange={(e) => {
                                        const amt = parseFloat(e.target.value) || 0;
                                        if (amt <= fee.total_due) {
                                          handleAllocationChange(fee.id, amt);
                                        }
                                      }}
                                      max={fee.total_due}
                                      min={0}
                                      step="0.01"
                                      className="flex-1"
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAllocationChange(fee.id, fee.total_due)}
                                      className="whitespace-nowrap"
                                    >
                                      Pay Full
                                    </Button>
                                    <span className="text-sm text-gray-600 min-w-[80px] text-right">
                                      Max: ₹{fee.total_due.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="border-t pt-6 space-y-5 bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Receipt size={20} className="text-indigo-600" />
                        Payment Details
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-lg p-4 border border-gray-200">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Total Due:</span>
                          <p className="text-2xl font-bold text-gray-900 mt-1">₹{totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Total Allocated:</span>
                          <p className="text-2xl font-bold text-indigo-600 mt-1">₹{totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>

                      <Input
                        label="Payment Amount *"
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Enter payment amount"
                        className="bg-white"
                      />

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <UserCheck size={16} className="text-indigo-600" />
                          Collector *
                        </label>
                        <select
                          value={selectedCollector}
                          onChange={(e) => setSelectedCollector(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          required
                        >
                          <option value="">Select collector...</option>
                          {loadingStaff ? (
                            <option disabled>Loading staff...</option>
                          ) : (
                            staffList.map((staff) => (
                              <option key={staff.id} value={staff.staff_id}>
                                {staff.full_name} ({staff.staff_id})
                              </option>
                            ))
                          )}
                        </select>
                        {!selectedCollector && (
                          <p className="text-xs text-red-600 mt-1">Collector information is required</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Mode *</label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="online">Online</option>
                          <option value="cheque">Cheque</option>
                          <option value="dd">Demand Draft</option>
                        </select>
                      </div>

                      {(paymentMode === 'upi' || paymentMode === 'bank' || paymentMode === 'online' || paymentMode === 'cheque' || paymentMode === 'dd') && (
                        <Input
                          label="Reference Number"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                          placeholder="Transaction ID, UPI ref, cheque no, etc."
                          className="bg-white"
                        />
                      )}

                      <Button
                        onClick={handleCollectPayment}
                        disabled={collecting || !paymentAmount || parseFloat(paymentAmount) <= 0 || totalAllocated === 0 || !selectedCollector}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                      >
                        {collecting ? (
                          <>
                            <Loader2 size={20} className="mr-2 animate-spin" />
                            Processing Payment...
                          </>
                        ) : (
                          <>
                            <Receipt size={20} className="mr-2" />
                            Collect Payment & Generate Receipt
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-6">
                  <Users size={40} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Student</h3>
                <p className="text-gray-600">Choose a student from the list to view fees and collect payment</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
