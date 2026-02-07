'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, RefreshCw, Loader2, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

interface AcademicYearRow {
  id: string;
  year_name: string;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  is_current?: boolean;
  source?: 'academic_years' | 'classes';
}

export default function YearSetupPage({ params }: { params: Promise<{ school: string }> }) {
  const { school: schoolCode } = use(params);
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchYears = useCallback(async () => {
    if (!schoolCode) return;
    setLoadingYears(true);
    setError('');
    try {
      const res = await fetch(`/api/academic-year-management/years?school_code=${encodeURIComponent(schoolCode)}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setYears(Array.isArray(data.data) ? data.data : []);
      } else {
        setError(data.error || 'Failed to load years');
      }
    } catch {
      setError('Failed to load years');
    } finally {
      setLoadingYears(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const handleCreateYear = async () => {
    if (!schoolCode || !newYearName.trim()) {
      setError('Year name is required');
      return;
    }
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/academic-year-management/years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          year_name: newYearName.trim(),
          start_date: newStartDate || undefined,
          end_date: newEndDate || undefined,
          status: 'upcoming',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Academic year created.');
        setNewYearName('');
        setNewStartDate('');
        setNewEndDate('');
        fetchYears();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to create year');
      }
    } catch {
      setError('Failed to create year');
    } finally {
      setCreating(false);
    }
  };

  const base = schoolCode ? `/dashboard/${schoolCode}/academic-year-management` : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={base} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold text-[#0F172A]">Year Setup</h1>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-800">
          <AlertTriangle size={18} />
          {error}
          <button type="button" onClick={() => setError('')} className="ml-auto underline">Dismiss</button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2 text-sm text-green-800">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      <Card className="p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#0F172A]">Academic Years</h2>
          <Button variant="secondary" size="sm" onClick={fetchYears} disabled={loadingYears}>
            <RefreshCw size={14} className={loadingYears ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
        <p className="text-xs text-[#64748B] mb-4">
          List includes years from <strong>Year setup</strong> (academic_years table) and years that appear in the <strong>Classes</strong> table. The dashboard and other modules use the same combined list.
        </p>
        {loadingYears ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-[#2F6FED]" size={24} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left py-2 text-[#64748B] font-medium">Year</th>
                    <th className="text-left py-2 text-[#64748B] font-medium">Start</th>
                    <th className="text-left py-2 text-[#64748B] font-medium">End</th>
                    <th className="text-left py-2 text-[#64748B] font-medium">Status</th>
                    <th className="text-left py-2 text-[#64748B] font-medium">Current</th>
                    <th className="text-left py-2 text-[#64748B] font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {years.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#64748B]">No academic years yet. Create one below or add classes with an academic year.</td>
                    </tr>
                  ) : (
                    years.map((y) => (
                      <tr key={y.id || y.year_name} className="border-b border-[#E5E7EB]">
                        <td className="py-2 text-[#0F172A]">{y.year_name}</td>
                        <td className="py-2 text-[#64748B]">{y.start_date ?? '-'}</td>
                        <td className="py-2 text-[#64748B]">{y.end_date ?? '-'}</td>
                        <td className="py-2 text-[#64748B]">{y.status ?? 'active'}</td>
                        <td className="py-2">{y.is_current ? 'Yes' : '-'}</td>
                        <td className="py-2 text-[#64748B]">{y.source === 'classes' ? 'From classes' : 'Year setup'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
              <h3 className="text-sm font-medium text-[#0F172A] mb-3">Create new academic year</h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-[#64748B] mb-1">Year name (e.g. 2026-2027)</label>
                  <Input value={newYearName} onChange={(e) => setNewYearName(e.target.value)} placeholder="2026-2027" className="w-40" />
                </div>
                <div>
                  <label className="block text-xs text-[#64748B] mb-1">Start date</label>
                  <Input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} className="w-40" />
                </div>
                <div>
                  <label className="block text-xs text-[#64748B] mb-1">End date</label>
                  <Input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className="w-40" />
                </div>
                <Button onClick={handleCreateYear} disabled={creating || !newYearName.trim()}>
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create year
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
