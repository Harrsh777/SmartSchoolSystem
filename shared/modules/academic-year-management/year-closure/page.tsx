'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Lock, Loader2, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

interface AcademicYearRow {
  id: string;
  year_name: string;
}

export default function YearClosurePage({ params }: { params: Promise<{ school: string }> }) {
  const { school: schoolCode } = use(params);
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [closurePrevYear, setClosurePrevYear] = useState('');
  const [closureNewYear, setClosureNewYear] = useState('');
  const [closureConfirm, setClosureConfirm] = useState('');
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchYears = useCallback(async () => {
    if (!schoolCode) return;
    try {
      const res = await fetch(`/api/academic-year-management/years?school_code=${encodeURIComponent(schoolCode)}`);
      const data = await res.json();
      if (res.ok && data.data) setYears(Array.isArray(data.data) ? data.data : []);
    } catch {
      setYears([]);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const handleClosure = async () => {
    if (!schoolCode || closureConfirm !== 'CLOSE') {
      setError('Type CLOSE to confirm year closure.');
      return;
    }
    setClosing(true);
    setError('');
    try {
      const res = await fetch('/api/academic-year-management/closure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          previous_year: closurePrevYear,
          new_year: closureNewYear,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Year closure completed. Current academic year updated.');
        setClosurePrevYear('');
        setClosureNewYear('');
        setClosureConfirm('');
        fetchYears();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Closure failed');
      }
    } catch {
      setError('Closure failed');
    } finally {
      setClosing(false);
    }
  };

  const base = schoolCode ? `/dashboard/${schoolCode}/academic-year-management` : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={base} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold text-[#0F172A]">Year Closure</h1>
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

      <Card className="p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg shadow-sm max-w-xl">
        <h2 className="text-sm font-semibold text-[#0F172A] mb-2">Close previous year and activate new year</h2>
        <p className="text-xs text-[#64748B] mb-4">
          This sets the previous year to closed (read-only for marks, attendance, fees) and sets the new year as active. The school&apos;s current academic year is updated. Type <strong>CLOSE</strong> to confirm.
        </p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-[#64748B] mb-1">Previous year (to close)</label>
            <select value={closurePrevYear} onChange={(e) => setClosurePrevYear(e.target.value)} className="border border-[#E5E7EB] rounded px-3 py-2 text-sm w-full">
              <option value="">Select</option>
              {years.map((y) => (<option key={y.id || y.year_name} value={y.year_name}>{y.year_name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#64748B] mb-1">New year (to activate)</label>
            <select value={closureNewYear} onChange={(e) => setClosureNewYear(e.target.value)} className="border border-[#E5E7EB] rounded px-3 py-2 text-sm w-full">
              <option value="">Select</option>
              {years.map((y) => (<option key={y.id || y.year_name} value={y.year_name}>{y.year_name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#64748B] mb-1">Type CLOSE to confirm</label>
            <Input value={closureConfirm} onChange={(e) => setClosureConfirm(e.target.value)} placeholder="CLOSE" className="w-full" />
          </div>
        </div>
        <Button onClick={handleClosure} disabled={closing || closureConfirm !== 'CLOSE' || !closurePrevYear || !closureNewYear}>
          {closing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          Run year closure
        </Button>
      </Card>
    </div>
  );
}
