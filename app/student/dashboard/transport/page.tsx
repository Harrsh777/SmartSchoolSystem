'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { Bus, MapPin, Phone, User, Navigation, AlertCircle, CheckCircle2, Route } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

interface Stop {
  id: string;
  order: number;
  stop_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  pickup_fare: number | null;
  drop_fare: number | null;
  is_active: boolean;
}

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  seats: number | null;
  registration_number: string | null;
}

interface TransportInfo {
  has_transport: boolean;
  transport_type: string | null;
  route: {
    id: string;
    route_name: string;
    is_active: boolean;
    created_at: string;
  } | null;
  vehicle: Vehicle | null;
  stops: Stop[];
  pickup_stop: Stop | null;
  dropoff_stop: Stop | null;
}

export default function StudentTransportPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [transportInfo, setTransportInfo] = useState<TransportInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchTransportInfo(studentData);
    }
  }, []);

  const fetchTransportInfo = async (studentData: Student) => {
    try {
      setLoading(true);
      const schoolCode = getString(studentData.school_code);
      const studentId = getString(studentData.id);
      
      if (!schoolCode || !studentId) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/student/transport?school_code=${schoolCode}&student_id=${studentId}`
      );

      const result = await response.json();

      // Always set transport info - API now returns 200 with empty data on errors
      if (response.ok && result.data) {
        setTransportInfo(result.data);
      } else {
        // Fallback: set empty transport info if response structure is unexpected
        setTransportInfo({
          has_transport: false,
          transport_type: null,
          route: null,
          vehicle: null,
          stops: [],
          pickup_stop: null,
          dropoff_stop: null,
        });
        
        // Only log if it's a real error (not just missing transport)
        if (response.status >= 500) {
          console.error('Error fetching transport info:', result.error || result.details);
        }
      }
    } catch (error) {
      console.error('Error fetching transport info:', error);
      // Set empty transport info on error - UI will show appropriate message
      setTransportInfo({
        has_transport: false,
        transport_type: null,
        route: null,
        vehicle: null,
        stops: [],
        pickup_stop: null,
        dropoff_stop: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = (latitude: number, longitude: number, label: string) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}&label=${encodeURIComponent(label)}`;
    window.open(url, '_blank');
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading transport information...</p>
        </div>
      </div>
    );
  }

  if (!transportInfo || !transportInfo.has_transport) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bus className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Transport Information</h1>
              <p className="text-muted-foreground">View your transport route and stops</p>
            </div>
          </div>
        </motion.div>

        <Card className="glass-card soft-shadow">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground text-lg">No Transport Assigned</p>
            <p className="text-sm text-muted-foreground mt-2">
              You are not currently assigned to any transport route. Please contact the school administration for transport services.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bus className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transport Information</h1>
            <p className="text-muted-foreground">View your transport route and stops</p>
          </div>
        </div>
      </motion.div>

      {/* Route Information */}
      {transportInfo.route && (
        <Card className="glass-card soft-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Route className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Route Information</h2>
              <p className="text-sm text-muted-foreground">Your assigned transport route</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium text-muted-foreground">Route Name</span>
              <span className="text-lg font-semibold text-foreground">{transportInfo.route.route_name}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium text-muted-foreground">Transport Type</span>
              <span className="text-lg font-semibold text-foreground">{transportInfo.transport_type || 'School Bus'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                transportInfo.route.is_active
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {transportInfo.route.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Vehicle Information */}
      {transportInfo.vehicle && (
        <Card className="glass-card soft-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bus className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Vehicle Details</h2>
              <p className="text-sm text-muted-foreground">Information about your transport vehicle</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Vehicle Number</p>
              <p className="text-lg font-semibold text-foreground">{transportInfo.vehicle.vehicle_number}</p>
            </div>
            {transportInfo.vehicle.registration_number && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Registration</p>
                <p className="text-lg font-semibold text-foreground">{transportInfo.vehicle.registration_number}</p>
              </div>
            )}
            {transportInfo.vehicle.vehicle_type && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Vehicle Type</p>
                <p className="text-lg font-semibold text-foreground">{transportInfo.vehicle.vehicle_type}</p>
              </div>
            )}
            {transportInfo.vehicle.seats && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Capacity</p>
                <p className="text-lg font-semibold text-foreground">{transportInfo.vehicle.seats} Seats</p>
              </div>
            )}
          </div>

          {/* Driver Information */}
          {(transportInfo.vehicle.driver_name || transportInfo.vehicle.driver_phone) && (
            <div className="mt-4 pt-4 border-t border-input">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <User size={16} />
                Driver Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transportInfo.vehicle.driver_name && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Driver Name</p>
                    <p className="text-lg font-semibold text-foreground">{transportInfo.vehicle.driver_name}</p>
                  </div>
                )}
                {transportInfo.vehicle.driver_phone && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Phone size={12} />
                      Driver Phone
                    </p>
                    <a
                      href={`tel:${transportInfo.vehicle.driver_phone}`}
                      className="text-lg font-semibold text-primary hover:underline"
                    >
                      {transportInfo.vehicle.driver_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Pickup and Dropoff Stops */}
      {(transportInfo.pickup_stop || transportInfo.dropoff_stop) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {transportInfo.pickup_stop && (
            <Card className="glass-card soft-shadow border-l-4 border-blue-500">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="text-blue-600" size={20} />
                <h3 className="text-lg font-bold text-foreground">Pickup Stop</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Stop Name</p>
                  <p className="text-lg font-semibold text-foreground">{transportInfo.pickup_stop.stop_name}</p>
                </div>
                {transportInfo.pickup_stop.address && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin size={14} />
                      Address
                    </p>
                    <p className="text-foreground">{transportInfo.pickup_stop.address}</p>
                  </div>
                )}
                {transportInfo.pickup_stop.pickup_fare && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Pickup Fare</p>
                    <p className="text-lg font-semibold text-foreground">₹{transportInfo.pickup_stop.pickup_fare}</p>
                  </div>
                )}
                {transportInfo.pickup_stop.latitude && transportInfo.pickup_stop.longitude && (
                  <button
                    onClick={() => openInMaps(
                      transportInfo.pickup_stop!.latitude!,
                      transportInfo.pickup_stop!.longitude!,
                      transportInfo.pickup_stop!.stop_name
                    )}
                    className="w-full mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Navigation size={16} />
                    Open in Maps
                  </button>
                )}
              </div>
            </Card>
          )}

          {transportInfo.dropoff_stop && (
            <Card className="glass-card soft-shadow border-l-4 border-purple-500">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="text-purple-600" size={20} />
                <h3 className="text-lg font-bold text-foreground">Dropoff Stop</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Stop Name</p>
                  <p className="text-lg font-semibold text-foreground">{transportInfo.dropoff_stop.stop_name}</p>
                </div>
                {transportInfo.dropoff_stop.address && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin size={14} />
                      Address
                    </p>
                    <p className="text-foreground">{transportInfo.dropoff_stop.address}</p>
                  </div>
                )}
                {transportInfo.dropoff_stop.drop_fare && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Dropoff Fare</p>
                    <p className="text-lg font-semibold text-foreground">₹{transportInfo.dropoff_stop.drop_fare}</p>
                  </div>
                )}
                {transportInfo.dropoff_stop.latitude && transportInfo.dropoff_stop.longitude && (
                  <button
                    onClick={() => openInMaps(
                      transportInfo.dropoff_stop!.latitude!,
                      transportInfo.dropoff_stop!.longitude!,
                      transportInfo.dropoff_stop!.stop_name
                    )}
                    className="w-full mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Navigation size={16} />
                    Open in Maps
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* All Route Stops */}
      {transportInfo.stops && transportInfo.stops.length > 0 && (
        <Card className="glass-card soft-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">All Route Stops</h2>
              <p className="text-sm text-muted-foreground">Complete list of stops on your route</p>
            </div>
          </div>
          <div className="space-y-3">
            {transportInfo.stops.map((stop, index) => {
              const isPickup = transportInfo.pickup_stop?.id === stop.id;
              const isDropoff = transportInfo.dropoff_stop?.id === stop.id;
              
              return (
                <motion.div
                  key={stop.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border-2 ${
                    isPickup
                      ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700'
                      : isDropoff
                      ? 'bg-purple-50 border-purple-300 dark:bg-purple-900/20 dark:border-purple-700'
                      : 'bg-muted border-input'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          isPickup
                            ? 'bg-blue-500 text-white'
                            : isDropoff
                            ? 'bg-purple-500 text-white'
                            : 'bg-primary text-primary-foreground'
                        }`}>
                          {stop.order}
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">{stop.stop_name}</h3>
                        {isPickup && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            Pickup
                          </span>
                        )}
                        {isDropoff && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                            Dropoff
                          </span>
                        )}
                      </div>
                      {stop.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                          <MapPin size={14} />
                          {stop.address}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {stop.pickup_fare && (
                          <span>Pickup: ₹{stop.pickup_fare}</span>
                        )}
                        {stop.drop_fare && (
                          <span>Dropoff: ₹{stop.drop_fare}</span>
                        )}
                      </div>
                    </div>
                    {stop.latitude && stop.longitude && (
                      <button
                        onClick={() => openInMaps(stop.latitude!, stop.longitude!, stop.stop_name)}
                        className="p-2 bg-background border border-input rounded-lg hover:bg-muted transition-colors"
                        title="Open in Maps"
                      >
                        <Navigation size={18} className="text-primary" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
