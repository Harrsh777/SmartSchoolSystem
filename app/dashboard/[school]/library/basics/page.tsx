'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Settings, Save, Plus, Edit, Trash2, Loader2, X, AlertCircle, CheckCircle } from 'lucide-react';

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
        setError(result.error || 'Failed to save settings');
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="text-indigo-600" size={32} />
            Library Basics
          </h1>
          <p className="text-gray-600 mt-2">
            Configure library rules and master data for {schoolCode}
          </p>
        </div>
      </motion.div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <CheckCircle size={20} />
          {success}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}

      {/* Library Rules */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Library Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Borrow Period (Days) *
            </label>
            <Input
              type="number"
              min="1"
              value={settings.borrow_days}
              onChange={(e) => setSettings({ ...settings, borrow_days: parseInt(e.target.value) || 14 })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Books Allowed (Student) *
            </label>
            <Input
              type="number"
              min="1"
              value={settings.max_books_student}
              onChange={(e) => setSettings({ ...settings, max_books_student: parseInt(e.target.value) || 3 })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Books Allowed (Staff) *
            </label>
            <Input
              type="number"
              min="1"
              value={settings.max_books_staff}
              onChange={(e) => setSettings({ ...settings, max_books_staff: parseInt(e.target.value) || 5 })}
            />
          </div>
        </div>
      </Card>

      {/* Fine Configuration */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Fine Configuration</h2>
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Set either per-day fine OR fixed fine, not both.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lost Book Fine (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.lost_book_fine}
                onChange={(e) => setSettings({ ...settings, lost_book_fine: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Damaged Book Fine (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.damaged_book_fine}
                onChange={(e) => setSettings({ ...settings, damaged_book_fine: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button onClick={handleSaveSettings} disabled={saving}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Library Sections */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Library Sections</h2>
            <Button size="sm" onClick={() => {
              setEditingSection(null);
              setSectionForm({ name: '', material_type: 'Books' });
              setSectionModalOpen(true);
            }}>
              <Plus size={16} className="mr-1" />
              Add Section
            </Button>
          </div>
          <div className="space-y-2">
            {sections.map((section) => (
              <div
                key={section.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-300 transition-all"
              >
                <div>
                  <p className="font-medium text-gray-900">{section.name}</p>
                  <p className="text-sm text-gray-600">{section.material_type}</p>
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
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteSection(section.id)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
            {sections.length === 0 && (
              <p className="text-center text-gray-500 py-8">No sections added yet</p>
            )}
          </div>
        </Card>

        {/* Material Types */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Material Types</h2>
            <Button size="sm" onClick={() => {
              setEditingType(null);
              setTypeForm({ name: '' });
              setTypeModalOpen(true);
            }}>
              <Plus size={16} className="mr-1" />
              Add Type
            </Button>
          </div>
          <div className="space-y-2">
            {materialTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-300 transition-all"
              >
                <p className="font-medium text-gray-900">{type.name}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingType(type);
                      setTypeForm({ name: type.name });
                      setTypeModalOpen(true);
                    }}
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteType(type.id)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
            {materialTypes.length === 0 && (
              <p className="text-center text-gray-500 py-8">No material types added yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Section Modal */}
      {sectionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingSection ? 'Edit Section' : 'Add Section'}
                </h2>
                <button
                  onClick={() => {
                    setSectionModalOpen(false);
                    setEditingSection(null);
                    setSectionForm({ name: '', material_type: 'Books' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section Name *
                </label>
                <Input
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                  placeholder="e.g., Fiction, Non-Fiction"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material Type *
                </label>
                <select
                  value={sectionForm.material_type}
                  onChange={(e) => setSectionForm({ ...sectionForm, material_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Books">Books</option>
                  <option value="Magazines">Magazines</option>
                  <option value="Reference">Reference</option>
                  <option value="Journals">Journals</option>
                  <option value="Digital">Digital</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setSectionModalOpen(false);
                setEditingSection(null);
                setSectionForm({ name: '', material_type: 'Books' });
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveSection} disabled={saving || !sectionForm.name.trim()}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingType ? 'Edit Material Type' : 'Add Material Type'}
                </h2>
                <button
                  onClick={() => {
                    setTypeModalOpen(false);
                    setEditingType(null);
                    setTypeForm({ name: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material Type Name *
                </label>
                <Input
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ name: e.target.value })}
                  placeholder="e.g., Book, Journal, Magazine"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setTypeModalOpen(false);
                setEditingType(null);
                setTypeForm({ name: '' });
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveType} disabled={saving || !typeForm.name.trim()}>
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
  );
}

