'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { Library, BookOpen, CheckCircle2, Search, Filter, Clock, XCircle, Tag } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

interface Book {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  edition: string | null;
  section: string | null;
  material_type: string | null;
  total_copies: number;
  available_copies: number;
  is_available: boolean;
}

interface BorrowedBook {
  id: string;
  book_id: string;
  book_title: string;
  book_author: string | null;
  book_isbn: string | null;
  book_edition: string | null;
  accession_number: string | null;
  barcode: string | null;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  is_overdue: boolean;
  fine_amount: number | null;
  fine_reason: string | null;
  notes: string | null;
}

export default function StudentLibraryPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'borrowed'>('all');
  const [filterAvailable, setFilterAvailable] = useState<'all' | 'available' | 'unavailable'>('all');

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchLibraryData(studentData);
    }
  }, []);

  const fetchLibraryData = async (studentData: Student) => {
    try {
      setLoading(true);
      const schoolCode = getString(studentData.school_code);
      const studentId = getString(studentData.id);
      
      if (!schoolCode || !studentId) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/student/library?school_code=${schoolCode}&student_id=${studentId}`
      );

      const result = await response.json();

      if (response.ok && result.data) {
        setBooks(result.data.books || []);
        setBorrowedBooks(result.data.borrowed_books || []);
      } else {
        console.error('Error fetching library data:', result.error);
        setBooks([]);
        setBorrowedBooks([]);
      }
    } catch (error) {
      console.error('Error fetching library data:', error);
      setBooks([]);
      setBorrowedBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (status === 'returned') {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    } else if (isOverdue) {
      return 'bg-red-100 text-red-700 border-red-200';
    } else if (status === 'issued') {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusLabel = (status: string, isOverdue: boolean) => {
    if (status === 'returned') {
      return 'Returned';
    } else if (isOverdue) {
      return 'Overdue';
    } else if (status === 'issued') {
      return 'Issued';
    }
    return status;
  };

  const calculateDaysRemaining = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredBooks = books.filter(book => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!book.title.toLowerCase().includes(searchLower) &&
          !(book.author && book.author.toLowerCase().includes(searchLower)) &&
          !(book.isbn && book.isbn.toLowerCase().includes(searchLower))) {
        return false;
      }
    }
    // Availability filter
    if (filterAvailable === 'available' && !book.is_available) return false;
    if (filterAvailable === 'unavailable' && book.is_available) return false;
    return true;
  });

  const activeBorrowedBooks = borrowedBooks.filter(b => b.status === 'issued');
  const returnedBorrowedBooks = borrowedBooks.filter(b => b.status === 'returned');

  const stats = {
    total_books: books.length,
    available_books: books.filter(b => b.is_available).length,
    borrowed_count: activeBorrowedBooks.length,
    overdue_count: activeBorrowedBooks.filter(b => b.is_overdue).length,
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Library className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Library</h1>
            <p className="text-muted-foreground">Browse books and view your borrowed items</p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card soft-shadow p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Books</p>
          <p className="text-2xl font-bold text-foreground">{stats.total_books}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-emerald-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Available</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.available_books}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-blue-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Borrowed</p>
          <p className="text-2xl font-bold text-blue-600">{stats.borrowed_count}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-red-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{stats.overdue_count}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-input">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'all'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Books ({books.length})
        </button>
        <button
          onClick={() => setActiveTab('borrowed')}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === 'borrowed'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Borrowed Books ({activeBorrowedBooks.length})
          {stats.overdue_count > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {stats.overdue_count}
            </span>
          )}
        </button>
      </div>

      {/* Search and Filter (for All Books tab) */}
      {activeTab === 'all' && (
        <Card className="glass-card soft-shadow">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Search by title, author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted border border-input rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground" size={18} />
              <select
                value={filterAvailable}
                onChange={(e) => setFilterAvailable(e.target.value as typeof filterAvailable)}
                className="px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="all">All Books</option>
                <option value="available">Available Only</option>
                <option value="unavailable">Unavailable Only</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* All Books Tab */}
      {activeTab === 'all' && (
        <>
          {filteredBooks.length === 0 ? (
            <Card className="glass-card soft-shadow">
              <div className="text-center py-12">
                <BookOpen className="mx-auto mb-4 text-muted-foreground" size={48} />
                <p className="text-muted-foreground text-lg">No books found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {books.length === 0 
                    ? 'No books are available in the library yet.'
                    : 'No books match your search criteria.'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBooks.map((book) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="glass-card soft-shadow hover:shadow-md transition-all h-full">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2">{book.title}</h3>
                          {book.author && (
                            <p className="text-sm text-muted-foreground mb-2">by {book.author}</p>
                          )}
                        </div>
                        {book.is_available ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full whitespace-nowrap">
                            Available
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full whitespace-nowrap">
                            Unavailable
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        {book.publisher && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Publisher:</span>
                            <span className="text-foreground">{book.publisher}</span>
                          </div>
                        )}
                        {book.isbn && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">ISBN:</span>
                            <span className="text-foreground font-mono text-xs">{book.isbn}</span>
                          </div>
                        )}
                        {book.edition && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Edition:</span>
                            <span className="text-foreground">{book.edition}</span>
                          </div>
                        )}
                        {book.section && (
                          <div className="flex items-center gap-2">
                            <Tag size={14} className="text-muted-foreground" />
                            <span className="text-muted-foreground">Section:</span>
                            <span className="text-foreground">{book.section}</span>
                          </div>
                        )}
                        {book.material_type && (
                          <div className="flex items-center gap-2">
                            <BookOpen size={14} className="text-muted-foreground" />
                            <span className="text-muted-foreground">Type:</span>
                            <span className="text-foreground">{book.material_type}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-input">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Copies:</span>
                          <span className="font-semibold text-foreground">
                            {book.available_copies} / {book.total_copies} available
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Borrowed Books Tab */}
      {activeTab === 'borrowed' && (
        <>
          {activeBorrowedBooks.length === 0 && returnedBorrowedBooks.length === 0 ? (
            <Card className="glass-card soft-shadow">
              <div className="text-center py-12">
                <BookOpen className="mx-auto mb-4 text-muted-foreground" size={48} />
                <p className="text-muted-foreground text-lg">No borrowed books</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You haven&apos;t borrowed any books from the library yet.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Currently Issued Books */}
              {activeBorrowedBooks.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Clock className="text-blue-600" size={20} />
                    Currently Issued ({activeBorrowedBooks.length})
                  </h2>
                  <div className="space-y-4">
                    {activeBorrowedBooks.map((book) => {
                      const daysRemaining = calculateDaysRemaining(book.due_date);
                      return (
                        <motion.div
                          key={book.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Card className={`glass-card soft-shadow border-l-4 ${
                            book.is_overdue ? 'border-red-500' : daysRemaining <= 3 ? 'border-yellow-500' : 'border-blue-500'
                          }`}>
                            <div className="space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-semibold text-foreground">{book.book_title}</h3>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(book.status, book.is_overdue)}`}>
                                      {getStatusLabel(book.status, book.is_overdue)}
                                    </span>
                                  </div>
                                  {book.book_author && (
                                    <p className="text-sm text-muted-foreground mb-2">by {book.book_author}</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    {book.accession_number && (
                                      <div>
                                        <span className="font-medium">Accession:</span> {book.accession_number}
                                      </div>
                                    )}
                                    {book.book_isbn && (
                                      <div>
                                        <span className="font-medium">ISBN:</span> {book.book_isbn}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-input">
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Issue Date</p>
                                  <p className="text-sm font-semibold text-foreground">
                                    {new Date(book.issue_date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Due Date</p>
                                  <p className={`text-sm font-semibold ${
                                    book.is_overdue ? 'text-red-600' : daysRemaining <= 3 ? 'text-yellow-600' : 'text-foreground'
                                  }`}>
                                    {new Date(book.due_date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Days Remaining</p>
                                  <p className={`text-sm font-semibold flex items-center gap-1 ${
                                    book.is_overdue
                                      ? 'text-red-600'
                                      : daysRemaining <= 3
                                      ? 'text-yellow-600'
                                      : 'text-emerald-600'
                                  }`}>
                                    {book.is_overdue ? (
                                      <>
                                        <XCircle size={14} />
                                        Overdue by {Math.abs(daysRemaining)} days
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 size={14} />
                                        {daysRemaining} days left
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {book.fine_amount && book.fine_amount > 0 && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                    Fine: ₹{book.fine_amount}
                                    {book.fine_reason && ` (${book.fine_reason})`}
                                  </p>
                                </div>
                              )}

                              {book.notes && (
                                <div className="p-3 bg-muted rounded-lg">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                                  <p className="text-sm text-foreground">{book.notes}</p>
                                </div>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Returned Books History */}
              {returnedBorrowedBooks.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-600" size={20} />
                    Returned Books ({returnedBorrowedBooks.length})
                  </h2>
                  <div className="space-y-4">
                    {returnedBorrowedBooks.map((book) => (
                      <motion.div
                        key={book.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className="glass-card soft-shadow border-l-4 border-emerald-500">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-foreground">{book.book_title}</h3>
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(book.status, false)}`}>
                                    Returned
                                  </span>
                                </div>
                                {book.book_author && (
                                  <p className="text-sm text-muted-foreground">by {book.book_author}</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-input text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Issue Date</p>
                                <p className="font-semibold text-foreground">
                                  {new Date(book.issue_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Due Date</p>
                                <p className="font-semibold text-foreground">
                                  {new Date(book.due_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Return Date</p>
                                <p className="font-semibold text-emerald-600">
                                  {book.return_date ? new Date(book.return_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  }) : 'N/A'}
                                </p>
                              </div>
                            </div>

                            {book.fine_amount && book.fine_amount > 0 && (
                              <div className="p-2 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">
                                  Fine paid: ₹{book.fine_amount}
                                  {book.fine_reason && ` (${book.fine_reason})`}
                                </p>
                              </div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
