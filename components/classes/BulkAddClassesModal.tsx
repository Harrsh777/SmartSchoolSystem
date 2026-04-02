'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Plus, Trash2 } from 'lucide-react';

interface BulkAddClassesModalProps {
  schoolCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ClassEntry {
  id: string;
  class: string;
  section: string;
}

export default function BulkAddClassesModal({
  schoolCode,
  onClose,
  onSuccess,
}: BulkAddClassesModalProps) {
  const [saving, setSaving] = useState(false);
  const [academicYear, setAcademicYear] = useState<string>('');
  const [loadingAcademicYear, setLoadingAcademicYear] = useState(true);
  const [classes, setClasses] = useState<ClassEntry[]>([
    { id: '1', class: '', section: '' },
  ]);

  const handleAddRow = () => {
    const newId = String(Date.now());
    setClasses([...classes, { id: newId, class: '', section: '' }]);
  };

  const handleRemoveRow = (id: string) => {
    if (classes.length > 1) {
      setClasses(classes.filter(c => c.id !== id));
    }
  };

  const handleClassChange = (id: string, field: 'class' | 'section', value: string) => {
    const processedValue = field === 'class' || field === 'section' ? value.toUpperCase() : value;
    setClasses(classes.map(c => 
      c.id === id ? { ...c, [field]: processedValue } : c
    ));
  };

  useEffect(() => {
    const fetchCurrentAcademicYear = async () => {
      try {
        setLoadingAcademicYear(true);
        const response = await fetch(
          `/api/schools/current-academic-year?school_code=${encodeURIComponent(schoolCode)}`
        );
        const result = await response.json();
        if (response.ok) {
          setAcademicYear(String(result.current_academic_year || result.data || '').trim());
        } else {
          setAcademicYear('');
          alert(result.error || 'Setup academic year first from Academic Year Management module.');
        }
      } catch {
        setAcademicYear('');
        alert('Failed to load current academic year');
      } finally {
        setLoadingAcademicYear(false);
      }
    };
    fetchCurrentAcademicYear();
  }, [schoolCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const invalidClasses = classes.filter(c => !c.class.trim() || !c.section.trim());
    if (invalidClasses.length > 0) {
      alert('Please fill in all class and section fields');
      return;
    }

    if (!academicYear.trim()) {
      alert('Setup academic year first from Academic Year Management module.');
      return;
    }

    // Check for duplicates within the form
    const classKeys = classes.map(c => `${c.class}-${c.section}`);
    const duplicates = classKeys.filter((key, index) => classKeys.indexOf(key) !== index);
    if (duplicates.length > 0) {
      alert('Duplicate class-section combinations found. Please remove duplicates.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/classes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          academic_year: academicYear,
          classes: classes.map(c => ({
            class: c.class.trim(),
            section: c.section.trim(),
          })),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        alert(result.error || 'Failed to create classes');
        if (result.details) {
          console.error('Bulk create error details:', result.details);
        }
      }
    } catch (error) {
      console.error('Error creating classes:', error);
      alert('Failed to create classes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <Card className="relative flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h2 className="text-2xl font-bold text-black">Bulk Add Classes</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-4">
              {/* Academic Year */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={academicYear}
                  readOnly
                  required
                  placeholder={loadingAcademicYear ? 'Loading academic year...' : 'Not configured'}
                  className="max-w-xs bg-gray-50 cursor-not-allowed"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This academic year is auto-fetched from Academic Year Management and will be applied to all classes below
                </p>
              </div>

              {/* Classes Table */}
              <div className="min-h-0">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Classes <span className="text-red-500">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRow}
                  >
                    <Plus size={16} className="mr-2" />
                    Add Row
                  </Button>
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[45vh] border border-gray-100 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {classes.map((classEntry) => (
                        <tr key={classEntry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Input
                              type="text"
                              value={classEntry.class}
                              onChange={(e) => handleClassChange(classEntry.id, 'class', e.target.value)}
                              required
                              placeholder="e.g., 10"
                              className="uppercase"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="text"
                              value={classEntry.section}
                              onChange={(e) => handleClassChange(classEntry.id, 'section', e.target.value)}
                              required
                              placeholder="e.g., A"
                              className="uppercase"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {classes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(classEntry.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove row"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {classes.length} class{classes.length !== 1 ? 'es' : ''} will be created
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white flex justify-end gap-3 pt-4 border-t border-gray-200 flex-shrink-0">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || loadingAcademicYear || !academicYear.trim()}>
                {saving ? 'Creating...' : `Create ${classes.length} Class${classes.length !== 1 ? 'es' : ''}`}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

