'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  Edit2, 
  Save, 
  X, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle,
  Database,
  BookOpen,
  Users,
  Camera,
  GraduationCap,
  DollarSign,
  Bus,
  Library,
  Package,
  FileCheck,
  UserPlus,
  Info
} from 'lucide-react';

interface ModuleData {
  id: string;
  module: string;
  attachments: string | null;
  uploadedBy: string | null;
  dataReceivedDate: string | null;
  dataImplementedOn: string | null;
  tat: string | null;
  owner: string | null;
  confirmation: string | null;
  status: 'Pending' | 'In Progress' | 'Completed';
  comment: string | null;
}

const modules = [
  { id: '1', name: 'Student Data', icon: Users },
  { id: '2', name: 'Staff Data', icon: UserPlus },
  { id: '3', name: 'Student Photos', icon: Camera },
  { id: '4', name: 'Staff Photos', icon: Camera },
  { id: '5', name: 'Subject Teacher Mapping', icon: GraduationCap },
  { id: '6', name: 'Time Table Data', icon: Clock },
  { id: '7', name: 'Fee Data', icon: DollarSign },
  { id: '8', name: 'Transport Data', icon: Bus },
  { id: '9', name: 'Library Data', icon: Library },
  { id: '10', name: 'Inventory Data', icon: Package },
  { id: '11', name: 'Report Card Structure', icon: FileCheck },
  { id: '12', name: 'Admission Process', icon: UserPlus },
];

