'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface DetectedClass {
  class: string;
  section: string;
  academic_year: string;
  student_count: number;
  exists: boolean;
}

interface DetectClassesModalProps {
  schoolCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DetectClassesModal({
  schoolCode,
  onClose,
  onSuccess,
}: DetectClassesModalProps) {
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detectedClasses, setDetectedClasses] = useState<DetectedClass[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchDetectedClasses();
  }, [schoolCode]);

  const fetchDetectedClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/classes/detect?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setDetectedClasses(result.data);
        // Pre-select classes that don't exist
        const indices = result.data
          .map((cls: DetectedClass, idx: number) => !cls.exists ? idx : -1)
          .filter((idx: number) => idx !== -1);
        setSelectedClasses(new Set(indices));
      }
    } catch (err) {
      console.error('Error detecting classes:', err);
      alert('Failed to detect classes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClass = (index: number) => {
    const newSelected = new Set(selectedClasses);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedClasses(newSelected);
  };

  const handleCreate = async () => {
    if (selectedClasses.size === 0) {
      alert('Please select at least one class to create.');
      return;
    }

    const classesToCreate = Array.from(selectedClasses).map(idx => detectedClasses[idx]);

    setDetecting(true);
    try {
      const response = await fetch('/api/classes/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          classes: classesToCreate,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Successfully created ${result.created} class(es)!`);
        onSuccess();
      } else {
        alert(result.error || 'Failed to create classes');
      }
    } catch (error) {
      console.error('Error creating classes:', error);
      alert('Failed to create classes. Please try again.');
    } finally {
      setDetecting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Detecting classes from students...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl"
      >
        <Card className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black">Detect Classes from Students</h2>
              <p className="text-gray-600 mt-1">Select classes to create from your student data</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          {detectedClasses.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg mb-2">No classes detected</p>
              <p className="text-gray-500 text-sm">
                Add students first to automatically detect classes
              </p>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600">
                  Found <span className="font-semibold">{detectedClasses.length}</span> unique class combinations from your students.
                  {detectedClasses.filter(c => c.exists).length > 0 && (
                    <span className="ml-2">
                      <span className="font-semibold">{detectedClasses.filter(c => c.exists).length}</span> already exist.
                    </span>
                  )}
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 w-12"></th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Class</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Section</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Academic Year</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Students</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detectedClasses.map((cls, index) => (
                      <tr
                        key={`${cls.class}-${cls.section}-${cls.academic_year}`}
                        className={`border-b border-gray-100 ${
                          cls.exists ? 'bg-gray-50' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedClasses.has(index)}
                            onChange={() => handleToggleClass(index)}
                            disabled={cls.exists}
                            className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium text-black">{cls.class}</td>
                        <td className="py-3 px-4 text-gray-700">{cls.section}</td>
                        <td className="py-3 px-4 text-gray-700">{cls.academic_year}</td>
                        <td className="py-3 px-4 text-gray-700">{cls.student_count}</td>
                        <td className="py-3 px-4">
                          {cls.exists ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Already exists
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              New
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {selectedClasses.size} class(es) selected
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={selectedClasses.size === 0 || detecting}
                  >
                    {detecting ? 'Creating...' : `Create ${selectedClasses.size} Class(es)`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

