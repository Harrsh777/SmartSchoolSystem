'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Plus, Edit2, Trash2, Search, CheckCircle, AlertCircle, Loader2, DollarSign } from 'lucide-react';

interface FeeHead {
  id: string;
  name: string;
  description: string | null;
  is_optional: boolean;
  is_active: boolean;
  created_at: string;
}

export default function FeeHeadsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingHead, setEditingHead] = useState<FeeHead | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_optional: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFeeHeads = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/v2/fees/fee-heads?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok) {
        setFeeHeads(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch fee heads');
      }
    } catch (err) {
      setError('Failed to load fee heads');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchFeeHeads();
  }, [fetchFeeHeads]);

  const handleCreate = () => {
    setEditingHead(null);
    setFormData({ name: '', description: '', is_optional: false });
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleEdit = (head: FeeHead) => {
    setEditingHead(head);
    setFormData({
      name: head.name,
      description: head.description || '',
      is_optional: head.is_optional,
    });
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Fee head name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const url = editingHead
        ? `/api/v2/fees/fee-heads/${editingHead.id}`
        : '/api/v2/fees/fee-heads';
      const method = editingHead ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_optional: formData.is_optional,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(editingHead ? 'Fee head updated successfully' : 'Fee head created successfully');
        setShowModal(false);
        fetchFeeHeads();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to save fee head');
      }
    } catch (err) {
      setError('Failed to save fee head');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (head: FeeHead) => {
    if (!confirm(`Are you sure you want to delete "${head.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      const response = await fetch(`/api/v2/fees/fee-heads/${head.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Fee head deleted successfully');
        fetchFeeHeads();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to delete fee head');
      }
    } catch (err) {
      setError('Failed to delete fee head');
      console.error(err);
    }
  };

  const filteredHeads = feeHeads.filter(head =>
    head.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    head.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}>
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <DollarSign size={32} className="text-indigo-600" />
              Fee Heads Management
            </h1>
            <p className="text-gray-600">Manage fee types (Tuition, Transport, Library, etc.)</p>
          </div>
        </div>
        <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus size={18} className="mr-2" />
          Create Fee Head
        </Button>
      </motion.div>

      {/* Messages */}
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

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Search fee heads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Fee Heads List */}
      <Card>
        <div className="space-y-3">
          {filteredHeads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'No fee heads found matching your search' : 'No fee heads created yet'}
            </div>
          ) : (
            filteredHeads.map((head) => (
              <motion.div
                key={head.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{head.name}</h3>
                    {head.is_optional && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Optional</span>
                    )}
                    {!head.is_active && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Inactive</span>
                    )}
                  </div>
                  {head.description && (
                    <p className="text-sm text-gray-600 mt-1">{head.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(head)}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    <Edit2 size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(head)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingHead ? 'Edit Fee Head' : 'Create Fee Head'}
            </h2>

            <div className="space-y-4">
              <Input
                label="Fee Head Name *"
                placeholder="e.g., Tuition Fee, Transport Fee"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!formData.name.trim() ? 'Name is required' : ''}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Optional description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_optional"
                  checked={formData.is_optional}
                  onChange={(e) => setFormData({ ...formData, is_optional: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="is_optional" className="text-sm text-gray-700">
                  Mark as optional (students can opt out)
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
