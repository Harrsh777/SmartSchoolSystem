'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Award,
  Search,
  Eye,
  Download,
  ArrowLeft,
  FileImage,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import Image from 'next/image';

interface Certificate {
  id: string;
  student_id: string;
  student_name: string;
  student_class: string;
  student_section?: string;
  certificate_image_url: string;
  certificate_title?: string;
  submitted_at: string;
  submitted_by?: string;
}

export default function CertificateDashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch certificates
  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/certificates/simple?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setCertificates(result.data);
      } else {
        setError(result.error || 'Failed to fetch certificates');
      }
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch = 
      cert.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.student_class.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cert.certificate_title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: certificates.length,
    thisMonth: certificates.filter(c => {
      const certDate = new Date(c.submitted_at);
      const now = new Date();
      return certDate.getMonth() === now.getMonth() && certDate.getFullYear() === now.getFullYear();
    }).length,
    today: certificates.filter(c => {
      const certDate = new Date(c.submitted_at).toISOString().split('T')[0];
      return certDate === new Date().toISOString().split('T')[0];
    }).length,
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
              <Award className="text-white" size={28} />
            </div>
            Certificate Dashboard
          </h1>
          <p className="text-gray-600">View and manage all student certificates</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm"
          >
            <div className="flex items-center gap-2">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-gradient-to-br from-[#5A7A95] to-[#567C8D] text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#C8D9E6] text-sm font-medium mb-2">Total Certificates</p>
                <p className="text-4xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <Award size={32} className="opacity-90" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-[#6B9BB8] to-[#5A7A95] text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#C8D9E6] text-sm font-medium mb-2">This Month</p>
                <p className="text-4xl font-bold">{stats.thisMonth}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <Calendar size={32} className="opacity-90" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-[#567C8D] to-[#6B9BB8] text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#C8D9E6] text-sm font-medium mb-2">Today</p>
                <p className="text-4xl font-bold">{stats.today}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <CheckCircle2 size={32} className="opacity-90" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Search */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5A7A95] dark:text-[#6B9BB8]" size={20} />
            <Input
              type="text"
              placeholder="Search by student name, class, or certificate title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 focus:border-[#5A7A95] dark:focus:border-[#6B9BB8] rounded-xl transition-all"
            />
          </div>
        </Card>
      </motion.div>

      {/* Certificates List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A7A95] border-t-transparent"></div>
            <p className="text-[#5A7A95] dark:text-[#6B9BB8] font-medium">Loading certificates...</p>
          </div>
        </div>
      ) : filteredCertificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((cert, index) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card className="p-5 hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-[#5A7A95]/30 dark:hover:border-[#6B9BB8]/30 group">
                <div className="relative w-full h-52 mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-[#F0F5F9] to-gray-100 dark:from-[#1e293b] dark:to-[#0f172a] border-2 border-gray-200 dark:border-gray-700 group-hover:border-[#5A7A95] dark:group-hover:border-[#6B9BB8] transition-colors">
                  {cert.certificate_image_url ? (
                    <Image
                      src={cert.certificate_image_url}
                      alt={cert.certificate_title || 'Certificate'}
                      fill
                      className="object-contain p-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="text-gray-400 dark:text-gray-600" size={48} />
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{cert.student_name}</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#5A7A95] dark:bg-[#6B9BB8]"></div>
                      <p>Class: {cert.student_class}{cert.student_section ? `-${cert.student_section}` : ''}</p>
                    </div>
                    {cert.certificate_title && (
                      <div className="flex items-center gap-2 mt-2">
                        <Award size={14} className="text-[#5A7A95] dark:text-[#6B9BB8]" />
                        <p className="font-semibold text-[#5A7A95] dark:text-[#6B9BB8]">{cert.certificate_title}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <Calendar size={12} className="text-gray-400" />
                      <p className="text-gray-500">
                        {new Date(cert.submitted_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => window.open(cert.certificate_image_url, '_blank')}
                      className="flex-1 px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] text-white rounded-lg hover:from-[#567C8D] hover:to-[#5A7A95] transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <Eye size={16} />
                      View
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = cert.certificate_image_url;
                        link.download = `${cert.student_name}_certificate.jpg`;
                        link.click();
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-medium bg-[#F0F5F9] dark:bg-[#2F4156] text-[#5A7A95] dark:text-[#6B9BB8] rounded-lg hover:bg-[#E1E1DB] dark:hover:bg-[#1e293b] transition-all duration-300 flex items-center justify-center gap-2 border border-[#5A7A95]/20 dark:border-[#6B9BB8]/20"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="p-16">
            <div className="text-center">
              <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] mb-6">
                <Award size={48} className="text-white" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">No certificates found</p>
              <p className="text-gray-600 dark:text-gray-400">Start by creating a new certificate.</p>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
