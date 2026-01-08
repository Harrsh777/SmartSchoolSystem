'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  CalendarX,
  Plus,
  Edit,
  Trash2,
  Settings,
  Save,
  X,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  FileText,
  Download
} from 'lucide-react';

interface LeaveType {
  id: string;
  abbreviation: string;
  name: string;
  is_active: boolean;
  max_days?: number;
  carry_forward?: boolean;
  academic_year: string;
  staff_type?: string;
}

export default function LeaveBasicsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState('');
  const [staffType, setStaffType] = useState('Teaching');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    abbreviation: '',
    name: '',
    max_days: '',
    carry_forward: false,
    is_active: true,
  });

  // Academic years
  const academicYears = [
    'Apr 2024 - Mar 2025',
    'Apr 2025 - Mar 2026',
    'Apr 2026 - Mar 2027',
  ];
  const staffTypes = ['Teaching', 'Non-Teaching', 'All'];

  useEffect(() => {
    fetchLeaveTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear, staffType, schoolCode]);

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
      });
      if (academicYear) {
        params.append('academic_year', academicYear);
      }
      if (staffType) {
        params.append('staff_type', staffType);
      }

      const response = await fetch(`/api/leave/types?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setLeaveTypes(result.data);
      } else {
        console.error('Error fetching leave types:', result.error);
      }
    } catch (err) {
      console.error('Error fetching leave types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (leaveType?: LeaveType) => {
    if (leaveType) {
      setEditingId(leaveType.id);
      setFormData({
        abbreviation: leaveType.abbreviation,
        name: leaveType.name,
        max_days: leaveType.max_days?.toString() || '',
        carry_forward: leaveType.carry_forward || false,
        is_active: leaveType.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        abbreviation: '',
        name: '',
        max_days: '',
        carry_forward: false,
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.abbreviation || !formData.name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        // Update existing leave type
        const response = await fetch(`/api/leave/types/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            abbreviation: formData.abbreviation,
            name: formData.name,
            max_days: formData.max_days,
            carry_forward: formData.carry_forward,
            is_active: formData.is_active,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          fetchLeaveTypes();
          handleCloseModal();
        } else {
          alert(result.error || 'Failed to update leave type');
        }
      } else {
        // Create new leave type
        const response = await fetch('/api/leave/types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            abbreviation: formData.abbreviation,
            name: formData.name,
            max_days: formData.max_days,
            carry_forward: formData.carry_forward,
            is_active: formData.is_active,
            academic_year: academicYear || 'Apr 2025 - Mar 2026',
            staff_type: staffType || 'All',
          }),
        });

        const result = await response.json();
        if (response.ok) {
          fetchLeaveTypes();
          handleCloseModal();
        } else {
          alert(result.error || 'Failed to create leave type');
        }
      }
    } catch (err) {
      console.error('Error saving leave type:', err);
      alert('Failed to save leave type. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this leave type?')) {
      try {
        setLoading(true);
        const response = await fetch(`/api/leave/types/${id}`, {
          method: 'DELETE',
        });

        const result = await response.json();
        if (response.ok) {
          fetchLeaveTypes();
        } else {
          alert(result.error || 'Failed to delete leave type');
        }
      } catch (err) {
        console.error('Error deleting leave type:', err);
        alert('Failed to delete leave type. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leave/types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        fetchLeaveTypes();
      } else {
        alert(result.error || 'Failed to update leave type');
      }
    } catch (err) {
      console.error('Error toggling leave type status:', err);
      alert('Failed to update leave type. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetLeaveTypes = async () => {
    if (confirm('Are you sure you want to reset all leave types? This will restore default settings.')) {
      // This is a placeholder - you can implement default leave types if needed
      alert('Reset functionality can be implemented as needed');
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
              <CalendarX className="text-white" size={24} />
            </div>
            Leave Basics
          </h1>
          <p className="text-gray-600">Manage leave types and configurations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/leave`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Academic Year
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              >
                {academicYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Staff Type
              </label>
              <select
                value={staffType}
                onChange={(e) => setStaffType(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              >
                {staffTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <Button
              variant="outline"
              onClick={handleResetLeaveTypes}
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <RefreshCw size={18} className="mr-2" />
              Reset Leave Types
            </Button>
            <Button
              variant="outline"
              className="border-[#1e3a8a] text-[#1e3a8a]"
            >
              <FileText size={18} className="mr-2" />
              Logs
            </Button>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
            >
              <Plus size={18} className="mr-2" />
              Add New Leave Type
            </Button>
            <Button
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white"
            >
              <Save size={18} className="mr-2" />
              Save
            </Button>
          </div>
        </div>
      </Card>

      {/* Leave Types List */}
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Leave Types</h3>
        <div className="space-y-3">
          {leaveTypes.map((leaveType, index) => (
            <motion.div
              key={leaveType.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border-2 border-gray-200 hover:border-[#1e3a8a] transition-all"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-16 h-12 rounded-lg border-2 border-orange-500 bg-orange-50 flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-sm">{leaveType.abbreviation}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-gray-900">{leaveType.name}</h4>
                  {leaveType.max_days && (
                    <p className="text-sm text-gray-600">Max Days: {leaveType.max_days}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleActive(leaveType.id, leaveType.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      leaveType.is_active ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        leaveType.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => handleOpenModal(leaveType)}
                    className="p-2 text-[#1e3a8a] hover:bg-blue-50 rounded-lg transition-colors"
                    title="Settings"
                  >
                    <Settings size={18} />
                  </button>
                  {leaveType.abbreviation !== 'LWP' && (
                    <button
                      onClick={() => handleDelete(leaveType.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    title="More Options"
                  >
                    <X size={18} className="rotate-45" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
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
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">
                    {editingId ? 'Edit Leave Type' : 'Add Leave Type'}
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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Abbreviation <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.abbreviation}
                    onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })}
                    placeholder="e.g., CL, EL, SL"
                    maxLength={5}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Leave Type Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Casual Leaves, Earned Leaves"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Days (Optional)
                  </label>
                  <Input
                    type="number"
                    value={formData.max_days}
                    onChange={(e) => setFormData({ ...formData, max_days: e.target.value })}
                    placeholder="Leave empty for unlimited"
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Carry Forward
                    </label>
                    <p className="text-xs text-gray-600">Allow unused leaves to carry forward</p>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, carry_forward: !formData.carry_forward })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.carry_forward ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.carry_forward ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Active
                    </label>
                    <p className="text-xs text-gray-600">Enable this leave type</p>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.is_active ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
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



