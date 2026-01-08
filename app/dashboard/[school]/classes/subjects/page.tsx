'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, Edit, Trash2, ArrowLeft, Search, BookOpen } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  color?: string;
  school_id?: string;
  school_code?: string;
  created_at?: string;
  updated_at?: string;
}

export default function SubjectsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#6366f1',
  });

  useEffect(() => {
    fetchSubjects();
  }, [schoolCode]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/subjects?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setSubjects(result.data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      color: '#6366f1',
    });
    setShowAddModal(true);
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      color: subject.color || '#6366f1',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/subjects/${subjectId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        fetchSubjects();
      } else {
        alert(result.error || 'Failed to delete subject');
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Failed to delete subject. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingSubject
        ? `/api/subjects/${editingSubject.id}?school_code=${schoolCode}`
        : `/api/subjects?school_code=${schoolCode}`;
      
      const method = editingSubject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          school_code: schoolCode,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowAddModal(false);
        setEditingSubject(null);
        fetchSubjects();
      } else {
        alert(result.error || `Failed to ${editingSubject ? 'update' : 'create'} subject`);
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      alert(`Failed to ${editingSubject ? 'update' : 'create'} subject. Please try again.`);
    }
  };

  const filteredSubjects = subjects.filter(subject => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = subject.name.toLowerCase().includes(searchLower);
    return matchesSearch;
  });

  // Calculate statistics - simplified since we only have basic fields
  const totalSubjects = subjects.length;


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-[#F8FAFC] min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6FED] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/classes`)}
            className="border-[#E5E7EB] text-[#64748B] hover:bg-[#F1F5F9]"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2 flex items-center gap-3">
              <BookOpen size={32} className="text-[#2F6FED]" />
              All Subjects
            </h1>
            <p className="text-[#64748B]">Manage subjects for your classes</p>
          </div>
        </div>
        <Button
          onClick={handleAdd}
          className="bg-[#F97316] hover:bg-[#EA580C] text-white"
        >
          <Plus size={18} className="mr-2" />
          ADD NEW SUBJECT
        </Button>
      </motion.div>

      {/* Summary Card */}
      <Card className="bg-white">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B] mb-1">Total Subjects</p>
              <p className="text-3xl font-bold text-[#0F172A]">{totalSubjects}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
              <BookOpen className="text-[#22C55E]" size={24} />
            </div>
          </div>
        </div>
      </Card>

      {/* Search Filter */}
      <Card className="bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" size={20} />
          <Input
            type="text"
            placeholder="Search subjects by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-[#E5E7EB] focus:ring-[#2F6FED]"
          />
        </div>
      </Card>

      {/* Subjects Table */}
      <Card className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Subject Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Color</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Created At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] bg-white">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject, index) => (
                  <tr key={subject.id} className="hover:bg-[#F1F5F9] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">
                      {subject.name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full border border-[#E5E7EB]"
                          style={{ backgroundColor: subject.color || '#6366f1' }}
                        />
                        <span className="text-[#64748B]">{subject.color || '#6366f1'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#64748B]">
                      {subject.created_at ? new Date(subject.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(subject)}
                          className="p-2 text-[#F97316] hover:bg-[#FFEDD5] rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(subject.id)}
                          className="p-2 text-[#EF4444] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                    {searchQuery ? 'No subjects found matching your search' : 'No subjects found. Add your first subject!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-[#E5E7EB]">
              <h2 className="text-2xl font-bold text-[#0F172A]">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Subject Name <span className="text-[#EF4444]">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="border-[#E5E7EB] focus:ring-[#2F6FED]"
                  placeholder="Enter subject name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10 border border-[#E5E7EB] rounded-lg cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 border-[#E5E7EB] focus:ring-[#2F6FED]"
                    placeholder="#6366f1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSubject(null);
                  }}
                  className="border-[#E5E7EB] text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#2F6FED] hover:bg-[#1E3A8A] text-white"
                >
                  {editingSubject ? 'Update Subject' : 'Add Subject'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

