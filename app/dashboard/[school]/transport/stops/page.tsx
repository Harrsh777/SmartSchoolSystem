'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { MapPin, Plus, Edit, Trash2, Loader2, X, Save, AlertCircle, CheckCircle, DollarSign, ArrowLeft, Clock } from 'lucide-react';

interface Stop {
  id: string;
  name: string;
  pickup_fare: number;
  drop_fare: number;
  expected_pickup_time: string | null;
  expected_drop_time: string | null;
  is_active: boolean;
  created_at: string;
}

export default function StopsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    pickup_fare: '',
    drop_fare: '',
    expected_pickup_time: '',
    expected_drop_time: '',
  });

  useEffect(() => {
    fetchStops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchStops = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transport/stops?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setStops(result.data);
      } else {
        setError(result.error || 'Failed to load stops');
      }
    } catch (err) {
      console.error('Error fetching stops:', err);
      setError('Failed to load stops');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (stop?: Stop) => {
    if (stop) {
      setEditingStop(stop);
      setFormData({
        name: stop.name,
        pickup_fare: stop.pickup_fare.toString(),
        drop_fare: stop.drop_fare.toString(),
        expected_pickup_time: stop.expected_pickup_time || '',
        expected_drop_time: stop.expected_drop_time || '',
      });
    } else {
      setEditingStop(null);
      setFormData({
        name: '',
        pickup_fare: '',
        drop_fare: '',
        expected_pickup_time: '',
        expected_drop_time: '',
      });
    }
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingStop(null);
    setFormData({
      name: '',
      pickup_fare: '',
      drop_fare: '',
      expected_pickup_time: '',
      expected_drop_time: '',
    });
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Stop name is required.');
      return false;
    }
    if (!formData.pickup_fare || parseFloat(formData.pickup_fare) < 0) {
      setError('Pickup fare must be a valid number.');
      return false;
    }
    if (!formData.drop_fare || parseFloat(formData.drop_fare) < 0) {
      setError('Drop fare must be a valid number.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        school_code: schoolCode,
        name: formData.name.trim(),
        pickup_fare: parseFloat(formData.pickup_fare),
        drop_fare: parseFloat(formData.drop_fare),
        expected_pickup_time: formData.expected_pickup_time || null,
        expected_drop_time: formData.expected_drop_time || null,
      };

      if (editingStop) {
        // Update existing stop
        const response = await fetch(`/api/transport/stops/${editingStop.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok && result.data) {
          setSuccess('Stop updated successfully!');
          fetchStops();
          setTimeout(() => {
            handleCloseModal();
          }, 1500);
        } else {
          setError(result.error || result.details || 'Failed to update stop');
        }
      } else {
        // Create new stop
        const response = await fetch('/api/transport/stops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok && result.data) {
          setSuccess('Stop created successfully!');
          fetchStops();
          setTimeout(() => {
            handleCloseModal();
          }, 1500);
        } else {
          setError(result.error || result.details || 'Failed to create stop');
        }
      }
    } catch (err) {
      console.error('Error saving stop:', err);
      setError('An error occurred while saving the stop');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (stopId: string) => {
    if (!confirm('Are you sure you want to delete this stop? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/transport/stops/${stopId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Stop deleted successfully!');
        fetchStops();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || result.details || 'Failed to delete stop');
        setTimeout(() => setError(''), 5000);
      }
    } catch (err) {
      console.error('Error deleting stop:', err);
      setError('An error occurred while deleting the stop');
      setTimeout(() => setError(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#5A7A95] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading stops...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5EFEB] dark:bg-[#0f172a]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/transport`)}
                className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#6B9BB8] via-[#7DB5D3] to-[#8FC5E8] flex items-center justify-center shadow-lg">
                <MapPin className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transport Stops</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage pickup and drop locations</p>
              </div>
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#6B9BB8] hover:bg-[#5a8aa8]"
            >
              <Plus size={18} className="mr-2" />
              Add Stop
            </Button>
          </div>
        </motion.div>

        {/* Alerts */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-600 dark:text-red-400 hover:text-red-800">
              <X size={18} />
            </button>
          </motion.div>
        )}

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

        {/* Stops Grid */}
        {stops.length === 0 ? (
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-12 text-center">
            <MapPin className="mx-auto mb-4 text-gray-400" size={64} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Stops Created</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by creating your first transport stop</p>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#6B9BB8] hover:bg-[#5a8aa8]"
            >
              <Plus size={18} className="mr-2" />
              Create First Stop
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stops.map((stop, index) => (
              <motion.div
                key={stop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60 dark:border-gray-700/50 p-6 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center">
                          <MapPin className="text-white" size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{stop.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenModal(stop)}
                        className="border-[#6B9BB8]/30 text-[#6B9BB8] hover:bg-[#6B9BB8]/10"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(stop.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="text-[#6B9BB8] dark:text-[#7DB5D3]" size={16} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pickup Fare</span>
                      </div>
                      <span className="text-lg font-bold text-[#6B9BB8] dark:text-[#7DB5D3]">₹{stop.pickup_fare}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="text-[#6B9BB8] dark:text-[#7DB5D3]" size={16} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop Fare</span>
                      </div>
                      <span className="text-lg font-bold text-[#6B9BB8] dark:text-[#7DB5D3]">₹{stop.drop_fare}</span>
                    </div>

                    {stop.expected_pickup_time && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock size={14} />
                        <span>Pickup: {stop.expected_pickup_time}</span>
                      </div>
                    )}

                    {stop.expected_drop_time && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock size={14} />
                        <span>Drop: {stop.expected_drop_time}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingStop ? 'Edit Stop' : 'Create New Stop'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stop Name *
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Downtown Plaza"
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Pickup Fare (₹) *
                    </label>
                    <Input
                      name="pickup_fare"
                      type="number"
                      value={formData.pickup_fare}
                      onChange={handleInputChange}
                      placeholder="500"
                      min="0"
                      step="0.01"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Drop Fare (₹) *
                    </label>
                    <Input
                      name="drop_fare"
                      type="number"
                      value={formData.drop_fare}
                      onChange={handleInputChange}
                      placeholder="500"
                      min="0"
                      step="0.01"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expected Pickup Time
                    </label>
                    <Input
                      name="expected_pickup_time"
                      type="time"
                      value={formData.expected_pickup_time}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expected Drop Time
                    </label>
                    <Input
                      name="expected_drop_time"
                      type="time"
                      value={formData.expected_drop_time}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="text-red-600 dark:text-red-400" size={16} />
                    <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircle className="text-green-600 dark:text-green-400" size={16} />
                    <p className="text-green-800 dark:text-green-300 text-sm">{success}</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={handleCloseModal} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
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
                      {editingStop ? 'Update' : 'Create'} Stop
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
