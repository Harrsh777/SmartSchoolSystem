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
  Award,
  TrendingUp,
  Save,
  X,
  Loader2
} from 'lucide-react';

interface GradeScale {
  id: string;
  grade: string;
  min_marks: number;
  max_marks: number;
  grade_point: number;
  description?: string;
}

export default function GradeScalePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    grade: '',
    min_marks: '',
    max_marks: '',
    grade_point: '',
    description: '',
  });

  const handleOpenModal = (scale?: GradeScale) => {
    if (scale) {
      setEditingId(scale.id);
      setFormData({
        grade: scale.grade,
        min_marks: scale.min_marks.toString(),
        max_marks: scale.max_marks.toString(),
        grade_point: scale.grade_point.toString(),
        description: scale.description || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        grade: '',
        min_marks: '',
        max_marks: '',
        grade_point: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      grade: '',
      min_marks: '',
      max_marks: '',
      grade_point: '',
      description: '',
    });
  };

  const handleSave = async () => {
    // TODO: Implement API call
    console.log('Saving grade scale:', formData);
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this grade scale?')) {
      // TODO: Implement API call
      console.log('Deleting grade scale:', id);
    }
  };

  // Mock data for demonstration
  const mockGradeScales: GradeScale[] = [
    { id: '1', grade: 'A+', min_marks: 90, max_marks: 100, grade_point: 10, description: 'Outstanding' },
    { id: '2', grade: 'A', min_marks: 80, max_marks: 89, grade_point: 9, description: 'Excellent' },
    { id: '3', grade: 'B+', min_marks: 70, max_marks: 79, grade_point: 8, description: 'Very Good' },
    { id: '4', grade: 'B', min_marks: 60, max_marks: 69, grade_point: 7, description: 'Good' },
    { id: '5', grade: 'C', min_marks: 50, max_marks: 59, grade_point: 6, description: 'Average' },
    { id: '6', grade: 'D', min_marks: 40, max_marks: 49, grade_point: 5, description: 'Below Average' },
    { id: '7', grade: 'F', min_marks: 0, max_marks: 39, grade_point: 0, description: 'Fail' },
  ];

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
              <Award className="text-white" size={24} />
            </div>
            Grade Scale
          </h1>
          <p className="text-gray-600">Manage grade scales for examinations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
          >
            <Plus size={18} className="mr-2" />
            Add Grade Scale
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

      {/* Grade Scales List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Grade</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Min Marks</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Max Marks</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Grade Point</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockGradeScales.map((scale, index) => (
                <motion.tr
                  key={scale.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                      {scale.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{scale.min_marks}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{scale.max_marks}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{scale.grade_point}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{scale.description}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(scale)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(scale.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
                    {editingId ? 'Edit Grade Scale' : 'Add Grade Scale'}
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
                    Grade <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="e.g., A+, A, B+"
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Min Marks <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.min_marks}
                      onChange={(e) => setFormData({ ...formData, min_marks: e.target.value })}
                      placeholder="0"
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
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Grade Point <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.grade_point}
                    onChange={(e) => setFormData({ ...formData, grade_point: e.target.value })}
                    placeholder="e.g., 10, 9, 8"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Outstanding, Excellent"
                    className="w-full"
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


