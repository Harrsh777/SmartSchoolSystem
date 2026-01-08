'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { DoorOpen, Plus, Search, Users, X, Calendar, FileText, Phone } from 'lucide-react';

interface GatePass {
  id: string;
  person_type: string;
  person_name: string;
  purpose: string;
  out_date_time: string;
  in_date_time_tentative: string | null;
  status: string;
}

interface GatePassPurpose {
  id: string;
  purpose_name: string;
}

interface Staff {
  id: string;
  full_name: string;
}

export default function GatePassPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchGatePasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, searchQuery]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/gate-pass/stats?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setTotalCount(result.data.total);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchGatePasses = async () => {
    try {
      setLoading(true);
      const url = `/api/gate-pass?school_code=${schoolCode}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();
      if (response.ok && result.data) {
        setGatePasses(result.data);
      }
    } catch (err) {
      console.error('Error fetching gate passes:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <DoorOpen size={32} />
            Gate Pass
          </h1>
          <p className="text-gray-600">Manage gate passes for staff and students</p>
        </div>
      </div>

      {/* Summary Card and Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Gate Pass Card */}
        <Card className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-blue-800 flex items-center justify-center">
              <Users className="text-white" size={32} />
            </div>
            <div>
              <p className="text-3xl font-bold">{totalCount}</p>
              <p className="text-blue-100 text-sm">Total Gate Pass</p>
            </div>
          </div>
        </Card>

        {/* Search Bar */}
        <div className="md:col-span-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search gate pass by person's name"
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus size={18} className="mr-2" />
          CREATE GATE PASS
        </Button>
      </div>

      {/* Gate Passes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      ) : gatePasses.length > 0 ? (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-teal-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Person Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Person Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Purpose</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Out Date & Time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">In Date & Time (Tentative)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {gatePasses.map((gatePass) => (
                  <tr key={gatePass.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{gatePass.person_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{gatePass.person_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{gatePass.purpose}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(gatePass.out_date_time)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {gatePass.in_date_time_tentative ? formatDateTime(gatePass.in_date_time_tentative) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          gatePass.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : gatePass.status === 'approved'
                            ? 'bg-blue-100 text-blue-800'
                            : gatePass.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {gatePass.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-32 h-32 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-20 h-20 text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data found</h3>
            <p className="text-gray-500 mb-6">No gate passes have been created yet.</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              CREATE GATE PASS
            </Button>
          </div>
        </Card>
      )}

      {/* Create Gate Pass Modal */}
      {showCreateModal && (
        <CreateGatePassModal
          schoolCode={schoolCode}
          onClose={() => {
            setShowCreateModal(false);
            fetchGatePasses();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

// Create Gate Pass Modal Component
function CreateGatePassModal({
  schoolCode,
  onClose,
}: {
  schoolCode: string;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [studentList, setStudentList] = useState<Array<{ id: string; student_name: string }>>([]);
  const [purposes, setPurposes] = useState<GatePassPurpose[]>([]);
  const [searchStaffQuery, setSearchStaffQuery] = useState('');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Array<{ id: string; student_name: string }>>([]);

  const [formData, setFormData] = useState({
    person_type: 'Staff',
    person_id: '',
    person_name: '',
    purpose: '',
    leaving_with: '',
    permitted_by_1: '',
    permitted_by_1_name: '',
    permitted_by_2: '',
    permitted_by_2_name: '',
    out_date_time: '',
    in_date_time_tentative: '',
    mobile_number: '',
    remarks: '',
  });

  useEffect(() => {
    fetchStaff();
    fetchStudents();
    fetchPurposes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchStaffQuery) {
      setFilteredStaff(
        staffList.filter((staff) =>
          staff.full_name.toLowerCase().includes(searchStaffQuery.toLowerCase())
        )
      );
    } else {
      setFilteredStaff(staffList.slice(0, 10));
    }
  }, [searchStaffQuery, staffList]);

  useEffect(() => {
    if (searchStudentQuery) {
      setFilteredStudents(
        studentList.filter((student) =>
          student.student_name.toLowerCase().includes(searchStudentQuery.toLowerCase())
        )
      );
    } else {
      setFilteredStudents(studentList.slice(0, 10));
    }
  }, [searchStudentQuery, studentList]);

  const fetchStaff = async () => {
    try {
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStaffList(result.data);
        setFilteredStaff(result.data.slice(0, 10));
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/students?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStudentList(result.data);
        setFilteredStudents(result.data.slice(0, 10));
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchPurposes = async () => {
    try {
      const response = await fetch(`/api/gate-pass/purposes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setPurposes(result.data);
      }
    } catch (err) {
      console.error('Error fetching purposes:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.person_name || !formData.purpose || !formData.out_date_time) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/gate-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
          out_date_time: new Date(formData.out_date_time).toISOString(),
          in_date_time_tentative: formData.in_date_time_tentative
            ? new Date(formData.in_date_time_tentative).toISOString()
            : null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onClose();
      } else {
        alert(result.error || 'Failed to create gate pass');
      }
    } catch (err) {
      console.error('Error creating gate pass:', err);
      alert('Failed to create gate pass. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectPerson = (person: Staff | { id: string; student_name: string }) => {
    const name = 'full_name' in person ? person.full_name : person.student_name;
    setFormData({
      ...formData,
      person_id: person.id,
      person_name: name,
    });
    setSearchStaffQuery('');
    setSearchStudentQuery('');
    setShowStaffDropdown(false);
    setShowStudentDropdown(false);
  };

  const selectPermittedBy = (staff: Staff, field: 'permitted_by_1' | 'permitted_by_2') => {
    setFormData({
      ...formData,
      [field]: staff.id,
      [`${field}_name`]: staff.full_name,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-white rounded-lg shadow-xl my-8"
      >
        {/* Header */}
        <div className="bg-orange-500 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <h2 className="text-xl font-bold">Create Gate Pass</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Person Detail Section */}
          <div>
            <div className="bg-amber-900 text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold">Person Detail</h3>
            </div>
            <div className="border border-amber-900 rounded-b-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Person Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    value={formData.person_type}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        person_type: e.target.value,
                        person_id: '',
                        person_name: '',
                      });
                    }}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="Staff">Staff</option>
                    <option value="Student">Student</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {formData.person_type} Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="text"
                    value={formData.person_type === 'Staff' ? searchStaffQuery : searchStudentQuery}
                    onChange={(e) => {
                      if (formData.person_type === 'Staff') {
                        setSearchStaffQuery(e.target.value);
                        setShowStaffDropdown(true);
                      } else {
                        setSearchStudentQuery(e.target.value);
                        setShowStudentDropdown(true);
                      }
                    }}
                    onFocus={() => {
                      if (formData.person_type === 'Staff') {
                        setShowStaffDropdown(true);
                      } else {
                        setShowStudentDropdown(true);
                      }
                    }}
                    placeholder={`Search ${formData.person_type}`}
                    className="pl-10"
                    required
                  />
                  {(showStaffDropdown || showStudentDropdown) && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {(formData.person_type === 'Staff' ? filteredStaff : filteredStudents).map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => selectPerson(person)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          {'full_name' in person ? person.full_name : person.student_name}
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.person_name && (
                    <div className="mt-2 text-sm text-gray-600">
                      Selected: <span className="font-medium">{formData.person_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Purpose Section */}
          <div>
            <div className="bg-amber-900 text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold">Purpose</h3>
            </div>
            <div className="border border-amber-900 rounded-b-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Add Purpose of going out <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="">Select Purpose</option>
                    {purposes.map((purpose) => (
                      <option key={purpose.id} value={purpose.purpose_name}>
                        {purpose.purpose_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Leaving With</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="text"
                    value={formData.leaving_with}
                    onChange={(e) => setFormData({ ...formData, leaving_with: e.target.value })}
                    placeholder="Leaving With"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Permitted By (1)</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <select
                      value={formData.permitted_by_1}
                      onChange={(e) => {
                        const staff = staffList.find((s) => s.id === e.target.value);
                        if (staff) {
                          selectPermittedBy(staff, 'permitted_by_1');
                        }
                      }}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Staff</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Permitted By (2)</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <select
                      value={formData.permitted_by_2}
                      onChange={(e) => {
                        const staff = staffList.find((s) => s.id === e.target.value);
                        if (staff) {
                          selectPermittedBy(staff, 'permitted_by_2');
                        }
                      }}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Staff</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Date & Time Section */}
          <div>
            <div className="bg-amber-900 text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold">Date & Time</h3>
            </div>
            <div className="border border-amber-900 rounded-b-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Out Date & Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="datetime-local"
                    value={formData.out_date_time}
                    onChange={(e) => setFormData({ ...formData, out_date_time: e.target.value })}
                    required
                    className="pr-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  In Date & Time (Tentative)
                </label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="datetime-local"
                    value={formData.in_date_time_tentative}
                    onChange={(e) => setFormData({ ...formData, in_date_time_tentative: e.target.value })}
                    className="pr-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Authenticate (Optional) Section */}
          <div>
            <div className="bg-amber-900 text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold">Authenticate (Optional)</h3>
            </div>
            <div className="border border-amber-900 rounded-b-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="tel"
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                    placeholder="Mobile Number"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Remarks"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="mr-3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gray-500 hover:bg-gray-600 text-white"
            >
              <FileText size={18} className="mr-2" />
              {saving ? 'Saving...' : 'SAVE'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}



