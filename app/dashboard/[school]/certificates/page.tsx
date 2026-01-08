'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
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
} from 'lucide-react';

interface CertificateTemplate {
  id: string;
  name: string;
  type: 'ACHIEVEMENT' | 'PARTICIPATION' | 'COMPLETION' | 'MERIT' | 'CUSTOM';
  description: string;
  preview_url?: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);

  // Mock data - Replace with API calls
  useEffect(() => {
    // Simulate loading
    setLoading(true);
    setTimeout(() => {
      setTemplates([
        {
          id: '1',
          name: 'Academic Excellence',
          type: 'ACHIEVEMENT',
          description: 'For outstanding academic performance',
          created_at: '2024-01-15',
          updated_at: '2024-01-20',
          usage_count: 45,
        },
        {
          id: '2',
          name: 'Sports Participation',
          type: 'PARTICIPATION',
          description: 'For participation in sports events',
          created_at: '2024-01-10',
          updated_at: '2024-01-18',
          usage_count: 32,
        },
        {
          id: '3',
          name: 'Course Completion',
          type: 'COMPLETION',
          description: 'For completing a course or program',
          created_at: '2024-01-05',
          updated_at: '2024-01-12',
          usage_count: 28,
        },
      ]);
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
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || template.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch = cert.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certificate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.template_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    totalTemplates: templates.length,
    totalCertificates: certificates.length,
    issuedToday: certificates.filter(c => c.issued_date === new Date().toISOString().split('T')[0]).length,
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
          <p className="text-gray-600">Create, manage, and issue certificates for students</p>
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
              onDelete={(id) => {
                if (confirm('Are you sure you want to delete this template?')) {
                  setTemplates(templates.filter(t => t.id !== id));
                }
              }}
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
            <ClasswiseTab schoolCode={schoolCode} />
          )}
        </div>
      </Card>

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          template={selectedTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setSelectedTemplate(null);
          }}
          onSave={(template) => {
            if (selectedTemplate) {
              setTemplates(templates.map(t => t.id === template.id ? template : t));
            } else {
              setTemplates([...templates, { ...template, id: Date.now().toString(), usage_count: 0 }]);
            }
            setShowTemplateModal(false);
            setSelectedTemplate(null);
          }}
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
      case 'ACHIEVEMENT': return 'bg-blue-100 text-blue-800';
      case 'PARTICIPATION': return 'bg-green-100 text-green-800';
      case 'COMPLETION': return 'bg-purple-100 text-purple-800';
      case 'MERIT': return 'bg-yellow-100 text-yellow-800';
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
            <option value="ACHIEVEMENT">Achievement</option>
            <option value="PARTICIPATION">Participation</option>
            <option value="COMPLETION">Completion</option>
            <option value="MERIT">Merit</option>
            <option value="CUSTOM">Custom</option>
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
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>
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
function ClasswiseTab({ schoolCode }: { schoolCode: string }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [students, setStudents] = useState<any[]>([]);

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
          >
            <option value="">Select a class</option>
            <option value="9">Class 9</option>
            <option value="10">Class 10</option>
            <option value="11">Class 11</option>
            <option value="12">Class 12</option>
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
          >
            <option value="">Select a template</option>
            <option value="1">Academic Excellence</option>
            <option value="2">Sports Participation</option>
            <option value="3">Course Completion</option>
          </select>
        </div>
      </div>

      {selectedClass && selectedTemplate && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Students</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <label key={i} className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <input type="checkbox" className="mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Student {i}</p>
                  <p className="text-sm text-gray-600">Roll No: {i.toString().padStart(3, '0')}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              Generate Certificates
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// Template Modal Component
function TemplateModal({
  template,
  onClose,
  onSave,
}: {
  template: CertificateTemplate | null;
  onClose: () => void;
  onSave: (template: CertificateTemplate) => void;
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'ACHIEVEMENT',
    description: template?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: template?.id || '',
      created_at: template?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: template?.usage_count || 0,
    } as CertificateTemplate);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-white rounded-lg shadow-xl my-8 max-h-[90vh] flex flex-col"
      >
        <Card className="m-0 flex flex-col h-full max-h-[90vh]">
          <div className="flex items-center justify-between mb-6 flex-shrink-0 px-6 pt-6">
            <h2 className="text-2xl font-bold text-black">
              {template ? 'Edit Template' : 'Create Template'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="px-6 pb-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter template name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Template Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="ACHIEVEMENT">Achievement</option>
                  <option value="PARTICIPATION">Participation</option>
                  <option value="COMPLETION">Completion</option>
                  <option value="MERIT">Merit</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y"
                  rows={4}
                  placeholder="Enter template description"
                />
              </div>

              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Layout size={20} />
                  Template Designer
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Design your certificate template. Drag and drop elements, customize fonts, colors, and layout.
                </p>
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <ImageIcon size={48} className="mx-auto mb-2" />
                    <p>Template Designer</p>
                    <p className="text-xs mt-1">Design interface will be implemented here</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 pb-6 px-6 border-t border-gray-200 flex-shrink-0 bg-white">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white">
                <Save size={18} className="mr-2" />
                {template ? 'Update Template' : 'Create Template'}
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

