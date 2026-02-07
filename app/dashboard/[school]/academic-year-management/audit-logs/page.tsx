'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { RefreshCw, Loader2, ArrowLeft } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  academic_year_from?: string;
  academic_year_to?: string;
  performed_by?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export default function AuditLogsPage({ params }: { params: Promise<{ school: string }> }) {
  const { school: schoolCode } = use(params);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchAudit = useCallback(async () => {
    if (!schoolCode) return;
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/academic-year-management/audit?school_code=${encodeURIComponent(schoolCode)}&limit=100`);
      const data = await res.json();
      if (res.ok && data.data) {
        setAuditLogs(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const base = schoolCode ? `/dashboard/${schoolCode}/academic-year-management` : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={base} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold text-[#0F172A]">Audit Logs</h1>
      </div>

      <Card className="p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#0F172A]">Audit trail</h2>
          <Button variant="secondary" size="sm" onClick={fetchAudit} disabled={loadingAudit}>
            <RefreshCw size={14} className={loadingAudit ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
        {loadingAudit ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-[#2F6FED]" size={24} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 text-[#64748B] font-medium">Time</th>
                  <th className="text-left py-2 text-[#64748B] font-medium">Action</th>
                  <th className="text-left py-2 text-[#64748B] font-medium">From → To</th>
                  <th className="text-left py-2 text-[#64748B] font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#64748B]">No audit entries yet.</td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-[#E5E7EB]">
                      <td className="py-2 text-[#64748B]">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-2 text-[#0F172A]">{log.action}</td>
                      <td className="py-2 text-[#64748B]">{log.academic_year_from || '-'} → {log.academic_year_to || '-'}</td>
                      <td className="py-2 text-[#64748B]">{log.performed_by || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
