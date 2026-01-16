'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Car, Plus, Edit, Trash2, Loader2, X, Save, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Vehicle {
  id: string;
  vehicle_code: string;
  registration_number: string;
  seats: number;
  type: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export default function VehiclesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    vehicle_code: '',
    registration_number: '',
    seats: '',
    type: 'bus',
    description: '',
  });

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transport/vehicles?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setVehicles(result.data);
      } else {
        setError(result.error || 'Failed to load vehicles');
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        vehicle_code: vehicle.vehicle_code,
        registration_number: vehicle.registration_number,
        seats: vehicle.seats.toString(),
        type: vehicle.type,
        description: vehicle.description || '',
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        vehicle_code: '',
        registration_number: '',
        seats: '',
        type: 'bus',
        description: '',
      });
    }
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    // Validate form
    if (!formData.vehicle_code.trim()) {
      setError('Vehicle code is required');
      return;
    }
    if (!formData.registration_number.trim()) {
      setError('Registration number is required');
      return;
    }
    if (!formData.seats || parseInt(formData.seats) < 1) {
      setError('Number of seats must be at least 1');
      return;
    }
    if (parseInt(formData.seats) > 200) {
      setError('Number of seats cannot exceed 200');
      return;
    }
    if (!formData.type) {
      setError('Vehicle type is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const url = editingVehicle
        ? `/api/transport/vehicles/${editingVehicle.id}`
        : '/api/transport/vehicles';
      const method = editingVehicle ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          vehicle_code: formData.vehicle_code.trim(),
          registration_number: formData.registration_number.trim(),
          seats: parseInt(formData.seats),
          type: formData.type,
          description: formData.description.trim() || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(editingVehicle ? 'Vehicle updated successfully!' : 'Vehicle created successfully!');
        setModalOpen(false);
        fetchVehicles();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorMessage = result.error || 'Failed to save vehicle';
        const details = result.details ? `\n\nDetails: ${result.details}` : '';
        const hint = result.hint ? `\n\nHint: ${result.hint}` : '';
        setError(`${errorMessage}${details}${hint}`);
        console.error('Vehicle save error:', result);
      }
    } catch (err) {
      console.error('Error saving vehicle:', err);
      setError(`Failed to save vehicle: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const capitalizeType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      const response = await fetch(`/api/transport/vehicles/${vehicleId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Vehicle deleted successfully!');
        fetchVehicles();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete vehicle');
      }
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setError('Failed to delete vehicle');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#5A7A95] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading vehicles...</p>
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
                onClick={() => router.push(`/dashboard/${schoolCode}/transport`)}
                className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg">
                <Car className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vehicles Management</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage transport vehicles for {schoolCode}</p>
              </div>
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#5A7A95] hover:bg-[#4a6a85]"
            >
              <Plus size={18} className="mr-2" />
              Add Vehicle
            </Button>
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
            <button
              onClick={() => setError('')}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex-shrink-0"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}

        {vehicles.length === 0 ? (
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-12 text-center">
            <Car className="mx-auto mb-4 text-gray-400" size={64} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Vehicles Added</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by adding your first transport vehicle</p>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#5A7A95] hover:bg-[#4a6a85]"
            >
              <Plus size={18} className="mr-2" />
              Add First Vehicle
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((vehicle, index) => (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60 dark:border-gray-700/50 p-6 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] flex items-center justify-center">
                          <Car className="text-white" size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {vehicle.vehicle_code}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mb-3">
                        {vehicle.registration_number}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
                          <span className="px-2 py-1 bg-[#5A7A95]/10 text-[#5A7A95] dark:bg-[#6B9BB8]/20 dark:text-[#6B9BB8] rounded text-xs font-semibold">
                            {capitalizeType(vehicle.type)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Capacity</span>
                          <span className="text-sm font-bold text-[#5A7A95] dark:text-[#6B9BB8]">{vehicle.seats} seats</span>
                        </div>
                        {vehicle.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                            {vehicle.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenModal(vehicle)}
                      className="flex-1 border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10 dark:border-[#6B9BB8]/30 dark:text-[#6B9BB8]"
                    >
                      <Edit size={14} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(vehicle.id)}
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                  </h2>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vehicle Code *
                  </label>
                  <Input
                    value={formData.vehicle_code}
                    onChange={(e) => setFormData({ ...formData, vehicle_code: e.target.value })}
                    placeholder="e.g., BUS001"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Registration Number *
                  </label>
                  <Input
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    placeholder="e.g., AP01AB1234"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Seats *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="200"
                    value={formData.seats}
                    onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                    placeholder="e.g., 50"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vehicle Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8]"
                  >
                    <option value="bus">Bus</option>
                    <option value="van">Van</option>
                    <option value="auto">Auto</option>
                    <option value="bike">Bike</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8]"
                    rows={3}
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-[#5A7A95] hover:bg-[#4a6a85]">
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

