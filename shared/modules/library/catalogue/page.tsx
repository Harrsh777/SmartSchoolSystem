'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
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
  status: string;
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
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    publisher: '',
    isbn: '',
    edition: '',
    section_id: '',
    material_type_id: '',
    section_other: '',       // type section name when not in dropdown
    material_type_other: '', // type material type when not in dropdown
    image_url: '',           // book cover/image URL
    total_copies: 1,
  });

  const [copyForm, setCopyForm] = useState({
    accession_number: '',
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
      section_other: '',
      material_type_other: '',
      image_url: '',
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
      section_other: '',
      material_type_other: '',
      image_url: (book as { image_url?: string }).image_url || '',
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

      let sectionId = bookForm.section_id || null;
      let materialTypeId = bookForm.material_type_id || null;

      // If user typed a section name (not in dropdown), create section first
      if (!sectionId && bookForm.section_other?.trim()) {
        const sectionRes = await fetch('/api/library/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            name: bookForm.section_other.trim(),
            material_type: bookForm.material_type_other?.trim() || 'General',
          }),
        });
        const sectionResult = await sectionRes.json();
        if (sectionRes.ok && sectionResult.data?.id) {
          sectionId = sectionResult.data.id;
          setSections((prev) => [...prev, { id: sectionResult.data.id, name: bookForm.section_other.trim() }]);
        } else {
          setError(sectionResult.error || 'Failed to create section');
          setSaving(false);
          return;
        }
      }

      // If user typed a material type (not in dropdown), create material type first
      if (!materialTypeId && bookForm.material_type_other?.trim()) {
        const typeRes = await fetch('/api/library/material-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            name: bookForm.material_type_other.trim(),
          }),
        });
        const typeResult = await typeRes.json();
        if (typeRes.ok && typeResult.data?.id) {
          materialTypeId = typeResult.data.id;
          setMaterialTypes((prev) => [...prev, { id: typeResult.data.id, name: bookForm.material_type_other.trim() }]);
        } else {
          setError(typeResult.error || 'Failed to create material type');
          setSaving(false);
          return;
        }
      }

      const url = editingBook
        ? `/api/library/books/${editingBook.id}`
        : '/api/library/books';

      const method = editingBook ? 'PATCH' : 'POST';

      const body = {
        school_code: schoolCode,
        title: bookForm.title,
        author: bookForm.author || undefined,
        publisher: bookForm.publisher || undefined,
        isbn: bookForm.isbn || undefined,
        edition: bookForm.edition || undefined,
        section_id: sectionId || undefined,
        material_type_id: materialTypeId || undefined,
        image_url: bookForm.image_url?.trim() || undefined,
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
        fetchSections();
        fetchMaterialTypes();
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
      notes: '',
    });
  };

  const parseCsvRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && c === ',') {
        out.push(cur.trim());
        cur = '';
        continue;
      }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  };

  const normHeader = (h: string) =>
    h
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/^["']|["']$/g, '');

  const resolveOrCreateSection = async (
    name: string,
    sectionCache: Map<string, string>
  ): Promise<string | null> => {
    const key = name.toLowerCase();
    if (sectionCache.has(key)) return sectionCache.get(key)!;
    const existing = sections.find((s) => s.name.toLowerCase() === key);
    if (existing) {
      sectionCache.set(key, existing.id);
      return existing.id;
    }
    const sectionRes = await fetch('/api/library/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_code: schoolCode,
        name: name.trim(),
        material_type: 'General',
      }),
    });
    const sectionResult = await sectionRes.json();
    if (sectionRes.ok && sectionResult.data?.id) {
      sectionCache.set(key, sectionResult.data.id);
      setSections((prev) => [...prev, { id: sectionResult.data.id, name: name.trim() }]);
      return sectionResult.data.id;
    }
    return null;
  };

  const resolveOrCreateMaterialType = async (
    name: string,
    typeCache: Map<string, string>
  ): Promise<string | null> => {
    const key = name.toLowerCase();
    if (typeCache.has(key)) return typeCache.get(key)!;
    const existing = materialTypes.find((t) => t.name.toLowerCase() === key);
    if (existing) {
      typeCache.set(key, existing.id);
      return existing.id;
    }
    const typeRes = await fetch('/api/library/material-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_code: schoolCode,
        name: name.trim(),
      }),
    });
    const typeResult = await typeRes.json();
    if (typeRes.ok && typeResult.data?.id) {
      typeCache.set(key, typeResult.data.id);
      setMaterialTypes((prev) => [...prev, { id: typeResult.data.id, name: name.trim() }]);
      return typeResult.data.id;
    }
    return null;
  };

  const handleBulkFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setBulkUploading(true);
      setError('');
      setSuccess('');
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) {
        setError('The file is empty.');
        return;
      }

      const headers = parseCsvRow(lines[0]).map(normHeader);
      const titleIdx = headers.findIndex((h) => h === 'title');
      if (titleIdx < 0) {
        setError('The first row must be headers and include a column named "title".');
        return;
      }

      const col = (names: string[]) => {
        for (const n of names) {
          const i = headers.indexOf(normHeader(n));
          if (i >= 0) return i;
        }
        return -1;
      };

      const authorIdx = col(['author']);
      const publisherIdx = col(['publisher']);
      const isbnIdx = col(['isbn']);
      const editionIdx = col(['edition']);
      const copiesIdx = col(['copies', 'total_copies']);
      const sectionIdx = col(['section', 'section_name']);
      const typeIdx = col(['material_type', 'type', 'material_type_name']);

      const sectionCache = new Map<string, string>();
      const typeCache = new Map<string, string>();
      let added = 0;
      const rowErrors: string[] = [];

      for (let r = 1; r < lines.length; r++) {
        const cells = parseCsvRow(lines[r]);
        const title = cells[titleIdx]?.trim();
        if (!title) continue;

        let sectionId: string | null = null;
        let materialTypeId: string | null = null;
        if (sectionIdx >= 0 && cells[sectionIdx]?.trim()) {
          sectionId = await resolveOrCreateSection(cells[sectionIdx].trim(), sectionCache);
        }
        if (typeIdx >= 0 && cells[typeIdx]?.trim()) {
          materialTypeId = await resolveOrCreateMaterialType(cells[typeIdx].trim(), typeCache);
        }

        const totalCopiesRaw = copiesIdx >= 0 ? cells[copiesIdx] : '';
        const totalCopies = Math.max(1, Math.floor(Number(totalCopiesRaw)) || 1);

        const res = await fetch('/api/library/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            title,
            author: authorIdx >= 0 && cells[authorIdx]?.trim() ? cells[authorIdx].trim() : undefined,
            publisher: publisherIdx >= 0 && cells[publisherIdx]?.trim() ? cells[publisherIdx].trim() : undefined,
            isbn: isbnIdx >= 0 && cells[isbnIdx]?.trim() ? cells[isbnIdx].trim() : undefined,
            edition: editionIdx >= 0 && cells[editionIdx]?.trim() ? cells[editionIdx].trim() : undefined,
            section_id: sectionId || undefined,
            material_type_id: materialTypeId || undefined,
            total_copies: totalCopies,
          }),
        });
        const result = await res.json();
        if (res.ok) {
          added += 1;
        } else {
          rowErrors.push(`Row ${r + 1} (${title}): ${result.error || result.details || 'failed'}`);
        }
      }

      if (added > 0) {
        setSuccess(`Imported ${added} book(s).`);
        setBulkModalOpen(false);
        fetchBooks();
        fetchSections();
        fetchMaterialTypes();
        setTimeout(() => setSuccess(''), 5000);
      }
      if (rowErrors.length) {
        setError(rowErrors.slice(0, 5).join(' ') + (rowErrors.length > 5 ? ` …and ${rowErrors.length - 5} more` : ''));
      } else if (added === 0) {
        setError('No rows were imported. Check that each data row has a title.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to read or import the file.');
    } finally {
      setBulkUploading(false);
    }
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
          notes: copyForm.notes || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Copy added successfully!');
        setCopyForm({
          accession_number: '',
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
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg">
                <BookOpen className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Book Catalogue</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage library book inventory for {schoolCode}</p>
              </div>
            </div>
        <div className="flex gap-3">
          <input
            ref={bulkFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleBulkFileSelected}
          />
          <Button
            variant="outline"
            onClick={() => setBulkModalOpen(true)}
            disabled={bulkUploading}
          >
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

        {/* Filters */}
        <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search by title, author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <div className="flex gap-4 md:col-span-3 md:grid md:grid-cols-3 md:gap-4">
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="flex-1 w-full min-w-0 h-11 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] text-sm"
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
                className="flex-1 w-full min-w-0 h-11 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] text-sm"
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
  className="flex items-center justify-center gap-2 h-11 px-4 whitespace-nowrap border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-600 dark:hover:bg-gray-700/50"
>
  <X size={18} />
  <span>Clear Filters</span>
</Button>
            </div>
          </div>
        </Card>

        {/* Books Table */}
        <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="animate-spin mx-auto mb-4 text-[#5A7A95]" size={32} />
              <p className="text-gray-600 dark:text-gray-400">Loading books...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto mb-4 text-gray-400" size={64} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Books Found</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {searchTerm || sectionFilter || typeFilter
                  ? 'Try adjusting your filters'
                  : 'Add your first book to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white">
                <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Author</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">ISBN</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Section</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Copies</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Available</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredBooks.map((book) => (
                      <tr key={book.id} className="hover:bg-[#5A7A95]/5 dark:hover:bg-[#6B9BB8]/10 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{book.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{book.author || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{book.isbn || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{book.section?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{book.material_type?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{book.total_copies || 0}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              book.available_copies > 0
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
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
                              className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10"
                            >
                              <Copy size={14} className="mr-1" />
                              Copies
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditBook(book)}
                              className="border-[#6B9BB8]/30 text-[#6B9BB8] hover:bg-[#6B9BB8]/10"
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteBook(book.id)}
                              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Book image URL</label>
                <Input
                  value={bookForm.image_url}
                  onChange={(e) => setBookForm({ ...bookForm, image_url: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                  <select
                    value={bookForm.section_id}
                    onChange={(e) => setBookForm({ ...bookForm, section_id: e.target.value, section_other: e.target.value ? '' : bookForm.section_other })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={bookForm.section_other}
                    onChange={(e) => setBookForm({ ...bookForm, section_other: e.target.value })}
                    placeholder="Or type section name (e.g. Fiction, Reference)"
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Material Type</label>
                  <select
                    value={bookForm.material_type_id}
                    onChange={(e) => setBookForm({ ...bookForm, material_type_id: e.target.value, material_type_other: e.target.value ? '' : bookForm.material_type_other })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Material Type</option>
                    {materialTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={bookForm.material_type_other}
                    onChange={(e) => setBookForm({ ...bookForm, material_type_other: e.target.value })}
                    placeholder="Or type material type (e.g. Book, Magazine)"
                    className="mt-2"
                  />
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

      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#1e293b] rounded-lg shadow-xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bulk upload (CSV)</h2>
              <button
                type="button"
                onClick={() => !bulkUploading && setBulkModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Use a UTF-8 CSV with a header row. Required column: <span className="font-mono">title</span>.
              Optional: <span className="font-mono">author</span>, <span className="font-mono">publisher</span>,{' '}
              <span className="font-mono">isbn</span>, <span className="font-mono">edition</span>,{' '}
              <span className="font-mono">copies</span> (defaults to 1), <span className="font-mono">section</span>,{' '}
              <span className="font-mono">material_type</span> (matched or created by name).
              Columns named <span className="font-mono">barcode</span> or <span className="font-mono">location</span> are not imported.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={bulkUploading}
                onClick={() => bulkFileInputRef.current?.click()}
              >
                {bulkUploading ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload size={18} className="mr-2" />
                    Choose CSV file
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" disabled={bulkUploading} onClick={() => setBulkModalOpen(false)}>
                Cancel
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <Input
                    placeholder="Accession Number *"
                    value={copyForm.accession_number}
                    onChange={(e) => setCopyForm({ ...copyForm, accession_number: e.target.value })}
                  />
                  <Input
                    placeholder="Notes (optional)"
                    value={copyForm.notes}
                    onChange={(e) => setCopyForm({ ...copyForm, notes: e.target.value })}
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
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookCopies.map((copy) => (
                      <tr key={copy.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900 font-mono">{copy.accession_number}</td>
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
    </div>
  );
}

