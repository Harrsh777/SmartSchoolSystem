'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';

export default function FeeFinePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fine_type: 'fixed' as 'fixed' | 'percentage' | 'daily',
    fine_amount: '',
    fine_percentage: '',
    daily_fine_amount: '',
    grace_period_days: '0',
  });

  useEffect(() => {
    fetchFineConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchFineConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fees/fine?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data && result.data.length > 0) {
        const config = result.data[0];
        setFormData({
          fine_type: config.fine_type || 'fixed',
          fine_amount: config.fine_amount?.toString() || '',
          fine_percentage: config.fine_percentage?.toString() || '',
          daily_fine_amount: config.daily_fine_amount?.toString() || '',
          grace_period_days: config.grace_period_days?.toString() || '0',
        });
      }
    } catch (err) {
      console.error('Error fetching fine config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/fees/fine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
          fine_amount: formData.fine_type === 'fixed' ? parseFloat(formData.fine_amount) || null : null,
          fine_percentage: formData.fine_type === 'percentage' ? parseFloat(formData.fine_percentage) || null : null,
          daily_fine_amount: formData.fine_type === 'daily' ? parseFloat(formData.daily_fine_amount) || null : null,
          grace_period_days: parseInt(formData.grace_period_days) || 0,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Fee fine configuration saved successfully!');
      } else {
        alert(result.error || 'Failed to save fine configuration');
      }
    } catch (error) {
      console.error('Error saving fine config:', error);
      alert('Failed to save fine configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <AlertCircle size={32} />
            Fee Fine Configuration
          </h1>
          <p className="text-gray-600">Configure fee fine rules and grace period</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fine Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.fine_type}
              onChange={(e) => setFormData(prev => ({ ...prev, fine_type: e.target.value as 'fixed' | 'percentage' | 'daily' }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              required
            >
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
              <option value="daily">Daily Fine</option>
            </select>
          </div>

          {formData.fine_type === 'fixed' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fine Amount (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.fine_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, fine_amount: e.target.value }))}
                required
                placeholder="e.g., 100"
              />
            </div>
          )}

          {formData.fine_type === 'percentage' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fine Percentage (%) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.fine_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, fine_percentage: e.target.value }))}
                required
                placeholder="e.g., 5"
                max="100"
              />
            </div>
          )}

          {formData.fine_type === 'daily' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Daily Fine Amount (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.daily_fine_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, daily_fine_amount: e.target.value }))}
                required
                placeholder="e.g., 10"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Grace Period (Days) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.grace_period_days}
              onChange={(e) => setFormData(prev => ({ ...prev, grace_period_days: e.target.value }))}
              required
              min="0"
              placeholder="e.g., 7"
            />
            <p className="text-xs text-gray-500 mt-1">Number of days after due date before fine is applied</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Save size={18} className="mr-2" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

