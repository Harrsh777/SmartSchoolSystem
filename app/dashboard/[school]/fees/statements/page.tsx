'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Receipt, 
  ArrowLeft,
  Search,
  Download,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  CheckSquare,
  Square,
  IndianRupee,
} from 'lucide-react';

interface Student {
  id: string;
  student_name: string;
  admission_no: string;
  class: string;
  section: string;
}

interface FeeRecord {
  id: string;
  due_month: string;
  due_date: string;
  base_amount: number;
  paid_amount: number;
  adjustment_amount: number;
  late_fee: number;
  total_due: number;
  balance_due: number;
  status: string;
  days_overdue: number;
  is_overdue: boolean;
  fee_structure: {
    id: string;
    name: string;
    class_name?: string;
    section?: string;
  };
}

interface PaymentRecord {
  id: string;
  receipt_no: string;
  payment_date: string;
  amount: number;
  payment_mode: string;
  reference_no?: string;
  remarks?: string;
  allocations: Array<{
    student_fee_id: string;
    allocated_amount: number;
    fee_name: string;
    due_month: string;
    due_date: string;
  }>;
}

interface FeeStatement {
  student: Student;
  summary: {
    total_due: number;
    total_paid: number;
    total_pending: number;
    overdue_amount: number;
  };
  fees: FeeRecord[];
  payment_history: PaymentRecord[];
}

