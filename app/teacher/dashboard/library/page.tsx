'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { Library, Search, Filter, Tag, BookOpen } from 'lucide-react';
import type { Staff } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

interface Book {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  edition: string | null;
  section?: { name?: string } | string | null;
  material_type?: { name?: string } | string | null;
  total_copies: number;
  available_copies: number;
}

export default function TeacherLibraryPage() {
  const [, setTeacher] = useState<Staff | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAvailable, setFilterAvailable] = useState<'all' | 'available' | 'unavailable'>('all');

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchBooks(teacherData);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchBooks = async (teacherData: Staff) => {
    try {
      setLoading(true);
      const schoolCode = getString((teacherData as unknown as { school_code?: string }).school_code);
      if (!schoolCode) {
        setLoading(false);
        return;
      }
      const response = await fetch(`/api/library/books?school_code=${encodeURIComponent(schoolCode)}`);
      const result = await response.json();
      if (response.ok && result.data) {
        const data = result.data as Book[];
        setBooks(
          data.map((b) => ({
            ...b,
            total_copies: (b as Book).total_copies ?? 0,
            available_copies: (b as Book).available_copies ?? 0,
          }))
        );
      } else {
        console.error('Error fetching books:', result.error);
        setBooks([]);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter((book) => {
    const query = searchTerm.toLowerCase();
    if (query) {
      const title = (book.title || '').toLowerCase();
      const author = (book.author || '').toLowerCase();
      const isbn = (book.isbn || '').toLowerCase();
      if (!title.includes(query) && !author.includes(query) && !isbn.includes(query)) {
        return false;
      }
    }
    if (filterAvailable === 'available' && book.available_copies <= 0) return false;
    if (filterAvailable === 'unavailable' && book.available_copies > 0) return false;
    return true;
  });

  const stats = {
    total: books.length,
    available: books.filter((b) => b.available_copies > 0).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Library className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Library</h1>
            <p className="text-gray-600">View all books available in your school library</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Books</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card className="p-4 border-l-4 border-emerald-500">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Available</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.available}</p>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-500" size={18} />
            <select
              value={filterAvailable}
              onChange={(e) => setFilterAvailable(e.target.value as typeof filterAvailable)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All books</option>
              <option value="available">Available only</option>
              <option value="unavailable">Unavailable only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <BookOpen className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">
              {books.length === 0 ? 'No books have been added to the library yet.' : 'No books match your search or filters.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => {
            const sectionName =
              typeof book.section === 'string'
                ? book.section
                : (book.section as { name?: string })?.name ?? null;
            const typeName =
              typeof book.material_type === 'string'
                ? book.material_type
                : (book.material_type as { name?: string })?.name ?? null;

            return (
              <motion.div key={book.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-4 h-full flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{book.title}</h3>
                        {book.author && (
                          <p className="text-sm text-gray-600">by {book.author}</p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          book.available_copies > 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {book.available_copies > 0 ? 'Available' : 'Unavailable'}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-700">
                      {book.publisher && (
                        <div className="flex gap-2">
                          <span className="text-gray-500">Publisher:</span>
                          <span>{book.publisher}</span>
                        </div>
                      )}
                      {book.isbn && (
                        <div className="flex gap-2">
                          <span className="text-gray-500">ISBN:</span>
                          <span className="font-mono text-xs">{book.isbn}</span>
                        </div>
                      )}
                      {book.edition && (
                        <div className="flex gap-2">
                          <span className="text-gray-500">Edition:</span>
                          <span>{book.edition}</span>
                        </div>
                      )}
                      {sectionName && (
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-gray-500" />
                          <span className="text-gray-500">Section:</span>
                          <span>{sectionName}</span>
                        </div>
                      )}
                      {typeName && (
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-gray-500" />
                          <span className="text-gray-500">Type:</span>
                          <span>{typeName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-200 text-sm flex items-center justify-between">
                    <span className="text-gray-500">Copies:</span>
                    <span className="font-semibold text-gray-900">
                      {book.available_copies} / {book.total_copies} available
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

