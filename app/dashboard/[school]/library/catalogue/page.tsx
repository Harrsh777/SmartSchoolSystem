'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Upload,
} from 'lucide-react';

interface LibrarySection {
  id: string;
  name: string;
}

interface MaterialType {
  id: string;
  name: string;
}

interface Book {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  edition: string | null;
  section: { name: string } | null;
  material_type: { name: string } | null;
  total_copies: number;
  available_copies: number;
  section_id: string | null;
  material_type_id: string | null;
}

interface BookCopy {
  id: string;
  accession_number: string;
  barcode: string | null;
  status: string;
  location?: string | null;
}

export default function LibraryCataloguePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [books, setBooks] = useState<Book[]>([]);
  const [sections, setSections] = useState<LibrarySection[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    publisher: '',
    isbn: '',
    edition: '',
    section_id: '',
    material_type_id: '',
    total_copies: 1,
  });

  const [copyForm, setCopyForm] = useState({
    accession_number: '',
    barcode: '',
    location: '',
    notes: '',
  });

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('school_code', schoolCode);
      if (searchTerm) params.append('search', searchTerm);
      if (sectionFilter) params.append('section_id', sectionFilter);
      if (typeFilter) params.append('material_type_id', typeFilter);

      const response = await fetch(`/api/library/books?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setBooks(result.data);
      } else {
        setError(result.error || 'Failed to fetch books');
      }
    } catch (err) {
      console.error('Error fetching books:', err);
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, searchTerm, sectionFilter, typeFilter]);

  const fetchSections = useCallback(async () => {
    try {
      const response = await fetch(`/api/library/sections?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setSections(result.data);
      }
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  }, [schoolCode]);

  const fetchMaterialTypes = useCallback(async () => {
    try {
      const response = await fetch(`/api/library/material-types?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setMaterialTypes(result.data);
      }
    } catch (err) {
      console.error('Error fetching material types:', err);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchBooks();
    fetchSections();
    fetchMaterialTypes();
  }, [fetchBooks, fetchSections, fetchMaterialTypes]);

  const handleAddBook = () => {
    setEditingBook(null);
    setBookForm({
      title: '',
      author: '',
      publisher: '',
      isbn: '',
      edition: '',
      section_id: '',
      material_type_id: '',
      total_copies: 1,
    });
    setBookModalOpen(true);
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      author: book.author || '',
      publisher: book.publisher || '',
      isbn: book.isbn || '',
      edition: book.edition || '',
      section_id: book.section_id || '',
      material_type_id: book.material_type_id || '',
      total_copies: book.total_copies || 1,
    });
    setBookModalOpen(true);
  };

  const handleSaveBook = async () => {
    if (!bookForm.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const url = editingBook
        ? `/api/library/books/${editingBook.id}`
        : '/api/library/books';

      const method = editingBook ? 'PATCH' : 'POST';

      const body = {
        school_code: schoolCode,
        ...bookForm,
        total_copies: parseInt(String(bookForm.total_copies)) || 1,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(editingBook ? 'Book updated successfully!' : 'Book added successfully!');
        setBookModalOpen(false);
        fetchBooks();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to save book');
      }
    } catch (err) {
      console.error('Error saving book:', err);
      setError('Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book? All copies will be marked as lost.')) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/library/books/${bookId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Book deleted successfully!');
        fetchBooks();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete book');
      }
    } catch (err) {
      console.error('Error deleting book:', err);
      setError('Failed to delete book');
    } finally {
      setSaving(false);
    }
  };

  const handleViewCopies = async (book: Book) => {
    try {
      setSelectedBook(book);
      const response = await fetch(`/api/library/books/${book.id}?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setBookCopies((result.data.copies as BookCopy[]) || []);
        setCopyModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching copies:', err);
      setError('Failed to load book copies');
    }
  };

  const handleAddCopy = () => {
    setCopyForm({
      accession_number: '',
      barcode: '',
      location: '',
      notes: '',
    });
  };

  const handleSaveCopy = async () => {
    if (!copyForm.accession_number.trim()) {
      setError('Accession number is required');
      return;
    }

    if (!selectedBook) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/library/books/copies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          book_id: selectedBook.id,
          accession_number: copyForm.accession_number,
          barcode: copyForm.barcode || null,
          location: copyForm.location || null,
          notes: copyForm.notes || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Copy added successfully!');
        setCopyForm({
          accession_number: '',
          barcode: '',
          location: '',
          notes: '',
        });
        handleViewCopies(selectedBook); // Refresh copies
        fetchBooks(); // Refresh book list
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to add copy');
      }
    } catch (err) {
      console.error('Error saving copy:', err);
      setError('Failed to save copy');
    } finally {
      setSaving(false);
    }
  };

  const filteredBooks = books.filter((book) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        book.title.toLowerCase().includes(search) ||
        (book.author && book.author.toLowerCase().includes(search)) ||
        (book.isbn && book.isbn.toLowerCase().includes(search))
      );
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
            <BookOpen className="text-indigo-600" size={32} />
            Book Catalogue
          </h1>
          <p className="text-gray-600 mt-2">Manage library book inventory for {schoolCode}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => {}}>
            <Upload size={18} className="mr-2" />
            Bulk Upload
          </Button>
          <Button variant="outline" onClick={() => {}}>
            <Download size={18} className="mr-2" />
            Export
          </Button>
          <Button onClick={handleAddBook}>
            <Plus size={18} className="mr-2" />
            Add Book
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

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Material Types</option>
            {materialTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setSectionFilter('');
              setTypeFilter('');
            }}
          >
            <X size={18} className="mr-2" />
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Books Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="animate-spin mx-auto mb-4 text-indigo-600" size={32} />
            <p className="text-gray-600">Loading books...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">No books found</p>
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm || sectionFilter || typeFilter
                ? 'Try adjusting your filters'
                : 'Add your first book to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Author</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ISBN</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Copies</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Available</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{book.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{book.author || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{book.isbn || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{book.section?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{book.material_type?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{book.total_copies || 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          book.available_copies > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {book.available_copies || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewCopies(book)}
                        >
                          <Copy size={14} className="mr-1" />
                          Copies
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditBook(book)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteBook(book.id)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Book Modal */}
      {bookModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingBook ? 'Edit Book' : 'Add New Book'}
                </h2>
                <button
                  onClick={() => setBookModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <Input
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  placeholder="Enter book title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                  <Input
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    placeholder="Enter author name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publisher</label>
                  <Input
                    value={bookForm.publisher}
                    onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                    placeholder="Enter publisher name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ISBN</label>
                  <Input
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    placeholder="Enter ISBN"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Edition</label>
                  <Input
                    value={bookForm.edition}
                    onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                    placeholder="e.g., 1st Edition"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                  <select
                    value={bookForm.section_id}
                    onChange={(e) => setBookForm({ ...bookForm, section_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Material Type</label>
                  <select
                    value={bookForm.material_type_id}
                    onChange={(e) => setBookForm({ ...bookForm, material_type_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Material Type</option>
                    {materialTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Copies</label>
                <Input
                  type="number"
                  value={bookForm.total_copies}
                  onChange={(e) => setBookForm({ ...bookForm, total_copies: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setBookModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveBook} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* View/Add Copies Modal */}
      {copyModalOpen && selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Book Copies</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedBook.title}</p>
                </div>
                <button
                  onClick={() => {
                    setCopyModalOpen(false);
                    setSelectedBook(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Existing Copies</h3>
                <Button size="sm" onClick={handleAddCopy}>
                  <Plus size={14} className="mr-1" />
                  Add Copy
                </Button>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-4 gap-4">
                  <Input
                    placeholder="Accession Number *"
                    value={copyForm.accession_number}
                    onChange={(e) => setCopyForm({ ...copyForm, accession_number: e.target.value })}
                  />
                  <Input
                    placeholder="Barcode"
                    value={copyForm.barcode}
                    onChange={(e) => setCopyForm({ ...copyForm, barcode: e.target.value })}
                  />
                  <Input
                    placeholder="Location"
                    value={copyForm.location}
                    onChange={(e) => setCopyForm({ ...copyForm, location: e.target.value })}
                  />
                  <Button onClick={handleSaveCopy} disabled={saving || !copyForm.accession_number.trim()}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Accession #</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Barcode</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookCopies.map((copy) => (
                      <tr key={copy.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900 font-mono">{copy.accession_number}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 font-mono">{copy.barcode || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              copy.status === 'available'
                                ? 'bg-green-100 text-green-800'
                                : copy.status === 'issued'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {copy.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{copy.location || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

