'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Plus, Edit2, Power, PowerOff, FileText, Search, CheckCircle, XCircle, AlertCircle, Loader2, Calendar, TrendingUp, ChevronDown, ChevronRight, Trash2, ClipboardCopy } from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

interface FeeStructureItem {
  id: string;
  fee_head_id: string;
  amount: number;
  fee_head?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface FeeStructure {
  id: string;
  name: string;
  class_name: string;
  section: string | null;
  academic_year: string | null;
  start_month: number;
  end_month: number;
  frequency: string;
  late_fee_type: string | null;
  late_fee_value: number;
  grace_period_days: number;
  is_active: boolean;
  activated_at: string | null;
  fees_generated?: boolean;
  fees_generated_at?: string | null;
  items?: FeeStructureItem[];
  created_at: string;
}

export default function FeeStructuresPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deactivateModal, setDeactivateModal] = useState<{
    structureId: string;
    structureName: string;
    students: Array<{ id: string; student_name: string; admission_no: string; class: string; section: string }>;
    count: number;
  } | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [groupActionKey, setGroupActionKey] = useState<string | null>(null);
  /** Set when DELETE fails until DB has fee_structures.deleted_at (API returns apply_sql). */
  const [feeStructureSchemaSql, setFeeStructureSchemaSql] = useState<string | null>(null);

  const fetchStructures = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/v2/fees/fee-structures?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok) {
        setStructures(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch fee structures');
      }
    } catch (err) {
      setError('Failed to load fee structures');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchStructures();
  }, [fetchStructures]);

  useEffect(() => {
    if (!error) setFeeStructureSchemaSql(null);
  }, [error]);

  const handleActivate = async (structureId: string) => {
    if (!confirm('Activate this fee structure? This will make it available for fee generation.')) {
      return;
    }

    try {
      setError('');
      const response = await fetch(`/api/v2/fees/fee-structures/${structureId}/activate`, {
        method: 'POST',
        headers: {
          'x-staff-id': sessionStorage.getItem('staff_id') || '',
        },
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Fee structure activated successfully');
        fetchStructures();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to activate fee structure');
      }
    } catch (err) {
      setError('Failed to activate fee structure');
      console.error(err);
    }
  };

  const handleDeactivate = async (structureId: string, structureName: string) => {
    try {
      setError('');
      const res = await fetch(`/api/v2/fees/fee-structures/${structureId}/students-with-fees`);
      const result = await res.json();
      const students = result.data?.students || [];
      const count = result.data?.count ?? students.length;

      if (count > 0) {
        setDeactivateModal({
          structureId,
          structureName,
          students,
          count,
        });
        return;
      }

      if (!confirm('Deactivate this fee structure? This will prevent it from being used for fee generation. Existing fees will not be affected.')) {
        return;
      }
      await doDeactivate(structureId);
    } catch (err) {
      setError('Failed to check fee structure');
      console.error(err);
    }
  };

  const doDeactivate = async (structureId: string) => {
    try {
      setDeactivating(structureId);
      setError('');
      const response = await fetch(`/api/v2/fees/fee-structures/${structureId}/deactivate`, {
        method: 'POST',
        headers: {
          'x-staff-id': sessionStorage.getItem('staff_id') || '',
        },
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Fee structure deactivated successfully');
        setDeactivateModal(null);
        fetchStructures();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to deactivate fee structure');
      }
    } catch (err) {
      setError('Failed to deactivate fee structure');
      console.error(err);
    } finally {
      setDeactivating(null);
    }
  };

  const handleDelete = async (structure: FeeStructure) => {
    const { id: structureId, name: structureName, fees_generated: feesGenerated } = structure;
    const msg = feesGenerated
      ? `Remove "${structureName}" from the fee structure list?\n\n` +
        `• Student installments and amounts already generated stay in the system.\n` +
        `• Collect Payment and receipts are not affected.\n` +
        `• This only hides the structure after you have deactivated it (no new generation).\n\n` +
        `Continue?`
      : `Permanently delete "${structureName}"?\n\n` +
        `No student fee rows exist for this structure yet. This cannot be undone.`;
    if (!confirm(msg)) return;

    try {
      setDeleting(structureId);
      setError('');
      setFeeStructureSchemaSql(null);
      const staffId = sessionStorage.getItem('staff_id') || '';
      const response = await fetch(`/api/v2/fees/fee-structures/${structureId}`, {
        method: 'DELETE',
        headers: staffId ? { 'x-staff-id': staffId } : {},
      });
      const result = await response.json();

      if (response.ok) {
        setSuccess(
          result.message ||
            (result.data?.soft_deleted
              ? 'Fee structure removed. Existing student fees and payments are unchanged.'
              : 'Fee structure deleted successfully')
        );
        fetchStructures();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(result.error || 'Failed to delete fee structure');
        setFeeStructureSchemaSql(typeof result.apply_sql === 'string' ? result.apply_sql : null);
      }
    } catch (err) {
      setError('Failed to delete fee structure');
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const getTotalAmount = (structure: FeeStructure) => {
    return structure.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
  };

  const getMonthName = (monthNumber: number) => {
    return MONTHS.find(m => m.value === monthNumber)?.label || `Month ${monthNumber}`;
  };

  // Base name for grouping:
  // - remove trailing section suffixes like " - A"
  // - remove trailing quarter/month tokens like "Q1", "Q2", "M1", "April"
  const getBaseName = (name: string) => {
    const monthPattern =
      '(January|February|March|April|May|June|July|August|September|October|November|December)';
    return name
      .replace(/\s*-\s*[A-Z]\s*$/i, '')
      .replace(/\s*[-–]?\s*(Q[1-4]|M[0-9]{1,2}|MONTH\s*[0-9]{1,2})\s*$/i, '')
      .replace(new RegExp(`\\s*[-–]?\\s*${monthPattern}\\s*$`, 'i'), '')
      .trim() || name;
  };

  const getPeriodLabelFromName = (name: string) => {
    const quarter = name.match(/\b(Q[1-4])\s*$/i) || name.match(/\b(Q[1-4])\b/i);
    if (quarter?.[1]) return quarter[1].toUpperCase();

    // Prefer trailing month token (e.g. "... - September"), avoid matching "April" from "April-March".
    const trailingMonth = name.match(
      /(?:-|–|\s)\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*$/i
    );
    if (trailingMonth?.[1]) {
      const m = trailingMonth[1];
      return `${m.charAt(0).toUpperCase()}${m.slice(1).toLowerCase()}`;
    }
    return '';
  };

  const periodSortValue = (s: FeeStructure) => {
    const label = getPeriodLabelFromName(s.name);
    const quarterMap: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
    if (quarterMap[label]) return quarterMap[label];
    const monthIndex = MONTHS.findIndex((m) => m.label.toLowerCase() === label.toLowerCase());
    if (monthIndex >= 0) return monthIndex + 1;
    return 999;
  };

  const nextMonthNumber = (start: number, offset: number) => {
    const normalized = ((Number(start) - 1 + Number(offset)) % 12 + 12) % 12;
    return normalized + 1;
  };

  const fallbackPeriodLabel = (s: FeeStructure, index: number) => {
    const freq = String(s.frequency || '').toLowerCase();
    if (freq === 'quarterly') return `Q${Math.min(4, Math.max(1, index + 1))}`;
    if (freq === 'monthly') return getMonthName(nextMonthNumber(s.start_month, index));
    if (freq === 'yearly') return 'Yearly';
    return '';
  };

  const getGroupKey = (s: FeeStructure) => {
    const base = getBaseName(s.name);
    return [
      base,
      s.class_name || '',
      s.section || '',
      s.academic_year || '',
      String(s.start_month || ''),
      String(s.end_month || ''),
    ].join('|');
  };

  // Group structures so one logical structure (same name base + period + frequency) appears once
  const structureGroups = useMemo(() => {
    const map = new Map<string, FeeStructure[]>();
    structures.forEach((s) => {
      const key = getGroupKey(s);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).map(([key, list]) => ({
      key,
      displayName: getBaseName(list[0].name),
      structures: list.sort((a, b) =>
        periodSortValue(a) - periodSortValue(b) ||
        a.class_name.localeCompare(b.class_name) ||
        (a.section || '').localeCompare(b.section || '')
      ),
    }));
  }, [structures]);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [selectedFrequencyByGroup, setSelectedFrequencyByGroup] = useState<Record<string, string>>({});

  const runGroupAction = async (
    groupKey: string,
    groupStructures: FeeStructure[],
    action: 'activate' | 'deactivate'
  ) => {
    const target = action === 'activate'
      ? groupStructures.filter((s) => !s.is_active)
      : groupStructures.filter((s) => s.is_active);

    if (target.length === 0) {
      setError(`All entries are already ${action === 'activate' ? 'active' : 'inactive'}.`);
      return;
    }

    const confirmText =
      action === 'activate'
        ? `Activate all ${target.length} entries in this structure group?`
        : `Deactivate all ${target.length} entries in this structure group?`;
    if (!confirm(confirmText)) return;

    try {
      setGroupActionKey(groupKey);
      setError('');
      setSuccess('');
      const staffId = sessionStorage.getItem('staff_id') || '';

      for (const structure of target) {
        const endpoint = `/api/v2/fees/fee-structures/${structure.id}/${action}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'x-staff-id': staffId },
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || `Failed to ${action} ${structure.name}`);
        }
      }

      setSuccess(
        action === 'activate'
          ? 'Whole structure group activated successfully'
          : 'Whole structure group deactivated successfully'
      );
      fetchStructures();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} structure group`);
    } finally {
      setGroupActionKey(null);
    }
  };

  const handleDeleteGroup = async (groupKey: string, groupStructures: FeeStructure[]) => {
    if (groupStructures.some((s) => s.is_active)) {
      setError('Deactivate the whole structure first, then delete it.');
      return;
    }
    if (
      !confirm(
        `Delete whole structure (${groupStructures.length} entries)?\n\n` +
          'If student fees already exist, this removes entries from list only; installments and payments stay.'
      )
    ) {
      return;
    }

    try {
      setGroupActionKey(groupKey);
      setError('');
      setSuccess('');
      setFeeStructureSchemaSql(null);
      const staffId = sessionStorage.getItem('staff_id') || '';

      for (const structure of groupStructures) {
        const response = await fetch(`/api/v2/fees/fee-structures/${structure.id}`, {
          method: 'DELETE',
          headers: staffId ? { 'x-staff-id': staffId } : {},
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          setFeeStructureSchemaSql(typeof result.apply_sql === 'string' ? result.apply_sql : null);
          throw new Error(result.error || `Failed to delete ${structure.name}`);
        }
      }

      setSuccess('Whole structure deleted successfully');
      fetchStructures();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete whole structure');
    } finally {
      setGroupActionKey(null);
    }
  };

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return structureGroups.filter(
      (g) =>
        g.displayName.toLowerCase().includes(q) ||
        g.structures.some(
          (s) =>
            s.class_name.toLowerCase().includes(q) ||
            (s.section || '').toLowerCase().includes(q)
        )
    );
  }, [structureGroups, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">

          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <FileText size={32} className="text-indigo-600" />
              Fee Structures
            </h1>
            <p className="text-gray-600">Manage fee structures for classes</p>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">
              To remove a structure: <strong>Deactivate</strong> first (stops new fee generation), then use{' '}
              <strong>Delete</strong>. If students already have fees from this structure, delete only removes it from
              this list — installments and collected payments stay in Collect Payment.
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures/create`)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Create Structure
        </Button>
      </motion.div>

      {/* Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <CheckCircle size={20} className="mt-0.5 flex-shrink-0 text-green-600" />
            <div className="flex-1">
              <pre className="whitespace-pre-wrap font-sans text-sm">{success}</pre>
            </div>
          </div>
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg space-y-3"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <pre className="whitespace-pre-wrap font-sans text-sm">{error}</pre>
            </div>
          </div>
          {feeStructureSchemaSql && (
            <div className="rounded-md border border-amber-200 bg-amber-50/90 p-3 text-amber-950">
              <p className="text-xs font-semibold text-amber-900 mb-2">
                Supabase → SQL Editor → paste → Run. Then Settings → Data API → Reload schema if needed.
              </p>
              <div className="relative">
                <pre className="text-[11px] leading-relaxed overflow-x-auto p-2 pr-24 bg-white/80 border border-amber-100 rounded font-mono text-gray-900 max-h-48 overflow-y-auto">
                  {feeStructureSchemaSql}
                </pre>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-8 text-xs gap-1 bg-white"
                  onClick={() => {
                    void navigator.clipboard.writeText(feeStructureSchemaSql);
                  }}
                >
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  Copy SQL
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Search fee structures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Structures List - collapsed by default, expand on click; one card per logical structure (no repeats) */}
      <div className="space-y-3">
        {filteredGroups.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'No structures found matching your search' : 'No fee structures created yet'}
            </div>
          </Card>
        ) : (
          filteredGroups.map((group) => {
            const isExpanded = expandedKey === group.key;
            const first = group.structures[0];
            const frequencies = Array.from(
              new Set(group.structures.map((s) => String(s.frequency || '').toLowerCase()).filter(Boolean))
            );
            const selectedFrequency =
              selectedFrequencyByGroup[group.key] ||
              (frequencies.includes('monthly')
                ? 'monthly'
                : frequencies.includes('quarterly')
                  ? 'quarterly'
                  : frequencies[0] || String(first.frequency || ''));
            const visibleStructures = group.structures.filter(
              (s) => String(s.frequency || '').toLowerCase() === selectedFrequency
            );
            const activeCount = group.structures.filter((s) => s.is_active).length;
            const totalAmount = getTotalAmount(first);
            const isGroupBusy = groupActionKey === group.key;

            return (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className={`border-2 transition-all cursor-pointer select-none ${
                    activeCount > 0 ? 'border-green-200 hover:border-green-300' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedKey(null);
                      return;
                    }
                    setExpandedKey(group.key);
                    if (!selectedFrequencyByGroup[group.key] && selectedFrequency) {
                      setSelectedFrequencyByGroup((prev) => ({ ...prev, [group.key]: selectedFrequency }));
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-4 py-1">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown size={20} className="text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight size={20} className="text-gray-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">{group.displayName}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {group.structures.length} class{group.structures.length !== 1 ? 'es' : ''} •{' '}
                          {getMonthName(first.start_month)} – {getMonthName(first.end_month)} • {first.frequency}
                          {activeCount > 0 && (
                            <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                              <CheckCircle size={12} />
                              Active
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-sm font-bold text-indigo-600">
                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="pt-4 mt-4 border-t border-gray-200 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3">
                            <p className="text-xs text-gray-600">
                              Group controls: activate/deactivate all quarter or month entries together.
                            </p>
                            <div className="flex items-center gap-2">
                              {activeCount < group.structures.length ? (
                                <Button
                                  onClick={() => runGroupAction(group.key, group.structures, 'activate')}
                                  disabled={isGroupBusy}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 px-2"
                                  size="sm"
                                >
                                  {isGroupBusy ? <Loader2 size={14} className="animate-spin" /> : 'Activate Whole Structure'}
                                </Button>
                              ) : null}
                              {activeCount > 0 ? (
                                <Button
                                  onClick={() => runGroupAction(group.key, group.structures, 'deactivate')}
                                  disabled={isGroupBusy}
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-2"
                                  size="sm"
                                >
                                  {isGroupBusy ? <Loader2 size={14} className="animate-spin" /> : 'Deactivate Whole Structure'}
                                </Button>
                              ) : null}
                              {activeCount === 0 ? (
                                <Button
                                  onClick={() => handleDeleteGroup(group.key, group.structures)}
                                  disabled={isGroupBusy}
                                  className="bg-gray-700 hover:bg-gray-800 text-white text-xs py-1.5 px-2"
                                  size="sm"
                                >
                                  {isGroupBusy ? <Loader2 size={14} className="animate-spin" /> : 'Delete Whole Structure'}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          {frequencies.length > 1 && (
                            <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-2">
                              <span className="text-xs font-semibold text-indigo-900">Choose frequency:</span>
                              {frequencies.map((f) => (
                                <Button
                                  key={`${group.key}-${f}`}
                                  type="button"
                                  size="sm"
                                  variant={selectedFrequency === f ? 'primary' : 'outline'}
                                  className="text-xs capitalize"
                                  onClick={() =>
                                    setSelectedFrequencyByGroup((prev) => ({
                                      ...prev,
                                      [group.key]: f,
                                    }))
                                  }
                                >
                                  {f}
                                </Button>
                              ))}
                            </div>
                          )}
                          {visibleStructures.map((structure, idx) => (
                            <div
                              key={structure.id}
                              className="p-4 rounded-lg bg-gray-50 border border-gray-200"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2 text-sm">
                                  {(getPeriodLabelFromName(structure.name) || fallbackPeriodLabel(structure, idx)) && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-full">
                                      {getPeriodLabelFromName(structure.name) || fallbackPeriodLabel(structure, idx)}
                                    </span>
                                  )}
                                  <span className="font-semibold text-gray-900">
                                    {structure.class_name}
                                    {structure.section && (
                                      <span className="text-indigo-600"> - {structure.section}</span>
                                    )}
                                  </span>
                                  {structure.is_active ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                      <CheckCircle size={10} /> Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                      <XCircle size={10} /> Inactive
                                    </span>
                                  )}
                                  {structure.fees_generated ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">
                                      <Calendar size={10} />
                                      Fees generated
                                      {structure.fees_generated_at && (
                                        <span className="text-indigo-600">
                                          {' '}
                                          ({new Date(structure.fees_generated_at).toLocaleDateString('en-IN')})
                                        </span>
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {!structure.is_active ? (
                                    <Button
                                      onClick={() => handleActivate(structure.id)}
                                      className="bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 px-2"
                                      size="sm"
                                    >
                                      <Power size={14} className="mr-1" />
                                      Activate
                                    </Button>
                                  ) : (
                                    <Button
                                      onClick={() => handleDeactivate(structure.id, structure.name)}
                                      disabled={deactivating === structure.id}
                                      className="bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-2"
                                      size="sm"
                                    >
                                      {deactivating === structure.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <>
                                          <PowerOff size={14} className="mr-1" />
                                          Deactivate
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  {!structure.is_active && (
                                    <Button
                                      onClick={() => handleDelete(structure)}
                                      disabled={deleting === structure.id}
                                      className="bg-gray-700 hover:bg-gray-800 text-white text-xs py-1.5 px-2"
                                      size="sm"
                                    >
                                      {deleting === structure.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <>
                                          <Trash2 size={14} className="mr-1" />
                                          Delete
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures/${structure.id}`)}
                                    className="text-xs py-1.5 px-2"
                                  >
                                    <Edit2 size={14} className="mr-1" />
                                    View / Edit
                                  </Button>
                                </div>
                              </div>

                              {structure.items && structure.items.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Fee Composition</p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                                    {structure.items.map((item) => (
                                      <span key={item.id}>
                                        {item.fee_head?.name || 'Unknown'}: ₹
                                        {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {structure.late_fee_type && (
                                <p className="text-xs text-amber-800">
                                  Late: {structure.late_fee_type} – ₹{structure.late_fee_value}
                                  {structure.late_fee_type === 'per_day' && '/day'}
                                  {structure.grace_period_days > 0 && ` • ${structure.grace_period_days} days grace`}
                                </p>
                              )}
                            </div>
                          ))}

                          {first.items && first.items.length > 0 && group.structures.length > 1 && (
                            <div className="p-3 bg-white border border-gray-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={14} className="text-indigo-600" />
                                <p className="text-sm font-semibold text-gray-900">Fee Composition (same for all)</p>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                                {first.items.map((item) => (
                                  <span key={item.id}>
                                    {item.fee_head?.name}: ₹
                                    {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Deactivate warning modal: students with generated fees */}
      <AnimatePresence>
        {deactivateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !deactivating && setDeactivateModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="text-amber-500" size={22} />
                  Students with generated fees
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  The following {deactivateModal.count} student(s) have fees generated for structure &quot;{deactivateModal.structureName}&quot;. Deactivating will prevent new fee generation; existing fees will not be affected.
                </p>
              </div>
              <div className="p-4 overflow-y-auto flex-1 min-h-0">
                <ul className="space-y-2">
                  {deactivateModal.students.map((s) => (
                    <li key={s.id} className="text-sm text-gray-700 dark:text-gray-300 py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <span className="font-medium">{s.student_name}</span>
                      {s.admission_no && <span className="text-gray-500 dark:text-gray-400 ml-2">({s.admission_no})</span>}
                      {s.class && <span className="text-gray-500 dark:text-gray-400 ml-2">— {s.class}{s.section ? `-${s.section}` : ''}</span>}
                    </li>
                  ))}
                </ul>
                {deactivateModal.count > deactivateModal.students.length && (
                  <p className="text-xs text-gray-500 mt-2">... and {deactivateModal.count - deactivateModal.students.length} more</p>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeactivateModal(null)}
                  disabled={!!deactivating}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => doDeactivate(deactivateModal.structureId)}
                  disabled={!!deactivating}
                >
                  {deactivating ? <Loader2 size={18} className="animate-spin" /> : 'Deactivate anyway'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
