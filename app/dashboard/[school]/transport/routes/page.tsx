'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Route, Plus, Edit, Trash2, Loader2, X, Save, AlertCircle, CheckCircle, Bus, MapPin } from 'lucide-react';

interface Stop {
  id: string;
  name: string;
  pickup_fare: number;
  drop_fare: number;
}

interface Vehicle {
  id: string;
  vehicle_code: string;
  registration_number: string;
  seats: number;
}

interface RouteData {
  id: string;
  route_name: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  route_stops?: Stop[];
  is_active: boolean;
}

export default function RoutesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteData | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    route_name: '',
    vehicle_id: '',
    stop_ids: [] as string[],
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [routesRes, vehiclesRes, stopsRes] = await Promise.all([
        fetch(`/api/transport/routes?school_code=${schoolCode}`),
        fetch(`/api/transport/vehicles?school_code=${schoolCode}`),
        fetch(`/api/transport/stops?school_code=${schoolCode}`),
      ]);

      const routesData = await routesRes.json();
      const vehiclesData = await vehiclesRes.json();
      const stopsData = await stopsRes.json();

      if (routesRes.ok && routesData.data) {
        setRoutes(routesData.data);
      }
      if (vehiclesRes.ok && vehiclesData.data) {
        setVehicles(vehiclesData.data);
      }
      if (stopsRes.ok && stopsData.data) {
        setStops(stopsData.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (route?: RouteData) => {
    if (route) {
      setEditingRoute(route);
      setFormData({
        route_name: route.route_name,
        vehicle_id: route.vehicle_id,
        stop_ids: route.route_stops?.map((s) => s.id) || [],
      });
    } else {
      setEditingRoute(null);
      setFormData({
        route_name: '',
        vehicle_id: '',
        stop_ids: [],
      });
    }
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!formData.route_name || !formData.vehicle_id || formData.stop_ids.length === 0) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const url = editingRoute
        ? `/api/transport/routes/${editingRoute.id}`
        : '/api/transport/routes';
      const method = editingRoute ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(editingRoute ? 'Route updated successfully!' : 'Route created successfully!');
        setModalOpen(false);
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to save route');
      }
    } catch (err) {
      console.error('Error saving route:', err);
      setError('Failed to save route');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) {
      return;
    }

    try {
      const response = await fetch(`/api/transport/routes/${routeId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Route deleted successfully!');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete route');
      }
    } catch (err) {
      console.error('Error deleting route:', err);
      setError('Failed to delete route');
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
              <Route className="text-indigo-600" size={32} />
              Routes Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage transport routes for {schoolCode}
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={18} className="mr-2" />
            Add Route
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
        {routes.map((route, index) => (
          <motion.div
            key={route.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Bus size={20} className="text-indigo-600" />
                    {route.route_name}
                  </h3>
                  {route.vehicle && (
                    <p className="text-sm text-gray-600 mb-2">
                      Vehicle: {route.vehicle.vehicle_code} ({route.vehicle.registration_number})
                    </p>
                  )}
                  {route.route_stops && route.route_stops.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">Stops ({route.route_stops.length}):</p>
                      <div className="space-y-1">
                        {route.route_stops.slice(0, 3).map((stop) => (
                          <div key={stop.id} className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin size={12} />
                            {stop.name}
                          </div>
                        ))}
                        {route.route_stops.length > 3 && (
                          <p className="text-xs text-gray-500">+{route.route_stops.length - 3} more stops</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal(route)}
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(route.id)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {routes.length === 0 && (
        <Card className="p-12 text-center">
          <Route className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">No routes found</p>
          <p className="text-gray-500 text-sm mt-2">Add your first route to get started</p>
        </Card>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingRoute ? 'Edit Route' : 'Add New Route'}
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
                  Route Name *
                </label>
                <Input
                  value={formData.route_name}
                  onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                  placeholder="e.g., Route A - Downtown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle *
                </label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_code} - {vehicle.registration_number} ({vehicle.seats} seats)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stops * (Select in order)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {stops.map((stop) => {
                    const isSelected = formData.stop_ids.includes(stop.id);
                    const order = formData.stop_ids.indexOf(stop.id) + 1;
                    return (
                      <label
                        key={stop.id}
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                stop_ids: [...formData.stop_ids, stop.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                stop_ids: formData.stop_ids.filter((id) => id !== stop.id),
                              });
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{stop.name}</span>
                            {isSelected && (
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                Stop {order}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            Pickup: ₹{stop.pickup_fare} | Drop: ₹{stop.drop_fare}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {formData.stop_ids.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Selected {formData.stop_ids.length} stop(s)
                  </p>
                )}
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

