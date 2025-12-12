'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { mockTransport } from '@/lib/demoData';
import { Bus, Users, Phone } from 'lucide-react';

export default function TransportPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  use(params); // school param available if needed
  const routes = mockTransport;

  const stats = {
    totalRoutes: routes.length,
    totalVehicles: routes.length,
    totalStudents: routes.reduce((sum, r) => sum + r.students, 0),
    totalCapacity: routes.reduce((sum, r) => sum + r.capacity, 0),
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Transport Management</h1>
            <p className="text-gray-600">Manage transportation routes and vehicles</p>
          </div>
          <button className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            + Add Route
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Bus className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Routes</p>
                <p className="text-2xl font-bold text-black">{stats.totalRoutes}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <Bus className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-black">{stats.totalVehicles}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-black">{stats.totalStudents}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-orange-500 p-3 rounded-lg">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Capacity</p>
                <p className="text-2xl font-bold text-black">{stats.totalCapacity}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routes.map((route, index) => (
          <motion.div
            key={route.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            <Card hover>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-black mb-1">{route.routeName}</h3>
                  <p className="text-sm text-gray-600">Vehicle: {route.vehicleNo}</p>
                </div>
                <div className="bg-blue-500 p-3 rounded-lg">
                  <Bus className="text-white" size={24} />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Users size={18} />
                    <span className="text-sm">Students</span>
                  </div>
                  <span className="font-semibold text-black">
                    {route.students} / {route.capacity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <span className="text-sm">Driver</span>
                  </div>
                  <span className="font-medium text-black text-sm">{route.driverName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Phone size={18} />
                    <span className="text-sm">Contact</span>
                  </div>
                  <span className="font-medium text-black text-sm">{route.driverPhone}</span>
                </div>
                <div className="mt-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    route.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {route.status}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
                <button className="flex-1 px-3 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors">
                  View Details
                </button>
                <button className="px-3 py-2 text-sm border-2 border-gray-300 hover:border-black rounded-lg transition-colors">
                  Edit
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

