'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  AlertCircle,
  Download,
} from 'lucide-react';

interface PendingCheque {
  id: string;
  cheque_number: string;
  bank_name: string;
  amount: number;
  student_id: string;
  student_name: string;
  admission_no: string;
  class: string;
  section: string;
  cheque_date: string;
  received_date: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  remarks?: string;
  cleared_date?: string;
}

export default function PendingChequePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [cheques, setCheques] = useState<PendingCheque[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: '',
    end: '',
  });
  const [selectedCheque, setSelectedCheque] = useState<PendingCheque | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: 'cleared' as 'cleared' | 'bounced' | 'cancelled',
    remarks: '',
    cleared_date: new Date().toISOString().split('T')[0],
  });

  // Mock data
  const mockCheques: PendingCheque[] = [
    {
      id: '1',
      cheque_number: 'CHQ001234',
      bank_name: 'State Bank of India',
      amount: 25000,
      student_id: '1',
      student_name: 'John Doe',
      admission_no: 'STU001',
      class: '10',
      section: 'A',
      cheque_date: '2024-03-15',
      received_date: '2024-03-20',
      status: 'pending',
      remarks: 'Received for annual fee',
    },
    {
      id: '2',
      cheque_number: 'CHQ001235',
      bank_name: 'HDFC Bank',
      amount: 30000,
      student_id: '2',
      student_name: 'Jane Smith',
      admission_no: 'STU002',
      class: '10',
      section: 'A',
      cheque_date: '2024-03-18',
      received_date: '2024-03-22',
      status: 'pending',
      remarks: 'Quarterly fee payment',
    },
    {
      id: '3',
      cheque_number: 'CHQ001236',
      bank_name: 'ICICI Bank',
      amount: 20000,
      student_id: '3',
      student_name: 'Bob Johnson',
      admission_no: 'STU003',
      class: '9',
      section: 'B',
      cheque_date: '2024-03-10',
      received_date: '2024-03-15',
      status: 'cleared',
      cleared_date: '2024-03-25',
      remarks: 'Cleared successfully',
    },
    {
      id: '4',
      cheque_number: 'CHQ001237',
      bank_name: 'Axis Bank',
      amount: 15000,
      student_id: '4',
      student_name: 'Alice Williams',
      admission_no: 'STU004',
      class: '11',
      section: 'C',
      cheque_date: '2024-02-28',
      received_date: '2024-03-05',
      status: 'bounced',
      remarks: 'Insufficient funds',
    },
  ];

  useEffect(() => {
    // TODO: Fetch pending cheques
    setCheques(mockCheques);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleared': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'bounced': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cleared': return <CheckCircle2 size={14} className="text-green-600" />;
      case 'pending': return <Clock size={14} className="text-yellow-600" />;
      case 'bounced': return <XCircle size={14} className="text-red-600" />;
      case 'cancelled': return <XCircle size={14} className="text-gray-600" />;
      default: return <AlertCircle size={14} className="text-gray-600" />;
    }
  };

  const filteredCheques = cheques.filter(cheque => {
    const matchesSearch = 
      cheque.cheque_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cheque.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cheque.admission_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cheque.bank_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || cheque.status === selectedStatus;
    const matchesDateRange = 
      (!selectedDateRange.start || cheque.received_date >= selectedDateRange.start) &&
      (!selectedDateRange.end || cheque.received_date <= selectedDateRange.end);
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const handleUpdateStatus = (cheque: PendingCheque) => {
    setSelectedCheque(cheque);
    setStatusForm({
      status: cheque.status === 'pending' ? 'cleared' : cheque.status,
      remarks: cheque.remarks || '',
      cleared_date: cheque.cleared_date || new Date().toISOString().split('T')[0],
    });
    setShowStatusModal(true);
  };

  const handleSaveStatus = async () => {
    // TODO: Implement API call
    console.log('Updating cheque status:', statusForm, selectedCheque);
    setShowStatusModal(false);
  };

  const totalPending = cheques.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
  const totalCleared = cheques.filter(c => c.status === 'cleared').reduce((sum, c) => sum + c.amount, 0);
  const totalBounced = cheques.filter(c => c.status === 'bounced').reduce((sum, c) => sum + c.amount, 0);

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
              <CreditCard className="text-white" size={24} />
            </div>
            Pending Cheque
          </h1>
          <p className="text-gray-600">Manage and track cheque payments</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] text-white">
          <div className="flex items-center justify-between mb-2">
            <CreditCard size={20} className="opacity-90" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total</span>
          </div>
          <p className="text-3xl font-bold mb-1">{cheques.length}</p>
          <p className="text-xs text-blue-100">Total Cheques</p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <Clock size={20} className="opacity-90" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Pending</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency(totalPending)}
          </p>
          <p className="text-xs text-yellow-100">
            {cheques.filter(c => c.status === 'pending').length} cheques
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 size={20} className="opacity-90" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Cleared</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency(totalCleared)}
          </p>
          <p className="text-xs text-green-100">
            {cheques.filter(c => c.status === 'cleared').length} cheques
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <XCircle size={20} className="opacity-90" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Bounced</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency(totalBounced)}
          </p>
          <p className="text-xs text-red-100">
            {cheques.filter(c => c.status === 'bounced').length} cheques
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by cheque no, student, or bank..."
              className="pl-10"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="cleared">Cleared</option>
              <option value="bounced">Bounced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <Input
              type="date"
              value={selectedDateRange.start}
              onChange={(e) => setSelectedDateRange({ ...selectedDateRange, start: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
            <Input
              type="date"
              value={selectedDateRange.end}
              onChange={(e) => setSelectedDateRange({ ...selectedDateRange, end: e.target.value })}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Cheques Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Cheque Number</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Bank Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Student</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Class-Section</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Cheque Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Received Date</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCheques.map((cheque, index) => (
                <motion.tr
                  key={cheque.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-[#1e3a8a]" />
                      <span className="text-sm font-mono font-semibold text-gray-900">{cheque.cheque_number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cheque.bank_name}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{cheque.student_name}</p>
                      <p className="text-xs text-gray-600 font-mono">{cheque.admission_no}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cheque.class}-{cheque.section}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                    {formatCurrency(cheque.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(cheque.cheque_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(cheque.received_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(cheque.status)}`}>
                      {getStatusIcon(cheque.status)}
                      {cheque.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {cheque.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(cheque)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Update Status"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download Receipt"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Print"
                      >
                        <Printer size={16} />
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
      {filteredCheques.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <CreditCard size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No cheques found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        </Card>
      )}

      {/* Status Update Modal */}
      <AnimatePresence>
        {showStatusModal && selectedCheque && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowStatusModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <h3 className="text-2xl font-bold">Update Cheque Status</h3>
                <p className="text-blue-100 mt-1">
                  {selectedCheque.cheque_number} - {formatCurrency(selectedCheque.amount)}
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as 'cleared' | 'bounced' | 'cancelled' })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="cleared">Cleared</option>
                    <option value="bounced">Bounced</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                {statusForm.status === 'cleared' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cleared Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={statusForm.cleared_date}
                      onChange={(e) => setStatusForm({ ...statusForm, cleared_date: e.target.value })}
                      className="w-full"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={statusForm.remarks}
                    onChange={(e) => setStatusForm({ ...statusForm, remarks: e.target.value })}
                    placeholder="Add remarks..."
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowStatusModal(false)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveStatus}
                  className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                >
                  <CheckCircle2 size={18} className="mr-2" />
                  Update Status
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



