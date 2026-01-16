'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  Bus, 
  Car, 
  MapPin, 
  Route, 
  Users, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  RefreshCw,
  DollarSign
} from 'lucide-react';

interface Vehicle {
  id: string;
  vehicle_code: string;
  registration_number: string;
  seats: number;
  type: string;
  is_active: boolean;
}

interface Stop {
  id: string;
  name: string;
  pickup_fare: number;
  drop_fare: number;
  is_active: boolean;
}

interface RouteData {
  id: string;
  route_name: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  route_stops?: Stop[];
  is_active: boolean;
}

interface Student {
  id: string;
  student_name: string;
  admission_no: string;
  class: string;
  section: string;
  transport_route_id: string | null;
}

export default function TransportDashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, stopsRes, routesRes, studentsRes] = await Promise.all([
        fetch(`/api/transport/vehicles?school_code=${schoolCode}`),
        fetch(`/api/transport/stops?school_code=${schoolCode}`),
        fetch(`/api/transport/routes?school_code=${schoolCode}`),
        fetch(`/api/students?school_code=${schoolCode}&status=active`),
      ]);

      const vehiclesData = await vehiclesRes.json();
      const stopsData = await stopsRes.json();
      const routesData = await routesRes.json();
      const studentsData = await studentsRes.json();

      if (vehiclesRes.ok && vehiclesData.data) setVehicles(vehiclesData.data);
      if (stopsRes.ok && stopsData.data) setStops(stopsData.data);
      if (routesRes.ok && routesData.data) setRoutes(routesData.data);
      if (studentsRes.ok && studentsData.data) setStudents(studentsData.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData().finally(() => setRefreshing(false));
  };

  // Calculate statistics
  const totalCapacity = vehicles.reduce((sum, v) => sum + v.seats, 0);
  const assignedStudents = students.filter(s => s.transport_route_id).length;
  const availableSeats = totalCapacity - assignedStudents;
  const utilizationRate = totalCapacity > 0 ? (assignedStudents / totalCapacity) * 100 : 0;
  const totalRoutes = routes.length;
  const activeRoutes = routes.filter(r => r.is_active).length;

  // Get students per route
  const getStudentsPerRoute = (routeId: string) => {
    return students.filter(s => s.transport_route_id === routeId).length;
  };

  // Get route capacity
  const getRouteCapacity = (route: RouteData) => {
    return route.vehicle?.seats || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#5A7A95] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading transport dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-6 soft-shadow-md"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#2C3E50] dark:bg-[#4A707A] flex items-center justify-center soft-shadow">
                <Bus className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Transport Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">Overview of all transport operations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border-[#2C3E50]/30 text-[#2C3E50] hover:bg-[#2C3E50]/10 dark:border-[#4A707A]/30 dark:text-[#5A879A] dark:hover:bg-[#4A707A]/10"
              >
                <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Vehicles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Card className="group relative p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#5A7A95]/20 to-[#6B9BB8]/20 rounded-full -mr-16 -mt-16 blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#2C3E50] dark:bg-[#4A707A] flex items-center justify-center soft-shadow">
                    <Car className="text-white" size={24} />
                  </div>
                  <TrendingUp className="text-[#2C3E50] dark:text-[#5A879A]" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Vehicles</p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white"
                >
                  {vehicles.length}
                </motion.p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{totalCapacity} total seats</p>
              </div>
            </Card>
          </motion.div>

          {/* Total Stops */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Card className="group relative p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#6B9BB8]/20 to-[#7DB5D3]/20 rounded-full -mr-16 -mt-16 blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg">
                    <MapPin className="text-white" size={24} />
                  </div>
                  <TrendingUp className="text-[#2C3E50] dark:text-[#5A879A]" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Stops</p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white"
                >
                  {stops.length}
                </motion.p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pickup & drop locations</p>
              </div>
            </Card>
          </motion.div>

          {/* Active Routes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Card className="group relative p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#567C8D]/20 to-[#5A7A95]/20 rounded-full -mr-16 -mt-16 blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#567C8D] to-[#5A7A95] flex items-center justify-center shadow-lg">
                    <Route className="text-white" size={24} />
                  </div>
                  <TrendingUp className="text-[#2C3E50] dark:text-[#5A879A]" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Routes</p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white"
                >
                  {activeRoutes}
                </motion.p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">of {totalRoutes} total routes</p>
              </div>
            </Card>
          </motion.div>

          {/* Assigned Students */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Card className="group relative p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full -mr-16 -mt-16 blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <Users className="text-white" size={24} />
                  </div>
                  <TrendingUp className="text-[#2C3E50] dark:text-[#5A879A]" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Assigned Students</p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white"
                >
                  {assignedStudents}
                </motion.p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {availableSeats} seats available ({utilizationRate.toFixed(1)}% utilized)
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Setup Guide */}
        {(vehicles.length === 0 || stops.length === 0 || routes.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-[#5A7A95]/10 via-[#6B9BB8]/10 to-[#7DB5D3]/10 dark:from-[#5A7A95]/20 dark:via-[#6B9BB8]/20 dark:to-[#7DB5D3]/20 border-2 border-[#5A7A95]/30 dark:border-[#6B9BB8]/30 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] flex items-center justify-center shadow-lg flex-shrink-0">
                  <AlertCircle className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Transport Setup Guide</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Follow these steps to configure your transport management system:
                  </p>
                  <div className="space-y-3">
                    {/* Step 1 */}
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${
                      vehicles.length > 0 
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                        : 'bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        vehicles.length > 0 
                          ? 'bg-green-500 text-white' 
                          : 'bg-[#5A7A95] text-white'
                      }`}>
                        {vehicles.length > 0 ? <CheckCircle size={18} /> : <span className="font-bold">1</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${vehicles.length > 0 ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                          Step 1: Add Vehicles
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Add your transport vehicles with code, registration, and seat capacity
                        </p>
                        {vehicles.length === 0 && (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/dashboard/${schoolCode}/transport/vehicles`)}
                            className="mt-2 bg-[#5A7A95] hover:bg-[#4a6a85]"
                          >
                            <Plus size={14} className="mr-2" />
                            Add Vehicle
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${
                      stops.length > 0 
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                        : 'bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        stops.length > 0 
                          ? 'bg-green-500 text-white' 
                          : 'bg-[#5A7A95] text-white'
                      }`}>
                        {stops.length > 0 ? <CheckCircle size={18} /> : <span className="font-bold">2</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${stops.length > 0 ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                          Step 2: Create Stops
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Create pickup and drop locations with fare information
                        </p>
                        {stops.length === 0 && (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/dashboard/${schoolCode}/transport/stops`)}
                            className="mt-2 bg-[#5A7A95] hover:bg-[#4a6a85]"
                          >
                            <Plus size={14} className="mr-2" />
                            Create Stop
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${
                      routes.length > 0 
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                        : 'bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        routes.length > 0 
                          ? 'bg-green-500 text-white' 
                          : 'bg-[#5A7A95] text-white'
                      }`}>
                        {routes.length > 0 ? <CheckCircle size={18} /> : <span className="font-bold">3</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${routes.length > 0 ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                          Step 3: Create Routes
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Create routes by assigning vehicles to stops in order
                        </p>
                        {routes.length === 0 && vehicles.length > 0 && stops.length > 0 && (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/dashboard/${schoolCode}/transport/routes`)}
                            className="mt-2 bg-[#5A7A95] hover:bg-[#4a6a85]"
                          >
                            <Plus size={14} className="mr-2" />
                            Create Route
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${
                      assignedStudents > 0 
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                        : 'bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        assignedStudents > 0 
                          ? 'bg-green-500 text-white' 
                          : 'bg-[#5A7A95] text-white'
                      }`}>
                        {assignedStudents > 0 ? <CheckCircle size={18} /> : <span className="font-bold">4</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${assignedStudents > 0 ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                          Step 4: Assign Students
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Assign students to routes (system checks capacity automatically)
                        </p>
                        {assignedStudents === 0 && routes.length > 0 && (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/dashboard/${schoolCode}/transport/route-students`)}
                            className="mt-2 bg-[#5A7A95] hover:bg-[#4a6a85]"
                          >
                            <Plus size={14} className="mr-2" />
                            Assign Students
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Vehicles Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] flex items-center justify-center">
                  <Car className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vehicles</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{vehicles.length} vehicles registered</p>
                </div>
              </div>
              <Button
                onClick={() => router.push(`/dashboard/${schoolCode}/transport/vehicles`)}
                className="bg-[#5A7A95] hover:bg-[#4a6a85]"
              >
                <Plus size={18} className="mr-2" />
                Manage Vehicles
              </Button>
            </div>
            <div className="p-6">
              {vehicles.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 dark:text-gray-400">No vehicles added yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vehicles.slice(0, 6).map((vehicle, index) => (
                    <motion.div
                      key={vehicle.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#5A7A95] dark:hover:border-[#6B9BB8] transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{vehicle.vehicle_code}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{vehicle.registration_number}</p>
                        </div>
                        <span className="px-2 py-1 bg-[#5A7A95]/10 text-[#5A7A95] dark:bg-[#6B9BB8]/20 dark:text-[#6B9BB8] rounded text-xs font-semibold">
                          {vehicle.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="text-[#5A7A95] dark:text-[#6B9BB8]" size={16} />
                        <span className="text-gray-700 dark:text-gray-300">{vehicle.seats} seats</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Stops Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center">
                  <MapPin className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Stops</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stops.length} stops configured</p>
                </div>
              </div>
              <Button
                onClick={() => router.push(`/dashboard/${schoolCode}/transport/stops`)}
                className="bg-[#6B9BB8] hover:bg-[#5a8aa8]"
              >
                <Plus size={18} className="mr-2" />
                Manage Stops
              </Button>
            </div>
            <div className="p-6">
              {stops.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 dark:text-gray-400">No stops created yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stops.slice(0, 6).map((stop, index) => (
                    <motion.div
                      key={stop.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#6B9BB8] dark:hover:border-[#7DB5D3] transition-colors"
                    >
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">{stop.name}</h3>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <DollarSign className="text-[#6B9BB8] dark:text-[#7DB5D3]" size={14} />
                          <span className="text-gray-700 dark:text-gray-300">Pickup: ₹{stop.pickup_fare}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="text-[#6B9BB8] dark:text-[#7DB5D3]" size={14} />
                          <span className="text-gray-700 dark:text-gray-300">Drop: ₹{stop.drop_fare}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Routes Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#567C8D] to-[#5A7A95] flex items-center justify-center">
                  <Route className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Routes</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{activeRoutes} active routes</p>
                </div>
              </div>
              <Button
                onClick={() => router.push(`/dashboard/${schoolCode}/transport/routes`)}
                className="bg-[#567C8D] hover:bg-[#456a7d]"
              >
                <Plus size={18} className="mr-2" />
                Manage Routes
              </Button>
            </div>
            <div className="p-6">
              {routes.length === 0 ? (
                <div className="text-center py-8">
                  <Route className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 dark:text-gray-400">No routes created yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {routes.slice(0, 5).map((route, index) => {
                    const routeStudents = getStudentsPerRoute(route.id);
                    const routeCapacity = getRouteCapacity(route);
                    const routeUtilization = routeCapacity > 0 ? (routeStudents / routeCapacity) * 100 : 0;
                    
                    return (
                      <motion.div
                        key={route.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#567C8D] dark:hover:border-[#5A7A95] transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{route.route_name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>Vehicle: {route.vehicle?.vehicle_code || 'N/A'}</span>
                              <span>•</span>
                              <span>{route.route_stops?.length || 0} stops</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              {routeStudents} / {routeCapacity}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">students</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${routeUtilization}%` }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              className={`h-full ${
                                routeUtilization >= 90 
                                  ? 'bg-red-500' 
                                  : routeUtilization >= 70 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                              }`}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            {routeUtilization.toFixed(0)}%
                          </span>
                        </div>
                        {route.route_stops && route.route_stops.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {route.route_stops.slice(0, 3).map((stop, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-[#5A7A95]/10 text-[#5A7A95] dark:bg-[#6B9BB8]/20 dark:text-[#6B9BB8] rounded text-xs font-medium"
                              >
                                {stop.name}
                              </span>
                            ))}
                            {route.route_stops.length > 3 && (
                              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                                +{route.route_stops.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Students Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Users className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assigned Students</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{assignedStudents} students using transport</p>
                </div>
              </div>
              <Button
                onClick={() => router.push(`/dashboard/${schoolCode}/transport/route-students`)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus size={18} className="mr-2" />
                Assign Students
              </Button>
            </div>
            <div className="p-6">
              {assignedStudents === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 dark:text-gray-400">No students assigned to routes yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white">
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Student Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Admission No</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Class</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase">Route</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {students
                        .filter(s => s.transport_route_id)
                        .slice(0, 10)
                        .map((student, index) => {
                          const route = routes.find(r => r.id === student.transport_route_id);
                          return (
                            <motion.tr
                              key={student.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="hover:bg-[#5A7A95]/5 dark:hover:bg-[#6B9BB8]/10 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                {student.student_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                                {student.admission_no}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {student.class} {student.section}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="px-2 py-1 bg-[#5A7A95]/10 text-[#5A7A95] dark:bg-[#6B9BB8]/20 dark:text-[#6B9BB8] rounded text-xs font-semibold">
                                  {route?.route_name || 'N/A'}
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {assignedStudents > 10 && (
                    <div className="mt-4 text-center">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/dashboard/${schoolCode}/transport/route-students`)}
                        className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10"
                      >
                        View All {assignedStudents} Students
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
