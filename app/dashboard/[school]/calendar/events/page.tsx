'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import {  Plus, Edit, Trash2, Calendar, X, Download, Upload } from 'lucide-react';

interface Event {
  id: string;
  event_date: string;
  title: string;
  description: string | null;
  event_type: 'event' | 'holiday';
  applicable_for: 'all' | 'students' | 'staff' | 'specific_class';
  applicable_classes: string[] | null;
  is_active: boolean;
  color?: string | null;
}

interface GroupedEvent extends Event {
  start_date: string;
  end_date: string;
  ids: string[];
}

export default function EventsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/calendar/events?school_code=${schoolCode}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setEvents(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch(`/api/classes?school_code=${schoolCode}`);
      const json = await res.json();
      if (res.ok && json.data) {
        const unique: string[] = Array.from(
          new Set(json.data.map((c: any) => c.class).filter(Boolean))
        );
        setClasses(unique.sort());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const groupedEvents: GroupedEvent[] = useMemo(() => {
    const map = new Map<string, GroupedEvent>();

    for (const e of events) {
      const key = [
        e.title,
        e.event_type,
        e.applicable_for,
        JSON.stringify(e.applicable_classes ?? []),
        e.description ?? '',
        e.color ?? '',
      ].join('|');

      if (!map.has(key)) {
        map.set(key, {
          ...e,
          start_date: e.event_date,
          end_date: e.event_date,
          ids: [e.id],
        });
      } else {
        const item = map.get(key)!;
        item.ids.push(e.id);
        if (e.event_date < item.start_date) item.start_date = e.event_date;
        if (e.event_date > item.end_date) item.end_date = e.event_date;
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => a.start_date.localeCompare(b.start_date)
    );
  }, [events]);

  const handleDelete = async (ids: string[]) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await Promise.all(
        ids.map(id =>
          fetch(`/api/calendar/events/${id}?school_code=${schoolCode}`, {
            method: 'DELETE',
          })
        )
      );
      fetchEvents();
    } catch (e) {
      alert('Failed to delete event');
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const renderDate = (e: GroupedEvent) =>
    e.start_date === e.end_date
      ? formatDate(e.start_date)
      : `${formatDate(e.start_date)} – ${formatDate(e.end_date)}`;

  const handleDownloadTemplate = () => {
    window.open('/api/calendar/events/template', '_blank');
  };

  const handleBulkImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportMessage(null);

    const fd = new FormData();
    fd.set('file', file);
    fd.set('school_code', schoolCode);

    try {
      const res = await fetch('/api/calendar/events/bulk-import', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (res.ok) {
        setImportMessage({ type: 'success', text: json.message });
        fetchEvents();
      } else {
        setImportMessage({ type: 'error', text: json.error });
      }
    } catch {
      setImportMessage({ type: 'error', text: 'Import failed' });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-black" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calendar /> Events & Holidays
        </h1>

        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => { setEditingEvent(null); setShowAddModal(true); }}>
            <Plus size={16} /> Add Event
          </Button>

          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download size={16} /> Template
          </Button>

          <label className="border px-4 py-2 rounded cursor-pointer">
            <input type="file" hidden onChange={handleBulkImportFile} />
            <Upload size={16} /> {importing ? 'Importing…' : 'Bulk Import'}
          </label>

        
        </div>
      </div>

      {importMessage && (
        <div className={`p-3 rounded ${
          importMessage.type === 'success' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {importMessage.text}
        </div>
      )}

      <Card className="p-0 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Applicable For</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {groupedEvents.map(e => (
              <tr key={e.start_date + e.title} className="border-t">
                <td className="p-3">{renderDate(e)}</td>
                <td className="p-3 font-medium">{e.title}</td>
                <td className="p-3 capitalize">{e.event_type}</td>
                <td className="p-3">
                  {e.applicable_for === 'specific_class'
                    ? e.applicable_classes?.join(', ')
                    : e.applicable_for.toUpperCase()}
                </td>
                <td className="p-3">{e.description || '—'}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => { setEditingEvent(e); setShowAddModal(true); }}>
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(e.ids)}>
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showAddModal && (
        <EventModal
          schoolCode={schoolCode}
          event={editingEvent}
          classes={classes}
          onClose={() => { setShowAddModal(false); setEditingEvent(null); }}
          onSuccess={fetchEvents}
        />
      )}
    </div>
  );
}

/* -------- MODAL UNCHANGED -------- */

// Event Modal Component
function EventModal({
  schoolCode,
  event,
  classes,
  onClose,
  onSuccess,
}: {
  schoolCode: string;
  event: Event | null;
  classes: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    start_date: event?.event_date?.toString().split('T')[0] || '',
    end_date: event?.event_date?.toString().split('T')[0] || '',
    title: event?.title || '',
    description: event?.description || '',
    event_type: event?.event_type || 'event' as 'event' | 'holiday',
    applicable_for: event?.applicable_for || 'all' as 'all' | 'students' | 'staff' | 'specific_class',
    applicable_classes: event?.applicable_classes || [],
    color: event?.color || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.start_date || !formData.title) {
      alert('Please fill in Start date and Title');
      return;
    }
    const end = formData.end_date || formData.start_date;
    if (end < formData.start_date) {
      alert('End date must be on or after start date');
      return;
    }

    if (formData.applicable_for === 'specific_class' && formData.applicable_classes.length === 0) {
      alert('Please select at least one class');
      return;
    }

    setSaving(true);
    try {
      if (event) {
        const response = await fetch(`/api/calendar/events/${event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            event_date: formData.start_date,
            title: formData.title,
            description: formData.description,
            event_type: formData.event_type,
            applicable_for: formData.applicable_for,
            applicable_classes: formData.applicable_for === 'specific_class' ? formData.applicable_classes : null,
            color: formData.color || undefined,
          }),
        });
        const result = await response.json();
        if (response.ok) {
          onSuccess();
          onClose();
          alert('Event updated successfully! It will now be visible in the Academic Calendar.');
        } else {
          alert(result.error || 'Failed to update event');
        }
      } else {
        const response = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            start_date: formData.start_date,
            end_date: end,
            title: formData.title,
            description: formData.description,
            event_type: formData.event_type,
            applicable_for: formData.applicable_for,
            applicable_classes: formData.applicable_for === 'specific_class' ? formData.applicable_classes : null,
            color: formData.color || undefined,
          }),
        });
        const result = await response.json();
        if (response.ok) {
          onSuccess();
          onClose();
          const count = result.created_count ?? 1;
          alert(`Event${count > 1 ? ` (${count} days)` : ''} created successfully! It will now be visible in the Academic Calendar.`);
        } else {
          alert(result.error || 'Failed to create event');
        }
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert(`Failed to ${event ? 'update' : 'create'} event. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const toggleClass = (className: string) => {
    setFormData(prev => ({
      ...prev,
      applicable_classes: prev.applicable_classes.includes(className)
        ? prev.applicable_classes.filter(c => c !== className)
        : [...prev.applicable_classes, className],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="m-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {event ? 'Edit Event' : 'Add Event'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value, end_date: prev.end_date || e.target.value }))}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Date only (no time)</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End date
                </label>
                <Input
                  type="date"
                  value={formData.end_date}
                  min={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Same as start for one day; e.g. 20–23 for multi-day</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value as 'event' | 'holiday' }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  required
                >
                  <option value="event">Event</option>
                  <option value="holiday">Holiday</option>
                  <option value="holiday">Others</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                placeholder="e.g., Independence Day, Annual Sports Day"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter event description..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Color (for Academic Calendar)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {['', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'].map((hex) => (
                  <button
                    key={hex || 'none'}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: hex }))}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      (formData.color || '') === hex ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-400' : 'border-gray-200 hover:border-gray-400'
                    } ${hex ? '' : 'bg-gray-100 flex items-center justify-center text-xs text-gray-500'}`}
                    style={hex ? { backgroundColor: hex } : undefined}
                    title={hex ? hex : 'Default (no color)'}
                  >
                    {!hex && '—'}
                  </button>
                ))}
                <input
                  type="color"
                  value={formData.color && /^#([0-9A-Fa-f]{3}){1,2}$/.test(formData.color) ? formData.color : '#3B82F6'}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                  title="Custom color"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Applicable For <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.applicable_for}
                onChange={(e) => setFormData(prev => ({ ...prev, applicable_for: e.target.value as 'all' | 'students' | 'staff', applicable_classes: [] }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                required
              >
                <option value="all">All (Students & Staff)</option>
                <option value="students">Students Only</option>
                <option value="staff">Staff Only</option>
                <option value="specific_class">Specific Classes</option>
              </select>
            </div>

            {formData.applicable_for === 'specific_class' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Classes <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {classes.map(cls => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => toggleClass(cls)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          formData.applicable_classes.includes(cls)
                            ? 'bg-[#1E3A8A] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] hover:from-[#1E40AF] hover:to-[#2563EB] text-white">
                {saving ? 'Saving...' : (event ? 'Update' : 'Add Event')}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

