'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Users, 
  Search, 
  Plus, 
  RefreshCw, 
  Settings, 
  Eye, 
  Edit, 
  Download,
  User,
  Calendar,
  Clock,
  ArrowLeft,
  X,
  Phone,
  Mail,
  FileText,
  Car
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Visitor {
  id: string;
  visitor_name: string;
  phone_number?: string;
  email?: string;
  purpose_of_visit: string;
  person_to_meet: string;
  person_to_meet_id?: string;
  person_to_meet_type?: 'staff' | 'student' | 'other';
  visit_date: string;
  time_in: string;
  time_out?: string;
  status: 'IN' | 'OUT';
  id_proof_type?: string;
  id_proof_number?: string;
  vehicle_number?: string;
  remarks?: string;
  visitor_photo_url?: string;
}

interface Staff {
  id: string;
  full_name: string;
}

interface Student {
  id: string;
  student_name: string;
  class?: string;
  section?: string;
}

export default function VisitorManagementPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [searchPersonQuery, setSearchPersonQuery] = useState('');
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [filteredPeople, setFilteredPeople] = useState<Array<Staff | Student>>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedVisitorForView, setSelectedVisitorForView] = useState<Visitor | null>(null);

  const [formData, setFormData] = useState({
    visitor_name: '',
    phone_number: '',
    email: '',
    purpose_of_visit: '',
    person_to_meet: '',
    person_to_meet_id: '',
    person_to_meet_type: '' as 'staff' | 'student' | 'other' | '',
    visit_date: new Date().toISOString().split('T')[0],
    time_in: new Date().toTimeString().split(' ')[0].substring(0, 5),
    id_proof_type: '',
    id_proof_number: '',
    vehicle_number: '',
    remarks: '',
  });

  useEffect(() => {
    fetchStats();
    fetchVisitors();
    fetchStaff();
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, searchQuery, currentPage]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/visitors/stats?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.total_visitors !== undefined) {
        setTotalVisitors(result.total_visitors);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/visitors?${params}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setVisitors(result.data);
      }
    } catch (err) {
      console.error('Error fetching visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStaffList(result.data);
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
        setStudentList(result.data.map((s: { id: string; student_name?: string; full_name?: string; first_name?: string; last_name?: string; class: string; section?: string }) => ({
          id: s.id,
          student_name: s.student_name || s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          class: s.class,
          section: s.section,
        })));
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  useEffect(() => {
    if (searchPersonQuery && formData.person_to_meet_type) {
      const people = formData.person_to_meet_type === 'staff' ? staffList : studentList;
      const filtered = people.filter((person) => {
        const name = 'full_name' in person ? person.full_name : person.student_name;
        return name.toLowerCase().includes(searchPersonQuery.toLowerCase());
      });
      setFilteredPeople(filtered.slice(0, 10));
    } else {
      setFilteredPeople([]);
    }
  }, [searchPersonQuery, formData.person_to_meet_type, staffList, studentList]);

  const selectPerson = (person: Staff | Student) => {
    const name = 'full_name' in person ? person.full_name : person.student_name;
    setFormData({
      ...formData,
      person_to_meet: name,
      person_to_meet_id: person.id,
    });
    setSearchPersonQuery('');
    setShowPersonDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.visitor_name || !formData.purpose_of_visit || !formData.person_to_meet) {
      alert('Please fill in all required fields');
      return;
    }
    if (formData.phone_number) {
      const digitsOnly = formData.phone_number.replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        alert('Phone number must be exactly 10 digits.');
        return;
      }
    }

    // Get current staff from session storage
    const storedStaff = sessionStorage.getItem('staff');
    let createdBy: string | null = null;
    let staffId: string | null = null;
    
    if (storedStaff) {
      try {
        const staffData = JSON.parse(storedStaff);
        createdBy = staffData.id || null;
        staffId = staffData.id || null;
      } catch {
        // Ignore parse errors
      }
    }

    // If accessed from staff dashboard, check permissions
    if (staffId) {
      try {
        // Check staff permissions for visitor-management sub-module
        const permissionsResponse = await fetch(`/api/rbac/staff-permissions/${staffId}`);
        const permissionsResult = await permissionsResponse.json();
        
        if (permissionsResponse.ok && permissionsResult.data) {
          const modules = permissionsResult.data.modules || [];
          // Find Front Office management module and check for Visitor Management sub-module with edit_access
          let hasPermission = false;
          for (const mod of modules) {
            if (mod.name && (mod.name.toLowerCase().includes('front office') || mod.name.toLowerCase().includes('front_office'))) {
              const visitorSubModule = mod.sub_modules?.find((sm: { name?: string }) => 
                sm.name && (
                  sm.name.toLowerCase().includes('visitor') || 
                  sm.name.toLowerCase() === 'visitor management'
                )
              );
              if (visitorSubModule && visitorSubModule.edit_access === true) {
                hasPermission = true;
                break;
              }
            }
          }
          
          if (!hasPermission) {
            alert('You do not have permission to create visitors. Please contact your administrator.');
            setSaving(false);
            return;
          }
        }
      } catch (permErr) {
        console.error('Error checking permissions:', permErr);
        // Continue with creation if permission check fails (fail open for now)
      }
    }

    // If no staff in session (accessing from main dashboard), fetch default admin/principal
    if (!createdBy) {
      try {
        const response = await fetch(`/api/staff?school_code=${schoolCode}`);
        const result = await response.json();
        if (response.ok && result.data && Array.isArray(result.data) && result.data.length > 0) {
          // Try to find principal or admin first
          const principal = result.data.find((s: { role?: string; id: string }) => 
            s.role && (
              s.role.toLowerCase().includes('principal') || 
              s.role.toLowerCase().includes('admin')
            )
          );
          // If no principal/admin, use the first staff member
          const defaultStaff = principal || result.data[0];
          if (defaultStaff && defaultStaff.id) {
            createdBy = defaultStaff.id;
          } else {
            alert('Unable to create visitor. No valid staff found for this school.');
            setSaving(false);
            return;
          }
        } else {
          alert('Unable to create visitor. No staff found for this school.');
          setSaving(false);
          return;
        }
      } catch (err) {
        console.error('Error fetching default staff:', err);
        alert('Unable to create visitor. Please try again.');
        setSaving(false);
        return;
      }
    }

    // Final validation - ensure we have valid value before proceeding
    if (!createdBy) {
      alert('Unable to create visitor. Staff information is missing.');
      setSaving(false);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
          person_to_meet_type: formData.person_to_meet_type || null,
          person_to_meet_id: formData.person_to_meet_id || null,
          created_by: createdBy,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowAddModal(false);
        setFormData({
          visitor_name: '',
          phone_number: '',
          email: '',
          purpose_of_visit: '',
          person_to_meet: '',
          person_to_meet_id: '',
          person_to_meet_type: '',
          visit_date: new Date().toISOString().split('T')[0],
          time_in: new Date().toTimeString().split(' ')[0].substring(0, 5),
          id_proof_type: '',
          id_proof_number: '',
          vehicle_number: '',
          remarks: '',
        });
        fetchVisitors();
        fetchStats();
      } else {
        alert(result.error || 'Failed to create visitor');
      }
    } catch (err) {
      console.error('Error creating visitor:', err);
      alert('Failed to create visitor. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkExit = async (visitorId: string) => {
    try {
      const response = await fetch(`/api/visitors/${visitorId}/mark-out`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time_out: new Date().toTimeString().split(' ')[0].substring(0, 5),
        }),
      });

      if (response.ok) {
        fetchVisitors();
      }
    } catch (err) {
      console.error('Error marking exit:', err);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportFromDate || !reportToDate) {
      alert('Please select both From and To dates.');
      return;
    }
    if (new Date(reportFromDate) > new Date(reportToDate)) {
      alert('From date must be before or equal to To date.');
      return;
    }
    setReportLoading(true);
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
        start_date: reportFromDate,
        end_date: reportToDate,
        page: '1',
        limit: '10000',
      });
      const response = await fetch(`/api/visitors?${params}`);
      const result = await response.json();
      if (!response.ok) {
        alert(result.error || 'Failed to fetch visitors for report.');
        return;
      }
      const data = Array.isArray(result.data) ? result.data : [];
      const rows = (data as Visitor[]).map((v) => ({
        'Visitor Name': v.visitor_name,
        'Phone': v.phone_number ?? '',
        'Email': v.email ?? '',
        'Purpose of Visit': v.purpose_of_visit,
        'Person to Meet': v.person_to_meet,
        'Date': formatDateForExcel(v.visit_date),
        'Visit Date': v.visit_date,
        'Time In': v.time_in,
        'Time Out': v.time_out ?? '',
        'Status': v.status,
        'ID Proof Type': v.id_proof_type ?? '',
        'ID Proof Number': v.id_proof_number ?? '',
        'Vehicle Number': v.vehicle_number ?? '',
        'Remarks': v.remarks ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Visitors');
      const filename = `visitor-report-${reportFromDate}-to-${reportToDate}.xlsx`;
      XLSX.writeFile(wb, filename);
      setShowReportModal(false);
      setReportFromDate('');
      setReportToDate('');
    } catch (err) {
      console.error('Error downloading report:', err);
      alert('Failed to download report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      IN: { text: 'IN', color: 'bg-green-100 text-green-800 border-green-200' },
      OUT: { text: 'OUT', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.IN;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatDateTime = (date?: string, time?: string) => {
    if (!date) return '-';
    const d = new Date(date);
    const formattedDate = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return time ? `${formattedDate}, ${time}` : formattedDate;
  };

  const formatDateOnly = (date?: string) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateForExcel = (date?: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDownloadSingle = (visitor: Visitor) => {
    const row = {
      'Visitor Name': visitor.visitor_name,
      'Phone': visitor.phone_number ?? '',
      'Email': visitor.email ?? '',
      'Purpose of Visit': visitor.purpose_of_visit,
      'Person to Meet': visitor.person_to_meet,
      'Date': formatDateForExcel(visitor.visit_date),
      'Visit Date': visitor.visit_date,
      'Time In': visitor.time_in,
      'Time Out': visitor.time_out ?? '',
      'Status': visitor.status,
      'ID Proof Type': visitor.id_proof_type ?? '',
      'ID Proof Number': visitor.id_proof_number ?? '',
      'Vehicle Number': visitor.vehicle_number ?? '',
      'Remarks': visitor.remarks ?? '',
    };
    const ws = XLSX.utils.json_to_sheet([row]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Visitor');
    XLSX.writeFile(wb, `visitor-${visitor.visitor_name.replace(/\s+/g, '-')}-${visitor.visit_date}.xlsx`);
  };

  const totalPages = Math.ceil(totalVisitors / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Users size={32} />
            Visitor Management
          </h1>
          <p className="text-gray-600">Manage and track school visitors</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/front-office`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Stats Card */}
      <Card>
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white rounded-lg">
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalVisitors}</p>
            <p className="text-sm text-blue-100">Total Visitors</p>
          </div>
        </div>
      </Card>

      {/* Search and Actions */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <Search className="text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search by visitor's name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] hover:from-[#1E40AF] hover:to-[#2563EB] text-white"
            >
              <Plus size={18} className="mr-2" />
              ADD VISITOR
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2"
            >
              <Download size={18} />
              Report
            </Button>
            <Button
              variant="outline"
              onClick={fetchVisitors}
              className="rounded-full p-2"
            >
              <RefreshCw size={18} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Visitors Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading visitors...</p>
            </div>
          ) : visitors.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold text-gray-900 mb-2">No visitors found</p>
              <p className="text-sm text-gray-600">Add a visitor to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Visitor Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Purpose Of Visit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Person to Meet
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Visit Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Exit Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visitors.map((visitor) => (
                  <motion.tr
                    key={visitor.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {visitor.visitor_photo_url ? (
                          <Image
                            src={visitor.visitor_photo_url}
                            alt={visitor.visitor_name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User size={16} className="text-gray-500" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900">{visitor.visitor_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {visitor.purpose_of_visit}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {visitor.person_to_meet}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDateOnly(visitor.visit_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(visitor.visit_date, visitor.time_in)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {visitor.time_out ? (
                        <span className="text-sm text-gray-600">
                          {visitor.time_out}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleMarkExit(visitor.id)}
                          className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] hover:from-[#1E40AF] hover:to-[#2563EB] text-white text-xs px-3 py-1"
                        >
                          MARK EXIT
                        </Button>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(visitor.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {visitor.time_out ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedVisitorForView(visitor)}
                              className="p-2 text-[#1E3A8A] hover:bg-blue-50 rounded-lg transition-colors"
                              title="View details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadSingle(visitor)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Download as Excel"
                            >
                              <Download size={18} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit (coming soon)"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && visitors.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">Total Rows: {totalVisitors}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ←
              </button>
              <span className="px-4 py-2 bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white rounded-full text-sm font-semibold">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Visitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl bg-white rounded-lg shadow-xl my-8 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white px-6 py-4 rounded-t-lg flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold">Create Visitor Entry</h2>
              <button onClick={() => setShowAddModal(false)} className="text-white hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Visitor Details Section */}
              <div>
                <div className="bg-[#1E3A8A] text-white px-4 py-2 rounded-t-lg">
                  <h3 className="font-semibold">Visitor Details</h3>
                </div>
                <div className="border border-[#1E3A8A] rounded-b-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Visitor Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="text"
                        value={formData.visitor_name}
                        onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                        placeholder="Enter visitor name"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Phone size={14} className="inline mr-1" />
                        Phone Number
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone_number}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, phone_number: value });
                        }}
                        placeholder="10 digits only"
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Mail size={14} className="inline mr-1" />
                        Email
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Visit Details Section */}
              <div>
                <div className="bg-[#1E3A8A] text-white px-4 py-2 rounded-t-lg">
                  <h3 className="font-semibold">Visit Details</h3>
                </div>
                <div className="border border-[#1E3A8A] rounded-b-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Purpose of Visit <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.purpose_of_visit}
                      onChange={(e) => setFormData({ ...formData, purpose_of_visit: e.target.value })}
                      placeholder="Enter purpose of visit"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Person to Meet <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <select
                        value={formData.person_to_meet_type}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            person_to_meet_type: e.target.value as 'staff' | 'student' | 'other' | '',
                            person_to_meet: '',
                            person_to_meet_id: '',
                          });
                          setSearchPersonQuery('');
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                        required
                      >
                        <option value="">Select Type</option>
                        <option value="staff">Staff</option>
                        <option value="student">Student</option>
                        <option value="other">Other</option>
                      </select>
                      {formData.person_to_meet_type && formData.person_to_meet_type !== 'other' && (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <Input
                            type="text"
                            value={formData.person_to_meet || searchPersonQuery}
                            onChange={(e) => {
                              setSearchPersonQuery(e.target.value);
                              setShowPersonDropdown(true);
                              if (formData.person_to_meet) {
                                setFormData({ ...formData, person_to_meet: '', person_to_meet_id: '' });
                              }
                            }}
                            onFocus={() => setShowPersonDropdown(true)}
                            placeholder={`Search ${formData.person_to_meet_type}`}
                            className="pl-10"
                          />
                          {showPersonDropdown && filteredPeople.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {filteredPeople.map((person) => (
                                <button
                                  key={person.id}
                                  type="button"
                                  onClick={() => selectPerson(person)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                                >
                                  {'full_name' in person ? person.full_name : person.student_name}
                                  {'class' in person && person.class && (
                                    <span className="text-xs text-gray-500 ml-2">({person.class}-{person.section})</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                          {formData.person_to_meet && (
                            <div className="mt-2 text-sm text-gray-600">
                              Selected: <span className="font-medium">{formData.person_to_meet}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {formData.person_to_meet_type === 'other' && (
                        <Input
                          type="text"
                          value={formData.person_to_meet}
                          onChange={(e) => setFormData({ ...formData, person_to_meet: e.target.value })}
                          placeholder="Enter person name"
                          required
                        />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar size={14} className="inline mr-1" />
                        Visit Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={formData.visit_date}
                        onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Clock size={14} className="inline mr-1" />
                        Time In <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="time"
                        value={formData.time_in}
                        onChange={(e) => setFormData({ ...formData, time_in: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div>
                <div className="bg-[#1E3A8A] text-white px-4 py-2 rounded-t-lg">
                  <h3 className="font-semibold">Additional Information (Optional)</h3>
                </div>
                <div className="border border-[#1E3A8A] rounded-b-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <FileText size={14} className="inline mr-1" />
                        ID Proof Type
                      </label>
                      <select
                        value={formData.id_proof_type}
                        onChange={(e) => setFormData({ ...formData, id_proof_type: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                      >
                        <option value="">Select ID Proof Type</option>
                        <option value="Aadhaar">Aadhaar</option>
                        <option value="PAN">PAN</option>
                        <option value="Driving License">Driving License</option>
                        <option value="Voter ID">Voter ID</option>
                        <option value="Passport">Passport</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ID Proof Number
                      </label>
                      <Input
                        type="text"
                        value={formData.id_proof_number}
                        onChange={(e) => setFormData({ ...formData, id_proof_number: e.target.value })}
                        placeholder="Enter ID proof number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Car size={14} className="inline mr-1" />
                      Vehicle Number
                    </label>
                    <Input
                      type="text"
                      value={formData.vehicle_number}
                      onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                      placeholder="Enter vehicle number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="Enter any additional remarks"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-4 border-t border-gray-200 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
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
      )}

      {/* Download Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-lg shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Download size={24} className="text-[#1E3A8A]" />
                Download Visitor Report
              </h2>
              <button
                onClick={() => !reportLoading && setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Select date range to export visitor entries as Excel.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
                <Input
                  type="date"
                  value={reportFromDate}
                  onChange={(e) => setReportFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
                <Input
                  type="date"
                  value={reportToDate}
                  onChange={(e) => setReportToDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReportModal(false)}
                disabled={reportLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDownloadReport}
                disabled={reportLoading}
                className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] hover:from-[#1E40AF] hover:to-[#2563EB] text-white"
              >
                {reportLoading ? 'Generating...' : 'Download Excel'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* View Visitor Details Modal */}
      {selectedVisitorForView && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Visitor Details</h2>
              <button
                type="button"
                onClick={() => setSelectedVisitorForView(null)}
                className="text-white/90 hover:text-white p-1"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Visitor Name</p>
                  <p className="text-gray-900 font-medium">{selectedVisitorForView.visitor_name}</p>
                </div>
                {(selectedVisitorForView.phone_number || selectedVisitorForView.email) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedVisitorForView.phone_number && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Phone</p>
                        <p className="text-gray-900">{selectedVisitorForView.phone_number}</p>
                      </div>
                    )}
                    {selectedVisitorForView.email && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                        <p className="text-gray-900">{selectedVisitorForView.email}</p>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Purpose of Visit</p>
                  <p className="text-gray-900">{selectedVisitorForView.purpose_of_visit}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Person to Meet</p>
                  <p className="text-gray-900">{selectedVisitorForView.person_to_meet}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Date</p>
                    <p className="text-gray-900">{formatDateOnly(selectedVisitorForView.visit_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Time In</p>
                    <p className="text-gray-900">{selectedVisitorForView.time_in}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Time Out</p>
                    <p className="text-gray-900">{selectedVisitorForView.time_out ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Status</p>
                    <p className="text-gray-900">{selectedVisitorForView.status}</p>
                  </div>
                </div>
                {(selectedVisitorForView.id_proof_type || selectedVisitorForView.id_proof_number) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedVisitorForView.id_proof_type && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">ID Proof Type</p>
                        <p className="text-gray-900">{selectedVisitorForView.id_proof_type}</p>
                      </div>
                    )}
                    {selectedVisitorForView.id_proof_number && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">ID Proof Number</p>
                        <p className="text-gray-900">{selectedVisitorForView.id_proof_number}</p>
                      </div>
                    )}
                  </div>
                )}
                {selectedVisitorForView.vehicle_number && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Vehicle Number</p>
                    <p className="text-gray-900">{selectedVisitorForView.vehicle_number}</p>
                  </div>
                )}
                {selectedVisitorForView.remarks && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Remarks</p>
                    <p className="text-gray-900">{selectedVisitorForView.remarks}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleDownloadSingle(selectedVisitorForView)}
              >
                <Download size={16} className="mr-2" />
                Download Excel
              </Button>
              <Button onClick={() => setSelectedVisitorForView(null)}>Close</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

