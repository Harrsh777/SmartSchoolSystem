'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Settings, Save, Plus, Edit, Trash2, Loader2, X, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LibrarySection {
  id: string;
  name: string;
  material_type: string;
}

interface MaterialType {
  id: string;
  name: string;
}

export default function LibraryBasicsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    borrow_days: 14,
    max_books_student: 3,
    max_books_staff: 5,
    late_fine_per_day: 0,
    late_fine_fixed: 0,
    lost_book_fine: 0,
    damaged_book_fine: 0,
  });
  const [sections, setSections] = useState<LibrarySection[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<LibrarySection | null>(null);
  const [editingType, setEditingType] = useState<MaterialType | null>(null);
  const [sectionForm, setSectionForm] = useState({ name: '', material_type: 'Books' });
  const [typeForm, setTypeForm] = useState({ name: '' });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, sectionsRes, typesRes] = await Promise.all([
        fetch(`/api/library/settings?school_code=${schoolCode}`),
        fetch(`/api/library/sections?school_code=${schoolCode}`),
        fetch(`/api/library/material-types?school_code=${schoolCode}`),
      ]);

      const settingsData = await settingsRes.json();
      const sectionsData = await sectionsRes.json();
      const typesData = await typesRes.json();

      if (settingsRes.ok && settingsData.data) {
        setSettings(settingsData.data);
      }
      if (sectionsRes.ok && sectionsData.data) {
        setSections(sectionsData.data);
      }
      if (typesRes.ok && typesData.data) {
        setMaterialTypes(typesData.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    // Validate: Either per-day OR fixed fine
    if (settings.late_fine_per_day > 0 && settings.late_fine_fixed > 0) {
      setError('Please set either per-day fine OR fixed fine, not both');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/library/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...settings,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorMessage = result.error || 'Failed to save settings';
        const details = result.details ? `\n\nDetails: ${result.details}` : '';
        setError(`${errorMessage}${details}`);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSection = async () => {
    if (!sectionForm.name.trim()) {
      setError('Section name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const url = editingSection
        ? `/api/library/sections/${editingSection.id}`
        : '/api/library/sections';
      const method = editingSection ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...sectionForm,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(editingSection ? 'Section updated!' : 'Section created!');
        setSectionModalOpen(false);
        setEditingSection(null);
        setSectionForm({ name: '', material_type: 'Books' });
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to save section');
      }
    } catch (err) {
      console.error('Error saving section:', err);
      setError('Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveType = async () => {
    if (!typeForm.name.trim()) {
      setError('Material type name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const url = editingType
        ? `/api/library/material-types/${editingType.id}`
        : '/api/library/material-types';
      const method = editingType ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          name: typeForm.name,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(editingType ? 'Material type updated!' : 'Material type created!');
        setTypeModalOpen(false);
        setEditingType(null);
        setTypeForm({ name: '' });
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to save material type');
      }
    } catch (err) {
      console.error('Error saving material type:', err);
      setError('Failed to save material type');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) {
      return;
    }

    try {
      const response = await fetch(`/api/library/sections/${sectionId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Section deleted successfully!');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete section');
      }
    } catch (err) {
      console.error('Error deleting section:', err);
      setError('Failed to delete section');
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this material type?')) {
      return;
    }

    try {
      const response = await fetch(`/api/library/material-types/${typeId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Material type deleted successfully!');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete material type');
      }
    } catch (err) {
      console.error('Error deleting material type:', err);
      setError('Failed to delete material type');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#5A7A95] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading library settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5EFEB] dark:bg-[#0f172a]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/library`)}
                className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg">
                <Settings className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Library Basics</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure library rules and master data for {schoolCode}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3"
          >
            <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            <p className="text-green-800 dark:text-green-300 text-sm">{success}</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="font-semibold text-red-800 dark:text-red-300 mb-1">Error</p>
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-line">{error}</p>
              </div>
            </div>
            <button onClick={() => setError('')} className="text-red-600 dark:text-red-400 hover:text-red-800 flex-shrink-0">
              <X size={18} />
            </button>
          </motion.div>
        )}

        {/* Library Rules */}
        <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Library Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Borrow Period (Days) *
            </label>
            <Input
              type="number"
              min="1"
              value={settings.borrow_days}
              onChange={(e) => setSettings({ ...settings, borrow_days: parseInt(e.target.value) || 14 })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Books Allowed (Student) *
            </label>
            <Input
              type="number"
              min="1"
              value={settings.max_books_student}
              onChange={(e) => setSettings({ ...settings, max_books_student: parseInt(e.target.value) || 3 })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Books Allowed (Staff) *
            </label>
            <Input
              type="number"
              min="1"
              value={settings.max_books_staff}
              onChange={(e) => setSettings({ ...settings, max_books_staff: parseInt(e.target.value) || 5 })}
              className="w-full"
            />
          </div>
        </div>
      </Card>

        {/* Fine Configuration */}
        <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Fine Configuration</h2>
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Note:</strong> Set either per-day fine OR fixed fine, not both.
              </p>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Late Fine (₹ per day)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.late_fine_per_day}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setSettings({ ...settings, late_fine_per_day: value, late_fine_fixed: value > 0 ? 0 : settings.late_fine_fixed });
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Late Fine (₹ fixed)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.late_fine_fixed}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setSettings({ ...settings, late_fine_fixed: value, late_fine_per_day: value > 0 ? 0 : settings.late_fine_per_day });
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lost Book Fine (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.lost_book_fine}
                onChange={(e) => setSettings({ ...settings, lost_book_fine: parseFloat(e.target.value) || 0 })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Damaged Book Fine (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.damaged_book_fine}
                onChange={(e) => setSettings({ ...settings, damaged_book_fine: parseFloat(e.target.value) || 0 })}
                className="w-full"
              />
            </div>
          </div>
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                onClick={handleSaveSettings} 
                disabled={saving}
                className="bg-[#5A7A95] hover:bg-[#4a6a85]"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Library Sections */}
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Library Sections</h2>
              <Button 
                size="sm" 
                onClick={() => {
                  setEditingSection(null);
                  setSectionForm({ name: '', material_type: 'Books' });
                  setSectionModalOpen(true);
                }}
                className="bg-[#5A7A95] hover:bg-[#4a6a85]"
              >
                <Plus size={16} className="mr-1" />
                Add Section
              </Button>
            </div>
            <div className="space-y-2">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#5A7A95] dark:hover:border-[#6B9BB8] transition-all"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{section.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{section.material_type}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSection(section);
                        setSectionForm({ name: section.name, material_type: section.material_type });
                        setSectionModalOpen(true);
                      }}
                      className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10 dark:border-[#6B9BB8]/30 dark:text-[#6B9BB8]"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSection(section.id)}
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {sections.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No sections added yet</p>
              )}
            </div>
          </Card>

          {/* Material Types */}
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Material Types</h2>
              <Button 
                size="sm" 
                onClick={() => {
                  setEditingType(null);
                  setTypeForm({ name: '' });
                  setTypeModalOpen(true);
                }}
                className="bg-[#6B9BB8] hover:bg-[#5a8aa8]"
              >
                <Plus size={16} className="mr-1" />
                Add Type
              </Button>
            </div>
            <div className="space-y-2">
              {materialTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#6B9BB8] dark:hover:border-[#7DB5D3] transition-all"
                >
                  <p className="font-medium text-gray-900 dark:text-white">{type.name}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingType(type);
                        setTypeForm({ name: type.name });
                        setTypeModalOpen(true);
                      }}
                      className="border-[#6B9BB8]/30 text-[#6B9BB8] hover:bg-[#6B9BB8]/10 dark:border-[#7DB5D3]/30 dark:text-[#7DB5D3]"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteType(type.id)}
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {materialTypes.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No material types added yet</p>
              )}
            </div>
          </Card>
        </div>

        {/* Section Modal */}
        {sectionModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingSection ? 'Edit Section' : 'Add Section'}
                  </h2>
                  <button
                    onClick={() => {
                      setSectionModalOpen(false);
                      setEditingSection(null);
                      setSectionForm({ name: '', material_type: 'Books' });
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Section Name *
                  </label>
                  <Input
                    value={sectionForm.name}
                    onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                    placeholder="e.g., Fiction, Non-Fiction"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Material Type *
                  </label>
                  <select
                    value={sectionForm.material_type}
                    onChange={(e) => setSectionForm({ ...sectionForm, material_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8]"
                  >
                    <option value="Books">Books</option>
                    <option value="Magazines">Magazines</option>
                    <option value="Reference">Reference</option>
                    <option value="Journals">Journals</option>
                    <option value="Digital">Digital</option>
                  </select>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSectionModalOpen(false);
                    setEditingSection(null);
                    setSectionForm({ name: '', material_type: 'Books' });
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveSection} 
                  disabled={saving || !sectionForm.name.trim()}
                  className="bg-[#5A7A95] hover:bg-[#4a6a85]"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Material Type Modal */}
        {typeModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingType ? 'Edit Material Type' : 'Add Material Type'}
                  </h2>
                  <button
                    onClick={() => {
                      setTypeModalOpen(false);
                      setEditingType(null);
                      setTypeForm({ name: '' });
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Material Type Name *
                  </label>
                  <Input
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ name: e.target.value })}
                    placeholder="e.g., Book, Journal, Magazine"
                    className="w-full"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setTypeModalOpen(false);
                    setEditingType(null);
                    setTypeForm({ name: '' });
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveType} 
                  disabled={saving || !typeForm.name.trim()}
                  className="bg-[#6B9BB8] hover:bg-[#5a8aa8]"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

