'use client';

import { use, useState, useEffect } from 'react';
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
  payment_history: Array<{
    receipt_no: string;
    payment_date: string;
    total_amount: number;
    payment_mode: string;
  }>;
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchStudents();
    } else {
      setStudents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, schoolCode]);

  const searchStudents = async () => {
    try {
      const response = await fetch(`/api/students?school_code=${schoolCode}&search=${encodeURIComponent(searchQuery)}`);
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
            <Receipt className="text-[#2F6FED]" size={32} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-[#2F6FED] rounded-lg">
                <Receipt className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{feeStatement.student.student_name}</h3>
                <p className="text-sm text-gray-600">{feeStatement.student.admission_no} • {feeStatement.student.class}-{feeStatement.student.section}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Total Due</p>
                <p className="text-xl font-bold text-gray-900">₹{feeStatement.summary.total_due.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Total Paid</p>
                <p className="text-xl font-bold text-green-600">₹{feeStatement.summary.total_paid.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Pending</p>
                <p className="text-xl font-bold text-orange-600">₹{feeStatement.summary.total_pending.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Overdue</p>
                <p className="text-xl font-bold text-red-600">₹{feeStatement.summary.overdue_amount.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </Card>

          {/* Installments */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Fee Installments</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Export to PDF
                  alert('Export to PDF - Coming soon');
                }}
              >
                <Download size={16} className="mr-2" />
                Export PDF
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Component</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Installment</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Due Date</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Discount</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Fine</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Paid</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pending</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {feeStatement.installments.map((inst) => (
                    <tr key={inst.id} className={inst.is_overdue ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{inst.fee_component.component_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">#{inst.installment_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(inst.due_date).toLocaleDateString()}
                        </div>
                        {inst.is_overdue && (
                          <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                            <Clock size={12} />
                            {inst.days_overdue} days overdue
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">₹{inst.amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">₹{inst.discount_amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">₹{inst.fine_amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">₹{inst.paid_amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600 font-semibold">₹{inst.pending_amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          inst.status === 'paid' ? 'bg-green-100 text-green-800' :
                          inst.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          inst.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Payment History */}
          {feeStatement.payment_history.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Receipt No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment Date</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment Mode</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {feeStatement.payment_history.map((payment) => (
                      <tr key={payment.receipt_no} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.receipt_no}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(payment.payment_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">₹{payment.total_amount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                            {payment.payment_mode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Open receipt
                              alert(`Receipt: ${payment.receipt_no}`);
                            }}
                          >
                            <Download size={14} className="mr-1" />
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {!selectedStudent && (
        <Card className="p-12 text-center">
          <Receipt className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">Search for a student to view their fee statement</p>
        </Card>
      )}
    </div>
  );
}
