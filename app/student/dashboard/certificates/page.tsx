'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Award, Download, Calendar, FileImage, Eye, CheckCircle2, Search, Filter } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

interface Certificate {
  id: string;
  type: 'simple' | 'issued';
  title: string;
  image_url: string | null;
  issued_date: string;
  verification_code?: string | null;
  submitted_by?: string | null;
  description?: string | null;
  school_code: string;
  student_id: string;
}

export default function StudentCertificatesPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'simple' | 'issued'>('all');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchCertificates(studentData);
    }
  }, []);

  const fetchCertificates = async (studentData: Student) => {
    try {
      setLoading(true);
      const schoolCode = getString(studentData.school_code);
      const studentId = getString(studentData.id);
      
      if (!schoolCode || !studentId) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/student/certificates?school_code=${schoolCode}&student_id=${studentId}`
      );

      const result = await response.json();

      if (response.ok && result.data) {
        setCertificates(result.data || []);
      } else {
        console.error('Error fetching certificates:', result.error);
        setCertificates([]);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (certificate: Certificate) => {
    if (!certificate.image_url) {
      alert('Certificate image not available');
      return;
    }

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = certificate.image_url;
    link.download = `${certificate.title.replace(/[^a-z0-9]/gi, '_')}_${new Date(certificate.issued_date).getFullYear()}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setPreviewOpen(true);
  };

  const filteredCertificates = certificates.filter(cert => {
    // Search filter
    if (searchTerm && !cert.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Type filter
    if (filterType !== 'all' && cert.type !== filterType) {
      return false;
    }
    return true;
  });

  const stats = {
    total: certificates.length,
    simple: certificates.filter(c => c.type === 'simple').length,
    issued: certificates.filter(c => c.type === 'issued').length,
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Award className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Certificate Management</h1>
            <p className="text-muted-foreground">View and download your certificates</p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card soft-shadow p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Certificates</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-blue-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Uploaded</p>
          <p className="text-2xl font-bold text-blue-600">{stats.simple}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-purple-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Generated</p>
          <p className="text-2xl font-bold text-purple-600">{stats.issued}</p>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="glass-card soft-shadow">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search certificates by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted border border-input rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-muted-foreground" size={18} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="all">All Types</option>
              <option value="simple">Uploaded</option>
              <option value="issued">Generated</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Certificates Grid */}
      {filteredCertificates.length === 0 ? (
        <Card className="glass-card soft-shadow">
          <div className="text-center py-12">
            <Award className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground text-lg">No certificates found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {certificates.length === 0 
                ? 'Your certificates will appear here once they are issued or uploaded.'
                : 'No certificates match your search criteria.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((certificate) => (
            <motion.div
              key={certificate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card soft-shadow hover:shadow-md transition-all overflow-hidden">
                <div className="space-y-4">
                  {/* Certificate Image/Preview */}
                  <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden group">
                    {certificate.image_url ? (
                      <>
                        <Image
                          src={certificate.image_url}
                          alt={certificate.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Button
                            size="sm"
                            onClick={() => handlePreview(certificate)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye size={16} className="mr-2" />
                            Preview
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="text-muted-foreground" size={48} />
                      </div>
                    )}
                    {certificate.type === 'issued' && certificate.verification_code && (
                      <div className="absolute top-2 right-2">
                        <div className="px-2 py-1 bg-primary/90 text-primary-foreground text-xs font-medium rounded">
                          Verified
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Certificate Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground line-clamp-2">{certificate.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar size={14} />
                      <span>
                        {new Date(certificate.issued_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {certificate.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{certificate.description}</p>
                    )}
                    {certificate.verification_code && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 size={12} />
                        <span>Code: {certificate.verification_code}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-input">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(certificate)}
                      className="flex-1"
                      disabled={!certificate.image_url}
                    >
                      <Eye size={16} className="mr-2" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(certificate)}
                      className="flex-1"
                      disabled={!certificate.image_url}
                    >
                      <Download size={16} className="mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && selectedCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="p-6 border-b border-input flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedCertificate.title}</h2>
                <p className="text-sm text-muted-foreground">
                  Issued: {new Date(selectedCertificate.issued_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedCertificate)}
                  disabled={!selectedCertificate.image_url}
                >
                  <Download size={16} className="mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {selectedCertificate.image_url ? (
                <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                  <Image
                    src={selectedCertificate.image_url}
                    alt={selectedCertificate.title}
                    fill
                    className="object-contain"
                    unoptimized
                    sizes="100vw"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                  <p className="text-muted-foreground">Certificate image not available</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
