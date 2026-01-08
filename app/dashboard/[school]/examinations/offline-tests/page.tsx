'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  Calendar,
  Users,
  BookOpen,
  Save,
  X,
  Search,
  Filter
} from 'lucide-react';

interface OfflineTest {
  id: string;
  test_name: string;
  class: string;
  section: string;
  subject: string;
  test_date: string;
  max_marks: number;
  duration_minutes: number;
  description?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export default function OfflineTestsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [tests, setTests] = useState<OfflineTest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    test_name: '',
    class: '',
    section: '',
    subject: '',
    test_date: '',
    max_marks: '',
    duration_minutes: '',
    description: '',
  });

  // Mock data
  const mockTests: OfflineTest[] = [
    {
      id: '1',
      test_name: 'Mathematics Unit Test',
      class: '10',
      section: 'A',
      subject: 'Mathematics',
      test_date: '2024-03-15',
      max_marks: 50,
      duration_minutes: 90,
      status: 'scheduled',
    },
    {
      id: '2',
      test_name: 'Science Quiz',
      class: '9',
      section: 'B',
      subject: 'Science',
      test_date: '2024-03-10',
      max_marks: 30,
      duration_minutes: 45,
      status: 'completed',
    },
  ];

  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];
  const subjects = ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi'];

  const handleOpenModal = (test?: OfflineTest) => {
    if (test) {
      setEditingId(test.id);
      setFormData({
        test_name: test.test_name,
        class: test.class,
        section: test.section,
        subject: test.subject,
        test_date: test.test_date,
        max_marks: test.max_marks.toString(),
        duration_minutes: test.duration_minutes.toString(),
        description: test.description || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        test_name: '',
        class: '',
        section: '',
        subject: '',
        test_date: '',
        max_marks: '',
        duration_minutes: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    // TODO: Implement API call
    console.log('Saving offline test:', formData);
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this test?')) {
      // TODO: Implement API call
      console.log('Deleting test:', id);
    }
  };

  const filteredTests = mockTests.filter(test => {
    const matchesSearch = 
      test.test_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || test.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
            Offline Tests
          </h1>
          <p className="text-gray-600">Manage offline tests and assessments</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
          >
            <Plus size={18} className="mr-2" />
            Create Test
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tests..."
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tests List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTests.map((test, index) => (
          <motion.div
            key={test.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{test.test_name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(test.status)}`}>
                      {test.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenModal(test)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(test.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <BookOpen size={14} />
                  <span>{test.subject}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={14} />
                  <span>Class {test.class}-{test.section}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={14} />
                  <span>{new Date(test.test_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Max Marks: <span className="font-semibold text-gray-900">{test.max_marks}</span></span>
                  <span className="text-gray-600">Duration: <span className="font-semibold text-gray-900">{test.duration_minutes} min</span></span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTests.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No offline tests found</p>
            <Button
              onClick={() => handleOpenModal()}
              className="mt-4 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
            >
              <Plus size={18} className="mr-2" />
              Create First Test
            </Button>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">
                    {editingId ? 'Edit Offline Test' : 'Create Offline Test'}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Test Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.test_name}
                    onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                    placeholder="e.g., Mathematics Unit Test"
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Section <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    >
                      <option value="">Select Section</option>
                      {sections.map(sec => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Test Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.test_date}
                      onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Max Marks <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.max_marks}
                      onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
                      placeholder="100"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duration (min) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                      placeholder="90"
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Test description..."
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                >
                  <Save size={18} className="mr-2" />
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



