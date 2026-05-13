'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Save, Grid3X3, AlertCircle, Lock, Unlock } from 'lucide-react';

export default function RearrangeModulesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [isDragEnabled, setIsDragEnabled] = useState(false);
  const [originalState, setOriginalState] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Check current state from localStorage
    const dragEnabled = localStorage.getItem(`drag-enabled-${schoolCode}`);
    const enabled = dragEnabled === 'true';
    setIsDragEnabled(enabled);
    setOriginalState(enabled);
  }, [schoolCode]);

  useEffect(() => {
    setHasChanges(isDragEnabled !== originalState);
  }, [isDragEnabled, originalState]);

  const handleToggle = () => {
    setIsDragEnabled(!isDragEnabled);
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem(`drag-enabled-${schoolCode}`, isDragEnabled.toString());
    setOriginalState(isDragEnabled);
    setHasChanges(false);
    
    // Show success message
    alert(isDragEnabled 
      ? 'Module rearrangement enabled! You can now drag and drop modules in the sidebar to reorder them.'
      : 'Module rearrangement disabled! The sidebar is now locked.'
    );
    
    // Optionally redirect back to settings or dashboard
    router.push(`/dashboard/${schoolCode}/settings`);
  };

  const handleCancel = () => {
    setIsDragEnabled(originalState);
    router.push(`/dashboard/${schoolCode}/settings`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFEB] via-[#F0F5F9] to-[#EBF2F7] dark:bg-[#0f172a] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-[#5A7A95] dark:text-[#6B9BB8] hover:text-[#4A6A85] dark:hover:text-[#5A8BA8] mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Settings</span>
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
              <Grid3X3 className="text-white" size={28} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              Rearrange Modules
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Enable or disable the ability to drag and drop modules in the sidebar
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-8">
            {/* Toggle Section */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isDragEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {isDragEnabled ? (
                    <Unlock className={`${isDragEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} size={24} />
                  ) : (
                    <Lock className="text-gray-500 dark:text-gray-400" size={24} />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    Module Rearrangement
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {isDragEnabled ? 'Modules can be reordered' : 'Modules are locked in place'}
                  </p>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <button
                onClick={handleToggle}
                className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isDragEnabled
                    ? 'bg-green-600 focus:ring-green-500'
                    : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-500'
                }`}
              >
                <span
                  className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                    isDragEnabled ? 'translate-x-11' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Information Box */}
            <div className={`rounded-lg p-4 mb-6 ${isDragEnabled ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'}`}>
              <div className="flex gap-3">
                <AlertCircle className={`flex-shrink-0 ${isDragEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} size={20} />
                <div className="flex-1">
                  <h3 className={`font-semibold mb-2 ${isDragEnabled ? 'text-blue-900 dark:text-blue-200' : 'text-gray-800 dark:text-gray-200'}`}>
                    {isDragEnabled ? 'Rearrangement Mode Enabled' : 'Rearrangement Mode Disabled'}
                  </h3>
                  {isDragEnabled ? (
                    <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                      <p>When enabled, you can:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Drag the grip handle (⋮⋮) next to each module in the sidebar</li>
                        <li>Drop modules in your preferred order</li>
                        <li>Customize the sidebar layout to match your workflow</li>
                      </ul>
                      <p className="mt-3 font-medium">
                        💡 Your custom order will be saved automatically as you rearrange modules.
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                      <p>When disabled:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>The drag handles will be hidden from the sidebar</li>
                        <li>Modules cannot be moved or reordered</li>
                        <li>Your current module order is preserved</li>
                      </ul>
                      <p className="mt-3 font-medium">
                        🔒 This prevents accidental rearrangement during daily use.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
                <span>📌</span> How to Use
              </h4>
              <ol className="text-sm text-amber-800 dark:text-amber-300 space-y-2 ml-6 list-decimal">
                <li>Toggle the switch above to <strong>enable</strong> rearrangement mode</li>
                <li>Click <strong>Save Changes</strong> below to apply</li>
                <li>Return to the dashboard and look for the <strong>grip handles (⋮⋮)</strong> next to modules</li>
                <li>Click and drag modules to reorder them</li>
                <li>Return here to <strong>disable</strong> when you&apos;re done organizing</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`px-6 flex items-center gap-2 ${
                  hasChanges
                    ? 'bg-[#5A7A95] hover:bg-[#4A6A85] text-white'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <Save size={18} />
                Save Changes
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Tips Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-3 flex items-center gap-2">
              <span>💡</span> Pro Tips
            </h3>
            <ul className="text-sm text-purple-800 dark:text-purple-300 space-y-2 ml-6 list-disc">
              <li>Enable rearrangement mode only when you need to reorganize modules</li>
              <li>Disable it after organizing to prevent accidental changes during daily use</li>
              <li>Your module order is saved per school, so each school can have its own layout</li>
              <li>The sidebar must be expanded (not collapsed) to see the drag handles</li>
            </ul>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
