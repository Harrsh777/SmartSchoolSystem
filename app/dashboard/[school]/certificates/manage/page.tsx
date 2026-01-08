'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Award,
  Search,
  Eye,
  Download,
  Printer,
  Share2,
  ArrowLeft,
  BookOpen,
  Filter,
  Calendar,
} from 'lucide-react';

interface Certificate {
  id: string;
  template_id: string;
  template_name: string;
  student_id: string;
  student_name: string;
  student_class: string;
  student_section?: string;
  certificate_number: string;
  issued_date: string;
  issued_by: string;
  status: 'DRAFT' | 'ISSUED' | 'SENT';
  preview_url?: string;
}

export default function ManageCertificatesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchCertificates();
  }, [schoolCode]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/certificates?school_code=${schoolCode}`);
      // const result = await response.json();
      // if (response.ok && result.data) {
      //   setCertificates(result.data);
      // }
      
      // Mock data for now
      setTimeout(() => {
        setCertificates([
          {
            id: '1',
            template_id: '1',
            template_name: 'Academic Excellence',
            student_id: 'STU001',
            student_name: 'John Doe',
            student_class: '10',
            student_section: 'A',
            certificate_number: 'CERT-2024-001',
            issued_date: '2024-01-20',
            issued_by: 'Principal',
            status: 'ISSUED',
          },
          {
            id: '2',
            template_id: '2',
            template_name: 'Sports Participation',
            student_id: 'STU002',
            student_name: 'Jane Smith',
            student_class: '9',
            student_section: 'B',
            certificate_number: 'CERT-2024-002',
            issued_date: '2024-01-19',
            issued_by: 'Sports Teacher',
            status: 'SENT',
          },
          {
            id: '3',
            template_id: '1',
            template_name: 'Academic Excellence',
            student_id: 'STU003',
            student_name: 'Bob Johnson',
            student_class: '11',
            student_section: 'C',
            certificate_number: 'CERT-2024-003',
            issued_date: '2024-01-18',
            issued_by: 'Principal',
            status: 'DRAFT',
          },
        ]);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setLoading(false);
    }
  };

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch = cert.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certificate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.template_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || cert.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ISSUED': return 'bg-green-100 text-green-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: certificates.length,
    issued: certificates.filter(c => c.status === 'ISSUED').length,
    sent: certificates.filter(c => c.status === 'SENT').length,
    draft: certificates.filter(c => c.status === 'DRAFT').length,
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Award className="text-orange-500" size={32} />
            Manage Certificates
          </h1>
          <p className="text-gray-600">View and manage all issued certificates</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Certificates</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-700 flex items-center justify-center">
              <Award size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Issued</p>
              <p className="text-3xl font-bold">{stats.issued}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-700 flex items-center justify-center">
              <Calendar size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Sent</p>
              <p className="text-3xl font-bold">{stats.sent}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-700 flex items-center justify-center">
              <Share2 size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-1">Draft</p>
              <p className="text-3xl font-bold">{stats.draft}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-700 flex items-center justify-center">
              <BookOpen size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-[300px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search certificates by student name, number, or template..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="SENT">Sent</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Certificates List */}
      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </Card>
      ) : filteredCertificates.length > 0 ? (
        <div className="space-y-3">
          {filteredCertificates.map((cert) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{cert.student_name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cert.status)}`}>
                        {cert.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Template:</span> {cert.template_name}
                      </div>
                      <div>
                        <span className="font-medium">Class:</span> {cert.student_class}{cert.student_section ? `-${cert.student_section}` : ''}
                      </div>
                      <div>
                        <span className="font-medium">Certificate #:</span> {cert.certificate_number}
                      </div>
                      <div>
                        <span className="font-medium">Issued:</span> {new Date(cert.issued_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Preview"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      title="Download"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                      title="Print"
                    >
                      <Printer size={18} />
                    </button>
                    <button
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                      title="Share"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">No certificates found</p>
            <p>Generate certificates to see them here.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

