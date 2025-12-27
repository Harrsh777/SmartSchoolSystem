'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Users, Plus, X, Loader2, Save, AlertCircle, CheckCircle, Search, UserMinus } from 'lucide-react';

interface Student {
  id: string;
  admission_no: string;
  student_name: string;
  class: string;
  section: string;
  transport_route_id: string | null;
}

interface Route {
  id: string;
  route_name: string;
  vehicle?: {
    seats: number;
    vehicle_code: string;
  };
}

export default function RouteStudentsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedRoute) {
      fetchRouteStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoute]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [routesRes, studentsRes] = await Promise.all([
        fetch(`/api/transport/routes?school_code=${schoolCode}`),
        fetch(`/api/students?school_code=${schoolCode}&status=active`),
      ]);

      const routesData = await routesRes.json();
      const studentsData = await studentsRes.json();

      if (routesRes.ok && routesData.data) {
        setRoutes(routesData.data);
      }
      if (studentsRes.ok && studentsData.data) {
        setStudents(studentsData.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRouteStudents = async () => {
    try {
      const response = await fetch(`/api/transport/students?school_code=${schoolCode}&route_id=${selectedRoute}`);
      const result = await response.json();

      if (response.ok && result.data) {
        // Update students list with route assignments
        const routeStudentIds = new Set(result.data.map((s: Student) => s.id));
        setStudents((prev) =>
          prev.map((s) => ({
            ...s,
            transport_route_id: routeStudentIds.has(s.id) ? selectedRoute : s.transport_route_id,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching route students:', err);
    }
  };

  const handleOpenModal = () => {
    if (!selectedRoute) {
      setError('Please select a route first');
      return;
    }
    setSelectedStudents(new Set());
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleAssignStudents = async () => {
    if (selectedStudents.size === 0) {
      setError('Please select at least one student');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/transport/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          route_id: selectedRoute,
          student_ids: Array.from(selectedStudents),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(result.message || 'Students assigned successfully!');
        setModalOpen(false);
        fetchRouteStudents();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to assign students');
      }
    } catch (err) {
      console.error('Error assigning students:', err);
      setError('Failed to assign students');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Remove this student from the route?')) {
      return;
    }

    try {
      const response = await fetch(`/api/transport/students?school_code=${schoolCode}&student_ids=${studentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Student removed from route successfully!');
        fetchRouteStudents();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to remove student');
      }
    } catch (err) {
      console.error('Error removing student:', err);
      setError('Failed to remove student');
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${student.class}-${student.section}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const routeStudents = filteredStudents.filter((s) => s.transport_route_id === selectedRoute);
  const availableStudents = filteredStudents.filter(
    (s) => !s.transport_route_id || s.transport_route_id !== selectedRoute
  );

  const selectedRouteData = routes.find((r) => r.id === selectedRoute);
  const currentCount = routeStudents.length;
  const capacity = selectedRouteData?.vehicle?.seats || 0;

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
              <Users className="text-indigo-600" size={32} />
              Route Students
            </h1>
            <p className="text-gray-600 mt-2">
              Assign students to transport routes for {schoolCode}
            </p>
          </div>
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

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Route *
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a route</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.route_name}
                  {route.vehicle && ` (${route.vehicle.vehicle_code} - ${route.vehicle.seats} seats)`}
                </option>
              ))}
            </select>
          </div>

          {selectedRoute && selectedRouteData && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-indigo-900">{selectedRouteData.route_name}</p>
                  <p className="text-sm text-indigo-700">
                    Capacity: {currentCount} / {capacity} students
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentCount >= capacity
                    ? 'bg-red-100 text-red-700'
                    : currentCount >= capacity * 0.8
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {Math.round((currentCount / capacity) * 100)}% Full
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {selectedRoute && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search students..."
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleOpenModal} disabled={currentCount >= capacity}>
              <Plus size={18} className="mr-2" />
              Add Students
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assigned Students */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Assigned Students ({routeStudents.length})
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {routeStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-300 transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{student.student_name}</p>
                      <p className="text-sm text-gray-600">
                        {student.admission_no} • {student.class}-{student.section}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveStudent(student.id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <UserMinus size={14} />
                    </Button>
                  </div>
                ))}
                {routeStudents.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No students assigned to this route</p>
                )}
              </div>
            </Card>

            {/* Available Students */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Available Students ({availableStudents.length})
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {availableStudents.map((student) => (
                  <div
                    key={student.id}
                    className="p-3 border border-gray-200 rounded-lg"
                  >
                    <p className="font-medium text-gray-900">{student.student_name}</p>
                    <p className="text-sm text-gray-600">
                      {student.admission_no} • {student.class}-{student.section}
                    </p>
                    {student.transport_route_id && (
                      <p className="text-xs text-orange-600 mt-1">
                        Already assigned to another route
                      </p>
                    )}
                  </div>
                ))}
                {availableStudents.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No available students</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {!selectedRoute && (
        <Card className="p-12 text-center">
          <Users className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">Select a route to manage students</p>
        </Card>
      )}

      {/* Add Students Modal */}
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
                  Add Students to {selectedRouteData?.route_name}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Available capacity: {capacity - currentCount} seats
              </p>
            </div>
            <div className="p-6 space-y-2 max-h-[500px] overflow-y-auto">
              {availableStudents
                .filter((s) => !s.transport_route_id)
                .slice(0, capacity - currentCount)
                .map((student) => {
                  const isSelected = selectedStudents.has(student.id);
                  return (
                    <label
                      key={student.id}
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
                          const newSet = new Set(selectedStudents);
                          if (e.target.checked) {
                            if (newSet.size < capacity - currentCount) {
                              newSet.add(student.id);
                            }
                          } else {
                            newSet.delete(student.id);
                          }
                          setSelectedStudents(newSet);
                        }}
                        disabled={!isSelected && selectedStudents.size >= capacity - currentCount}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{student.student_name}</p>
                        <p className="text-sm text-gray-600">
                          {student.admission_no} • {student.class}-{student.section}
                        </p>
                      </div>
                    </label>
                  );
                })}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignStudents} disabled={saving || selectedStudents.size === 0}>
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Assign {selectedStudents.size} Student(s)
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

