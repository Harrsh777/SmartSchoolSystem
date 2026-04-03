'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  normalizeBulkSectionInput,
  sanitizeSectionKeystroke,
} from '@/lib/classes/bulk-section';

const SECTION_SLOTS = 4 as const;

interface BulkAddClassesModalProps {
  schoolCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ClassEntry {
  id: string;
  class: string;
  /** Four section letter slots; empty strings ignored */
  sections: [string, string, string, string];
}

function emptyRow(): ClassEntry {
  return {
    id: String(Date.now() + Math.random()),
    class: '',
    sections: ['', '', '', ''],
  };
}

/** Merge rows: same class → union of sections (deduped, sorted). */
function buildClassSectionPairs(
  rows: ClassEntry[]
): { class: string; section: string }[] {
  const byClass = new Map<string, Set<string>>();

  for (const row of rows) {
    const cls = row.class.trim().toUpperCase();
    if (!cls) continue;

    if (!byClass.has(cls)) byClass.set(cls, new Set());
    const set = byClass.get(cls)!;

    for (const slot of row.sections) {
      const sec = normalizeBulkSectionInput(slot);
      if (sec) set.add(sec);
    }
  }

  const pairs: { class: string; section: string }[] = [];
  const sortedClasses = [...byClass.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  for (const cls of sortedClasses) {
    const secs = [...byClass.get(cls)!].sort();
    for (const section of secs) {
      pairs.push({ class: cls, section });
    }
  }
  return pairs;
}

export default function BulkAddClassesModal({
  schoolCode,
  onClose,
  onSuccess,
}: BulkAddClassesModalProps) {
  const [saving, setSaving] = useState(false);
  const [academicYear, setAcademicYear] = useState<string>('');
  const [loadingAcademicYear, setLoadingAcademicYear] = useState(true);
  const [classes, setClasses] = useState<ClassEntry[]>([emptyRow()]);

  const previewPairs = useMemo(() => buildClassSectionPairs(classes), [classes]);
  const previewCount = previewPairs.length;

  const handleAddRow = () => {
    setClasses((prev) => [...prev, emptyRow()]);
  };

  const handleRemoveRow = (id: string) => {
    setClasses((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  };

  const handleClassChange = (id: string, value: string) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, class: value.toUpperCase() } : c
      )
    );
  };

  const handleSectionChange = (
    id: string,
    slotIndex: number,
    value: string
  ) => {
    const cleaned = sanitizeSectionKeystroke(value);
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next = [...c.sections] as [string, string, string, string];
        next[slotIndex] = cleaned;
        return { ...c, sections: next };
      })
    );
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
          setAcademicYear(
            String(result.current_academic_year || result.data || '').trim()
          );
        } else {
          setAcademicYear('');
          alert(
            result.error ||
              'Setup academic year first from Academic Year Management module.'
          );
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

    if (!academicYear.trim()) {
      alert('Setup academic year first from Academic Year Management module.');
      return;
    }

    const rowsWithClass = classes.filter((c) => c.class.trim());
    if (rowsWithClass.length === 0) {
      alert('Enter at least one class name.');
      return;
    }

    for (const row of rowsWithClass) {
      const hasAnySection = row.sections.some(
        (s) => normalizeBulkSectionInput(s) !== null
      );
      if (!hasAnySection) {
        alert(
          `Add at least one section (A–Z) for class "${row.class.trim() || row.class}".`
        );
        return;
      }
      for (let i = 0; i < row.sections.length; i++) {
        const raw = row.sections[i].trim();
        if (!raw) continue;
        if (normalizeBulkSectionInput(raw) === null) {
          alert(
            `Invalid section for class "${row.class.trim()}": use a single letter A–Z only (slot ${i + 1}).`
          );
          return;
        }
      }
    }

    const pairs = buildClassSectionPairs(classes);
    if (pairs.length === 0) {
      alert('No valid class–section pairs to create.');
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
          classes: pairs,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const created = result.created ?? result.data?.length ?? 0;
        const skipped = result.skipped as
          | { class: string; section: string; reason: string }[]
          | undefined;
        if (skipped?.length) {
          const lines = skipped
            .slice(0, 25)
            .map((s) => `${s.class}-${s.section}: ${s.reason}`);
          const more =
            skipped.length > 25 ? `\n… and ${skipped.length - 25} more` : '';
          alert(
            created > 0
              ? `Created ${created} class(es).\n\nSkipped (${skipped.length}):\n${lines.join('\n')}${more}`
              : `No new classes created.\n\nSkipped (${skipped.length}):\n${lines.join('\n')}${more}`
          );
        } else if (created === 0 && result.message) {
          alert(result.message);
        }
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
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={academicYear}
                  readOnly
                  required
                  placeholder={
                    loadingAcademicYear ? 'Loading academic year...' : 'Not configured'
                  }
                  className="max-w-xs bg-gray-50 cursor-not-allowed"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Applied to all classes below (from Academic Year Management).
                </p>
              </div>

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

                <p className="text-sm text-gray-600 mb-3">
                  Enter a class name and up to four section letters (A–Z). Same
                  class on multiple rows merges sections. Empty boxes are ignored.
                </p>

                <div className="overflow-x-auto overflow-y-auto max-h-[45vh] border border-gray-100 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 min-w-[120px]">
                          Class
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          Sections (A–Z, one letter each)
                        </th>
                        <th className="px-4 py-3 w-20" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {classes.map((classEntry) => (
                        <tr key={classEntry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 align-top">
                            <Input
                              type="text"
                              value={classEntry.class}
                              onChange={(e) =>
                                handleClassChange(classEntry.id, e.target.value)
                              }
                              placeholder="e.g., 11"
                              className="uppercase max-w-[140px]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {Array.from({ length: SECTION_SLOTS }, (_, i) => (
                                <Input
                                  key={i}
                                  type="text"
                                  inputMode="text"
                                  autoComplete="off"
                                  maxLength={1}
                                  value={classEntry.sections[i]}
                                  onChange={(e) =>
                                    handleSectionChange(
                                      classEntry.id,
                                      i,
                                      e.target.value
                                    )
                                  }
                                  onPaste={(e) => {
                                    e.preventDefault();
                                    const t = sanitizeSectionKeystroke(
                                      e.clipboardData.getData('text') || ''
                                    );
                                    if (t) {
                                      handleSectionChange(classEntry.id, i, t);
                                    }
                                  }}
                                  placeholder="—"
                                  className="w-11 text-center uppercase font-semibold px-1"
                                  aria-label={`Section ${i + 1}`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
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
                  <span className="font-medium text-gray-700">{previewCount}</span>{' '}
                  class
                  {previewCount !== 1 ? 'es' : ''} will be created
                  {previewCount > 0 && (
                    <span className="text-gray-500 block sm:inline sm:ml-1 mt-1 sm:mt-0 break-words">
                      (
                      {previewPairs.length <= 20
                        ? previewPairs.map((p) => `${p.class}-${p.section}`).join(', ')
                        : `${previewPairs
                            .slice(0, 20)
                            .map((p) => `${p.class}-${p.section}`)
                            .join(', ')}… +${previewPairs.length - 20} more`}
                      )
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white flex justify-end gap-3 pt-4 border-t border-gray-200 flex-shrink-0">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  saving || loadingAcademicYear || !academicYear.trim() || previewCount === 0
                }
              >
                {saving
                  ? 'Creating...'
                  : `Create ${previewCount} class${previewCount !== 1 ? 'es' : ''}`}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
