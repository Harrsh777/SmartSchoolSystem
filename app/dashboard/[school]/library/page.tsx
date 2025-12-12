'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { mockLibraryBooks, mockLibraryIssues } from '@/lib/demoData';
import { Library, BookOpen, BookCheck, Search } from 'lucide-react';

export default function LibraryPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  use(params); // school param available if needed
  const books = mockLibraryBooks;
  const issues = mockLibraryIssues;

  const stats = {
    totalBooks: books.length,
    availableBooks: books.filter(b => b.status === 'Available').length,
    issuedBooks: books.filter(b => b.status === 'Issued').length,
    totalIssues: issues.length,
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Library Management</h1>
            <p className="text-gray-600">Manage books and track library resources</p>
          </div>
          <button className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            + Add Book
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Library className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Books</p>
                <p className="text-2xl font-bold text-black">{stats.totalBooks}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <BookOpen className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-black">{stats.availableBooks}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-orange-500 p-3 rounded-lg">
                <BookCheck className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Issued</p>
                <p className="text-2xl font-bold text-black">{stats.issuedBooks}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <Library className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Issues</p>
                <p className="text-2xl font-bold text-black">{issues.filter(i => i.status === 'Issued').length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Books List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-black">Books Catalog</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search books..."
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Title</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Author</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Category</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Available</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Total</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book, index) => (
                  <motion.tr
                    key={book.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <p className="font-medium text-black">{book.title}</p>
                      <p className="text-xs text-gray-500">ISBN: {book.isbn}</p>
                    </td>
                    <td className="py-4 px-4 text-gray-700">{book.author}</td>
                    <td className="py-4 px-4 text-gray-700">{book.category}</td>
                    <td className="py-4 px-4 font-semibold text-black">{book.available}</td>
                    <td className="py-4 px-4 text-gray-700">{book.total}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        book.status === 'Available' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {book.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Recent Issues */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">Recent Book Issues</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Student</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Book</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Issue Date</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Due Date</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, index) => (
                  <motion.tr
                    key={issue.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 + index * 0.1 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium text-black">{issue.studentName}</td>
                    <td className="py-4 px-4 text-gray-700">{issue.bookTitle}</td>
                    <td className="py-4 px-4 text-gray-700">
                      {new Date(issue.issueDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {new Date(issue.dueDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        issue.status === 'Returned' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {issue.status === 'Issued' && (
                        <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                          Return
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

