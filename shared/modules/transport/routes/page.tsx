'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Route, Plus, Edit, Trash2, Loader2, X, Save, AlertCircle, CheckCircle, Bus, MapPin, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#567C8D] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading routes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-6 soft-shadow-md"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/transport`)}
                className="border-[#2C3E50]/30 text-[#2C3E50] hover:bg-[#2C3E50]/10 dark:border-[#4A707A]/30 dark:text-[#5A879A] dark:hover:bg-[#4A707A]/10"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
              <div className="w-14 h-14 rounded-xl bg-[#2C3E50] dark:bg-[#4A707A] flex items-center justify-center soft-shadow">
                <Route className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Routes Management</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage transport routes for {schoolCode}</p>
              </div>
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#567C8D] hover:bg-[#456a7d]"
            >
              <Plus size={18} className="mr-2" />
              Add Route
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
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-600 dark:text-red-400 hover:text-red-800">
              <X size={18} />
            </button>
          </motion.div>
        )}

        {routes.length === 0 ? (
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-12 text-center">
            <Route className="mx-auto mb-4 text-gray-400" size={64} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Routes Created</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by creating your first transport route</p>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#567C8D] hover:bg-[#456a7d]"
            >
              <Plus size={18} className="mr-2" />
              Create First Route
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route, index) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60 dark:border-gray-700/50 p-6 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#567C8D] to-[#5A7A95] flex items-center justify-center">
                          <Bus className="text-white" size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {route.route_name}
                        </h3>
                      </div>
                      {route.vehicle && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span className="font-medium">Vehicle:</span> {route.vehicle.vehicle_code} ({route.vehicle.seats} seats)
                        </p>
                      )}
                      {route.route_stops && route.route_stops.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Stops ({route.route_stops.length}):
                          </p>
                          <div className="space-y-1">
                            {route.route_stops.slice(0, 3).map((stop, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <MapPin size={12} className="text-[#567C8D] dark:text-[#5A7A95]" />
                                <span>{stop.name}</span>
                              </div>
                            ))}
                            {route.route_stops.length > 3 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                +{route.route_stops.length - 3} more stops
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenModal(route)}
                      className="flex-1 border-[#567C8D]/30 text-[#567C8D] hover:bg-[#567C8D]/10 dark:border-[#5A7A95]/30 dark:text-[#5A7A95]"
                    >
                      <Edit size={14} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(route.id)}
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
              className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingRoute ? 'Edit Route' : 'Add New Route'}
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
                    Route Name *
                  </label>
                  <Input
                    value={formData.route_name}
                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                    placeholder="e.g., Route A"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vehicle *
                  </label>
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#567C8D] dark:focus:ring-[#5A7A95]"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stops * (Select in order)
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    {stops.map((stop) => {
                      const isSelected = formData.stop_ids.includes(stop.id);
                      const order = formData.stop_ids.indexOf(stop.id) + 1;
                      return (
                        <label
                          key={stop.id}
                          className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#567C8D] bg-[#567C8D]/10 dark:border-[#5A7A95] dark:bg-[#5A7A95]/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                            className="w-4 h-4 text-[#567C8D] border-gray-300 rounded focus:ring-[#567C8D]"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">{stop.name}</span>
                              {isSelected && (
                                <span className="text-xs bg-[#567C8D] text-white dark:bg-[#5A7A95] px-2 py-0.5 rounded">
                                  Stop {order}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Pickup: ₹{stop.pickup_fare} | Drop: ₹{stop.drop_fare}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {formData.stop_ids.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Selected {formData.stop_ids.length} stop(s)
                    </p>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-[#567C8D] hover:bg-[#456a7d]">
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