export default function SetupSchoolPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('DATA IMPLEMENTATION');
  const [isEditMode, setIsEditMode] = useState(false);
  const [moduleData, setModuleData] = useState<ModuleData[]>(() => 
    modules.map(module => ({
      id: module.id,
      module: module.name,
      attachments: null,
      uploadedBy: null,
      dataReceivedDate: null,
      dataImplementedOn: null,
      tat: null,
      owner: null,
      confirmation: null,
      status: 'Pending' as const,
      comment: null,
    }))
  );

  const tabs = [
    'DATA IMPLEMENTATION',
    'TEMPLATE IMPLEMENTATION',
    'INTEGRATIONS',
    'TRAINING',
  ];

  const handleSave = () => {
    // TODO: Implement save functionality
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    // TODO: Reset form data to original values
  };

  const handleFileUpload = (moduleId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setModuleData(prev => prev.map(item => 
        item.id === moduleId 
          ? { ...item, attachments: file.name, uploadedBy: 'Shivu' }
          : item
      ));
    }
  };

  const handleFieldChange = (moduleId: string, field: keyof ModuleData, value: string) => {
    setModuleData(prev => prev.map(item => 
      item.id === moduleId 
        ? { ...item, [field]: value }
        : item
    ));
  };

  const getModuleIcon = (moduleName: string) => {
    const foundModule = modules.find(m => m.name === moduleName);
    return foundModule?.icon || FileText;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      {/* Top Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <div className="flex items-center space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 font-semibold text-sm transition-all duration-300 ${
                  activeTab === tab
                    ? 'text-[#F97316] border-b-2 border-[#F97316] bg-[#FFEDD5]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-medium text-[#0F172A] border border-[#E5E7EB] rounded-lg hover:bg-[#F1F5F9] transition-colors">
              SHOW LOGS
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-[#F97316] rounded-lg hover:bg-[#EA580C] transition-colors flex items-center gap-2">
              <Database size={16} />
              UPDATE
            </button>
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                isEditMode
                  ? 'bg-[#2F6FED] text-white hover:bg-[#1E3A8A]'
                  : 'text-[#64748B] border border-[#E5E7EB] hover:bg-[#F1F5F9]'
              }`}
            >
              <Edit2 size={16} />
              EDIT
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Data implementation</h1>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <span>File Upload Guidelines</span>
                <button className="w-4 h-4 rounded-full bg-[#E0F2FE] text-[#38BDF8] flex items-center justify-center text-[10px] hover:bg-[#38BDF8] hover:text-white transition-colors">
                  <Info size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-[#1E3A8A] to-[#2F6FED] text-white">
                <th className="px-4 py-3 text-left text-sm font-semibold">Module</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Attachments</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Uploaded By</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Data received date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Data implemented on</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">TAT(Turn around time)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Owner (school side)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Confirmation (school side)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Comment</th>
              </tr>
            </thead>
            <tbody>
              {moduleData.map((item, index) => {
                const isEditing = isEditMode;
                const ModuleIcon = getModuleIcon(item.module);
                const isPending = item.status === 'Pending';
                
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-b border-[#E5E7EB] hover:bg-[#F1F5F9] transition-colors ${
                      isPending ? 'bg-[#FEE2E2]/30' : ''
                    }`}
                  >
                    {/* Module */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#EAF1FF] flex items-center justify-center">
                          <ModuleIcon size={16} className="text-[#2F6FED]" />
                        </div>
                        <span className="text-sm font-medium text-[#0F172A]">
                          {item.id}. {item.module}
                        </span>
                      </div>
                    </td>

                    {/* Attachments */}
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 text-xs font-medium text-[#F97316] border border-[#F97316] rounded-lg cursor-pointer hover:bg-[#FFEDD5] transition-colors flex items-center gap-1.5">
                            <Upload size={12} />
                            UPLOAD
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleFileUpload(item.id, e)}
                            />
                          </label>
                          {item.attachments && (
                            <span className="text-xs text-[#64748B]">{item.attachments}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-[#64748B]">
                          {item.attachments || '-'}
                        </span>
                      )}
                    </td>

                    {/* Uploaded By */}
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.uploadedBy || ''}
                          onChange={(e) => handleFieldChange(item.id, 'uploadedBy', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] bg-white"
                          placeholder="Enter name"
                        />
                      ) : (
                        <span className="text-sm text-[#64748B]">
                          {item.uploadedBy || '-'}
                        </span>
                      )}
                    </td>

                    {/* Data received date */}
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <div className="relative">
                          <input
                            type="datetime-local"
                            value={item.dataReceivedDate || ''}
                            onChange={(e) => handleFieldChange(item.id, 'dataReceivedDate', e.target.value)}
                            className="w-full px-3 py-1.5 pr-10 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] bg-white"
                            placeholder="DD/MM/YYYY, hh:mm"
                          />
                          <Calendar size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" />
                        </div>
                      ) : (
                        <span className="text-sm text-[#64748B]">
                          {item.dataReceivedDate || '-'}
                        </span>
                      )}
                    </td>

                    {/* Data implemented on */}
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <div className="relative">
                          <input
                            type="datetime-local"
                            value={item.dataImplementedOn || ''}
                            onChange={(e) => handleFieldChange(item.id, 'dataImplementedOn', e.target.value)}
                            className="w-full px-3 py-1.5 pr-10 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] bg-white"
                            placeholder="DD/MM/YYYY, hh:mm"
                          />
                          <Calendar size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" />
                        </div>
                      ) : (
                        <span className="text-sm text-[#64748B]">
                          {item.dataImplementedOn || '-'}
                        </span>
                      )}
                    </td>

                    {/* TAT */}
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.tat || ''}
                          onChange={(e) => handleFieldChange(item.id, 'tat', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] bg-white"
                          placeholder="Enter TAT"
                        />
                      ) : (
                        <span className="text-sm text-[#64748B]">
                          {item.tat || '-'}
                        </span>
                      )}
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <select
                          value={item.owner || ''}
                          onChange={(e) => handleFieldChange(item.id, 'owner', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] bg-white"
                        >
                          <option value="">Select Owner</option>
                          <option value="Admin">Admin</option>
                          <option value="Principal">Principal</option>
                          <option value="Coordinator">Coordinator</option>
                        </select>
                      ) : (
                        <span className="text-sm text-[#64748B]">
                          {item.owner || '-'}
                        </span>
                      )}
                    </td>

                    {/* Confirmation */}
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.confirmation || ''}
                          onChange={(e) => handleFieldChange(item.id, 'confirmation', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] bg-white"
                          placeholder="Enter confirmation"
                        />
                      ) : (
                        <span className="text-sm text-[#64748B]">
                          {item.confirmation || '-'}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <select
                          value={item.status}
                          onChange={(e) => handleFieldChange(item.id, 'status', e.target.value as ModuleData['status'])}
                          className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] ${
                            item.status === 'Pending' 
                              ? 'bg-[#FEE2E2] border-[#FEE2E2] text-[#EF4444]' 
                              : item.status === 'In Progress'
                              ? 'bg-[#FFEDD5] border-[#FFEDD5] text-[#F97316]'
                              : 'bg-[#DCFCE7] border-[#DCFCE7] text-[#22C55E]'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          isPending
                            ? 'bg-[#FEE2E2] text-[#EF4444]'
                            : item.status === 'In Progress'
                            ? 'bg-[#FFEDD5] text-[#F97316]'
                            : 'bg-[#DCFCE7] text-[#22C55E]'
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </td>

                    {/* Comment */}
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <textarea
                          value={item.comment || ''}
                          onChange={(e) => handleFieldChange(item.id, 'comment', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] bg-white resize-none"
                          rows={2}
                          placeholder="Enter comment"
                        />
                      ) : (
                        <span className="text-sm text-[#64748B]">
                          {item.comment || '-'}
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Edit Mode Actions */}
        {isEditMode && (
          <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-end gap-3">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 text-sm font-medium text-[#64748B] border border-[#E5E7EB] rounded-lg hover:bg-white transition-colors flex items-center gap-2"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-[#2F6FED] rounded-lg hover:bg-[#1E3A8A] transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              Save All Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

