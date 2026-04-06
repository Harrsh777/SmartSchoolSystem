'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Bus, Loader2, Receipt, Search } from 'lucide-react';

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
}

interface RosterRow {
  student_id: string;
  admission_no: string;
  student_name: string;
  class: string;
  section: string;
  route_name: string | null;
  monthly_transport_fee: number;
  billing_month: string;
  paid_this_month: number;
  balance_due: number;
  status: string;
  transport_fee_mode: string;
}

export default function TransportFeesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [billingMonth, setBillingMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [classRows, setClassRows] = useState<Array<{ class?: string; section?: string }>>([]);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  const [collectFor, setCollectFor] = useState<RosterRow | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState('');
  const [collectOk, setCollectOk] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedCollector, setSelectedCollector] = useState('');

  const fetchStaff = useCallback(async () => {
    try {
      const response = await fetch(`/api/staff?school_code=${encodeURIComponent(schoolCode)}`);
      const result = await response.json();
      if (response.ok) {
        const list = Array.isArray(result.data) ? (result.data as Staff[]) : [];
        setStaffList(list);
        if (!selectedCollector && list.length > 0) {
          setSelectedCollector(String(list[0].staff_id || ''));
        }
      } else {
        setStaffList([]);
      }
    } catch {
      setStaffList([]);
    }
  }, [schoolCode, selectedCollector]);

  useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  const fetchClassRows = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes?school_code=${encodeURIComponent(schoolCode)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setClassRows(data.data as Array<{ class?: string; section?: string }>);
      } else {
        setClassRows([]);
      }
    } catch {
      setClassRows([]);
    }
  }, [schoolCode]);

  useEffect(() => {
    void fetchClassRows();
  }, [fetchClassRows]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (!classFilter || !sectionFilter) {
        setRows([]);
        return;
      }
      const q = new URLSearchParams({
        school_code: schoolCode,
        roster: '1',
        page: String(page),
        page_size: '80',
        billing_month: billingMonth,
        class: classFilter,
        section: sectionFilter,
      });
      const res = await fetch(`/api/transport/fee-payments?${q}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load');
        setRows([]);
        return;
      }
      setRows(Array.isArray(json.data) ? json.data : []);
      if (json.meta?.transport_fee_mode === 'MERGED') {
        setError(
          'This school is still on merged transport fees. Switch to Separate under Fees → Fee configuration to use this screen.'
        );
      }
    } catch {
      setError('Failed to load roster');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, page, billingMonth, classFilter, sectionFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.student_name.toLowerCase().includes(q) ||
      String(r.admission_no || '')
        .toLowerCase()
        .includes(q)
    );
  });

  const uniqueClasses = Array.from(
    new Set(classRows.map((r) => String(r.class ?? '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const uniqueSections = Array.from(
    new Set(
      classRows
        .filter((r) => String(r.class ?? '').trim() === String(classFilter).trim())
        .map((r) => String(r.section ?? '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const resolveSessionStaffId = (): string => {
    try {
      const raw = sessionStorage.getItem('staff');
      if (!raw) return '';
      const s = JSON.parse(raw);
      return s?.staff_id ? String(s.staff_id) : '';
    } catch {
      return '';
    }
  };

  const submitCollection = async () => {
    if (!collectFor) return;
    const sessionStaffId = resolveSessionStaffId();
    const staffId = selectedCollector || sessionStaffId;
    if (!staffId) {
      setCollectError('Please select which staff collected this payment.');
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setCollectError('Enter a valid amount');
      return;
    }
    try {
      setCollecting(true);
      setCollectError('');
      setCollectOk('');
      const idem =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${collectFor.student_id}`;
      const res = await fetch('/api/transport/fee-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-id': staffId,
        },
        body: JSON.stringify({
          school_code: schoolCode,
          student_id: collectFor.student_id,
          amount: amt,
          payment_mode: paymentMode,
          period_month: collectFor.billing_month,
          reference_no: referenceNo.trim() || null,
          is_manual_entry: manualEntry,
          idempotency_key: idem,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCollectError(json.error || 'Collection failed');
        return;
      }
      const id = json.data?.id ? String(json.data.id) : '';
      setCollectOk(json.data?.receipt_no ? `Recorded — ${json.data.receipt_no}` : 'Recorded');
      setCollectFor(null);
      setAmount('');
      setReferenceNo('');
      void load();
      if (id) {
        const w = window.open(
          `/api/transport/fee-payments/${id}/receipt?school_code=${encodeURIComponent(schoolCode)}`,
          '_blank'
        );
        if (!w) setCollectOk((prev) => `${prev} (allow pop-ups for receipt)`);
      }
    } catch {
      setCollectError('Collection failed');
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bus className="text-[#5A7A95]" />
            Transport fees
          </h1>
          <p className="text-gray-600 text-sm mt-1">Per-month collection and TREC receipts (separate mode only)</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/transport`)}>
          <ArrowLeft size={16} className="mr-2" />
          Transport home
        </Button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <Card className="p-4 flex flex-wrap gap-4 items-end">
        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 block mb-1">Class</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setSectionFilter('');
              setPage(1);
            }}
          >
            <option value="">Select class</option>
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 block mb-1">Section</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setPage(1);
            }}
            disabled={!classFilter}
          >
            <option value="">{classFilter ? 'Select section' : 'Select class first'}</option>
            {uniqueSections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Billing month</label>
          <Input type="month" value={billingMonth.slice(0, 7)} onChange={(e) => setBillingMonth(`${e.target.value}-01`)} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-500 block mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or admission no."
            />
          </div>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
            <Loader2 className="animate-spin" size={20} />
            Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Route</th>
                  <th className="p-3 text-right">Monthly</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Balance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.student_id} className="border-t border-slate-100">
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{r.student_name}</div>
                      <div className="text-xs text-gray-500">{r.admission_no}</div>
                    </td>
                    <td className="p-3">
                      {r.class} {r.section}
                    </td>
                    <td className="p-3 text-gray-700">{r.route_name || '—'}</td>
                    <td className="p-3 text-right tabular-nums">₹{r.monthly_transport_fee.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right tabular-nums">₹{r.paid_this_month.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right tabular-nums font-medium">₹{r.balance_due.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          r.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : r.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={r.balance_due <= 0.02 || r.transport_fee_mode === 'MERGED'}
                        onClick={() => {
                          setCollectFor(r);
                          setAmount(String(r.balance_due));
                          setCollectError('');
                          setCollectOk('');
                        }}
                      >
                        Collect
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      {!classFilter || !sectionFilter
                        ? 'Select class and section to view mapped transport students.'
                        : 'No students with transport and a non-zero monthly fee for this month.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex justify-between items-center text-sm text-gray-500">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Previous page
        </Button>
        <span>Page {page}</span>
        <Button variant="outline" size="sm" disabled={rows.length < 80} onClick={() => setPage((p) => p + 1)}>
          Next page
        </Button>
      </div>

      {collectFor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => !collecting && setCollectFor(null)}
        >
          <Card className="w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">Collect transport fee</h3>
            <p className="text-sm text-gray-600 mb-4">
              {collectFor.student_name} — balance ₹{collectFor.balance_due.toLocaleString('en-IN')} for{' '}
              {collectFor.billing_month}
            </p>
            {collectError && <div className="text-sm text-red-600 mb-2">{collectError}</div>}
            {collectOk && <div className="text-sm text-green-700 mb-2">{collectOk}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Collected by (staff)</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedCollector}
                  onChange={(e) => setSelectedCollector(e.target.value)}
                >
                  <option value="">Select staff</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.staff_id}>
                      {s.full_name} ({s.staff_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Amount</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Mode</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Cheque</option>
                  <option>Bank transfer</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Reference (optional)</label>
                <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={manualEntry} onChange={(e) => setManualEntry(e.target.checked)} />
                Manual / backdated entry (audited)
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setCollectFor(null)} disabled={collecting}>
                Cancel
              </Button>
              <Button onClick={submitCollection} disabled={collecting}>
                {collecting ? <Loader2 className="animate-spin" size={18} /> : <Receipt size={18} className="mr-1" />}
                Confirm
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
