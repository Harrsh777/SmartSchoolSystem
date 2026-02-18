'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, Edit, Trash2, ArrowLeft, Search, Layers } from 'lucide-react';
import AddClassModal from '@/components/classes/AddClassModal';
import BulkAddClassesModal from '@/components/classes/BulkAddClassesModal';
import type { ClassWithDetails } from '@/lib/supabase';

export default function ModifyClassesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithDetails | null>(null);
  const [classSubjects, setClassSubjects] = useState<Record<string, Array<{ id: string; name: string }>>>({});

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    // Fetch subjects for each class
    if (classes.length > 0) {
      fetchAllClassSubjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllClassSubjects = async () => {
    try {
      const subjectsMap: Record<string, Array<{ id: string; name: string }>> = {};
      
      await Promise.all(
        classes.map(async (classItem) => {
          if (!classItem.id) return;
          
          try {
            const response = await fetch(
              `/api/classes/${classItem.id}/subjects?school_code=${schoolCode}`
            );
            const result = await response.json();
            
            if (response.ok && result.data) {
              subjectsMap[classItem.id] = result.data;
            } else {
              subjectsMap[classItem.id] = [];
            }
          } catch (err) {
            console.error(`Error fetching subjects for class ${classItem.id}:`, err);
            subjectsMap[classItem.id] = [];
          }
        })
      );
      
      setClassSubjects(subjectsMap);
    } catch (err) {
      console.error('Error fetching class subjects:', err);
    }
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    setShowBulkAddModal(false);
    fetchClasses();
    // Subjects will be fetched automatically via useEffect when classes update
  };

  const handleDelete = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/classes/${classId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        fetchClasses();
      } else {
        alert(result.error || 'Failed to delete class');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Failed to delete class. Please try again.');
    }
  };

  const handleEdit = (classItem: ClassWithDetails) => {
    setEditingClass(classItem);
    setShowAddModal(true);
  };

  const filteredClasses = classes.filter(cls => {
    const searchLower = searchQuery.toLowerCase();
    return (
      cls.class.toLowerCase().includes(searchLower) ||
      cls.section.toLowerCase().includes(searchLower) ||
      cls.academic_year.toLowerCase().includes(searchLower)
    );
  });

  // Calculate total classes and sections
  const totalClasses = new Set(classes.map(cls => cls.class)).size;
  const totalSections = new Set(classes.map(cls => `${cls.class}-${cls.section}`)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-[#F8FAFC] min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6FED] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Loading classes...</p>
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
        
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2 flex items-center gap-3">
              <Plus size={32} className="text-[#2F6FED]" />
              Add/Modify Classes
            </h1>
            <p className="text-[#64748B]">Add new classes or modify existing ones</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowBulkAddModal(true)}
            className="border-[#2F6FED] text-[#2F6FED] hover:bg-[#EAF1FF]"
          >
            <Layers size={18} className="mr-2" />
            Bulk Add Classes
          </Button>
          <Button 
            onClick={() => {
              setEditingClass(null);
              setShowAddModal(true);
            }}
            className="bg-[#2F6FED] hover:bg-[#1E3A8A] text-white"
          >
            <Plus size={18} className="mr-2" />
            Add Class
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B] mb-1">Total Classes</p>
                <p className="text-3xl font-bold text-[#0F172A]">{totalClasses}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-[#EAF1FF] flex items-center justify-center">
                <Layers className="text-[#2F6FED]" size={24} />
              </div>
            </div>
          </div>
        </Card>
        <Card className="bg-white">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B] mb-1">Total Sections</p>
                <p className="text-3xl font-bold text-[#0F172A]">{totalSections}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-[#E0F2FE] flex items-center justify-center">
                <Layers className="text-[#38BDF8]" size={24} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" size={20} />
          <Input
            type="text"
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-[#E5E7EB] focus:ring-[#2F6FED]"
          />
        </div>
      </Card>

      {/* Classes Table */}
      <Card className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Class</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Section</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Academic Year</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Subjects</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] bg-white">
              {filteredClasses.length > 0 ? (
                filteredClasses.map((classItem) => {
                  const subjects = classItem.id ? classSubjects[classItem.id] || [] : [];
                  return (
                    <tr key={classItem.id} className="hover:bg-[#F1F5F9] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">{classItem.class}</td>
                      <td className="px-4 py-3 text-sm text-[#0F172A]">{classItem.section}</td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{classItem.academic_year}</td>
                      <td className="px-4 py-3 text-sm text-[#0F172A]">
                        {subjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {subjects.map((subject) => (
                              <span
                                key={subject.id}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#EAF1FF] text-[#1E3A8A] border border-[#DBEAFE]"
                              >
                                {subject.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#94A3B8] italic">No subjects assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(classItem)}
                            className="p-2 text-[#F97316] hover:bg-[#FFEDD5] rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(classItem.id!)}
                            className="p-2 text-[#EF4444] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                    {searchQuery ? 'No classes found matching your search' : 'No classes found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddClassModal
          schoolCode={schoolCode}
          existingClass={editingClass || undefined}
          onClose={() => {
            setShowAddModal(false);
            setEditingClass(null);
          }}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Bulk Add Modal */}
      {showBulkAddModal && (
        <BulkAddClassesModal
          schoolCode={schoolCode}
          onClose={() => setShowBulkAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}

