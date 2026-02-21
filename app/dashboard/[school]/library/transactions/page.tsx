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
  ArrowLeft,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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

  // Issue tab: student filters (class & section)
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilterStudent, setSectionFilterStudent] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  // Issue tab: book filters
  const [bookSectionFilter, setBookSectionFilter] = useState('');
  const [bookTypeFilter, setBookTypeFilter] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [classes, setClasses] = useState<Array<{ class: string; section: string; academic_year: string | null }>>([]);
  const [librarySections, setLibrarySections] = useState<Array<{ id: string; name: string }>>([]);
  const [libraryMaterialTypes, setLibraryMaterialTypes] = useState<Array<{ id: string; name: string }>>([]);

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
      const params = new URLSearchParams();
      params.append('school_code', schoolCode);
      if (bookSectionFilter) params.append('section_id', bookSectionFilter);
      if (bookTypeFilter) params.append('material_type_id', bookTypeFilter);
      if (bookSearch) params.append('search', bookSearch);
      const response = await fetch(`/api/library/books?${params.toString()}`);
      const result = await response.json();
      if (response.ok && result.data) {
        const allBooks = result.data as Array<{ id: string; title: string; author: string | null; available_copies: number; copies?: Array<{ id: string; accession_number: string; status: string }> }>;
        const withAvailable = allBooks
          .filter((b) => (b.available_copies ?? 0) > 0)
          .map((b) => ({ ...b, copies: b.copies ?? [] })) as Book[];
        setBooks(withAvailable);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
    }
  }, [schoolCode, bookSectionFilter, bookTypeFilter, bookSearch]);

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('school_code', schoolCode);
      params.append('status', 'active');
      if (classFilter) params.append('class', classFilter);
      if (sectionFilterStudent) params.append('section', sectionFilterStudent);
      const response = await fetch(`/api/students?${params.toString()}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStudents(result.data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  }, [schoolCode, classFilter, sectionFilterStudent]);

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

  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  }, [schoolCode]);

  const fetchLibrarySectionsAndTypes = useCallback(async () => {
    try {
      const [secRes, typeRes] = await Promise.all([
        fetch(`/api/library/sections?school_code=${schoolCode}`),
        fetch(`/api/library/material-types?school_code=${schoolCode}`),
      ]);
      const secData = await secRes.json();
      const typeData = await typeRes.json();
      if (secRes.ok && secData.data) setLibrarySections(secData.data);
      if (typeRes.ok && typeData.data) setLibraryMaterialTypes(typeData.data);
    } catch (err) {
      console.error('Error fetching library sections/types:', err);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchTransactions();
    fetchAvailableBooks();
    fetchStudents();
    fetchStaff();
    fetchClasses();
    fetchLibrarySectionsAndTypes();
  }, [fetchTransactions, fetchAvailableBooks, fetchStudents, fetchStaff, fetchClasses, fetchLibrarySectionsAndTypes]);

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
    setError('');
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

  // When book list changes (e.g. filters), clear selection if selected book no longer in list
  useEffect(() => {
    if (selectedBook && activeTab === 'issue' && !books.some((b) => b.id === selectedBook)) {
      setSelectedBook('');
      setSelectedCopy('');
    }
  }, [books, selectedBook, activeTab]);

  const uniqueClasses = [...new Set(classes.map((c) => c.class).filter(Boolean))].sort();
  const uniqueSections = [...new Set(classes.map((c) => c.section).filter(Boolean))].sort();
  const filteredStaff = staffSearch.trim()
    ? staff.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
          s.staff_id?.toLowerCase().includes(staffSearch.toLowerCase())
      )
    : staff;

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
        const errorMessage = result.error || 'Failed to issue book';
        const details = result.details ? `\n\nDetails: ${result.details}` : '';
        setError(`${errorMessage}${details}`);
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
        const errorMessage = result.error || 'Failed to return book';
        const details = result.details ? `\n\nDetails: ${result.details}` : '';
        setError(`${errorMessage}${details}`);
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
        transaction.borrower_type === 'student'
          ? transaction.borrower?.student_name?.toLowerCase() || ''
          : transaction.borrower?.full_name?.toLowerCase() || '';
      const bookTitle = transaction.book_copy?.book?.title?.toLowerCase() || '';
      return borrowerName.includes(search) || bookTitle.includes(search);
    }
    return true;
  });

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#5A7A95] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5EFEB] dark:bg-[#0f172a]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/library`)}
                className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg">
                <FileText className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Library Transactions</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Issue and return books for {schoolCode}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'view' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('view')}
                className={activeTab === 'view' ? 'bg-[#5A7A95] hover:bg-[#4a6a85]' : ''}
              >
                View Transactions
              </Button>
              <Button
                variant={activeTab === 'issue' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('issue')}
                className={activeTab === 'issue' ? 'bg-[#5A7A95] hover:bg-[#4a6a85]' : ''}
              >
                <Plus size={18} className="mr-2" />
                Issue Book
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Success/Error Messages */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3"
          >
            <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            <p className="text-green-800 dark:text-green-300 text-sm">{success}</p>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-600 dark:text-red-400 hover:text-red-800">
              <X size={18} />
            </button>
          </motion.div>
        )}

        {activeTab === 'view' ? (
          <>
            {/* Filters */}
            <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8]"
                >
                  <option value="all">All Status</option>
                  <option value="issued">Issued</option>
                  <option value="returned">Returned</option>
                  <option value="overdue">Overdue</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8]"
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
                  className="w-full"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End Date"
                  className="w-full"
                />
              </div>
            </Card>

            {/* Transactions Table */}
            <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 overflow-hidden">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="animate-spin mx-auto mb-4 text-[#5A7A95]" size={32} />
                  <p className="text-gray-600 dark:text-gray-400">Loading transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto mb-4 text-gray-400" size={64} />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Transactions Found</h3>
                  <p className="text-gray-600 dark:text-gray-400">No transactions match your search criteria</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Borrower</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Book</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Accession #</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Issue Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Due Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Return Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Fine</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredTransactions.map((transaction) => {
                        const isOverdue =
                          transaction.status === 'issued' &&
                          new Date(transaction.due_date) < new Date();
                        return (
                          <tr key={transaction.id} className="hover:bg-[#5A7A95]/5 dark:hover:bg-[#6B9BB8]/10 transition-colors">
                            <td className="px-4 py-3 text-sm">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {transaction.borrower_type === 'student'
                                    ? transaction.borrower?.student_name || 'N/A'
                                    : transaction.borrower?.full_name || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {transaction.borrower_type === 'student'
                                    ? `${transaction.borrower?.class || ''} ${transaction.borrower?.section || ''}`
                                    : transaction.borrower?.staff_id || ''}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {transaction.book_copy?.book?.title || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {transaction.book_copy?.book?.author || ''}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                              {transaction.book_copy?.accession_number || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {new Date(transaction.issue_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {new Date(transaction.due_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {transaction.return_date
                                ? new Date(transaction.return_date).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {transaction.fine_amount > 0 ? (
                                <span className="text-red-600 dark:text-red-400 font-semibold">
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
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : isOverdue
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-[#5A7A95]/10 text-[#5A7A95] dark:bg-[#6B9BB8]/20 dark:text-[#6B9BB8]'
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
                                  className="border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
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
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
            <div className="space-y-8">
              {/* Borrower Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Borrower Type</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="student"
                      checked={borrowerType === 'student'}
                      onChange={(e) => {
                        setBorrowerType(e.target.value as 'student' | 'staff');
                        setSelectedBorrower('');
                        setBorrowerInfo(null);
                      }}
                      className="text-[#5A7A95] focus:ring-[#5A7A95]"
                    />
                    <span className="text-gray-900 dark:text-white">Student</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="staff"
                      checked={borrowerType === 'staff'}
                      onChange={(e) => {
                        setBorrowerType(e.target.value as 'student' | 'staff');
                        setSelectedBorrower('');
                        setBorrowerInfo(null);
                      }}
                      className="text-[#5A7A95] focus:ring-[#5A7A95]"
                    />
                    <span className="text-gray-900 dark:text-white">Staff</span>
                  </label>
                </div>
              </div>

              {/* Select Borrower: Class & Section (students) or Search (staff) */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2">
                  {borrowerType === 'student' ? 'Select Student' : 'Select Staff'}
                </h3>

                {borrowerType === 'student' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Class</label>
                        <select
                          value={classFilter}
                          onChange={(e) => {
                            setClassFilter(e.target.value);
                            setSelectedBorrower('');
                            setBorrowerInfo(null);
                          }}
                          className="w-full h-11 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] text-sm"
                        >
                          <option value="">All Classes</option>
                          {uniqueClasses.map((cls) => (
                            <option key={cls} value={cls}>
                              {cls}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Section</label>
                        <select
                          value={sectionFilterStudent}
                          onChange={(e) => {
                            setSectionFilterStudent(e.target.value);
                            setSelectedBorrower('');
                            setBorrowerInfo(null);
                          }}
                          className="w-full h-11 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] text-sm"
                        >
                          <option value="">All Sections</option>
                          {uniqueSections.map((sec) => (
                            <option key={sec} value={sec}>
                              {sec}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Student</label>
                      <select
                        value={selectedBorrower}
                        onChange={(e) => {
                          setSelectedBorrower(e.target.value);
                          setBorrowerInfo(null);
                        }}
                        className="w-full h-11 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] text-sm"
                      >
                        <option value="">
                          {students.length === 0 ? 'No students (set Class/Section to load)' : 'Select Student'}
                        </option>
                        {students.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.student_name} ({item.admission_no}) — {item.class}{item.section || ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search by name or ID</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                          placeholder="Type name or staff ID..."
                          value={staffSearch}
                          onChange={(e) => setStaffSearch(e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Staff</label>
                      <select
                        value={selectedBorrower}
                        onChange={(e) => {
                          setSelectedBorrower(e.target.value);
                          setBorrowerInfo(null);
                        }}
                        className="w-full h-11 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] text-sm"
                      >
                        <option value="">
                          {filteredStaff.length === 0 ? 'No staff match' : 'Select Staff'}
                        </option>
                        {filteredStaff.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.full_name} ({item.staff_id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {selectedBorrower && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCheckBorrower}
                    className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10"
                  >
                    Check Eligibility
                  </Button>
                )}
              </div>

              {borrowerInfo && (
                <div className="bg-gradient-to-r from-[#5A7A95]/10 via-[#6B9BB8]/10 to-[#7DB5D3]/10 dark:from-[#5A7A95]/20 dark:via-[#6B9BB8]/20 dark:to-[#7DB5D3]/20 border-2 border-[#5A7A95]/30 dark:border-[#6B9BB8]/30 rounded-xl p-4">
                  <h3 className="font-semibold text-[#5A7A95] dark:text-[#6B9BB8] mb-3">Borrower Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Max Books:</span>{' '}
                      <span className="font-bold text-[#5A7A95] dark:text-[#6B9BB8]">{borrowerInfo.maxBooksAllowed}</span>
                    </div>
                    <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Current Books:</span>{' '}
                      <span className="font-bold text-[#5A7A95] dark:text-[#6B9BB8]">{borrowerInfo.currentBooksCount}</span>
                    </div>
                    <div className="col-span-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Can Borrow:</span>{' '}
                      <span
                        className={`font-bold ${borrowerInfo.canBorrow ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {borrowerInfo.canBorrow ? 'Yes ✓' : 'No ✗'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Select Book: filters + dropdown */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2">
                  Select Book
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Section</label>
                    <select
                      value={bookSectionFilter}
                      onChange={(e) => {
                        setBookSectionFilter(e.target.value);
                        setSelectedBook('');
                        setSelectedCopy('');
                      }}
                      className="w-full h-11 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] text-sm"
                    >
                      <option value="">All Sections</option>
                      {librarySections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Material Type</label>
                    <select
                      value={bookTypeFilter}
                      onChange={(e) => {
                        setBookTypeFilter(e.target.value);
                        setSelectedBook('');
                        setSelectedCopy('');
                      }}
                      className="w-full h-11 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] text-sm"
                    >
                      <option value="">All Material Types</option>
                      {libraryMaterialTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search book</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        placeholder="Title, author, ISBN..."
                        value={bookSearch}
                        onChange={(e) => {
                          setBookSearch(e.target.value);
                          setSelectedBook('');
                          setSelectedCopy('');
                        }}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Book</label>
                  <select
                    value={selectedBook}
                    onChange={(e) => handleBookSelect(e.target.value)}
                    className="w-full h-11 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] text-sm"
                  >
                    <option value="">
                      {books.length === 0 ? 'No available books (try changing filters)' : 'Select Book'}
                    </option>
                    {books
                      .filter((book) => book.available_copies > 0)
                      .map((book) => (
                        <option key={book.id} value={book.id}>
                          {book.title} — {book.author || 'Unknown'} ({book.available_copies} available)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {selectedBook && selectedCopy && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                    <CheckCircle size={16} />
                    Copy selected and ready to issue
                  </p>
                </div>
              )}

<Button
  onClick={handleIssueBook}
  disabled={
    saving ||
    !selectedBorrower ||
    !selectedBook ||
    !selectedCopy ||
    (borrowerInfo ? !borrowerInfo.canBorrow : false)
  }
  className="w-[150px] h-9 flex items-center justify-center gap-2 whitespace-nowrap bg-[#5A7A95] hover:bg-[#4a6a85] disabled:opacity-50 text-sm font-medium"
>
  {saving ? (
    <>
      <Loader2 size={16} className="animate-spin" />
      <span>Issuing...</span>
    </>
  ) : (
    <>
      <BookOpen size={16} />
      <span>Issue Book</span>
    </>
  )}
</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

