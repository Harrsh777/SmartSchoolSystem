'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Settings, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function TransportBasicsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [config, setConfig] = useState({
    pickup_percentage: 100,
    drop_percentage: 100,
    applicable_months: [] as number[],
  });

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transport/fee-config?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setConfig({
          pickup_percentage: result.data.pickup_percentage || 100,
          drop_percentage: result.data.drop_percentage || 100,
          applicable_months: result.data.applicable_months || [],
        });
      }
    } catch (err) {
      console.error('Error fetching config:', err);
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

      const response = await fetch('/api/transport/fee-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...config,
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
      console.error('Error saving config:', err);
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="text-indigo-600" size={32} />
              Transport Basics
            </h1>
            <p className="text-gray-600 mt-2">
              Configure transport fee settings for {schoolCode}
            </p>
          </div>
        </div>
      </motion.div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <CheckCircle size={20} />
          {success}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Fee Configuration</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Fee Percentage (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={config.pickup_percentage}
              onChange={(e) => setConfig({ ...config, pickup_percentage: parseInt(e.target.value) || 0 })}
              placeholder="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Percentage of stop pickup fare to charge
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drop Fee Percentage (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={config.drop_percentage}
              onChange={(e) => setConfig({ ...config, drop_percentage: parseInt(e.target.value) || 0 })}
              placeholder="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Percentage of stop drop fare to charge
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 mb-4">
              Applicable Months
            </label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {months.map((month, index) => {
                const monthNum = index + 1;
                const isSelected = config.applicable_months.includes(monthNum);
                return (
                  <label
                    key={month}
                    className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setConfig({
                            ...config,
                            applicable_months: [...config.applicable_months, monthNum],
                          });
                        } else {
                          setConfig({
                            ...config,
                            applicable_months: config.applicable_months.filter((m) => m !== monthNum),
                          });
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{month}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

