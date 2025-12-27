'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Car, Plus, Edit, Trash2, Loader2, X, Save, AlertCircle, CheckCircle } from 'lucide-react';

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
    type: 'Bus',
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
        type: 'Bus',
        description: '',
      });
    }
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
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
          ...formData,
          seats: parseInt(formData.seats),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(editingVehicle ? 'Vehicle updated successfully!' : 'Vehicle created successfully!');
        setModalOpen(false);
        fetchVehicles();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to save vehicle');
      }
    } catch (err) {
      console.error('Error saving vehicle:', err);
      setError('Failed to save vehicle');
    } finally {
      setSaving(false);
    }
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Car className="text-indigo-600" size={32} />
              Vehicles Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage transport vehicles for {schoolCode}
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={18} className="mr-2" />
            Add Vehicle
          </Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle, index) => (
          <motion.div
            key={vehicle.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {vehicle.vehicle_code}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {vehicle.registration_number}
                  </p>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">Type:</span> {vehicle.type}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Capacity:</span> {vehicle.seats} seats
                    </p>
                    {vehicle.description && (
                      <p className="text-gray-600">
                        <span className="font-medium">Description:</span> {vehicle.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal(vehicle)}
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(vehicle.id)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {vehicles.length === 0 && (
        <Card className="p-12 text-center">
          <Car className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">No vehicles found</p>
          <p className="text-gray-500 text-sm mt-2">Add your first vehicle to get started</p>
        </Card>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Code *
                </label>
                <Input
                  value={formData.vehicle_code}
                  onChange={(e) => setFormData({ ...formData, vehicle_code: e.target.value })}
                  placeholder="e.g., VH001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Number *
                </label>
                <Input
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  placeholder="e.g., AP01AB1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Seats *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.seats}
                  onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                  placeholder="e.g., 50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Bus">Bus</option>
                  <option value="Van">Van</option>
                  <option value="Car">Car</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
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

