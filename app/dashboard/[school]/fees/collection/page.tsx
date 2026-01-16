'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  CreditCard, 
  Search,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Receipt,
  Calendar,
  User,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';

interface Student {
  id: string;
  student_name: string;
  admission_no: string;
  class: string;
  section: string;
}

interface Installment {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  discount_amount: number;
  fine_amount: number;
  paid_amount: number;
  status: string;
  total_due: number;
  pending_amount: number;
  days_overdue: number;
  is_overdue: boolean;
  fee_component: {
    component_name: string;
  };
}

interface FeeStatement {
  student: Student;
  summary: {
    total_due: number;
    total_paid: number;
    total_pending: number;
    overdue_amount: number;
  };
  installments: Installment[];
}

interface Collection {
  id: string;
  receipt_no: string;
  student?: {
    student_name?: string;
    admission_no?: string;
    class?: string;
    section?: string;
  };
  payment_date: string;
  total_amount?: number;
  payment_mode: string;
}

export default function FeeCollectionPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'collect' | 'list'>('collect');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [feeStatement, setFeeStatement] = useState<FeeStatement | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Payment form data
  const [paymentData, setPaymentData] = useState({
    payment_mode: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    discount_amount: '0',
    fine_amount: '0',
    cheque_number: '',
    cheque_date: '',
    bank_name: '',
    transaction_id: '',
    remarks: '',
  });

  // Collection list
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionFilters, setCollectionFilters] = useState({
    start_date: '',
    end_date: '',
    payment_mode: '',
  });

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchStudents();
    } else {
      setStudents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, schoolCode]);

  const searchStudents = useCallback(async () => {
    try {
      const response = await fetch(`/api/students?school_code=${schoolCode}&search=${encodeURIComponent(searchQuery)}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStudents(result.data.slice(0, 10)); // Limit to 10 results
      }
    } catch (error) {
      console.error('Error searching students:', error);
    }
  }, [searchQuery, schoolCode]);

  const fetchFeeStatement = async (studentId: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/fees/students/${studentId}/statement?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setFeeStatement(result.data);
        // Auto-select overdue installments
        const overdueIds: Set<string> = new Set(
          result.data.installments
            .filter((inst: Installment) => inst.is_overdue && inst.pending_amount > 0)
            .map((inst: Installment) => inst.id)
        );
        setSelectedInstallments(overdueIds);
        // Auto-calculate fine amount
        const totalFine = result.data.installments
          .filter((inst: Installment) => overdueIds.has(inst.id))
          .reduce((sum: number, inst: Installment) => sum + (inst.fine_amount || 0), 0);
        setPaymentData(prev => ({ ...prev, fine_amount: totalFine.toString() }));
      } else {
        setError(result.error || 'Failed to fetch fee statement');
      }
    } catch (err) {
      console.error('Error fetching fee statement:', err);
      setError('Failed to fetch fee statement');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setStudents([]);
    fetchFeeStatement(student.id);
  };

  const toggleInstallment = (installmentId: string) => {
    setSelectedInstallments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(installmentId)) {
        newSet.delete(installmentId);
      } else {
        newSet.add(installmentId);
      }
      return newSet;
    });
  };

  const calculateTotal = () => {
    if (!feeStatement) return 0;
    
    const selected = feeStatement.installments.filter(inst => selectedInstallments.has(inst.id));
    const total = selected.reduce((sum, inst) => sum + inst.pending_amount, 0);
    const discount = parseFloat(paymentData.discount_amount) || 0;
    const fine = parseFloat(paymentData.fine_amount) || 0;
    
    return total - discount + fine;
  };

  const handleCollectFee = async () => {
    if (!selectedStudent || selectedInstallments.size === 0) {
      setError('Please select a student and at least one installment to pay');
      return;
    }

    if (!paymentData.payment_mode || !paymentData.payment_date) {
      setError('Payment mode and payment date are required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Get staff ID from session
      const storedStaff = sessionStorage.getItem('staff');
      let collectedBy = null;
      if (storedStaff) {
        try {
          const staffData = JSON.parse(storedStaff);
          collectedBy = staffData.id;
        } catch {
          // Ignore parse error
        }
      }

      // Get headers for authentication
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (collectedBy) {
        headers['x-staff-id'] = collectedBy;
      }

      const response = await fetch('/api/fees/collections', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          school_code: schoolCode,
          student_id: selectedStudent.id,
          installment_ids: Array.from(selectedInstallments),
          payment_mode: paymentData.payment_mode,
          payment_date: paymentData.payment_date,
          discount_amount: parseFloat(paymentData.discount_amount) || 0,
          fine_amount: parseFloat(paymentData.fine_amount) || 0,
          cheque_number: paymentData.payment_mode === 'cheque' ? paymentData.cheque_number : null,
          cheque_date: paymentData.payment_mode === 'cheque' ? paymentData.cheque_date : null,
          bank_name: ['cheque', 'bank_transfer'].includes(paymentData.payment_mode) ? paymentData.bank_name : null,
          remarks: paymentData.remarks || (paymentData.transaction_id && ['online', 'bank_transfer'].includes(paymentData.payment_mode) ? `Transaction ID: ${paymentData.transaction_id}` : null) || null,
          collected_by: collectedBy,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`Fee collected successfully! Receipt: ${result.data?.receipt_no || 'N/A'}`);
        setSelectedStudent(null);
        setFeeStatement(null);
        setSelectedInstallments(new Set());
        setPaymentData({
          payment_mode: 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          discount_amount: '0',
          fine_amount: '0',
          cheque_number: '',
          cheque_date: '',
          bank_name: '',
          transaction_id: '',
          remarks: '',
        });
        setTimeout(() => setSuccess(''), 5000);
        
        // Refresh collections list if on list tab
        if (activeTab === 'list') {
          fetchCollections();
        }
      } else {
        setError(result.error || result.details || 'Failed to collect fee');
      }
    } catch (err) {
      console.error('Error collecting fee:', err);
      setError('Failed to collect fee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ school_code: schoolCode });
      if (collectionFilters.start_date) params.append('start_date', collectionFilters.start_date);
      if (collectionFilters.end_date) params.append('end_date', collectionFilters.end_date);
      if (collectionFilters.payment_mode) params.append('payment_mode', collectionFilters.payment_mode);

      const response = await fetch(`/api/fees/collections?${params.toString()}`);
      const result = await response.json();

      if (response.ok) {
        setCollections(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, collectionFilters]);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchCollections();
    }
  }, [activeTab, fetchCollections]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <CreditCard className="text-[#2F6FED]" size={32} />
            Fee Collection
          </h1>
          <p className="text-gray-600">Collect fees from students and generate receipts</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <CheckCircle size={20} />
            <span>{success}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('collect')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'collect'
                ? 'text-[#2F6FED] border-b-2 border-[#2F6FED] bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Quick Collection
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'list'
                ? 'text-[#2F6FED] border-b-2 border-[#2F6FED] bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Collection List
          </button>
        </div>

        {/* Quick Collection Tab */}
        {activeTab === 'collect' && (
          <div className="p-6 space-y-6">
            {/* Student Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search by name or admission number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {students.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto">
                  {students.map(student => (
                    <button
                      key={student.id}
                      onClick={() => handleStudentSelect(student)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{student.student_name}</div>
                      <div className="text-sm text-gray-600">{student.admission_no} • {student.class}-{student.section}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fee Statement */}
            {selectedStudent && feeStatement && (
              <>
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-[#2F6FED] rounded-lg">
                      <User className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{feeStatement.student.student_name}</h3>
                      <p className="text-sm text-gray-600">{feeStatement.student.admission_no} • {feeStatement.student.class}-{feeStatement.student.section}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total Due</p>
                      <p className="text-lg font-bold text-gray-900">₹{feeStatement.summary.total_due.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total Paid</p>
                      <p className="text-lg font-bold text-green-600">₹{feeStatement.summary.total_paid.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Pending</p>
                      <p className="text-lg font-bold text-orange-600">₹{feeStatement.summary.total_pending.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Overdue</p>
                      <p className="text-lg font-bold text-red-600">₹{feeStatement.summary.overdue_amount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </Card>

                {/* Installments List */}
                <Card className="overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Pending Installments</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {feeStatement.installments.filter(inst => inst.pending_amount > 0).length === 0 ? (
                      <div className="p-8 text-center text-gray-500">No pending installments</div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {feeStatement.installments
                          .filter(inst => inst.pending_amount > 0)
                          .map(inst => (
                            <label
                              key={inst.id}
                              className={`flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                inst.is_overdue ? 'bg-red-50' : ''
                              }`}
                            >
                              <div className="mt-1">
                                {selectedInstallments.has(inst.id) ? (
                                  <CheckSquare className="text-[#2F6FED]" size={20} />
                                ) : (
                                  <Square className="text-gray-400" size={20} />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="font-medium text-gray-900">{inst.fee_component.component_name} - Installment {inst.installment_number}</p>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                      <span className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        Due: {new Date(inst.due_date).toLocaleDateString()}
                                      </span>
                                      {inst.is_overdue && (
                                        <span className="flex items-center gap-1 text-red-600 font-medium">
                                          <Clock size={14} />
                                          {inst.days_overdue} days overdue
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-gray-900">₹{inst.pending_amount.toLocaleString('en-IN')}</p>
                                    {inst.fine_amount > 0 && (
                                      <p className="text-xs text-red-600">Fine: ₹{inst.fine_amount.toLocaleString('en-IN')}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedInstallments.has(inst.id)}
                                onChange={() => toggleInstallment(inst.id)}
                                className="sr-only"
                              />
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Payment Details */}
                {selectedInstallments.size > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Mode <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={paymentData.payment_mode}
                          onChange={(e) => setPaymentData({ ...paymentData, payment_mode: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                        >
                          <option value="cash">Cash</option>
                          <option value="online">Online</option>
                          <option value="cheque">Cheque</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Date <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="date"
                          value={paymentData.payment_date}
                          onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                          required
                        />
                      </div>

                      {paymentData.payment_mode === 'cheque' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Number</label>
                            <Input
                              type="text"
                              value={paymentData.cheque_number}
                              onChange={(e) => setPaymentData({ ...paymentData, cheque_number: e.target.value })}
                              placeholder="Enter cheque number"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Date</label>
                            <Input
                              type="date"
                              value={paymentData.cheque_date}
                              onChange={(e) => setPaymentData({ ...paymentData, cheque_date: e.target.value })}
                            />
                          </div>
                        </>
                      )}

                      {(paymentData.payment_mode === 'cheque' || paymentData.payment_mode === 'bank_transfer') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                          <Input
                            type="text"
                            value={paymentData.bank_name}
                            onChange={(e) => setPaymentData({ ...paymentData, bank_name: e.target.value })}
                            placeholder="Enter bank name"
                          />
                        </div>
                      )}

                      {(paymentData.payment_mode === 'online' || paymentData.payment_mode === 'bank_transfer') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
                          <Input
                            type="text"
                            value={paymentData.transaction_id}
                            onChange={(e) => setPaymentData({ ...paymentData, transaction_id: e.target.value })}
                            placeholder="Enter transaction ID"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Discount Amount</label>
                        <Input
                          type="number"
                          value={paymentData.discount_amount}
                          onChange={(e) => setPaymentData({ ...paymentData, discount_amount: e.target.value })}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fine Amount</label>
                        <Input
                          type="number"
                          value={paymentData.fine_amount}
                          onChange={(e) => setPaymentData({ ...paymentData, fine_amount: e.target.value })}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                        <textarea
                          value={paymentData.remarks}
                          onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                          placeholder="Additional notes..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] resize-none"
                        />
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-gray-700">Total Amount:</span>
                        <span className="text-2xl font-bold text-[#2F6FED]">₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <Button
                        onClick={handleCollectFee}
                        disabled={saving || selectedInstallments.size === 0}
                        className="bg-[#2F6FED] hover:bg-[#1E3A8A] text-white min-w-[200px]"
                      >
                        {saving ? (
                          <>
                            <Loader2 size={18} className="mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Receipt size={18} className="mr-2" />
                            Collect Fee & Generate Receipt
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* Collection List Tab */}
        {activeTab === 'list' && (
          <div className="p-6 space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <Input
                  type="date"
                  value={collectionFilters.start_date}
                  onChange={(e) => setCollectionFilters({ ...collectionFilters, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <Input
                  type="date"
                  value={collectionFilters.end_date}
                  onChange={(e) => setCollectionFilters({ ...collectionFilters, end_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                <select
                  value={collectionFilters.payment_mode}
                  onChange={(e) => setCollectionFilters({ ...collectionFilters, payment_mode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                >
                  <option value="">All Modes</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchCollections}
                  className="w-full bg-[#2F6FED] hover:bg-[#1E3A8A] text-white"
                >
                  <Search size={18} className="mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Collections Table */}
            <Card className="overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : collections.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No collections found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Receipt No</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment Mode</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {collections.map((collection) => (
                        <tr key={collection.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{collection.receipt_no}</td>
                          <td className="px-4 py-3 text-sm">
                            <div>
                              <p className="font-medium text-gray-900">
                                {collection.student?.student_name || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-600">
                                {collection.student?.admission_no || ''} • {collection.student?.class || ''}-{collection.student?.section || ''}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(collection.payment_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            ₹{collection.total_amount?.toLocaleString('en-IN') || '0'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                              {collection.payment_mode}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // TODO: Open receipt modal or navigate to receipt page
                                alert(`Receipt: ${collection.receipt_no}`);
                              }}
                            >
                              <Receipt size={14} className="mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
