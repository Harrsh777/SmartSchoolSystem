'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { DoorOpen, Plus, Search, Users, X, Calendar, FileText, Download, Printer } from 'lucide-react';
import { getGatePassPrintHtml, getGatePassSlipHtml, printHtml } from '@/lib/print-utils';


interface GatePass {
  id: string;
  person_type: 'student' | 'staff';
  person_name: string;
  class?: string;
  section?: string;
  academic_year?: string;
  pass_type: 'early_leave' | 'late_entry' | 'half_day';
  reason: string;
  date: string;
  time_out: string;
  expected_return_time?: string;
  actual_return_time?: string;
  approved_by_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'closed';
}

interface Staff {
  id: string;
  full_name?: string;
  role?: string;
}

export default function GatePassPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [loading, setLoading] = useState(true);
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === gatePasses.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(gatePasses.map((p) => p.id)));
  };

  const selectedPasses = gatePasses.filter((p) => selectedIds.has(p.id));

  const handlePrintGatePass = (pass: GatePass) => {
    const html = getGatePassSlipHtml({
      id: pass.id,
      person_type: pass.person_type,
      person_name: pass.person_name,
      class: pass.class,
      section: pass.section,
      pass_type: pass.pass_type,
      reason: pass.reason,
      date: pass.date,
      time_out: pass.time_out,
      expected_return_time: pass.expected_return_time,
      approved_by_name: pass.approved_by_name,
      status: pass.status,
    });
    printHtml(html, `Gate Pass - ${pass.person_name}`);
  };

  const handleDownloadGatePass = async (pass: GatePass) => {
    try {
      const res = await fetch(`/api/gate-pass/${pass.id}/download-pdf`);
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const name = (pass.person_name || 'GatePass').replace(/[^a-zA-Z0-9\s.-]/g, '').trim() || 'GatePass';
      const filename = match ? match[1].trim() : `${name} Gate Pass.pdf`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Download PDF error:', err);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handlePrintSelected = () => {
    if (selectedPasses.length === 0) return;
    const html = getGatePassPrintHtml(
      selectedPasses.map((p) => ({
        id: p.id,
        person_type: p.person_type,
        person_name: p.person_name,
        class: p.class,
        section: p.section,
        pass_type: p.pass_type,
        reason: p.reason,
        date: p.date,
        time_out: p.time_out,
        expected_return_time: p.expected_return_time,
        approved_by_name: p.approved_by_name,
        status: p.status,
      }))
    );
    printHtml(html, 'Gate Passes');
  };

  const handleDownloadSelected = async () => {
    if (selectedPasses.length === 0) return;
    const ids = selectedPasses.map((p) => p.id);
    try {
      if (ids.length === 1) {
        const pass = selectedPasses[0];
        await handleDownloadGatePass(pass);
        return;
      }
      const res = await fetch('/api/gate-pass/download-pdf-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed to generate ZIP');
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1].trim() : `Gate_Passes_${new Date().toISOString().split('T')[0]}.zip`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download. Please try again.');
    }
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

      {/* Create Button and Download/Print */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {gatePasses.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSelected}
                disabled={selectedIds.size === 0}
                title="Download selected gate passes"
              >
                <Download size={16} className="mr-1" />
                Download ({selectedIds.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintSelected}
                disabled={selectedIds.size === 0}
                title="Print selected gate passes"
              >
                <Printer size={16} className="mr-1" />
                Print ({selectedIds.size})
              </Button>
            </div>
          </>
        )}
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] hover:from-[#1E40AF] hover:to-[#2563EB] text-white"
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
              <thead className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white">
                <tr>
                  <th className="px-2 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={gatePasses.length > 0 && selectedIds.size === gatePasses.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Person Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Person Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Pass Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Reason</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Time Out</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {gatePasses.map((gatePass) => (
                  <tr key={gatePass.id} className="hover:bg-gray-50">
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(gatePass.id)}
                        onChange={() => toggleSelect(gatePass.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{gatePass.person_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{gatePass.person_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {gatePass.pass_type ? gatePass.pass_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{gatePass.reason || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {gatePass.date ? new Date(gatePass.date).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{gatePass.time_out || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          gatePass.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : gatePass.status === 'approved'
                            ? 'bg-blue-100 text-blue-800'
                            : gatePass.status === 'closed'
                            ? 'bg-gray-100 text-gray-800'
                            : gatePass.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {gatePass.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadGatePass(gatePass)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                          title="Download gate pass"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintGatePass(gatePass)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                          title="Print gate pass"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
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
              <div className="w-32 h-32 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-20 h-20 text-blue-400"
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
              className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] hover:from-[#1E40AF] hover:to-[#2563EB] text-white"
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
  const [studentList, setStudentList] = useState<Array<{ id: string; student_name: string; class?: string; section?: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; class: string; section: string; academic_year: string }>>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [searchStaffQuery, setSearchStaffQuery] = useState('');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Array<{ id: string; student_name: string; class?: string; section?: string }>>([]);

  const [formData, setFormData] = useState({
    person_type: 'staff' as 'staff' | 'student',
    person_id: '',
    person_name: '',
    student_class: '',
    student_section: '',
    academic_year: '',
    pass_type: '' as '' | 'early_leave' | 'late_entry' | 'half_day',
    reason: '',
    date: new Date().toISOString().split('T')[0],
    time_out: new Date().toTimeString().split(' ')[0].substring(0, 5),
    expected_return_time: '',
  });

  useEffect(() => {
    fetchStaff();
    fetchStudents();
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Filter students by class and section when selected
    if (formData.person_type === 'student' && (formData.student_class || formData.student_section)) {
      let filtered = studentList;
      if (formData.student_class) {
        filtered = filtered.filter(s => s.class === formData.student_class);
      }
      if (formData.student_section) {
        filtered = filtered.filter(s => s.section === formData.student_section);
      }
      
      if (searchStudentQuery) {
        filtered = filtered.filter((student) =>
          student.student_name.toLowerCase().includes(searchStudentQuery.toLowerCase())
        );
      }
      setFilteredStudents(filtered.slice(0, 10));
    } else if (formData.person_type === 'student') {
      if (searchStudentQuery) {
        setFilteredStudents(
          studentList.filter((student) =>
            student.student_name.toLowerCase().includes(searchStudentQuery.toLowerCase())
          ).slice(0, 10)
        );
      } else {
        setFilteredStudents(studentList.slice(0, 10));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.student_class, formData.student_section, searchStudentQuery, studentList]);

  useEffect(() => {
    // Update sections when class changes
    if (formData.student_class) {
      const classSections = Array.from(
        new Set(
          classes
            .filter(c => c.class === formData.student_class)
            .map(c => c.section)
        )
      ).sort();
      setSections(classSections);
      // Clear section if it's not valid for the new class
      if (formData.student_section && !classSections.includes(formData.student_section)) {
        setFormData({ ...formData, student_section: '' });
      }
    } else {
      setSections([]);
      setFormData({ ...formData, student_section: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.student_class, classes]);

  useEffect(() => {
    if (searchStaffQuery) {
      setFilteredStaff(
        staffList.filter((staff) =>
          staff.full_name?.toLowerCase().includes(searchStaffQuery.toLowerCase())
        )
      );
    } else {
      setFilteredStaff(staffList.slice(0, 10));
    }
  }, [searchStaffQuery, staffList]);

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
        interface StudentData {
          id: string;
          student_name?: string;
          full_name?: string;
          first_name?: string;
          last_name?: string;
          class?: string;
          section?: string;
        }

        const studentsWithClass = result.data.map((s: StudentData) => ({
          id: s.id,
          student_name: s.student_name || s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          class: s.class,
          section: s.section,
        }));
        setStudentList(studentsWithClass);
        setFilteredStudents(studentsWithClass.slice(0, 10));
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.person_name || !formData.pass_type || !formData.reason || !formData.date || !formData.time_out) {
      alert('Please fill in all required fields');
      return;
    }

    // Get current staff from session storage
    const storedStaff = sessionStorage.getItem('staff');
    let createdBy: string | null = null;
    let approvedByName: string = '';
    
    if (storedStaff) {
      try {
        const staffData = JSON.parse(storedStaff);
        createdBy = staffData.id || null;
        approvedByName = staffData.full_name || '';
      } catch {
        // Ignore parse errors
      }
    }

    // If no staff in session (accessing from main dashboard), fetch default admin/principal
    // Check if we have valid values (not null, not empty string)
    const hasValidStaff = createdBy && createdBy.toString().trim() !== '' && approvedByName && approvedByName.toString().trim() !== '';
    
    if (!hasValidStaff) {
      try {
        const response = await fetch(`/api/staff?school_code=${schoolCode}`);
        const result = await response.json();
        if (response.ok && result.data && Array.isArray(result.data) && result.data.length > 0) {
          // Try to find principal or admin first
          const principal = result.data.find((s: Staff) => 
            s.role && (
              s.role.toLowerCase().includes('principal') || 
              s.role.toLowerCase().includes('admin')
            )
          );
          // If no principal/admin, use the first staff member
          const defaultStaff = principal || result.data[0];
          if (defaultStaff && defaultStaff.id) {
            createdBy = defaultStaff.id;
            approvedByName = defaultStaff.full_name || 'Admin';
          } else {
            alert('Unable to create gate pass. No valid staff found for this school.');
            return;
          }
        } else {
          alert('Unable to create gate pass. No staff found for this school.');
          return;
        }
      } catch (err) {
        console.error('Error fetching default staff:', err);
        alert('Unable to create gate pass. Please try again.');
        return;
      }
    }

    // Final validation - ensure we have valid values before proceeding
    if (!createdBy || !approvedByName) {
      alert('Unable to create gate pass. Staff information is missing.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/gate-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          person_type: formData.person_type.toLowerCase(),
          person_id: formData.person_id || null,
          person_name: formData.person_name,
          class: formData.person_type === 'student' ? formData.student_class : null,
          section: formData.person_type === 'student' ? formData.student_section : null,
          academic_year: formData.person_type === 'student' ? formData.academic_year : null,
          pass_type: formData.pass_type,
          reason: formData.reason,
          date: formData.date,
          time_out: formData.time_out,
          expected_return_time: formData.expected_return_time || null,
          approved_by_name: approvedByName,
          created_by: createdBy,
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

  const selectPerson = (person: Staff | { id: string; student_name: string; class?: string; section?: string }) => {
    const name = 'full_name' in person ? (person.full_name || '') : ('student_name' in person ? person.student_name : '');
    const selectedClass = 'class' in person && person.class ? person.class : formData.student_class;
    const selectedSection = 'section' in person && person.section ? person.section : formData.student_section;
    
    // Get academic_year from the selected class
    const selectedClassData = classes.find(c => c.class === selectedClass && c.section === selectedSection);
    
    setFormData({
      ...formData,
      person_id: person.id,
      person_name: name,
      student_class: selectedClass,
      student_section: selectedSection,
      academic_year: selectedClassData?.academic_year || '',
    });
    setSearchStaffQuery('');
    setSearchStudentQuery('');
    setShowStaffDropdown(false);
    setShowStudentDropdown(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-white rounded-lg shadow-xl my-8 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-orange-500 text-white px-6 py-4 rounded-t-lg flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold">Create Gate Pass</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Person Detail Section */}
          <div>
            <div className="bg-[#1E3A8A] text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold">Person Detail</h3>
            </div>
            <div className="border border-[#1E3A8A] rounded-b-lg p-4 space-y-4">
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
                        person_type: e.target.value as 'staff' | 'student',
                        person_id: '',
                        person_name: '',
                        student_class: '',
                        student_section: '',
                        academic_year: '',
                      });
                      setSearchStaffQuery('');
                      setSearchStudentQuery('');
                      setShowStaffDropdown(false);
                      setShowStudentDropdown(false);
                    }}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    required
                  >
                    <option value="staff">Staff</option>
                    <option value="student">Student</option>
                  </select>
                </div>
              </div>
              {formData.person_type === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.student_class}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          student_class: e.target.value,
                          student_section: '',
                          academic_year: '',
                          person_id: '',
                          person_name: '',
                        });
                        setSearchStudentQuery('');
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                      required={formData.person_type === 'student'}
                    >
                      <option value="">Select Class</option>
                      {Array.from(new Set(classes.map(c => c.class))).sort().map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Section <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.student_section}
                      onChange={(e) => {
                        const selectedSection = e.target.value;
                        // Get academic_year from the selected class and section
                        const selectedClassData = classes.find(c => c.class === formData.student_class && c.section === selectedSection);
                        setFormData({
                          ...formData,
                          student_section: selectedSection,
                          academic_year: selectedClassData?.academic_year || '',
                          person_id: '',
                          person_name: '',
                        });
                        setSearchStudentQuery('');
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                      required={formData.person_type === 'student'}
                      disabled={!formData.student_class}
                    >
                      <option value="">Select Section</option>
                      {sections.map((section) => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {formData.person_type} Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="text"
                    value={formData.person_name || (formData.person_type === 'staff' ? searchStaffQuery : searchStudentQuery)}
                    onChange={(e) => {
                      if (formData.person_type === 'staff') {
                        setSearchStaffQuery(e.target.value);
                        setShowStaffDropdown(true);
                        setShowStudentDropdown(false);
                        if (formData.person_name) {
                          setFormData({ ...formData, person_id: '', person_name: '' });
                        }
                      } else {
                        setSearchStudentQuery(e.target.value);
                        setShowStudentDropdown(true);
                        setShowStaffDropdown(false);
                        if (formData.person_name) {
                          setFormData({ ...formData, person_id: '', person_name: '' });
                        }
                      }
                    }}
                    onFocus={() => {
                      if (formData.person_type === 'staff') {
                        setShowStaffDropdown(true);
                        setShowStudentDropdown(false);
                      } else {
                        setShowStudentDropdown(true);
                        setShowStaffDropdown(false);
                      }
                    }}
                    placeholder={formData.person_name ? formData.person_name : `Search ${formData.person_type}`}
                    className="pl-10"
                    required
                  />
                  {((formData.person_type === 'staff' && showStaffDropdown) || (formData.person_type === 'student' && showStudentDropdown)) && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {(formData.person_type === 'staff' ? filteredStaff : filteredStudents).map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => selectPerson(person)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          {'full_name' in person ? (person.full_name || '') : ('student_name' in person ? person.student_name : '')}
                          {'class' in person && person.class && (
                            <span className="text-xs text-gray-500 ml-2">({person.class}-{person.section})</span>
                          )}
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

          {/* Pass Type and Reason Section */}
          <div>
            <div className="bg-[#1E3A8A] text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold">Pass Type & Reason</h3>
            </div>
            <div className="border border-[#1E3A8A] rounded-b-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pass Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    value={formData.pass_type}
                    onChange={(e) => setFormData({ ...formData, pass_type: e.target.value as 'early_leave' | 'late_entry' | 'half_day' })}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    required
                  >
                    <option value="">Select Pass Type</option>
                    <option value="early_leave">Early Leave</option>
                    <option value="late_entry">Late Entry</option>
                    <option value="half_day">Half Day</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Enter reason for gate pass"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Date & Time Section */}
          <div>
            <div className="bg-[#1E3A8A] text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold">Date & Time</h3>
            </div>
            <div className="border border-[#1E3A8A] rounded-b-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="pr-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Time Out <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type="time"
                      value={formData.time_out}
                      onChange={(e) => setFormData({ ...formData, time_out: e.target.value })}
                      required
                      className="pr-10"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expected Return Time
                </label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="time"
                    value={formData.expected_return_time}
                    onChange={(e) => setFormData({ ...formData, expected_return_time: e.target.value })}
                    className="pr-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t border-gray-200 flex-shrink-0">
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
              className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] hover:from-[#1E40AF] hover:to-[#2563EB] text-white"
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



