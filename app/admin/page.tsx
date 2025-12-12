'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { mockAllSchools, type School, saveSchool, getStoredSchools, createSchoolSlug } from '@/lib/demoData';
import { Building2, Plus, Trash2, Edit, TrendingUp, Calendar, CheckCircle, X } from 'lucide-react';

export default function AdminDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    // Initialize with mock data if localStorage is empty
    const stored = getStoredSchools();
    if (stored.length === 0) {
      // Initialize with mock schools
      mockAllSchools.forEach(school => saveSchool(school));
      setSchools(mockAllSchools);
    } else {
      setSchools(stored);
    }
  }, []);

  const currentYear = new Date().getFullYear();
  const newSchoolsThisYear = schools.filter(() => {
    // Mock: assume schools created this year
    return true; // For demo, we'll show all as new
  }).length;

  const stats = {
    totalSchools: schools.length,
    newSchoolsThisYear,
    setupCompleted: schools.filter(s => s.setupCompleted).length,
    setupPending: schools.filter(s => !s.setupCompleted).length,
  };

  const handleAddSchool = () => {
    if (!formData.name || !formData.email || !formData.address) return;

    const newSchool: School = {
      id: createSchoolSlug(formData.name),
      name: formData.name,
      email: formData.email,
      address: formData.address,
      setupCompleted: false,
    };

    saveSchool(newSchool);
    setSchools([...schools, newSchool]);
    setFormData({ name: '', email: '', address: '' });
    setShowAddModal(false);
  };

  const handleDeleteSchool = (id: string) => {
    if (confirm('Are you sure you want to delete this school?')) {
      const updated = schools.filter(s => s.id !== id);
      setSchools(updated);
      localStorage.setItem('eduflow360_schools', JSON.stringify(updated));
    }
  };

  const handleEditSchool = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      email: school.email,
      address: school.address,
    });
    setShowAddModal(true);
  };

  const handleUpdateSchool = () => {
    if (!editingSchool || !formData.name || !formData.email || !formData.address) return;

    const updated = schools.map(s =>
      s.id === editingSchool.id
        ? { ...s, name: formData.name, email: formData.email, address: formData.address }
        : s
    );

    setSchools(updated);
    localStorage.setItem('eduflow360_schools', JSON.stringify(updated));
    setFormData({ name: '', email: '', address: '' });
    setEditingSchool(null);
    setShowAddModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold text-black">
              EduFlow<span className="text-gray-600">360</span>
            </Link>
            <Link href="/" className="text-sm text-gray-600 hover:text-black">
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-black mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage all schools and monitor platform statistics</p>
            </div>
            <Button onClick={() => { setShowAddModal(true); setEditingSchool(null); setFormData({ name: '', email: '', address: '' }); }}>
              <Plus size={20} className="mr-2" />
              Add School
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card hover>
              <div className="flex items-center space-x-4">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <Building2 className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Schools</p>
                  <p className="text-3xl font-bold text-black">{stats.totalSchools}</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card hover>
              <div className="flex items-center space-x-4">
                <div className="bg-green-500 p-3 rounded-lg">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">New Schools ({currentYear})</p>
                  <p className="text-3xl font-bold text-black">{stats.newSchoolsThisYear}</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card hover>
              <div className="flex items-center space-x-4">
                <div className="bg-purple-500 p-3 rounded-lg">
                  <CheckCircle className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Setup Completed</p>
                  <p className="text-3xl font-bold text-black">{stats.setupCompleted}</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card hover>
              <div className="flex items-center space-x-4">
                <div className="bg-orange-500 p-3 rounded-lg">
                  <Calendar className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Setup Pending</p>
                  <p className="text-3xl font-bold text-black">{stats.setupPending}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Schools List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <h2 className="text-2xl font-bold text-black mb-6">All Schools</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">School Name</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Email</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Address</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school, index) => (
                    <motion.tr
                      key={school.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <Link
                          href={`/dashboard/${school.id}`}
                          className="font-semibold text-black hover:underline"
                        >
                          {school.name}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-gray-700">{school.email}</td>
                      <td className="py-4 px-4 text-gray-700">{school.address}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          school.setupCompleted
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {school.setupCompleted ? 'Active' : 'Pending Setup'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditSchool(school)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteSchool(school.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">
                {editingSchool ? 'Edit School' : 'Add New School'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSchool(null);
                  setFormData({ name: '', email: '', address: '' });
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="School Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter school name"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="school@example.com"
              />
              <Input
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter school address"
              />

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSchool(null);
                    setFormData({ name: '', email: '', address: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={editingSchool ? handleUpdateSchool : handleAddSchool}
                >
                  {editingSchool ? 'Update' : 'Add'} School
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

