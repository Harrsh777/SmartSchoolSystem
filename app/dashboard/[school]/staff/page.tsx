'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { mockStaff } from '@/lib/demoData';
import { UserCheck, Search, Mail, Phone } from 'lucide-react';

export default function StaffPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  use(params); // school param available if needed
  const staff = mockStaff;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Staff Management</h1>
            <p className="text-gray-600">Manage all staff members and their information</p>
          </div>
          <button className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            + Add Staff
          </button>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search staff by name, role, or department..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            <select className="px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black">
              <option>All Departments</option>
              <option>Administration</option>
              <option>Mathematics</option>
              <option>Languages</option>
              <option>Science</option>
              <option>Social Studies</option>
              <option>Computer Science</option>
              <option>Sports</option>
            </select>
          </div>
        </Card>
      </motion.div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Card hover>
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-black mb-1">{member.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{member.role}</p>
                  <p className="text-xs text-gray-500 mb-3">{member.department}</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <Mail size={14} />
                      <span>{member.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <Phone size={14} />
                      <span>{member.phone}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Joined: {new Date(member.joinDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
                <button className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  View
                </button>
                <button className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 hover:border-black rounded-lg transition-colors">
                  Edit
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-blue-500 p-3 rounded-lg">
              <UserCheck className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-black">{staff.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-green-500 p-3 rounded-lg">
              <UserCheck className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Teachers</p>
              <p className="text-2xl font-bold text-black">{staff.filter(s => s.role.includes('Teacher')).length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-purple-500 p-3 rounded-lg">
              <UserCheck className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Administration</p>
              <p className="text-2xl font-bold text-black">{staff.filter(s => s.department === 'Administration').length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-orange-500 p-3 rounded-lg">
              <UserCheck className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Departments</p>
              <p className="text-2xl font-bold text-black">{new Set(staff.map(s => s.department)).size}</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

