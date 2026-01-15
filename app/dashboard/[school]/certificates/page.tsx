'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import {
  Award,
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  X,
  Check,
  Users,
  Calendar,
  BookOpen,
  Image as ImageIcon,
  Settings,
  Printer,
  Share2,
  Copy,
  ArrowLeft,
  Sparkles,
  Layout,
  Type,
  Palette,
  Upload,
  Save,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface CertificateTemplate {
  id: string;
  name: string;
  type: 'student' | 'staff';
  description: string | null;
  preview_url?: string;
  background_image_url?: string;
  page_size?: string;
  page_orientation?: string;
  design_json?: any;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

interface Certificate {
  id: string;
  template_id: string;
  template_name?: string;
  recipient_type: 'student' | 'staff';
  recipient_id: string;
  certificate_number: string;
  certificate_code?: string;
  issued_at: string;
  status: 'DRAFT' | 'ISSUED' | 'SENT';
  pdf_path?: string;
  verification_url?: string;
  recipient_info?: {
    student_name?: string;
    student_class?: string;
    student_section?: string;
    staff_name?: string;
    staff_designation?: string;
  };
}

export default function CertificateManagementPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'templates' | 'generate' | 'library' | 'classwise'>('templates');
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/certificates/templates?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setTemplates(result.data);
      } else {
        setError(result.error || 'Failed to fetch templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Fetch certificates
  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/certificates/issued?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        // Transform API data to match our interface
        const transformedCerts = result.data.map((cert: any) => ({
          id: cert.id,
          template_id: cert.template_id,
          template_name: cert.certificate_templates?.name,
          recipient_type: cert.recipient_type,
          recipient_id: cert.recipient_id,
          certificate_number: cert.certificate_number,
          certificate_code: cert.certificate_code,
          issued_at: cert.issued_at,
          status: cert.status,
          pdf_path: cert.pdf_path,
          verification_url: cert.verification_url,
          recipient_info: cert.recipient_info,
        }));
        setCertificates(transformedCerts);
      } else {
        setError(result.error || 'Failed to fetch certificates');
      }
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  // Handle template save (create/update)
  const handleTemplateSave = async (templateData: {
    name: string;
    type: 'student' | 'staff';
    description: string;
    page_size?: string;
    page_orientation?: string;
    height_mm?: number;
    width_mm?: number;
    image_size_px?: number;
    user_image_shape?: string;
    background_image_url?: string;
    html_template?: string;
  }) => {
    try {
      setError('');
      setSuccess('');
      
      // Get staff ID for created_by
      let createdBy: string | null = null;
      try {
        const storedStaff = sessionStorage.getItem('staff');
        if (storedStaff) {
          const staffData = JSON.parse(storedStaff);
          createdBy = staffData.id || null;
        }
      } catch {
        // Ignore parse errors
      }
      
      if (selectedTemplate) {
        // Update existing template
        // Get existing design_json and update settings
        const existingDesignJson = (selectedTemplate as any).design_json || {};
        const updatedDesignJson = {
          ...existingDesignJson,
          settings: {
            ...(existingDesignJson.settings || {}),
            height_mm: templateData.height_mm || 210,
            width_mm: templateData.width_mm || 297,
            user_image_shape: templateData.user_image_shape || 'round',
            image_size_px: templateData.image_size_px || 100,
          },
        };

        const response = await fetch(`/api/certificates/templates/${selectedTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateData.name,
            type: templateData.type,
            description: templateData.description,
            page_size: templateData.page_size || 'A4',
            page_orientation: templateData.page_orientation || 'portrait',
            background_image_url: templateData.background_image_url || null,
            html_template: templateData.html_template || templateData.description || null,
            design_json: updatedDesignJson,
          }),
        });
        const result = await response.json();
        if (response.ok) {
          setSuccess('Template updated successfully');
          fetchTemplates();
          setShowTemplateModal(false);
          setSelectedTemplate(null);
        } else {
          setError(result.error || 'Failed to update template');
        }
      } else {
        // Create new template
        // Store additional settings in design_json
        const designJson = {
          elements: [],
          background: {
            type: templateData.background_image_url ? 'image' : 'color',
            url: templateData.background_image_url || null,
            color: '#FFFFFF',
          },
          settings: {
            height_mm: templateData.height_mm || 210,
            width_mm: templateData.width_mm || 297,
            user_image_shape: templateData.user_image_shape || 'round',
            image_size_px: templateData.image_size_px || 100,
          },
        };

        const response = await fetch('/api/certificates/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            name: templateData.name,
            type: templateData.type,
            description: templateData.description,
            page_size: templateData.page_size || 'A4',
            page_orientation: templateData.page_orientation || 'portrait',
            background_image_url: templateData.background_image_url || null,
            html_template: templateData.html_template || templateData.description || null,
            design_json: designJson,
            created_by: createdBy,
          }),
        });
        const result = await response.json();
        if (response.ok) {
          setSuccess('Template created successfully');
          fetchTemplates();
          setShowTemplateModal(false);
          setSelectedTemplate(null);
        } else {
          setError(result.error || 'Failed to create template');
        }
      }
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template');
    }
  };

  // Handle template delete
  const handleTemplateDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');
      const response = await fetch(`/api/certificates/templates/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (response.ok) {
        setSuccess('Template deleted successfully');
        fetchTemplates();
      } else {
        setError(result.error || 'Failed to delete template');
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template');
    }
  };

  useEffect(() => {
    fetchTemplates();
    if (activeTab === 'library') {
      fetchCertificates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, activeTab]);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || template.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const filteredCertificates = certificates.filter((cert) => {
    const recipientName = cert.recipient_info?.student_name || cert.recipient_info?.staff_name || '';
    const matchesSearch = recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certificate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cert.template_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    totalTemplates: templates.length,
    totalCertificates: certificates.length,
    issuedToday: certificates.filter(c => {
      const issuedDate = new Date(c.issued_at).toISOString().split('T')[0];
      return issuedDate === new Date().toISOString().split('T')[0];
    }).length,
    pendingIssuance: certificates.filter(c => c.status === 'DRAFT').length,
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Award className="text-orange-500" size={32} />
            Certificate Management
          </h1>
          <p className="text-gray-600">Create, manage, and issue certificates for students and staff</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={20} />
              <p className="text-green-800 font-medium">{success}</p>
            </div>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Templates</p>
              <p className="text-3xl font-bold">{stats.totalTemplates}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-700 flex items-center justify-center">
              <FileText size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Total Certificates</p>
              <p className="text-3xl font-bold">{stats.totalCertificates}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-700 flex items-center justify-center">
              <Award size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Issued Today</p>
              <p className="text-3xl font-bold">{stats.issuedToday}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-700 flex items-center justify-center">
              <Calendar size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-1">Pending</p>
              <p className="text-3xl font-bold">{stats.pendingIssuance}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-700 flex items-center justify-center">
              <Sparkles size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="p-0">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'templates', label: 'Templates', icon: FileText },
              { id: 'generate', label: 'Generate', icon: Plus },
              { id: 'library', label: 'Library', icon: BookOpen },
              { id: 'classwise', label: 'Class-wise', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <TemplatesTab
              templates={filteredTemplates}
              loading={loading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterType={filterType}
              setFilterType={setFilterType}
              onEdit={(template) => {
                setSelectedTemplate(template);
                setShowTemplateModal(true);
              }}
              onCreate={() => {
                setSelectedTemplate(null);
                setShowTemplateModal(true);
              }}
              onDelete={handleTemplateDelete}
            />
          )}

          {/* Generate Tab */}
          {activeTab === 'generate' && (
            <GenerateTab
              templates={templates}
              onGenerate={() => setShowGenerateModal(true)}
            />
          )}

          {/* Library Tab */}
          {activeTab === 'library' && (
            <LibraryTab
              certificates={filteredCertificates}
              loading={loading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}

          {/* Class-wise Tab */}
          {activeTab === 'classwise' && (
            <ClasswiseTab schoolCode={schoolCode} templates={templates} />
          )}
        </div>
      </Card>

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          schoolCode={schoolCode}
          template={selectedTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setSelectedTemplate(null);
            setError('');
          }}
          onSave={handleTemplateSave}
        />
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <GenerateModal
          templates={templates}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={(cert) => {
            setCertificates([...certificates, cert]);
            setShowGenerateModal(false);
          }}
        />
      )}
    </div>
  );
}

// Templates Tab Component
function TemplatesTab({
  templates,
  loading,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  onEdit,
  onCreate,
  onDelete,
}: {
  templates: CertificateTemplate[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  onEdit: (template: CertificateTemplate) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'student': return 'bg-blue-100 text-blue-800';
      case 'staff': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Types</option>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <Button onClick={onCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={18} className="mr-2" />
          Create Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <Card className="p-6 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{template.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(template.type)}`}>
                      {template.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(template)}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(template.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description || 'No description'}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Used {template.usage_count} times</span>
                  <span>{new Date(template.updated_at).toLocaleDateString()}</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <FileText size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">No templates found</p>
            <p>Create your first certificate template to get started.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// Generate Tab Component
function GenerateTab({
  templates,
  onGenerate,
}: {
  templates: CertificateTemplate[];
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="text-orange-500" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Certificates</h2>
        <p className="text-gray-600 mb-6">Create and issue certificates for students</p>
        <Button onClick={onGenerate} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3">
          <Plus size={20} className="mr-2" />
          Start Generation Wizard
        </Button>
      </div>

      {templates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.slice(0, 4).map((template) => (
              <Card key={template.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onGenerate}
                    className="ml-4"
                  >
                    Use
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Library Tab Component
function LibraryTab({
  certificates,
  loading,
  searchQuery,
  setSearchQuery,
}: {
  certificates: Certificate[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ISSUED': return 'bg-green-100 text-green-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : certificates.length > 0 ? (
        <div className="space-y-3">
          {certificates.map((cert) => (
            <Card key={cert.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {cert.recipient_info?.student_name || cert.recipient_info?.staff_name || 'Unknown'}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cert.status)}`}>
                      {cert.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Template:</span> {cert.template_name || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Class:</span> {cert.recipient_info?.student_class || 'N/A'}
                      {cert.recipient_info?.student_section ? `-${cert.recipient_info.student_section}` : ''}
                    </div>
                    <div>
                      <span className="font-medium">Certificate #:</span> {cert.certificate_number}
                    </div>
                    <div>
                      <span className="font-medium">Issued:</span> {new Date(cert.issued_at).toLocaleDateString()}
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
                </div>
              </div>
            </Card>
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

// Class-wise Tab Component
function ClasswiseTab({ schoolCode, templates }: { schoolCode: string; templates: CertificateTemplate[] }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/classes?school_code=${schoolCode}`);
        const result = await response.json();
        if (response.ok && result.data) {
          setClasses(result.data);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [schoolCode]);

  // Fetch students when class is selected
  useEffect(() => {
    if (selectedClass) {
      const fetchStudents = async () => {
        try {
          setLoading(true);
          const classData = classes.find(c => c.id === selectedClass);
          if (!classData) return;
          
          const response = await fetch(`/api/students?school_code=${schoolCode}&class=${classData.class}&section=${classData.section}`);
          const result = await response.json();
          if (response.ok && result.data) {
            setStudents(result.data);
          }
        } catch (err) {
          console.error('Error fetching students:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [selectedClass, classes, schoolCode]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={loading}
          >
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.class}-{cls.section}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={loading || templates.length === 0}
          >
            <option value="">Select a template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedClass && selectedTemplate && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Students</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : students.length > 0 ? (
            <>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {students.map((student) => (
                  <label key={student.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input type="checkbox" className="mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{student.full_name}</p>
                      <p className="text-sm text-gray-600">Roll No: {student.roll_number || 'N/A'}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Generate Certificates
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No students found for this class.</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// Template Modal Component
function TemplateModal({
  schoolCode,
  template,
  onClose,
  onSave,
}: {
  schoolCode: string;
  template: CertificateTemplate | null;
  onClose: () => void;
  onSave: (templateData: {
    name: string;
    type: 'student' | 'staff';
    description: string;
    page_size?: string;
    page_orientation?: string;
    height_mm?: number;
    width_mm?: number;
    image_size_px?: number;
    user_image_shape?: string;
    background_image_url?: string;
    html_template?: string;
  }) => Promise<void>;
}) {
  // Initialize form data from template or defaults
  const getInitialFormData = () => {
    if (!template) {
      return {
        name: '',
        type: 'student' as 'student' | 'staff',
        description: '',
        height_mm: 210,
        width_mm: 297,
        user_image_shape: 'round' as 'round' | 'square' | 'circle',
        page_layout: 'A4 Landscape' as 'A4 Portrait' | 'A4 Landscape' | 'A3 Portrait' | 'A3 Landscape',
        image_size_px: 100,
        background_image_url: '',
      };
    }
    
    // Parse design_json for additional settings
    const designJson = (template as any).design_json || {};
    const settings = designJson.settings || {};
    
    // Get page layout from template
    const pageSize = template.page_size || 'A4';
    const pageOrientation = template.page_orientation || 'landscape';
    const pageLayout = `${pageSize} ${pageOrientation.charAt(0).toUpperCase() + pageOrientation.slice(1)}` as 'A4 Portrait' | 'A4 Landscape' | 'A3 Portrait' | 'A3 Landscape';
    
    return {
      name: template.name || '',
      type: (template.type || 'student') as 'student' | 'staff',
      description: template.description || '',
      height_mm: settings.height_mm || 210,
      width_mm: settings.width_mm || 297,
      user_image_shape: (settings.user_image_shape || 'round') as 'round' | 'square' | 'circle',
      page_layout: pageLayout,
      image_size_px: settings.image_size_px || 100,
      background_image_url: template.background_image_url || '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(template?.background_image_url || null);
  const [uploading, setUploading] = useState(false);
  const [placeholderFields, setPlaceholderFields] = useState<any[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const quillRef = useRef<any>(null);

  // Update form data when template changes
  useEffect(() => {
    const initialData = getInitialFormData();
    setFormData(initialData);
    setBackgroundPreview(template?.background_image_url || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id]);

  // Fetch placeholder fields
  useEffect(() => {
    const fetchFields = async () => {
      try {
        setLoadingFields(true);
        const response = await fetch('/api/certificates/fields');
        const result = await response.json();
        if (response.ok && result.data) {
          // Filter fields based on template type
          const filtered = result.data.filter((field: any) => {
            if (formData.type === 'student') {
              return field.source_type === 'student' || field.source_type === 'system';
            } else {
              return field.source_type === 'staff' || field.source_type === 'system';
            }
          });
          setPlaceholderFields(filtered);
        }
      } catch (err) {
        console.error('Error fetching placeholder fields:', err);
      } finally {
        setLoadingFields(false);
      }
    };
    fetchFields();
  }, [formData.type]);

  // Handle background image upload
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('school_code', schoolCode);
      if (template?.id) {
        uploadFormData.append('template_id', template.id);
      }

      const response = await fetch('/api/certificates/upload-template', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (response.ok && result.data?.file_url) {
        const imageUrl = result.data.file_url;
        setBackgroundPreview(imageUrl);
        setFormData({ ...formData, background_image_url: imageUrl });
      } else {
        alert(result.error || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Error uploading background:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  // Insert placeholder into description
  const insertPlaceholder = (fieldKey: string, fieldLabel: string) => {
    const placeholder = `{{${fieldKey}}}`;
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      quill.insertText(range ? range.index : quill.getLength(), placeholder);
      quill.setSelection((range ? range.index : quill.getLength()) + placeholder.length);
    } else {
      // Fallback: append to end
      const currentDesc = formData.description || '';
      setFormData({ ...formData, description: currentDesc + placeholder });
    }
  };

  // Parse page layout to page_size and page_orientation
  const getPageSettings = () => {
    const [size, orientation] = formData.page_layout.split(' ');
    return {
      page_size: size as 'A4' | 'A3',
      page_orientation: orientation.toLowerCase() as 'portrait' | 'landscape',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a template name');
      return;
    }
    if (!formData.description.trim()) {
      alert('Please enter a description');
      return;
    }
    const pageSettings = getPageSettings();
    await onSave({
      ...formData,
      ...pageSettings,
    });
  };

  const handleReset = () => {
    setFormData(getInitialFormData());
    setBackgroundPreview(template?.background_image_url || null);
  };

  // Quill editor modules
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      [{ 'font': [] }],
      [{ 'size': [] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-white rounded-lg shadow-xl my-8 max-h-[90vh] flex flex-col"
      >
        <Card className="m-0 flex flex-col h-full max-h-[90vh]">
          <div className="flex items-center justify-between mb-6 flex-shrink-0 px-6 pt-6 border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-bold text-black">Manage Certificate Template</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="px-6 pb-6 overflow-y-auto flex-1 space-y-6">
              {/* Edit Certificate Template Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Certificate Template</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Enter template name"
                    />
                  </div>

                  {/* Type - Radio Buttons */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value="student"
                          checked={formData.type === 'student'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'student' | 'staff' })}
                          className="w-4 h-4 text-orange-500"
                        />
                        <span>Student</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value="staff"
                          checked={formData.type === 'staff'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'student' | 'staff' })}
                          className="w-4 h-4 text-orange-500"
                        />
                        <span>Staff</span>
                      </label>
                    </div>
                  </div>

                  {/* Height (mm) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Height (mm) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.height_mm}
                      onChange={(e) => setFormData({ ...formData, height_mm: parseInt(e.target.value) || 210 })}
                      required
                      min="50"
                      max="1000"
                    />
                  </div>

                  {/* Width (mm) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Width (mm) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.width_mm}
                      onChange={(e) => setFormData({ ...formData, width_mm: parseInt(e.target.value) || 297 })}
                      required
                      min="50"
                      max="1000"
                    />
                  </div>

                  {/* User Image Shape */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      User Image Shape <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.user_image_shape}
                      onChange={(e) => setFormData({ ...formData, user_image_shape: e.target.value as 'round' | 'square' | 'circle' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="round">Round</option>
                      <option value="square">Square</option>
                      <option value="circle">Circle</option>
                    </select>
                  </div>

                  {/* Page Layout */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Page Layout <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.page_layout}
                      onChange={(e) => setFormData({ ...formData, page_layout: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="A4 Portrait">A4 Portrait</option>
                      <option value="A4 Landscape">A4 Landscape</option>
                      <option value="A3 Portrait">A3 Portrait</option>
                      <option value="A3 Landscape">A3 Landscape</option>
                    </select>
                  </div>

                  {/* Image Size (PX) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Image Size (PX) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.image_size_px}
                      onChange={(e) => setFormData({ ...formData, image_size_px: parseInt(e.target.value) || 100 })}
                      required
                      min="50"
                      max="500"
                    />
                  </div>
                </div>

                {/* Background Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Background Image <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      {backgroundPreview ? (
                        <div className="relative border border-gray-300 rounded-lg overflow-hidden">
                          <img
                            src={backgroundPreview}
                            alt="Background preview"
                            className="w-full h-64 object-contain bg-gray-50"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setBackgroundPreview(null);
                              setFormData({ ...formData, background_image_url: '' });
                            }}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBackgroundUpload}
                            disabled={uploading}
                            className="hidden"
                            id="background-upload"
                          />
                          <label
                            htmlFor="background-upload"
                            className="cursor-pointer flex flex-col items-center gap-2"
                          >
                            <Upload className="text-gray-400" size={32} />
                            <span className="text-sm text-gray-600">
                              {uploading ? 'Uploading...' : 'Click to upload'}
                            </span>
                          </label>
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>Thumbnail</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('background-upload')?.click()}
                          disabled={uploading}
                        >
                          Upload
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Section with Rich Text Editor */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                {typeof window !== 'undefined' && ReactQuill && (
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={formData.description || ''}
                      onChange={(value) => setFormData({ ...formData, description: value })}
                      modules={quillModules}
                      placeholder="Enter certificate description. Use dynamic fields below to insert placeholders."
                      className="bg-white"
                      style={{ minHeight: '200px' }}
                    />
                  </div>
                )}
                {(!ReactQuill || typeof window === 'undefined') && (
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full min-h-[200px]"
                    placeholder="Enter template description. Use placeholder tags below to insert dynamic fields."
                    required
                  />
                )}
              </div>

              {/* Dynamic Fields Grid */}
              {placeholderFields.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Dynamic Fields
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                    {placeholderFields.map((field) => (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => insertPlaceholder(field.field_key, field.field_label)}
                        className="px-3 py-2 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-colors text-left"
                        title={field.description || field.field_label}
                      >
                        ({field.field_label})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3 pt-4 pb-6 px-6 border-t border-gray-200 flex-shrink-0 bg-white">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleReset}
                disabled={!template && formData.name === '' && formData.description === ''}
              >
                Reset
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Submit
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

// Generate Modal Component
function GenerateModal({
  templates,
  onClose,
  onGenerate,
}: {
  templates: CertificateTemplate[];
  onClose: () => void;
  onGenerate: (cert: Certificate) => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [formData, setFormData] = useState({
    issued_by: 'Principal',
    issued_date: new Date().toISOString().split('T')[0],
  });

  const handleGenerate = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      onGenerate({
        id: Date.now().toString(),
        template_id: selectedTemplate,
        template_name: template.name,
        student_id: 'STU001',
        student_name: 'John Doe',
        student_class: '10',
        student_section: 'A',
        certificate_number: `CERT-${new Date().getFullYear()}-${Date.now()}`,
        issued_date: formData.issued_date,
        issued_by: formData.issued_by,
        status: 'ISSUED',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-lg shadow-xl my-8 max-h-[90vh] flex flex-col"
      >
        <Card className="m-0 flex flex-col h-full max-h-[90vh]">
          <div className="flex items-center justify-between mb-6 flex-shrink-0 px-6 pt-6">
            <h2 className="text-2xl font-bold text-black">Generate Certificate</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-col h-full">
            <div className="px-6 pb-6 overflow-y-auto flex-1 space-y-6">
              {/* Step Indicator */}
              <div className="flex items-center justify-between mb-6">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center flex-1">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step > s ? <Check size={20} /> : s}
                    </div>
                    {s < 3 && (
                      <div className={`flex-1 h-1 mx-2 ${
                        step > s ? 'bg-orange-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {step === 1 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Template</h3>
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <label
                        key={template.id}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate === template.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="template"
                          value={template.id}
                          checked={selectedTemplate === template.id}
                          onChange={(e) => setSelectedTemplate(e.target.value)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{template.name}</p>
                          <p className="text-sm text-gray-600">{template.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Student</h3>
                  <div className="space-y-3">
                    {['John Doe', 'Jane Smith', 'Bob Johnson'].map((name, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedStudent === name
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="student"
                          value={name}
                          checked={selectedStudent === name}
                          onChange={(e) => setSelectedStudent(e.target.value)}
                          className="mr-3"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">{name}</p>
                          <p className="text-sm text-gray-600">Class 10-A | Roll No: {String(idx + 1).padStart(3, '0')}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Issued By
                      </label>
                      <Input
                        type="text"
                        value={formData.issued_by}
                        onChange={(e) => setFormData({ ...formData, issued_by: e.target.value })}
                        placeholder="Principal"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Issue Date
                      </label>
                      <Input
                        type="date"
                        value={formData.issued_date}
                        onChange={(e) => setFormData({ ...formData, issued_date: e.target.value })}
                      />
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-[200px] flex items-center justify-center">
                        <p className="text-gray-400">Certificate Preview</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 pb-6 px-6 border-t border-gray-200 flex-shrink-0 bg-white">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  Previous
                </Button>
              )}
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={step === 1 && !selectedTemplate || step === 2 && !selectedStudent}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleGenerate}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Generate Certificate
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

