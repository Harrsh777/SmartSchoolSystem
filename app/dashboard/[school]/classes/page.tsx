'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Search, HelpCircle } from 'lucide-react';
import ClassesTable from '@/components/classes/ClassesTable';
import AddClassModal from '@/components/classes/AddClassModal';
import AssignTeacherModal from '@/components/classes/AssignTeacherModal';
import ClassesTutorial from '@/components/classes/ClassesTutorial';
import type { ClassWithDetails } from '@/lib/supabase';

export default function ClassesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    fetchClasses();
    // Automatically detect and create classes from students
    autoDetectClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const autoDetectClasses = async () => {
    try {
      // Detect classes from students
      const detectResponse = await fetch(`/api/classes/detect?school_code=${schoolCode}`);
      const detectResult = await detectResponse.json();

      if (detectResponse.ok && detectResult.data) {
        // Filter only new classes (that don't exist)
        interface ClassData {
          exists?: boolean;
          class: string;
          section: string;
          [key: string]: unknown;
        }
        const newClasses = detectResult.data.filter((cls: ClassData) => !cls.exists);
        
        if (newClasses.length > 0) {
          // Automatically create them
          const createResponse = await fetch('/api/classes/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              school_code: schoolCode,
              classes: newClasses,
            }),
          });

          const createResult = await createResponse.json();

          if (createResponse.ok) {
            // Refresh classes list
            fetchClasses();
          } else {
            console.error('Error auto-creating classes:', createResult.error);
          }
        }
      }
    } catch (error) {
      console.error('Error auto-detecting classes:', error);
      // Silently fail - don't show error to user
    }
  };

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

  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchClasses();
  };

  const handleAssignTeacher = (classItem: ClassWithDetails) => {
    setSelectedClass(classItem);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setSelectedClass(null);
    fetchClasses();
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

  const filteredClasses = classes.filter(cls => {
    const searchLower = searchQuery.toLowerCase();
    return (
      cls.class.toLowerCase().includes(searchLower) ||
      cls.section.toLowerCase().includes(searchLower) ||
      cls.academic_year.toLowerCase().includes(searchLower) ||
      (cls.class_teacher?.full_name.toLowerCase().includes(searchLower) || false)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Classes</h1>
            <p className="text-gray-600">Manage class structure and assign class teachers</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTutorial(true)}
            >
              <HelpCircle size={18} className="mr-2" />
              Tutorial
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={18} className="mr-2" />
              Add Class
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search classes by class, section, year, or teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </Card>
      </motion.div>

      {/* Classes Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ClassesTable
          classes={filteredClasses}
          schoolCode={schoolCode}
          onAssignTeacher={handleAssignTeacher}
          onDelete={handleDelete}
          onStudentCountClick={(cls) => {
            router.push(`/dashboard/${schoolCode}/students?class=${cls.class}&section=${cls.section}&year=${cls.academic_year}`);
          }}
        />
      </motion.div>

      {/* Modals */}
      {showAddModal && (
        <AddClassModal
          schoolCode={schoolCode}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {showAssignModal && selectedClass && (
        <AssignTeacherModal
          schoolCode={schoolCode}
          classId={selectedClass.id!}
          currentTeacher={selectedClass.class_teacher}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedClass(null);
          }}
          onSuccess={handleAssignSuccess}
        />
      )}

      {showTutorial && (
        <ClassesTutorial
          schoolCode={schoolCode}
          onClose={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
}
