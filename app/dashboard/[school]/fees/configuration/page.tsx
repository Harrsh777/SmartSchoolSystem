'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ArrowLeft,
  Save,
  FileText,
  Settings,
  Copy,
  QrCode,
  GripVertical,
  Crown,
} from 'lucide-react';

interface StudentDetailField {
  field_name: string;
  display_order: number;
  is_enabled: boolean;
}

const DEFAULT_STUDENT_DETAILS: StudentDetailField[] = [
  { field_name: 'Receipt No.', display_order: 1, is_enabled: true },
  { field_name: 'Receipt Date', display_order: 2, is_enabled: true },
  { field_name: 'Session', display_order: 3, is_enabled: true },
  { field_name: 'Student Name', display_order: 4, is_enabled: true },
  { field_name: 'Admission No.', display_order: 5, is_enabled: true },
  { field_name: 'Class', display_order: 6, is_enabled: true },
  { field_name: 'Father Name', display_order: 7, is_enabled: true },
  { field_name: 'Mother Name', display_order: 8, is_enabled: false },
  { field_name: 'Address', display_order: 9, is_enabled: false },
  { field_name: 'Father Phone', display_order: 10, is_enabled: false },
  { field_name: 'Mother Phone', display_order: 11, is_enabled: false },
];

export default function FeeConfigurationPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [config, setConfig] = useState({
    // Fee Receipt Settings
    fee_receipt_layout: 'A4 Portrait',
    fee_invoice_layout: 'A4 Portrait',
    fee_receipt_template: 'Default Template',
    fee_wallet_template: '',
    number_of_copies: 2,
    default_payment_mode: 'Cash',
    payment_url_enabled: false,
    payment_url: '',
    add_fee_due: true,
    add_fee_discount: true,
    add_fee_balance: true,
    note_on_fee_receipt: '',
    note_on_fee_receipt_enabled: false,
    
    // Other Payment Configuration
    show_zero_paid_component: true,
    collect_siblings_fee_together: false,
    keep_fee_receipt_date_editable: true,
    keep_fee_entry_date_editable: true,
    allow_later_installment_collection: true,
    allow_multiple_discount: false,
    do_not_show_zero_pending_component: false,
    do_not_repeat_discount: true,
    do_not_allow_cancelled_receipt_numbers: false,
    allow_manual_receipt_number: false,
    round_off_discount: false,
    fine_apply_as_per_receipt_date: false,
    enable_hide_installments: false,
    
    // Parent Side Configuration
    allow_component_selection: true,
    allow_fee_fine_selection: true,
    dont_allow_partial_payment: true,
    do_not_show_components_on_app: false,
  });

  const [studentDetails, setStudentDetails] = useState<StudentDetailField[]>(DEFAULT_STUDENT_DETAILS);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchConfiguration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fees/configuration?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        if (result.data.configuration) {
          setConfig(result.data.configuration);
        }
        if (result.data.student_details && result.data.student_details.length > 0) {
          setStudentDetails(result.data.student_details);
        }
      }
    } catch (err) {
      console.error('Error fetching configuration:', err);
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/fees/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          configuration: config,
          student_details: studentDetails,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Configuration saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to save configuration');
      }
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = () => {
    if (config.payment_url) {
      navigator.clipboard.writeText(config.payment_url);
      setSuccess('URL copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newDetails = [...studentDetails];
    const draggedItem = newDetails[draggedIndex];
    newDetails.splice(draggedIndex, 1);
    newDetails.splice(index, 0, draggedItem);

    // Update display_order
    const updatedDetails = newDetails.map((detail, idx) => ({
      ...detail,
      display_order: idx + 1,
    }));

    setStudentDetails(updatedDetails);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleStudentDetail = (index: number) => {
    const newDetails = [...studentDetails];
    newDetails[index].is_enabled = !newDetails[index].is_enabled;
    setStudentDetails(newDetails);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Settings size={32} />
            Fee Configuration
          </h1>
          <p className="text-gray-600">Configure fee receipt and payment settings</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg"
        >
          {success}
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
        >
          {error}
        </motion.div>
      )}

      {/* Fee Receipt Section */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Fee Receipt</h2>
        
        <div className="space-y-6">
          {/* Layout Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fee receipt layout
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={config.fee_receipt_layout}
                  onChange={(e) => setConfig({ ...config, fee_receipt_layout: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="A4 Portrait">A4 Portrait</option>
                  <option value="A4 Landscape">A4 Landscape</option>
                  <option value="Letter Portrait">Letter Portrait</option>
                  <option value="Letter Landscape">Letter Landscape</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fee invoice layout
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={config.fee_invoice_layout}
                  onChange={(e) => setConfig({ ...config, fee_invoice_layout: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="A4 Portrait">A4 Portrait</option>
                  <option value="A4 Landscape">A4 Landscape</option>
                  <option value="Letter Portrait">Letter Portrait</option>
                  <option value="Letter Landscape">Letter Landscape</option>
                </select>
              </div>
            </div>
          </div>

          {/* Template Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fee Receipt Template
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={config.fee_receipt_template}
                  onChange={(e) => setConfig({ ...config, fee_receipt_template: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Default Template">Default Template</option>
                  <option value="Custom Template 1">Custom Template 1</option>
                  <option value="Custom Template 2">Custom Template 2</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fee wallet template (for advance payment collected)
              </label>
              <div className="relative flex items-center gap-2">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={config.fee_wallet_template}
                  onChange={(e) => setConfig({ ...config, fee_wallet_template: e.target.value })}
                  className="flex-1 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select template</option>
                  <option value="Wallet Template 1">Wallet Template 1</option>
                  <option value="Wallet Template 2">Wallet Template 2</option>
                </select>
                <button
                  type="button"
                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Number of Copies and Payment Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                No. of copies
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={config.number_of_copies}
                  onChange={(e) => setConfig({ ...config, number_of_copies: parseInt(e.target.value) || 1 })}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={config.default_payment_mode}
                onChange={(e) => setConfig({ ...config, default_payment_mode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Online">Online</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>

          {/* Payment URL */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => {
                  const newEnabled = !config.payment_url_enabled;
                  if (newEnabled && !config.payment_url) {
                    // Auto-generate payment URL
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://online.edutinker.com';
                    const generatedUrl = `${baseUrl}/form/student/fee?schoolId=${schoolCode}&dc=IN&name=${encodeURIComponent('School')}`;
                    setConfig({ ...config, payment_url_enabled: newEnabled, payment_url: generatedUrl });
                  } else {
                    setConfig({ ...config, payment_url_enabled: newEnabled });
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.payment_url_enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.payment_url_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label className="text-sm font-medium text-gray-700">Payment URL</label>
              <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">PRO-X</span>
            </div>
            {config.payment_url_enabled && (
              <div className="flex items-center gap-2 mt-2">
                <QrCode className="text-gray-400" size={18} />
                <Input
                  type="text"
                  value={config.payment_url}
                  onChange={(e) => setConfig({ ...config, payment_url: e.target.value })}
                  placeholder="https://online.edutinker.com/form/student/fee?schoolId=..."
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy URL"
                >
                  <Copy size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Add to fee receipt checkboxes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Add to fee receipt
            </label>
            <div className="space-y-2">
              {[
                { key: 'add_fee_due', label: 'Fee Due' },
                { key: 'add_fee_discount', label: 'Fee Discount' },
                { key: 'add_fee_balance', label: 'Fee Balance' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config[item.key as keyof typeof config] as boolean}
                    onChange={(e) => setConfig({ ...config, [item.key]: e.target.checked })}
                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Note on fee Receipt */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Note on fee Receipt <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setConfig({ ...config, note_on_fee_receipt_enabled: !config.note_on_fee_receipt_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.note_on_fee_receipt_enabled ? 'bg-green-500' : 'bg-red-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.note_on_fee_receipt_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {config.note_on_fee_receipt_enabled && (
              <Input
                type="text"
                value={config.note_on_fee_receipt}
                onChange={(e) => setConfig({ ...config, note_on_fee_receipt: e.target.value })}
                placeholder="Note on fee Receipt"
                className="mt-2"
              />
            )}
          </div>
        </div>
      </Card>

      {/* Other payment configuration Section */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Other payment configuration</h2>
        
        <div className="space-y-4">
          {[
            { key: 'show_zero_paid_component', label: 'Show zero paid component in receipt if selected at time of payment' },
            { key: 'collect_siblings_fee_together', label: 'Collect siblings fee together in single page' },
            { key: 'keep_fee_receipt_date_editable', label: 'Keep fee receipt date editable at time of student fee collection' },
            { key: 'keep_fee_entry_date_editable', label: 'Keep fee entry date editable at time of student fee collection' },
            { key: 'allow_later_installment_collection', label: 'Allow to collect later installment amount even if previous installment amount is due' },
            { key: 'allow_multiple_discount', label: 'Allow multiple discount on same installment component' },
            { key: 'do_not_show_zero_pending_component', label: 'Do not show component with zero pending amount at time of marking paid' },
            { key: 'do_not_repeat_discount', label: 'Do not repeat discount in fee receipt' },
            { key: 'do_not_allow_cancelled_receipt_numbers', label: 'Do not allow usage of cancelled receipt numbers' },
            { key: 'allow_manual_receipt_number', label: 'Allow Manual Input of Receipt Number' },
            { key: 'round_off_discount', label: 'Round off discount' },
            { key: 'fine_apply_as_per_receipt_date', label: 'Fine should apply as per fee receipt date' },
            { key: 'enable_hide_installments', label: 'Enable Hide installments option in Student-wise fee to hide installment from student' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-700">{item.label}</span>
              <button
                type="button"
                onClick={() => setConfig({ ...config, [item.key]: !config[item.key as keyof typeof config] })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config[item.key as keyof typeof config] ? 'bg-green-500' : 'bg-red-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config[item.key as keyof typeof config] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Parent side configuration on app Section */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Parent side configuration on app</h2>
        
        <div className="space-y-4">
          {[
            { key: 'allow_component_selection', label: 'Allow component to be selected at time of making payment on parent side' },
            { key: 'allow_fee_fine_selection', label: 'Allow fee fine to be selected at time of making payment on parent side' },
            { key: 'dont_allow_partial_payment', label: 'Don\'t allow student/ parent to do partial payment of component' },
            { key: 'do_not_show_components_on_app', label: 'Do not show components when student is paying the fee from app' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-700">{item.label}</span>
              <button
                type="button"
                onClick={() => setConfig({ ...config, [item.key]: !config[item.key as keyof typeof config] })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config[item.key as keyof typeof config] ? 'bg-green-500' : 'bg-red-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config[item.key as keyof typeof config] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Show students basic details on receipt Section */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Show students basic details on receipt</h2>
        
        <div className="space-y-2">
          {studentDetails.map((detail, index) => (
            <div
              key={detail.field_name}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <GripVertical className="text-gray-400 cursor-move" size={18} />
              <span className="flex-1 text-sm text-gray-700">{detail.field_name}</span>
              <button
                type="button"
                onClick={() => toggleStudentDetail(index)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  detail.is_enabled ? 'bg-green-500' : 'bg-red-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    detail.is_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Save Button */}
      <div className="fixed bottom-6 right-6 flex items-center gap-4">
        <span className="px-3 py-1 bg-green-500 text-white text-xs rounded-full font-medium flex items-center gap-1">
          <Crown size={12} />
          PREMIUM
        </span>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-600 text-white min-w-[120px]"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              SAVE
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

