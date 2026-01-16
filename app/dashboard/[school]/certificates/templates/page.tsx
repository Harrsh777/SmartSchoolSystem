'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Award,
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Save,
  ArrowLeft,
  Layout,
  Image as ImageIcon,
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

export default function TemplateSelectionPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [schoolCode]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/certificates/templates?school_code=${schoolCode}`);
      // const result = await response.json();
      // if (response.ok && result.data) {
      //   setTemplates(result.data);
      // }
      
      // Mock data for now
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
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || template.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ACHIEVEMENT': return 'bg-blue-100 text-blue-800';
      case 'PARTICIPATION': return 'bg-green-100 text-green-800';
      case 'COMPLETION': return 'bg-purple-100 text-purple-800';
      case 'MERIT': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      // TODO: API call to delete
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  const handleSave = async (template: CertificateTemplate) => {
    try {
      // TODO: API call to save
      if (selectedTemplate) {
        setTemplates(templates.map(t => t.id === template.id ? template : t));
      } else {
        setTemplates([...templates, { ...template, id: Date.now().toString(), usage_count: 0 }]);
      }
      setShowTemplateModal(false);
      setSelectedTemplate(null);
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Failed to save template');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Award className="text-orange-500" size={32} />
            Template Selection
          </h1>
          <p className="text-gray-600">Create and manage certificate templates</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
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
          <Button 
            onClick={() => {
              setSelectedTemplate(null);
              setShowTemplateModal(true);
            }} 
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus size={18} className="mr-2" />
            Create Template
          </Button>
        </div>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </Card>
      ) : filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
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
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowTemplateModal(true);
                      }}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
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

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          template={selectedTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setSelectedTemplate(null);
          }}
          onSave={handleSave}
        />
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
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'ACHIEVEMENT' | 'PARTICIPATION' | 'COMPLETION' })}
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

