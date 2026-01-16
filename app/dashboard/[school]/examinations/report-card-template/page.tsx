'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  Save,
  X,
  Eye,
  Palette,
  Type,
  Image as ImageIcon,
  Layout
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description?: string;
  layout_type: 'portrait' | 'landscape';
  background_color?: string;
  header_image?: string;
  footer_text?: string;
  is_default: boolean;
}

export default function ReportCardTemplatePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    layout_type: 'portrait' as 'portrait' | 'landscape',
    background_color: '#FFFFFF',
    header_image: '',
    footer_text: '',
  });

  // Mock data
  const mockTemplates: Template[] = [
    {
      id: '1',
      name: 'Standard Report Card',
      description: 'Default template for all classes',
      layout_type: 'portrait',
      background_color: '#FFFFFF',
      is_default: true,
    },
    {
      id: '2',
      name: 'Premium Report Card',
      description: 'Enhanced template with graphics',
      layout_type: 'landscape',
      background_color: '#F5F5F5',
      is_default: false,
    },
  ];

  const handleOpenModal = (template?: Template) => {
    if (template) {
      setEditingId(template.id);
      setFormData({
        name: template.name,
        description: template.description || '',
        layout_type: template.layout_type,
        background_color: template.background_color || '#FFFFFF',
        header_image: template.header_image || '',
        footer_text: template.footer_text || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        layout_type: 'portrait',
        background_color: '#FFFFFF',
        header_image: '',
        footer_text: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    // TODO: Implement API call
    console.log('Saving template:', formData);
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      // TODO: Implement API call
      console.log('Deleting template:', id);
    }
  };

  const handlePreview = (id: string) => {
    // TODO: Implement preview
    console.log('Preview template:', id);
  };

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
            Report Card Template Creator
          </h1>
          <p className="text-gray-600">Create and manage report card templates</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
          >
            <Plus size={18} className="mr-2" />
            Create Template
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockTemplates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                    {template.is_default && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                        Default
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Layout size={14} />
                  <span className="capitalize">{template.layout_type}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Palette size={14} />
                  <span>Background: {template.background_color}</span>
                </div>
              </div>

              {/* Template Preview */}
              <div 
                className="w-full h-48 rounded-lg border-2 border-gray-200 mb-4 flex items-center justify-center"
                style={{ backgroundColor: template.background_color }}
              >
                <div className="text-center">
                  <FileText size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-xs text-gray-500">Template Preview</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(template.id)}
                  className="flex-1 border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
                >
                  <Eye size={14} className="mr-2" />
                  Preview
                </Button>
                <button
                  onClick={() => handleOpenModal(template)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit size={16} />
                </button>
                {!template.is_default && (
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {mockTemplates.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No templates found</p>
            <Button
              onClick={() => handleOpenModal()}
              className="mt-4 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
            >
              <Plus size={18} className="mr-2" />
              Create First Template
            </Button>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-200"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">
                    {editingId ? 'Edit Template' : 'Create Template'}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Standard Report Card"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Template description..."
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Layout size={14} className="inline mr-1" />
                    Layout Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setFormData({ ...formData, layout_type: 'portrait' })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.layout_type === 'portrait'
                          ? 'border-[#1e3a8a] bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="w-16 h-24 mx-auto mb-2 border-2 border-gray-400 rounded"></div>
                        <span className="text-sm font-medium">Portrait</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, layout_type: 'landscape' })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.layout_type === 'landscape'
                          ? 'border-[#1e3a8a] bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="w-24 h-16 mx-auto mb-2 border-2 border-gray-400 rounded"></div>
                        <span className="text-sm font-medium">Landscape</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Palette size={14} className="inline mr-1" />
                    Background Color
                  </label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="color"
                      value={formData.background_color}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.background_color}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <ImageIcon size={14} className="inline mr-1" />
                    Header Image URL
                  </label>
                  <Input
                    value={formData.header_image}
                    onChange={(e) => setFormData({ ...formData, header_image: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Type size={14} className="inline mr-1" />
                    Footer Text
                  </label>
                  <Input
                    value={formData.footer_text}
                    onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                    placeholder="e.g., This is a computer generated report card"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                >
                  <Save size={18} className="mr-2" />
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



