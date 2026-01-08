'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
  Lock,
  User,
  Calendar,
  Clock,
  ArrowLeft,
  X
} from 'lucide-react';

interface Visitor {
  id: string;
  visitor_name: string;
  visitor_photo_url?: string;
  purpose_of_visit: string;
  student_name?: string;
  host_name: string;
  status: 'pending' | 'approved' | 'not_approved' | 'direct_entry';
  requested_by: string;
  check_in_date?: string;
  check_in_time?: string;
  exit_date?: string;
  exit_time?: string;
  student?: {
    id: string;
    student_name: string;
    admission_no: string;
  };
  host?: {
    id: string;
    full_name: string;
  };
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

  useEffect(() => {
    fetchStats();
    fetchVisitors();
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

  const handleMarkExit = async (visitorId: string) => {
    try {
      const now = new Date();
      const exitDate = now.toISOString().split('T')[0];
      const exitTime = now.toTimeString().split(' ')[0].substring(0, 5);

      const response = await fetch(`/api/visitors/${visitorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exit_date: exitDate,
          exit_time: exitTime,
        }),
      });

      if (response.ok) {
        fetchVisitors();
      }
    } catch (err) {
      console.error('Error marking exit:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { text: 'Approved', color: 'bg-green-100 text-green-800 border-green-200' },
      not_approved: { text: 'Not Approved', color: 'bg-green-100 text-green-800 border-green-200' },
      direct_entry: { text: 'Direct entry', color: 'bg-green-100 text-green-800 border-green-200' },
      pending: { text: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <Lock size={12} />
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
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-900">{totalVisitors}</p>
            <p className="text-sm text-blue-700">Total Visitors</p>
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
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              ADD VISITOR
            </Button>
            <Button
              variant="outline"
              onClick={fetchVisitors}
              className="rounded-full p-2"
            >
              <RefreshCw size={18} />
            </Button>
            <Button
              variant="outline"
              className="rounded-full p-2"
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Visitors Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
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
                    Student Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Host
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Check-in Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Exit time
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
                          <img
                            src={visitor.visitor_photo_url}
                            alt={visitor.visitor_name}
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
                      {visitor.student_name ? (
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          {visitor.student_name}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {visitor.host_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(visitor.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {visitor.requested_by === 'manual_entry' ? 'Manual entry' : visitor.requested_by}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(visitor.check_in_date, visitor.check_in_time)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {visitor.exit_date && visitor.exit_time ? (
                        <span className="text-sm text-gray-600">
                          {formatDateTime(visitor.exit_date, visitor.exit_time)}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleMarkExit(visitor.id)}
                          className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1"
                        >
                          MARK EXIT
                        </Button>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {visitor.exit_date ? (
                          <>
                            <button className="text-blue-600 hover:text-blue-800">
                              <Eye size={18} />
                            </button>
                            <button className="text-gray-600 hover:text-gray-800">
                              <Download size={18} />
                            </button>
                          </>
                        ) : (
                          <button className="text-gray-600 hover:text-gray-800">
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
              <span className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-semibold">
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

      {/* Add Visitor Modal - Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Add Visitor</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600">Add visitor form will be implemented here.</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

