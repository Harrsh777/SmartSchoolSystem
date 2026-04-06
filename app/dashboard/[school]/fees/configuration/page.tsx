'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Settings, Bus, AlertTriangle } from 'lucide-react';

type TransportFeeMode = 'MERGED' | 'SEPARATE';

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

  const [transportFeeMode, setTransportFeeMode] = useState<TransportFeeMode>('MERGED');
  const [rawConfig, setRawConfig] = useState<Record<string, unknown>>({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/fees/configuration?school_code=${encodeURIComponent(schoolCode)}`);
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || 'Failed to load');
          return;
        }

        const cfg = json.data?.configuration as Record<string, unknown> | null;
        if (cfg) {
          setRawConfig(cfg);
          const m = String(cfg.transport_fee_mode || 'MERGED').toUpperCase();
          setTransportFeeMode(m === 'SEPARATE' ? 'SEPARATE' : 'MERGED');
        }
      } catch {
        setError('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolCode]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const res = await fetch('/api/fees/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          configuration: { ...rawConfig, transport_fee_mode: transportFeeMode },
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Save failed');
        return;
      }

      if (json.data) setRawConfig(json.data as Record<string, unknown>);

      setSuccess('Configuration saved successfully');
      setTimeout(() => setSuccess(''), 2500);
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading configuration...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings size={26} /> Fee Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-1">School: {schoolCode}</p>
        </div>

        <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}>
          <ArrowLeft size={16} className="mr-2" /> Back
        </Button>
      </div>

      {/* Alerts */}
      {success && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm">
          {success}
        </motion.div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Main Card */}
      <Card className="p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bus size={20} /> Transport Fee Handling
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Decide how transport fees are collected and shown in receipts.
          </p>
        </div>

        {/* Warning */}
        <div className="flex gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm">
          <AlertTriangle size={18} className="mt-0.5" />
          <div>
            Switching modes only affects future data. Existing paid receipts remain unchanged.
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => setTransportFeeMode('MERGED')}
            className={`cursor-pointer border rounded-xl p-4 transition ${
              transportFeeMode === 'MERGED'
                ? 'border-black bg-gray-50'
                : 'border-gray-200'
            }`}
          >
            <h3 className="font-semibold">Merged</h3>
            <p className="text-sm text-gray-500 mt-1">
              Transport fees included in main receipts.
            </p>
          </div>

          <div
            onClick={() => setTransportFeeMode('SEPARATE')}
            className={`cursor-pointer border rounded-xl p-4 transition ${
              transportFeeMode === 'SEPARATE'
                ? 'border-black bg-gray-50'
                : 'border-gray-200'
            }`}
          >
            <h3 className="font-semibold">Separate</h3>
            <p className="text-sm text-gray-500 mt-1">
              Transport handled independently with separate receipts.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            Current Mode: <span className="font-medium text-black">{transportFeeMode}</span>
          </div>

          <div className="flex gap-3">
            {transportFeeMode === 'SEPARATE' && (
              <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/transport/fees`)}>
                Open Transport Fees
              </Button>
            )}

            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
