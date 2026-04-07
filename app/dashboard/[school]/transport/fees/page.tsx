'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Bus, Loader2, Printer, Receipt, Search } from 'lucide-react';

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
  billing_frequency?: string;
  period_label?: string;
  paid_this_month: number;
  balance_due: number;
  status: string;
  transport_fee_mode: string;
  pickup_stop_name?: string | null;
  drop_stop_name?: string | null;
  fare_breakdown?: {
    from_custom?: boolean;
    pickup_amount?: number;
    drop_amount?: number;
    calculated_total?: number;
    period_fee?: number;
  };
}

interface CollectionRow {
  id: string;
  student_id: string;
  amount: number;
  period_month: string;
  receipt_no: string | null;
  payment_date: string | null;
  payment_mode: string | null;
  reference_no: string | null;
  created_at: string;
  student?: { student_name?: string; admission_no?: string; class?: string; section?: string };
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
  const [dueRows, setDueRows] = useState<RosterRow[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [billingMonth, setBillingMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [search, setSearch] = useState('');
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
        setDueRows([]);
        setCollections([]);
        return;
      }
      const q = new URLSearchParams({
        school_code: schoolCode,
        roster: '1',
        billing_month: billingMonth,
        class: classFilter,
        section: sectionFilter,
      });
      const res = await fetch(`/api/transport/fee-payments?${q}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load');
        setDueRows([]);
        setCollections([]);
        return;
      }
      setDueRows(Array.isArray(json.due) ? json.due : []);
      setCollections(Array.isArray(json.collections) ? json.collections : []);
      if (json.meta?.transport_fee_mode === 'MERGED') {
        setError(
          'This school is still on merged transport fees. Switch to Separate under Fees → Fee configuration to use this screen.'
        );
      }
    } catch {
      setError('Failed to load roster');
      setDueRows([]);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, billingMonth, classFilter, sectionFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = dueRows.filter((r) => {
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

  const previewAmount = Number.parseFloat(amount);
  const validPreviewAmount = Number.isFinite(previewAmount) && previewAmount > 0 ? previewAmount : 0;
  const previewRemaining = collectFor ? Math.max(0, collectFor.balance_due - validPreviewAmount) : 0;
  const previewAlreadyPaid = collectFor ? Math.max(0, collectFor.paid_this_month) : 0;

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
          <label className="text-xs font-medium text-gray-500 block mb-1">Billing period (calendar month)</label>
          <Input type="month" value={billingMonth.slice(0, 7)} onChange={(e) => setBillingMonth(`${e.target.value}-01`)} />
          <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
            Monthly students use that month. Quarterly students use the quarter that contains this month (collections match quarter start).
          </p>
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
                  <th className="p-3">Freq</th>
                  <th className="p-3 text-right">Period fee</th>
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
                    <td className="p-3 text-gray-600 text-xs">
                      {r.billing_frequency === 'QUARTERLY' ? 'Quarterly' : 'Monthly'}
                      {r.period_label && (
                        <span className="block text-gray-400 mt-0.5">{r.period_label}</span>
                      )}
                    </td>
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
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      {!classFilter || !sectionFilter
                        ? 'Select class and section to view mapped transport students with a balance for this billing period.'
                        : 'No transport fee due for this class-section and billing period (all paid or zero fee).'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-800">Collections for this billing period</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Receipts recorded for the same period as above (month or quarter start).
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : collections.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">
            {!classFilter || !sectionFilter ? 'Select class and section.' : 'No collections for this period yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Receipt</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 w-32">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((c) => {
                  const st = c.student;
                  const name = st?.student_name || '—';
                  const adm = st?.admission_no || '';
                  return (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{name}</div>
                        <div className="text-xs text-gray-500">{adm}</div>
                      </td>
                      <td className="p-3 text-gray-700 tabular-nums">{c.receipt_no || c.id.slice(0, 8)}</td>
                      <td className="p-3 text-right tabular-nums font-medium">₹{Number(c.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-gray-600">{c.payment_date || c.created_at?.slice(0, 10) || '—'}</td>
                      <td className="p-3 text-gray-600">{c.payment_mode || '—'}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() =>
                              window.open(
                                `/api/transport/fee-payments/${c.id}/receipt?school_code=${encodeURIComponent(schoolCode)}`,
                                '_blank'
                              )
                            }
                          >
                            <Printer size={14} className="mr-1" />
                            Print
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Receipt preview</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-500">Pickup stop</span>
                  <span className="text-right text-slate-800">{collectFor.pickup_stop_name || 'Not selected'}</span>
                  <span className="text-slate-500">Drop stop</span>
                  <span className="text-right text-slate-800">{collectFor.drop_stop_name || 'Not selected'}</span>
                  <span className="text-slate-500">Pickup charge</span>
                  <span className="text-right tabular-nums text-slate-800">
                    ₹{Number(collectFor.fare_breakdown?.pickup_amount || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-500">Drop charge</span>
                  <span className="text-right tabular-nums text-slate-800">
                    ₹{Number(collectFor.fare_breakdown?.drop_amount || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-500">Calculated period fee</span>
                  <span className="text-right tabular-nums text-slate-800">
                    ₹{Number(collectFor.fare_breakdown?.calculated_total || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-500">Configured period fee</span>
                  <span className="text-right tabular-nums font-medium text-slate-900">
                    ₹{Number(collectFor.monthly_transport_fee || collectFor.fare_breakdown?.period_fee || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-500">Already paid</span>
                  <span className="text-right tabular-nums text-slate-800">
                    ₹{previewAlreadyPaid.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-500">This payment</span>
                  <span className="text-right tabular-nums text-emerald-700 font-medium">
                    ₹{validPreviewAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-500">Balance after payment</span>
                  <span className="text-right tabular-nums font-semibold text-slate-900">
                    ₹{previewRemaining.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
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
