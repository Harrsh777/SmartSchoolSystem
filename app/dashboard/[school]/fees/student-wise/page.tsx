'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  DollarSign,
  Search,
  User,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Receipt,
  Percent,
  Calendar,
  Filter,
  Loader2
} from 'lucide-react';

interface StudentFee {
  id: string;
  student_id: string;
  admission_no: string;
  student_name: string;
  class: string;
  section: string;
  total_fee: number;
  paid_amount: number;
  pending_amount: number;
  discount_amount: number;
  discount_percentage: number;
  status: 'paid' | 'partial' | 'pending';
  due_date: string;
  last_payment_date?: string;
}

interface FeeComponent {
  id: string;
  name: string;
  amount: number;
  paid: number;
  pending: number;
  due_date: string;
}

export default function StudentWiseFeePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentFee | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    amount: '',
    percentage: '',
    reason: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_mode: 'cash',
    receipt_no: '',
    payment_date: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  // Mock data
  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];

  const mockStudentFees: StudentFee[] = [
    {
      id: '1',
      student_id: '1',
      admission_no: 'STU001',
      student_name: 'John Doe',
      class: '10',
      section: 'A',
      total_fee: 50000,
      paid_amount: 30000,
      pending_amount: 20000,
      discount_amount: 0,
      discount_percentage: 0,
      status: 'partial',
      due_date: '2024-04-30',
      last_payment_date: '2024-03-15',
    },
    {
      id: '2',
      student_id: '2',
      admission_no: 'STU002',
      student_name: 'Jane Smith',
      class: '10',
      section: 'A',
      total_fee: 50000,
      paid_amount: 50000,
      pending_amount: 0,
      discount_amount: 5000,
      discount_percentage: 10,
      status: 'paid',
      due_date: '2024-04-30',
      last_payment_date: '2024-03-20',
    },
    {
      id: '3',
      student_id: '3',
      admission_no: 'STU003',
      student_name: 'Bob Johnson',
      class: '10',
      section: 'B',
      total_fee: 50000,
      paid_amount: 0,
      pending_amount: 50000,
      discount_amount: 0,
      discount_percentage: 0,
      status: 'pending',
      due_date: '2024-04-30',
    },
  ];

  useEffect(() => {
    // TODO: Fetch student fees
    setStudentFees(mockStudentFees);
  }, [selectedClass, selectedSection, selectedStatus]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredStudentFees = studentFees.filter(fee => {
    const matchesSearch = 
      fee.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fee.admission_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = !selectedClass || fee.class === selectedClass;
    const matchesSection = !selectedSection || fee.section === selectedSection;
    const matchesStatus = selectedStatus === 'all' || fee.status === selectedStatus;
    return matchesSearch && matchesClass && matchesSection && matchesStatus;
  });

  const handleAddDiscount = (student: StudentFee) => {
    setSelectedStudent(student);
    setDiscountForm({
      amount: '',
      percentage: '',
      reason: '',
    });
    setShowDiscountModal(true);
  };

  const handleMarkPaid = (student: StudentFee) => {
    setSelectedStudent(student);
    setPaymentForm({
      amount: student.pending_amount.toString(),
      payment_mode: 'cash',
      receipt_no: '',
      payment_date: new Date().toISOString().split('T')[0],
      remarks: '',
    });
    setShowPaymentModal(true);
  };

  const handleSaveDiscount = async () => {
    // TODO: Implement API call
    console.log('Saving discount:', discountForm, selectedStudent);
    setShowDiscountModal(false);
  };

  const handleSavePayment = async () => {
    // TODO: Implement API call
    console.log('Saving payment:', paymentForm, selectedStudent);
    setShowPaymentModal(false);
  };

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <DollarSign className="text-white" size={24} />
            </div>
            Student-wise Fee
          </h1>
          <p className="text-gray-600">Manage fees for individual students</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
          className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or admission no..."
              className="pl-10"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Sections</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                setSearchQuery('');
                setSelectedClass('');
                setSelectedSection('');
                setSelectedStatus('all');
              }}
              variant="outline"
              className="w-full border-gray-300"
            >
              <Filter size={16} className="mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={20} className="opacity-90" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency(studentFees.reduce((sum, fee) => sum + fee.total_fee, 0))}
          </p>
          <p className="text-xs text-blue-100">Total Fee Amount</p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 size={20} className="opacity-90" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Paid</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency(studentFees.reduce((sum, fee) => sum + fee.paid_amount, 0))}
          </p>
          <p className="text-xs text-green-100">Total Paid</p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <XCircle size={20} className="opacity-90" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Pending</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency(studentFees.reduce((sum, fee) => sum + fee.pending_amount, 0))}
          </p>
          <p className="text-xs text-red-100">Total Pending</p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <Percent size={20} className="opacity-90" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Discount</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency(studentFees.reduce((sum, fee) => sum + fee.discount_amount, 0))}
          </p>
          <p className="text-xs text-orange-100">Total Discount</p>
        </Card>
      </div>

      {/* Student Fees Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Admission No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Class-Section</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Total Fee</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Paid</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Pending</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Discount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudentFees.map((fee, index) => (
                <motion.tr
                  key={fee.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{fee.admission_no}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{fee.student_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fee.class}-{fee.section}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                    {formatCurrency(fee.total_fee)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                    {formatCurrency(fee.paid_amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                    {formatCurrency(fee.pending_amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {fee.discount_amount > 0 ? (
                      <span className="text-orange-600 font-medium">
                        {formatCurrency(fee.discount_amount)} ({fee.discount_percentage}%)
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(fee.status)}`}>
                      {fee.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {fee.pending_amount > 0 && (
                        <>
                          <button
                            onClick={() => handleAddDiscount(fee)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Add Discount"
                          >
                            <Percent size={16} />
                          </button>
                          <button
                            onClick={() => handleMarkPaid(fee)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Mark Paid"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        </>
                      )}
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Receipt"
                      >
                        <Receipt size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Empty State */}
      {filteredStudentFees.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <User size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No student fees found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        </Card>
      )}

      {/* Discount Modal */}
      <AnimatePresence>
        {showDiscountModal && selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDiscountModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <h3 className="text-2xl font-bold">Add Discount</h3>
                <p className="text-blue-100 mt-1">{selectedStudent.student_name} - {selectedStudent.admission_no}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Discount Amount (₹)
                  </label>
                  <Input
                    type="number"
                    value={discountForm.amount}
                    onChange={(e) => setDiscountForm({ ...discountForm, amount: e.target.value })}
                    placeholder="0"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Discount Percentage (%)
                  </label>
                  <Input
                    type="number"
                    value={discountForm.percentage}
                    onChange={(e) => setDiscountForm({ ...discountForm, percentage: e.target.value })}
                    placeholder="0"
                    max="100"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason
                  </label>
                  <textarea
                    value={discountForm.reason}
                    onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })}
                    placeholder="Reason for discount..."
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDiscountModal(false)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDiscount}
                  className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                >
                  Apply Discount
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <h3 className="text-2xl font-bold">Mark Payment</h3>
                <p className="text-blue-100 mt-1">{selectedStudent.student_name} - {selectedStudent.admission_no}</p>
                <p className="text-sm text-blue-200 mt-1">Pending: {formatCurrency(selectedStudent.pending_amount)}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0"
                    max={selectedStudent.pending_amount}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Receipt Number
                  </label>
                  <Input
                    value={paymentForm.receipt_no}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receipt_no: e.target.value })}
                    placeholder="Auto-generated if left empty"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={paymentForm.remarks}
                    onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePayment}
                  className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                >
                  <CheckCircle2 size={18} className="mr-2" />
                  Mark Paid
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



