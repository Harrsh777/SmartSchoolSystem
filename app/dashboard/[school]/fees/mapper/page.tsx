'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  Link2,
  Search,
  Users,
  Calendar,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface FeeSchedule {
  id: string;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface ClassMapping {
  id: string;
  class: string;
  section: string;
  fee_schedule_id: string;
  fee_schedule_name: string;
  academic_year: string;
  mapped_at: string;
}

export default function FeeMapperPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [mappings, setMappings] = useState<ClassMapping[]>([]);
  const [feeSchedules, setFeeSchedules] = useState<FeeSchedule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingForm, setMappingForm] = useState({
    class: '',
    section: '',
    fee_schedule_id: '',
    academic_year: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString(),
  });

  // Mock data
  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];

  const mockFeeSchedules: FeeSchedule[] = [
    {
      id: '1',
      name: 'Annual Fee Schedule 2024-25',
      academic_year: '2024-2025',
      start_date: '2024-04-01',
      end_date: '2025-03-31',
      is_active: true,
    },
    {
      id: '2',
      name: 'Quarterly Fee Schedule 2024-25',
      academic_year: '2024-2025',
      start_date: '2024-04-01',
      end_date: '2025-03-31',
      is_active: true,
    },
  ];

  const mockMappings: ClassMapping[] = [
    {
      id: '1',
      class: '10',
      section: 'A',
      fee_schedule_id: '1',
      fee_schedule_name: 'Annual Fee Schedule 2024-25',
      academic_year: '2024-2025',
      mapped_at: '2024-01-15',
    },
    {
      id: '2',
      class: '10',
      section: 'B',
      fee_schedule_id: '1',
      fee_schedule_name: 'Annual Fee Schedule 2024-25',
      academic_year: '2024-2025',
      mapped_at: '2024-01-15',
    },
    {
      id: '3',
      class: '9',
      section: 'A',
      fee_schedule_id: '2',
      fee_schedule_name: 'Quarterly Fee Schedule 2024-25',
      academic_year: '2024-2025',
      mapped_at: '2024-01-20',
    },
  ];

  useEffect(() => {
    // TODO: Fetch mappings and fee schedules
    setMappings(mockMappings);
    setFeeSchedules(mockFeeSchedules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMappings = mappings.filter(mapping => {
    const matchesSearch = 
      mapping.fee_schedule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${mapping.class}-${mapping.section}`.includes(searchQuery.toLowerCase());
    const matchesClass = !selectedClass || mapping.class === selectedClass;
    const matchesSection = !selectedSection || mapping.section === selectedSection;
    return matchesSearch && matchesClass && matchesSection;
  });

  const handleOpenModal = () => {
    setMappingForm({
      class: '',
      section: '',
      fee_schedule_id: '',
      academic_year: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString(),
    });
    setShowMappingModal(true);
  };

  const handleSaveMapping = async () => {
    // TODO: Implement API call
    console.log('Saving mapping:', mappingForm);
    setShowMappingModal(false);
  };

  const handleDeleteMapping = async (id: string) => {
    if (confirm('Are you sure you want to remove this mapping?')) {
      // TODO: Implement API call
      console.log('Deleting mapping:', id);
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
              <Link2 className="text-white" size={24} />
            </div>
            Student Class & Fee Schedule Mapper
          </h1>
          <p className="text-gray-600">Map classes and sections to fee schedules</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenModal}
            className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
          >
            <Plus size={18} className="mr-2" />
            Create Mapping
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by class, section, or schedule..."
              className="pl-10"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Sections</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                setSearchQuery('');
                setSelectedClass('');
                setSelectedSection('');
              }}
              variant="outline"
              className="w-full border-gray-300"
            >
              <Filter size={16} className="mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] text-white">
          <div className="flex items-center justify-between mb-2">
            <Link2 size={20} className="opacity-90" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total</span>
          </div>
          <p className="text-3xl font-bold mb-1">{mappings.length}</p>
          <p className="text-xs text-blue-100">Total Mappings</p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users size={20} className="opacity-90" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Classes</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            {new Set(mappings.map(m => `${m.class}-${m.section}`)).size}
          </p>
          <p className="text-xs text-green-100">Mapped Classes</p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <Calendar size={20} className="opacity-90" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Schedules</span>
          </div>
          <p className="text-3xl font-bold mb-1">
            {new Set(mappings.map(m => m.fee_schedule_id)).size}
          </p>
          <p className="text-xs text-purple-100">Active Schedules</p>
        </Card>
      </div>

      {/* Mappings Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Class-Section</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Fee Schedule</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Academic Year</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Mapped Date</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMappings.map((mapping, index) => (
                <motion.tr
                  key={mapping.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-bold">
                        {mapping.class}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Class {mapping.class}</p>
                        <p className="text-xs text-gray-600">Section {mapping.section}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-[#1e3a8a]" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{mapping.fee_schedule_name}</p>
                        <p className="text-xs text-gray-600">Schedule ID: {mapping.fee_schedule_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{mapping.academic_year}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(mapping.mapped_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                      <CheckCircle2 size={12} className="mr-1" />
                      Active
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleDeleteMapping(mapping.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Mapping"
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

      {/* Empty State */}
      {filteredMappings.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <Link2 size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No mappings found</p>
            <p className="text-sm text-gray-400 mt-1">Create a new mapping to get started</p>
            <Button
              onClick={handleOpenModal}
              className="mt-4 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
            >
              <Plus size={18} className="mr-2" />
              Create First Mapping
            </Button>
          </div>
        </Card>
      )}

      {/* Mapping Modal */}
      <AnimatePresence>
        {showMappingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMappingModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <h3 className="text-2xl font-bold">Create Mapping</h3>
                <p className="text-blue-100 mt-1">Map class and section to fee schedule</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Users size={14} className="inline mr-1" />
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mappingForm.class}
                    onChange={(e) => setMappingForm({ ...mappingForm, class: e.target.value })}
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
                    value={mappingForm.section}
                    onChange={(e) => setMappingForm({ ...mappingForm, section: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="">Select Section</option>
                    {sections.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Calendar size={14} className="inline mr-1" />
                    Fee Schedule <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mappingForm.fee_schedule_id}
                    onChange={(e) => setMappingForm({ ...mappingForm, fee_schedule_id: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="">Select Fee Schedule</option>
                    {feeSchedules.map(schedule => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.name} ({schedule.academic_year})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={mappingForm.academic_year}
                    onChange={(e) => setMappingForm({ ...mappingForm, academic_year: e.target.value })}
                    placeholder="e.g., 2024-2025"
                    className="w-full"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowMappingModal(false)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveMapping}
                  disabled={!mappingForm.class || !mappingForm.section || !mappingForm.fee_schedule_id}
                  className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                >
                  <Save size={18} className="mr-2" />
                  Create Mapping
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



