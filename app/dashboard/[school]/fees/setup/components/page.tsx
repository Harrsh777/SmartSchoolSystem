'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowLeft,
  Search,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

interface FeeComponent {
  id: string;
  school_code: string;
  component_name: string;
  head_name?: string | null;
  default_amount: number;
  fee_type: 'annual' | 'quarterly' | 'monthly' | 'one_time';
  applicable_classes?: string[];
  admission_type?: string;
  gender?: string;
  is_optional: boolean;
  is_active: boolean;
  academic_year?: string | null;
  remarks?: string | null;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export default function FeeComponentsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  
  const [components, setComponents] = useState<FeeComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<FeeComponent | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    component_name: '',
    head_name: '',
    default_amount: '0',
    fee_type: 'annual' as 'annual' | 'quarterly' | 'monthly' | 'one_time',
    applicable_classes: [] as string[],
    admission_type: 'All Students',
    gender: 'All Students',
    is_optional: false,
    is_active: true,
    academic_year: '',
    remarks: '',
  });

  const fetchComponents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/fees/components?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok) {
        setComponents(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch fee components');
      }
    } catch (err) {
      console.error('Error fetching components:', err);
      setError('Failed to fetch fee components');
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const handleOpenModal = (component?: FeeComponent) => {
    if (component) {
      setEditingComponent(component);
      setFormData({
        component_name: component.component_name || '',
        head_name: component.head_name || '',
        default_amount: component.default_amount?.toString() || '0',
        fee_type: component.fee_type || 'annual',
        applicable_classes: component.applicable_classes || [],
        admission_type: component.admission_type || 'All Students',
        gender: component.gender || 'All Students',
        is_optional: component.is_optional || false,
        is_active: component.is_active !== false,
        academic_year: component.academic_year || '',
        remarks: component.remarks || '',
      });
    } else {
      setEditingComponent(null);
      setFormData({
        component_name: '',
        head_name: '',
        default_amount: '0',
        fee_type: 'annual',
        applicable_classes: [],
        admission_type: 'All Students',
        gender: 'All Students',
        is_optional: false,
        is_active: true,
        academic_year: '',
        remarks: '',
      });
    }
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!formData.component_name.trim()) {
      setError('Component name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const url = editingComponent
        ? `/api/fees/components/${editingComponent.id}`
        : '/api/fees/components';
      const method = editingComponent ? 'PATCH' : 'POST';

      const body = {
        school_code: schoolCode,
        ...formData,
        default_amount: parseFloat(formData.default_amount) || 0,
        applicable_classes: formData.applicable_classes,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(editingComponent ? 'Fee component updated successfully!' : 'Fee component created successfully!');
        setModalOpen(false);
        fetchComponents();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || result.details || 'Failed to save fee component');
      }
    } catch (err) {
      console.error('Error saving component:', err);
      setError('Failed to save fee component');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (componentId: string) => {
    if (!confirm('Are you sure you want to delete this fee component? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');
      const response = await fetch(`/api/fees/components/${componentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Fee component deleted successfully!');
        fetchComponents();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to delete fee component');
      }
    } catch (err) {
      console.error('Error deleting component:', err);
      setError('Failed to delete fee component');
    }
  };

  const filteredComponents = components.filter((component) => {
    const matchesSearch = component.component_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         component.head_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         false;
    const matchesYear = !filterAcademicYear || component.academic_year === filterAcademicYear;
    const matchesActive = filterActive === null || component.is_active === filterActive;
    return matchesSearch && matchesYear && matchesActive;
  });

  const academicYears = Array.from(new Set(components.map(c => c.academic_year).filter(Boolean) as string[]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <FileText className="text-[#2F6FED]" size={32} />
            Fee Components
          </h1>
          <p className="text-gray-600">Manage fee types and components</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/fees/setup`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={18} className="mr-2" />
            Add Component
          </Button>
        </div>
      </motion.div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <Check size={20} />
            <span>{success}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
            <select
              value={filterAcademicYear}
              onChange={(e) => setFilterAcademicYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
            >
              <option value="">All Years</option>
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterActive === null ? '' : filterActive.toString()}
              onChange={(e) => setFilterActive(e.target.value === '' ? null : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Components Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredComponents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {components.length === 0 ? 'No fee components found. Create your first one!' : 'No components match your filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Component Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Head Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Default Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fee Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Academic Year</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredComponents.map((component) => (
                  <tr key={component.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{component.component_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{component.head_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">₹{component.default_amount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                        {component.fee_type.replace('_', '-')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{component.academic_year || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        component.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {component.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(component)}
                          className="p-2 text-[#2F6FED] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(component.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingComponent ? 'Edit Fee Component' : 'Add Fee Component'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Component Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.component_name}
                      onChange={(e) => setFormData({ ...formData, component_name: e.target.value })}
                      placeholder="e.g., Tuition Fee, Library Fee"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Head Name</label>
                    <Input
                      type="text"
                      value={formData.head_name}
                      onChange={(e) => setFormData({ ...formData, head_name: e.target.value })}
                      placeholder="e.g., Academic Fees, Transport Fees"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Amount <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.default_amount}
                      onChange={(e) => setFormData({ ...formData, default_amount: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.fee_type}
                      onChange={(e) => setFormData({ ...formData, fee_type: e.target.value as 'annual' | 'quarterly' | 'monthly' | 'one_time' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                      required
                    >
                      <option value="annual">Annual</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="monthly">Monthly</option>
                      <option value="one_time">One Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                    <Input
                      type="text"
                      value={formData.academic_year}
                      onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                      placeholder="e.g., 2026-27"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admission Type</label>
                    <select
                      value={formData.admission_type}
                      onChange={(e) => setFormData({ ...formData, admission_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                    >
                      <option value="All Students">All Students</option>
                      <option value="Regular">Regular</option>
                      <option value="RTE">RTE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                    >
                      <option value="All Students">All Students</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_optional}
                        onChange={(e) => setFormData({ ...formData, is_optional: e.target.checked })}
                        className="w-4 h-4 text-[#2F6FED] border-gray-300 rounded focus:ring-[#2F6FED]"
                      />
                      <span className="text-sm font-medium text-gray-700">Is Optional</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-[#2F6FED] border-gray-300 rounded focus:ring-[#2F6FED]"
                      />
                      <span className="text-sm font-medium text-gray-700">Is Active</span>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.component_name.trim()}
                >
                  {saving ? 'Saving...' : editingComponent ? 'Update' : 'Create'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
