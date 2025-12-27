'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { ArrowLeft, Plus, Edit, Trash2, Calendar, X } from 'lucide-react';

interface Event {
  id: string;
  event_date: string;
  title: string;
  description: string | null;
  event_type: 'event' | 'holiday';
  applicable_for: 'all' | 'students' | 'staff' | 'specific_class';
  applicable_classes: string[] | null;
  is_active: boolean;
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

  useEffect(() => {
    fetchEvents();
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/calendar/events?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setEvents(result.data);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        interface ClassData {
          class?: string;
          [key: string]: unknown;
        }
        const uniqueClasses = Array.from(new Set(result.data.map((c: ClassData) => c.class).filter(Boolean)));
        setClasses(uniqueClasses.sort());
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/events/${id}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchEvents();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Calendar size={32} />
            Events & Holidays
          </h1>
          <p className="text-gray-600">Manage school events and holidays</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setEditingEvent(null);
              setShowAddModal(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus size={18} className="mr-2" />
            Add Event
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/calendar/academic`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-teal-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Title</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Applicable For</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.length > 0 ? (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(event.event_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{event.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{event.event_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {event.applicable_for === 'specific_class' && event.applicable_classes
                        ? event.applicable_classes.join(', ')
                        : event.applicable_for.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                      {event.description || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingEvent(event);
                            setShowAddModal(true);
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No events found. Click &quot;Add Event&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <EventModal
          schoolCode={schoolCode}
          event={editingEvent}
          classes={classes}
          onClose={() => {
            setShowAddModal(false);
            setEditingEvent(null);
          }}
          onSuccess={fetchEvents}
        />
      )}
    </div>
  );
}

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
    event_date: event?.event_date || '',
    title: event?.title || '',
    description: event?.description || '',
    event_type: event?.event_type || 'event' as 'event' | 'holiday',
    applicable_for: event?.applicable_for || 'all' as 'all' | 'students' | 'staff' | 'specific_class',
    applicable_classes: event?.applicable_classes || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.event_date || !formData.title) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.applicable_for === 'specific_class' && formData.applicable_classes.length === 0) {
      alert('Please select at least one class');
      return;
    }

    setSaving(true);
    try {
      const url = event
        ? `/api/calendar/events/${event.id}`
        : '/api/calendar/events';
      const method = event ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
          applicable_classes: formData.applicable_for === 'specific_class' ? formData.applicable_classes : null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert(result.error || `Failed to ${event ? 'update' : 'create'} event`);
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
                  Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value as 'event' | 'holiday' }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                >
                  <option value="event">Event</option>
                  <option value="holiday">Holiday</option>
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
                Applicable For <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.applicable_for}
                onChange={(e) => setFormData(prev => ({ ...prev, applicable_for: e.target.value as 'all' | 'students' | 'staff', applicable_classes: [] }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
                            ? 'bg-orange-500 text-white'
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
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? 'Saving...' : (event ? 'Update' : 'Add Event')}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

