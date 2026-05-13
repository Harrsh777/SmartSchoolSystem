'use client';

import { use, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Video,
  Plus,
  Search,
  Calendar,
  Clock,
  Link2,
  Edit,
  Trash2,
  Save,
  X,
  User,
} from 'lucide-react';

interface Class {
  id: string;
  class: string;
  section: string;
  academic_year: string;
  class_teacher?: {
    id: string;
    full_name: string;
    staff_id: string;
  };
}

interface Teacher {
  id: string;
  full_name: string;
  staff_id: string;
  email?: string;
  department?: string;
}

interface OnlineClass {
  id: string;
  class_id: string;
  class_name: string;
  section: string;
  subject?: string;
  meeting_link: string;
  meeting_id?: string;
  meeting_password?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  teacher_id: string;
  teacher_name: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
}

export default function OnlineClassesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [onlineClasses, setOnlineClasses] = useState<OnlineClass[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [, setSelectedClass] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    class_id: '',
    subject: '',
    meeting_link: '',
    meeting_id: '',
    meeting_password: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    teacher_id: '',
  });

  // Mock data
  const mockClasses: Class[] = [
    {
      id: '1',
      class: '10',
      section: 'A',
      academic_year: '2024-2025',
      class_teacher: {
        id: 't1',
        full_name: 'John Doe',
        staff_id: 'STF001',
      },
    },
    {
      id: '2',
      class: '10',
      section: 'B',
      academic_year: '2024-2025',
      class_teacher: {
        id: 't2',
        full_name: 'Jane Smith',
        staff_id: 'STF002',
      },
    },
    {
      id: '3',
      class: '9',
      section: 'A',
      academic_year: '2024-2025',
    },
  ];

  const mockTeachers: Teacher[] = [
    { id: 't1', full_name: 'John Doe', staff_id: 'STF001', email: 'john@school.com', department: 'Mathematics' },
    { id: 't2', full_name: 'Jane Smith', staff_id: 'STF002', email: 'jane@school.com', department: 'Science' },
    { id: 't3', full_name: 'Bob Johnson', staff_id: 'STF003', email: 'bob@school.com', department: 'English' },
  ];

  const mockOnlineClasses: OnlineClass[] = [
    {
      id: '1',
      class_id: '1',
      class_name: '10',
      section: 'A',
      subject: 'Mathematics',
      meeting_link: 'https://meet.google.com/abc-defg-hij',
      meeting_id: 'abc-defg-hij',
      meeting_password: '123456',
      scheduled_date: '2024-12-20',
      scheduled_time: '10:00',
      duration_minutes: 60,
      teacher_id: 't1',
      teacher_name: 'John Doe',
      status: 'scheduled',
      created_at: '2024-12-15T10:00:00Z',
    },
  ];

  useEffect(() => {
    // TODO: Fetch classes, teachers, and online classes
    setClasses(mockClasses);
    setTeachers(mockTeachers);
    setOnlineClasses(mockOnlineClasses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const handleOpenCreateModal = (classId?: string) => {
    if (classId) {
      setFormData({
        ...formData,
        class_id: classId,
      });
    }
    setEditingId(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (onlineClass: OnlineClass) => {
    setEditingId(onlineClass.id);
    setFormData({
      class_id: onlineClass.class_id,
      subject: onlineClass.subject || '',
      meeting_link: onlineClass.meeting_link,
      meeting_id: onlineClass.meeting_id || '',
      meeting_password: onlineClass.meeting_password || '',
      scheduled_date: onlineClass.scheduled_date,
      scheduled_time: onlineClass.scheduled_time,
      duration_minutes: onlineClass.duration_minutes,
      teacher_id: onlineClass.teacher_id,
    });
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingId(null);
    setFormData({
      class_id: '',
      subject: '',
      meeting_link: '',
      meeting_id: '',
      meeting_password: '',
      scheduled_date: '',
      scheduled_time: '',
      duration_minutes: 60,
      teacher_id: '',
    });
  };

  const handleSave = async () => {
    // TODO: Implement API call
    console.log('Saving online class:', formData);
    handleCloseModal();
    // Refresh list
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this online class?')) {
      // TODO: Implement API call
      console.log('Deleting online class:', id);
    }
  };

  const handleAssignTeacher = (classId: string) => {
    setSelectedClass(classId);
    setShowAssignModal(true);
  };

  const filteredClasses = classes.filter(cls => {
    const searchLower = searchQuery.toLowerCase();
    return (
      cls.class.toLowerCase().includes(searchLower) ||
      cls.section.toLowerCase().includes(searchLower) ||
      (cls.class_teacher?.full_name.toLowerCase().includes(searchLower) || false)
    );
  });

  const filteredOnlineClasses = onlineClasses.filter(oc => {
    const searchLower = searchQuery.toLowerCase();
    return (
      oc.class_name.toLowerCase().includes(searchLower) ||
      oc.section.toLowerCase().includes(searchLower) ||
      oc.subject?.toLowerCase().includes(searchLower) ||
      oc.teacher_name.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ongoing': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectedClassData = classes.find(c => c.id === formData.class_id);

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
              <Video className="text-white" size={24} />
            </div>
            Online Classes
          </h1>
          <p className="text-gray-600">Generate and manage online classes for each class</p>
        </div>
        <Button
          onClick={() => handleOpenCreateModal()}
          className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
        >
          <Plus size={18} className="mr-2" />
          Create Online Class
        </Button>
      </motion.div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by class, section, subject, or teacher..."
            className="pl-10"
          />
        </div>
      </Card>

      {/* Classes List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Classes</h2>
          <p className="text-sm text-gray-600">{filteredClasses.length} classes</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls, index) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-lg border-2 border-gray-200 hover:border-[#1e3a8a] transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-bold">
                    {cls.class}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Class {cls.class}</h3>
                    <p className="text-sm text-gray-600">Section {cls.section}</p>
                  </div>
                </div>
              </div>
              {cls.class_teacher && (
                <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                  <User size={14} />
                  <span>{cls.class_teacher.full_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleOpenCreateModal(cls.id)}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                >
                  <Plus size={14} className="mr-1" />
                  Create Class
                </Button>
                <Button
                  onClick={() => handleAssignTeacher(cls.id)}
                  size="sm"
                  variant="outline"
                  className="border-[#1e3a8a] text-[#1e3a8a]"
                >
                  <User size={14} />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Online Classes List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Online Classes</h2>
          <p className="text-sm text-gray-600">{filteredOnlineClasses.length} classes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Class-Section</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Subject</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Teacher</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date & Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Duration</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Meeting Link</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOnlineClasses.map((oc, index) => (
                <motion.tr
                  key={oc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-bold text-xs">
                        {oc.class_name}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{oc.class_name}-{oc.section}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{oc.subject || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-900">{oc.teacher_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="flex items-center gap-1 text-gray-900">
                        <Calendar size={12} />
                        {new Date(oc.scheduled_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock size={12} />
                        {oc.scheduled_time}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{oc.duration_minutes} min</td>
                  <td className="px-4 py-3">
                    <a
                      href={oc.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Link2 size={14} />
                      Join
                    </a>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(oc.status)}`}>
                      {oc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(oc)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(oc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
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

        {filteredOnlineClasses.length === 0 && (
          <div className="text-center py-12">
            <Video size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No online classes found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first online class to get started</p>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
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
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">
                    {editingId ? 'Edit Online Class' : 'Create Online Class'}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        Class {cls.class} - Section {cls.section} ({cls.academic_year})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject (Optional)
                  </label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Mathematics, Science"
                    className="w-full"
                  />
                </div>

                {/* Teacher Assignment */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Assign Teacher <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="">Select Teacher</option>
                    {selectedClassData?.class_teacher && (
                      <option value={selectedClassData.class_teacher.id}>
                        {selectedClassData.class_teacher.full_name} (Class Teacher)
                      </option>
                    )}
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name} {teacher.department && `- ${teacher.department}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Meeting Link */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Meeting Link <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.meeting_link}
                    onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    required
                    className="w-full"
                  />
                </div>

                {/* Meeting ID and Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Meeting ID
                    </label>
                    <Input
                      value={formData.meeting_id}
                      onChange={(e) => setFormData({ ...formData, meeting_id: e.target.value })}
                      placeholder="abc-defg-hij"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Meeting Password
                    </label>
                    <Input
                      type="password"
                      value={formData.meeting_password}
                      onChange={(e) => setFormData({ ...formData, meeting_password: e.target.value })}
                      placeholder="Optional"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar size={14} className="inline mr-1" />
                      Scheduled Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Clock size={14} className="inline mr-1" />
                      Scheduled Time <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                      required
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Duration (minutes) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                    min={15}
                    max={240}
                    step={15}
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
                  disabled={!formData.class_id || !formData.teacher_id || !formData.meeting_link || !formData.scheduled_date || !formData.scheduled_time}
                  className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                >
                  <Save size={18} className="mr-2" />
                  {editingId ? 'Update' : 'Create'} Online Class
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Teacher Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAssignModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <h3 className="text-2xl font-bold">Assign Teacher</h3>
                <p className="text-blue-100 mt-1">Select a teacher for this class</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    placeholder="Search teachers..."
                    className="pl-10"
                  />
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {teachers.map(teacher => (
                    <button
                      key={teacher.id}
                      className="w-full p-3 text-left bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
                    >
                      <div className="font-semibold text-gray-900">{teacher.full_name}</div>
                      {teacher.department && (
                        <div className="text-sm text-gray-600">{teacher.department}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAssignModal(false)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