export default function FeeStatementsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [feeStatement, setFeeStatement] = useState<FeeStatement | null>(null);
  const [academicYear, setAcademicYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [classes, setClasses] = useState<Array<{ class: string; sections: string[] }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFees, setSelectedFees] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchStudents();
    } else {
      setStudents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedClass, selectedSection, schoolCode]);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/examinations/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const searchStudents = async () => {
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
        search: searchQuery,
      });
      if (selectedClass) params.append('class', selectedClass);
      if (selectedSection) params.append('section', selectedSection);

      const response = await fetch(`/api/students?${params.toString()}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStudents(result.data.slice(0, 10));
      }
    } catch (error) {
      console.error('Error searching students:', error);
    }
  };

  const fetchFeeStatement = async (studentId: string) => {
    try {
      setLoading(true);
      setSelectedFees(new Set());
      const params = new URLSearchParams({ school_code: schoolCode });
      if (academicYear) params.append('academic_year', academicYear);

      const response = await fetch(`/api/fees/students/${studentId}/statement?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setFeeStatement(result.data);
      }
    } catch (error) {
      console.error('Error fetching fee statement:', error);
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

  const toggleFeeSelection = (feeId: string) => {
    const newSelected = new Set(selectedFees);
    if (newSelected.has(feeId)) {
      newSelected.delete(feeId);
    } else {
      newSelected.add(feeId);
    }
    setSelectedFees(newSelected);
  };

  const toggleSelectAll = () => {
    if (!feeStatement) return;
    if (selectedFees.size === feeStatement.fees.length) {
      setSelectedFees(new Set());
    } else {
      setSelectedFees(new Set(feeStatement.fees.map(f => f.id)));
    }
  };

  const handleDownloadReceipt = async (feeIds: string[], openInNewTab = false) => {
    if (!selectedStudent || feeIds.length === 0) return;

    try {
      setDownloading(true);
      const response = await fetch('/api/fees/receipts/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          student_id: selectedStudent.id,
          fee_ids: feeIds,
        }),
      });

      if (response.ok) {
        const htmlContent = await response.text();
        
        if (openInNewTab) {
          // Open in new tab for viewing
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(htmlContent);
            newWindow.document.close();
            // Trigger print dialog after a short delay
            setTimeout(() => {
              newWindow.print();
            }, 500);
          }
        } else {
          // Download as HTML file
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `fee_receipt_${selectedStudent.admission_no}_${new Date().toISOString().split('T')[0]}.html`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to download receipt');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt');
    } finally {
      setDownloading(false);
    }
  };

  // Group fees by due month for date-wise display
  const feesByMonth = useMemo(() => {
    if (!feeStatement) return {};
    
    const grouped: Record<string, FeeRecord[]> = {};
    feeStatement.fees.forEach(fee => {
      const month = new Date(fee.due_month).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(fee);
    });
    
    // Sort months chronologically
    const sortedMonths = Object.keys(grouped).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
    
    const sorted: Record<string, FeeRecord[]> = {};
    sortedMonths.forEach(month => {
      sorted[month] = grouped[month];
    });
    
    return sorted;
  }, [feeStatement]);

  // Group payments by date
  const paymentsByDate = useMemo(() => {
    if (!feeStatement) return {};
    
    const grouped: Record<string, PaymentRecord[]> = {};
    feeStatement.payment_history.forEach(payment => {
      const date = new Date(payment.payment_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(payment);
    });
    
    return grouped;
  }, [feeStatement]);

  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear - 1}-${currentYear}`,
    `${currentYear + 1}-${currentYear + 2}`,
  ];

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
            <IndianRupee className="text-[#2F6FED]" size={32} />
            Student Fee Statements
          </h1>
          <p className="text-gray-600">View individual student fee history and pending amounts</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Search Section */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto z-10">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection(''); // Reset section when class changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
            >
              <option value="">All Classes</option>
              {classes.map((cls, idx) => (
                <option key={idx} value={cls.class}>{cls.class}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">All Sections</option>
              {selectedClass && classes.find(c => c.class === selectedClass)?.sections.map((section, idx) => (
                <option key={idx} value={section}>{section}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year (Optional)</label>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                if (selectedStudent) {
                  fetchFeeStatement(selectedStudent.id);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
            >
              <option value="">All Years</option>
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6FED] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fee statement...</p>
        </Card>
      )}

      {/* Fee Statement Display */}
      {selectedStudent && !loading && feeStatement && (
        <>
          {/* Summary Card */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#2F6FED] rounded-lg">
                  <Receipt className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{feeStatement.student.student_name}</h3>
                  <p className="text-sm text-gray-600">{feeStatement.student.admission_no} • {feeStatement.student.class}-{feeStatement.student.section}</p>
                </div>
              </div>
              {selectedFees.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDownloadReceipt(Array.from(selectedFees), true)}
                    disabled={downloading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileText size={18} className="mr-2" />
                    {downloading ? 'Opening...' : `View ${selectedFees.size} Receipt${selectedFees.size > 1 ? 's' : ''}`}
                  </Button>
                  <Button
                    onClick={() => handleDownloadReceipt(Array.from(selectedFees), false)}
                    disabled={downloading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download size={18} className="mr-2" />
                    {downloading ? 'Downloading...' : `Download ${selectedFees.size} Receipt${selectedFees.size > 1 ? 's' : ''}`}
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Total Due</p>
                <p className="text-xl font-bold text-gray-900">₹{feeStatement.summary.total_due.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Total Paid</p>
                <p className="text-xl font-bold text-green-600">₹{feeStatement.summary.total_paid.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Pending</p>
                <p className="text-xl font-bold text-orange-600">₹{feeStatement.summary.total_pending.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Overdue</p>
                <p className="text-xl font-bold text-red-600">₹{feeStatement.summary.overdue_amount.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </Card>

          {/* Fees by Month - Date-wise Display */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Select All"
                >
                  {selectedFees.size === feeStatement.fees.length ? (
                    <CheckSquare size={20} className="text-[#2F6FED]" />
                  ) : (
                    <Square size={20} className="text-gray-400" />
                  )}
                </button>
                <h3 className="text-lg font-semibold text-gray-900">Fee Statements (Date-wise)</h3>
                {selectedFees.size > 0 && (
                  <span className="text-sm text-gray-600">({selectedFees.size} selected)</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedFees.size > 0) {
                      handleDownloadReceipt(Array.from(selectedFees), true);
                    } else {
                      alert('Please select at least one fee statement to view');
                    }
                  }}
                  disabled={selectedFees.size === 0 || downloading}
                >
                  <FileText size={16} className="mr-2" />
                  View Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedFees.size > 0) {
                      handleDownloadReceipt(Array.from(selectedFees), false);
                    } else {
                      alert('Please select at least one fee statement to download');
                    }
                  }}
                  disabled={selectedFees.size === 0 || downloading}
                >
                  <Download size={16} className="mr-2" />
                  Download Selected
                </Button>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {Object.entries(feesByMonth).map(([month, fees]) => (
                <div key={month} className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="text-[#2F6FED]" size={18} />
                    <h4 className="text-md font-semibold text-gray-900">{month}</h4>
                    <span className="text-sm text-gray-500">({fees.length} fee{fees.length > 1 ? 's' : ''})</span>
                  </div>
                  <div className="space-y-3">
                    {fees.map((fee) => {
                      const isSelected = selectedFees.has(fee.id);
                      const balanceDue = fee.balance_due;
                      const isPaid = balanceDue <= 0;
                      
                      return (
                        <motion.div
                          key={fee.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isSelected 
                              ? 'border-[#2F6FED] bg-blue-50' 
                              : fee.is_overdue 
                                ? 'border-red-200 bg-red-50' 
                                : isPaid
                                  ? 'border-green-200 bg-green-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <button
                              onClick={() => toggleFeeSelection(fee.id)}
                              className="mt-1"
                            >
                              {isSelected ? (
                                <CheckSquare size={20} className="text-[#2F6FED]" />
                              ) : (
                                <Square size={20} className="text-gray-400" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h5 className="font-semibold text-gray-900">{fee.fee_structure.name}</h5>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                      <Calendar size={14} />
                                      Due: {new Date(fee.due_date).toLocaleDateString('en-IN')}
                                    </span>
                                    {fee.is_overdue && (
                                      <span className="flex items-center gap-1 text-red-600">
                                        <Clock size={14} />
                                        {fee.days_overdue} days overdue
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    {isPaid ? (
                                      <CheckCircle2 className="text-green-600" size={20} />
                                    ) : fee.is_overdue ? (
                                      <AlertCircle className="text-red-600" size={20} />
                                    ) : (
                                      <Clock className="text-orange-600" size={20} />
                                    )}
                                    <span className={`text-lg font-bold ${
                                      isPaid ? 'text-green-600' : fee.is_overdue ? 'text-red-600' : 'text-orange-600'
                                    }`}>
                                      {isPaid ? 'Paid' : `₹${balanceDue.toLocaleString('en-IN')}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                                <div>
                                  <span className="text-gray-600">Base Amount:</span>
                                  <span className="ml-2 font-medium">₹{fee.base_amount.toLocaleString('en-IN')}</span>
                                </div>
                                {fee.adjustment_amount !== 0 && (
                                  <div>
                                    <span className="text-gray-600">Adjustment:</span>
                                    <span className={`ml-2 font-medium ${fee.adjustment_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {fee.adjustment_amount > 0 ? '+' : ''}₹{fee.adjustment_amount.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                )}
                                {fee.late_fee > 0 && (
                                  <div>
                                    <span className="text-gray-600">Late Fee:</span>
                                    <span className="ml-2 font-medium text-red-600">₹{fee.late_fee.toLocaleString('en-IN')}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-600">Paid:</span>
                                  <span className="ml-2 font-medium text-green-600">₹{fee.paid_amount.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  fee.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  fee.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                  fee.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                                </span>
                                <div className="flex gap-2 ml-auto">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadReceipt([fee.id], true)}
                                    disabled={downloading}
                                  >
                                    <FileText size={14} className="mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadReceipt([fee.id], false)}
                                    disabled={downloading}
                                  >
                                    <Download size={14} className="mr-1" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Payment History - Date-wise */}
          {feeStatement.payment_history.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="text-[#2F6FED]" size={20} />
                  Payment History
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {Object.entries(paymentsByDate).map(([date, payments]) => (
                  <div key={date} className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="text-[#2F6FED]" size={18} />
                      <h4 className="text-md font-semibold text-gray-900">{date}</h4>
                      <span className="text-sm text-gray-500">({payments.length} payment{payments.length > 1 ? 's' : ''})</span>
                    </div>
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <motion.div
                          key={payment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h5 className="font-semibold text-gray-900">Receipt: {payment.receipt_no}</h5>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                                  {payment.payment_mode}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-bold text-green-600">
                                ₹{payment.amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                          {payment.allocations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">Allocated to:</p>
                              <div className="space-y-1">
                                {payment.allocations.map((alloc, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">{alloc.fee_name}</span>
                                    <span className="font-medium">₹{alloc.allocated_amount.toLocaleString('en-IN')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/fees/receipts/${payment.id}/download?school_code=${schoolCode}`);
                                    if (response.ok) {
                                      const htmlContent = await response.text();
                                      const newWindow = window.open('', '_blank');
                                      if (newWindow) {
                                        newWindow.document.write(htmlContent);
                                        newWindow.document.close();
                                        setTimeout(() => {
                                          newWindow.print();
                                        }, 500);
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Error viewing receipt:', error);
                                    alert('Failed to open receipt');
                                  }
                                }}
                              >
                                <FileText size={14} className="mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/fees/receipts/${payment.id}/download?school_code=${schoolCode}`);
                                    if (response.ok) {
                                      const htmlContent = await response.text();
                                      const blob = new Blob([htmlContent], { type: 'text/html' });
                                      const url = window.URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `receipt_${payment.receipt_no}.html`;
                                      document.body.appendChild(a);
                                      a.click();
                                      window.URL.revokeObjectURL(url);
                                      document.body.removeChild(a);
                                    }
                                  } catch (error) {
                                    console.error('Error downloading receipt:', error);
                                    alert('Failed to download receipt');
                                  }
                                }}
                              >
                                <Download size={14} className="mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {!selectedStudent && !loading && (
        <Card className="p-12 text-center">
          <Receipt className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">Search for a student to view their fee statement</p>
        </Card>
      )}
    </div>
  );
}
