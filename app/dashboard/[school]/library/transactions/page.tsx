'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  FileText,
  BookOpen,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
} from 'lucide-react';

interface Transaction {
  id: string;
  borrower_type: 'student' | 'staff';
  borrower_id: string;
  borrower: {
    student_name?: string;
    admission_no?: string;
    class?: string;
    section?: string;
    full_name?: string;
    staff_id?: string;
  } | null;
  book_copy: {
    accession_number: string;
    barcode: string | null;
    book: {
      id: string;
      title: string;
      author: string | null;
      edition: string | null;
    };
  } | null;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  fine_amount: number;
  fine_reason: string | null;
  status: 'issued' | 'returned' | 'overdue';
}

interface Book {
  id: string;
  title: string;
  author: string | null;
  available_copies: number;
  copies: Array<{
    id: string;
    accession_number: string;
    status: string;
  }>;
}

interface Student {
  id: string;
  student_name: string;
  admission_no: string;
  class: string;
  section: string | null;
}

interface Staff {
  id: string;
  full_name: string;
  staff_id: string;
}

interface BorrowerInfo {
  maxBooksAllowed: number;
  currentBooksCount: number;
  canBorrow: boolean;
}

export default function LibraryTransactionsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'issue'>('view');
  const [borrowerType, setBorrowerType] = useState<'student' | 'staff'>('student');
  const [selectedBorrower, setSelectedBorrower] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedCopy, setSelectedCopy] = useState<string>('');
  const [borrowerInfo, setBorrowerInfo] = useState<BorrowerInfo | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('school_code', schoolCode);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('borrower_type', typeFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/library/transactions?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setTransactions(result.data);
      } else {
        setError(result.error || 'Failed to fetch transactions');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, statusFilter, typeFilter, startDate, endDate]);

  const fetchAvailableBooks = useCallback(async () => {
    try {
      const response = await fetch(`/api/library/books/available?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setBooks(result.data);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
    }
  }, [schoolCode]);

  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch(`/api/students?school_code=${schoolCode}&status=active`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStudents(result.data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  }, [schoolCode]);

  const fetchStaff = useCallback(async () => {
    try {
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStaff(result.data);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchTransactions();
    fetchAvailableBooks();
    fetchStudents();
    fetchStaff();
  }, [fetchTransactions, fetchAvailableBooks, fetchStudents, fetchStaff]);

  const handleCheckBorrower = async () => {
    if (!selectedBorrower) {
      setError('Please select a borrower');
      return;
    }

    try {
      const response = await fetch(
        `/api/library/borrower/check?school_code=${schoolCode}&borrower_type=${borrowerType}&borrower_id=${selectedBorrower}`
      );
      const result = await response.json();

      if (response.ok && result.data) {
        setBorrowerInfo(result.data);
        if (!result.data.canBorrow) {
          setError(`Maximum books reached (${result.data.maxBooksAllowed}). Please return a book first.`);
        } else {
          setError('');
        }
      } else {
        setError(result.error || 'Failed to check borrower');
      }
    } catch (err) {
      console.error('Error checking borrower:', err);
      setError('Failed to check borrower eligibility');
    }
  };

  const handleBookSelect = (bookId: string) => {
    setSelectedBook(bookId);
    const book = books.find((b) => b.id === bookId);
    if (book && book.copies && book.copies.length > 0) {
      const availableCopy = book.copies.find((c) => c.status === 'available');
      if (availableCopy) {
        setSelectedCopy(availableCopy.id);
      } else {
        setSelectedCopy('');
        setError('No available copies for this book');
      }
    } else {
      setSelectedCopy('');
      setError('No copies available for this book');
    }
  };

  const handleIssueBook = async () => {
    if (!selectedBorrower || !selectedBook || !selectedCopy) {
      setError('Please select borrower, book, and copy');
      return;
    }

    if (borrowerInfo && !borrowerInfo.canBorrow) {
      setError('Borrower has reached maximum books limit');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Get current staff from session (you may need to adjust this)
      const storedStaff = sessionStorage.getItem('staff');
      const staffData = storedStaff ? JSON.parse(storedStaff) : null;

      const response = await fetch('/api/library/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          borrower_type: borrowerType,
          borrower_id: selectedBorrower,
          book_copy_id: selectedCopy,
          book_id: selectedBook,
          issued_by: staffData?.id || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Book issued successfully!');
        setSelectedBorrower('');
        setSelectedBook('');
        setSelectedCopy('');
        setBorrowerInfo(null);
        fetchTransactions();
        fetchAvailableBooks();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to issue book');
      }
    } catch (err) {
      console.error('Error issuing book:', err);
      setError('Failed to issue book');
    } finally {
      setSaving(false);
    }
  };

  const handleReturnBook = async (transactionId: string) => {
    if (!confirm('Are you sure you want to return this book?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const storedStaff = sessionStorage.getItem('staff');
      const staffData = storedStaff ? JSON.parse(storedStaff) : null;

      const response = await fetch(`/api/library/transactions/${transactionId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          returned_by: staffData?.id || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Book returned successfully!');
        fetchTransactions();
        fetchAvailableBooks();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to return book');
      }
    } catch (err) {
      console.error('Error returning book:', err);
      setError('Failed to return book');
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const borrowerName =
        borrowerType === 'student'
          ? transaction.borrower?.student_name?.toLowerCase() || ''
          : transaction.borrower?.full_name?.toLowerCase() || '';
      const bookTitle = transaction.book_copy?.book?.title?.toLowerCase() || '';
      return borrowerName.includes(search) || bookTitle.includes(search);
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="text-indigo-600" size={32} />
            Library Transactions
          </h1>
          <p className="text-gray-600 mt-2">Issue and return books for {schoolCode}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant={activeTab === 'view' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('view')}
          >
            View Transactions
          </Button>
          <Button
            variant={activeTab === 'issue' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('issue')}
          >
            <Plus size={18} className="mr-2" />
            Issue Book
          </Button>
        </div>
      </motion.div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <CheckCircle size={20} />
          {success}
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}

      {activeTab === 'view' ? (
        <>
          {/* Filters */}
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Search borrower or book..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="issued">Issued</option>
                <option value="returned">Returned</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Types</option>
                <option value="student">Students</option>
                <option value="staff">Staff</option>
              </select>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
              />
            </div>
          </Card>

          {/* Transactions Table */}
          <Card>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto mb-4 text-indigo-600" size={32} />
                <p className="text-gray-600">Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-600 text-lg">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Borrower</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Book</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Accession #</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Issue Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Due Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Return Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Fine</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransactions.map((transaction) => {
                      const isOverdue =
                        transaction.status === 'issued' &&
                        new Date(transaction.due_date) < new Date();
                      return (
                        <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm">
                            <div>
                              <div className="font-medium text-gray-900">
                                {borrowerType === 'student'
                                  ? transaction.borrower?.student_name || 'N/A'
                                  : transaction.borrower?.full_name || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {borrowerType === 'student'
                                  ? `${transaction.borrower?.class || ''} ${transaction.borrower?.section || ''}`
                                  : transaction.borrower?.staff_id || ''}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-gray-900">
                              {transaction.book_copy?.book?.title || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {transaction.book_copy?.book?.author || ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                            {transaction.book_copy?.accession_number || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(transaction.issue_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(transaction.due_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {transaction.return_date
                              ? new Date(transaction.return_date).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {transaction.fine_amount > 0 ? (
                              <span className="text-red-600 font-semibold">
                                ₹{transaction.fine_amount.toFixed(2)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.status === 'returned'
                                  ? 'bg-green-100 text-green-800'
                                  : isOverdue
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {isOverdue ? 'Overdue' : transaction.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {transaction.status === 'issued' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReturnBook(transaction.id)}
                                disabled={saving}
                              >
                                Return
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Borrower Type</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="student"
                    checked={borrowerType === 'student'}
                    onChange={(e) => {
                      setBorrowerType(e.target.value as 'student' | 'staff');
                      setSelectedBorrower('');
                      setBorrowerInfo(null);
                    }}
                    className="mr-2"
                  />
                  Student
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="staff"
                    checked={borrowerType === 'staff'}
                    onChange={(e) => {
                      setBorrowerType(e.target.value as 'student' | 'staff');
                      setSelectedBorrower('');
                      setBorrowerInfo(null);
                    }}
                    className="mr-2"
                  />
                  Staff
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select {borrowerType === 'student' ? 'Student' : 'Staff'}
              </label>
              <select
                value={selectedBorrower}
                onChange={(e) => {
                  setSelectedBorrower(e.target.value);
                  setBorrowerInfo(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select {borrowerType === 'student' ? 'Student' : 'Staff'}</option>
                {(borrowerType === 'student' ? students : staff).map((item) => (
                  <option key={item.id} value={item.id}>
                    {borrowerType === 'student'
                      ? `${item.student_name} (${item.admission_no}) - ${item.class}${item.section || ''}`
                      : `${item.full_name} (${item.staff_id})`}
                  </option>
                ))}
              </select>
              {selectedBorrower && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCheckBorrower}
                  className="mt-2"
                >
                  Check Eligibility
                </Button>
              )}
            </div>

            {borrowerInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Borrower Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Max Books:</span>{' '}
                    <span className="font-medium">{borrowerInfo.maxBooksAllowed}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Books:</span>{' '}
                    <span className="font-medium">{borrowerInfo.currentBooksCount}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Can Borrow:</span>{' '}
                    <span
                      className={`font-medium ${borrowerInfo.canBorrow ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {borrowerInfo.canBorrow ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Book</label>
              <select
                value={selectedBook}
                onChange={(e) => handleBookSelect(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Book</option>
                {books
                  .filter((book) => book.available_copies > 0)
                  .map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} by {book.author || 'Unknown'} ({book.available_copies} available)
                    </option>
                  ))}
              </select>
            </div>

            {selectedBook && selectedCopy && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✓ Copy selected and ready to issue
                </p>
              </div>
            )}

            <Button
              onClick={handleIssueBook}
              disabled={saving || !selectedBorrower || !selectedBook || !selectedCopy || (borrowerInfo && !borrowerInfo.canBorrow)}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Issuing...
                </>
              ) : (
                <>
                  <BookOpen size={18} className="mr-2" />
                  Issue Book
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

