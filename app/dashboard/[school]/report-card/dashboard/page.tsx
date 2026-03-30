'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, FileText, Eye, Download, Printer, Plus, Search, Loader2, Trash2, Send, CheckSquare, Square } from 'lucide-react';

interface ReportCardItem {
  id: string;
  school_code: string;
  student_id: string;
  exam_id?: string;
  student_name: string;
  admission_no: string;
  roll_number?: string;
  class_name: string;
  section: string;
  academic_year: string;
  created_at: string;
  sent_at?: string | null;
}

export default function ReportCardDashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const [reportCards, setReportCards] = useState<ReportCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchReportCards = async () => {
    setLoading(true);
    try {
      // Always load all cards for the school; class/section filters are applied client-side.
      // Server-side filters caused "empty dashboard" after generate when a stale filter value
      // (or class label mismatch) did not match the newly saved rows.
      const params = new URLSearchParams({ school_code: schoolCode });
      const res = await fetch(`/api/marks/report-card/list?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Report card list failed:', data?.error || res.status);
        setReportCards([]);
        return;
      }
      setReportCards(Array.isArray(data.data) ? data.data : []);
    } catch {
      setReportCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const isFirstClassFilterEffect = useRef(true);
  useEffect(() => {
    if (isFirstClassFilterEffect.current) {
      isFirstClassFilterEffect.current = false;
      return;
    }
    setSectionFilter('');
  }, [classFilter]);

  const canShowResults = Boolean(classFilter && sectionFilter);

  const q = searchQuery.trim().toLowerCase();
  const filteredCards = canShowResults
    ? reportCards.filter((c) => {
        if (classFilter && (c.class_name || '') !== classFilter) return false;
        if (sectionFilter && (c.section || '') !== sectionFilter) return false;
        if (!q) return true;
        return (
          (c.student_name || '').toLowerCase().includes(q) ||
          (c.admission_no || '').toLowerCase().includes(q) ||
          (c.roll_number || '').toLowerCase().includes(q)
        );
      })
    : [];

  const classes = [...new Set(reportCards.map((c) => c.class_name).filter(Boolean))].sort();
  const sections = classFilter
    ? [
        ...new Set(
          reportCards
            .filter((c) => (c.class_name || '') === classFilter)
            .map((c) => c.section)
            .filter(Boolean)
        ),
      ].sort()
    : [];

  const handleView = (id: string) => {
    window.open(`/api/marks/report-card/${id}?_t=${Date.now()}`, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    setSelectedIds(new Set());
  }, [classFilter, sectionFilter]);

  const handleDownload = (id: string, name: string, year: string) => {
    const url = `/api/marks/report-card/${id}?_t=${Date.now()}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_card_${(name || '').replace(/\s+/g, '_')}_${(year || '').replace(/\s+/g, '_')}.html`;
    a.target = '_blank';
    a.click();
  };

  const handlePrint = (id: string) => {
    const w = window.open(`/api/marks/report-card/${id}?_t=${Date.now()}`, '_blank', 'noopener,noreferrer');
    if (w) {
      w.onload = () => { w.focus(); w.print(); };
    }
  };

  const handleDelete = async (card: ReportCardItem) => {
    if (!confirm(`Delete report card for ${card.student_name || 'this student'} (${card.academic_year || ''})? This cannot be undone.`)) return;
    setDeletingId(card.id);
    try {
      const res = await fetch(`/api/marks/report-card/${card.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setReportCards((prev) => prev.filter((c) => c.id !== card.id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(card.id); return n; });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map((c) => c.id)));
    }
  };

  const handleSendReportCards = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    try {
      const res = await fetch('/api/marks/report-card/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_code: schoolCode, report_card_ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSendModalOpen(false);
      setSelectedIds(new Set());
      await fetchReportCards();
      alert(data.message || `${data.sent_count} report card(s) sent. Students can view them in their Report Card module.`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
            Report Card Dashboard
          </h1>
          <p className="text-gray-600">View and manage all generated report cards</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setSendModalOpen(true)}
            disabled={selectedIds.size === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:pointer-events-none"
          >
            <Send size={18} className="mr-2" />
            Send Report Card {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
          <Button onClick={() => router.push(`/dashboard/${schoolCode}/report-card/generate`)} className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
            <Plus size={18} className="mr-2" />
            Generate Report Card
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/report-card`)} className="border-[#1e3a8a] text-[#1e3a8a]">
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, admission no, or roll no..."
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            />
          </div>
          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              disabled={!classFilter}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">{classFilter ? 'Select Section' : 'Select Class First'}</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!canShowResults && !loading ? (
          <div className="py-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300" />
            <p className="mt-4 text-gray-500 font-medium">Select Class and Section to view report cards</p>
            <p className="text-sm text-gray-400 mt-1">Then you can search and manage the generated report cards.</p>
            <Button
              onClick={() => router.push(`/dashboard/${schoolCode}/report-card/generate`)}
              className="mt-4 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
            >
              <Plus size={18} className="mr-2" />
              Generate Report Card
            </Button>
          </div>
        ) : loading ? (
          <div className="py-12 text-center">
            <Loader2 size={48} className="animate-spin mx-auto text-[#1e3a8a]" />
            <p className="mt-4 text-gray-500">Loading report cards...</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="py-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300" />
            <p className="mt-4 text-gray-500 font-medium">
              No report cards found for selected Class and Section
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {reportCards.length > 0
                ? 'Try generating report cards again or adjust your selection.'
                : 'Generate report cards to see them here'}
            </p>
            <Button
              onClick={() => router.push(`/dashboard/${schoolCode}/report-card/generate`)}
              className="mt-4 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
            >
              <Plus size={18} className="mr-2" />
              Generate Report Card
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <tr>
                  <th className="px-3 py-3 text-left w-12">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="p-1 rounded hover:bg-white/20 transition-colors"
                      title={selectedIds.size === filteredCards.length ? 'Deselect all' : 'Select all'}
                    >
                      {selectedIds.size === filteredCards.length && filteredCards.length > 0 ? (
                        <CheckSquare size={22} className="text-white" />
                      ) : (
                        <Square size={22} className="text-white/90" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Admission No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Roll No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Class-Section</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Academic Year</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Generated</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCards.map((card, index) => (
                  <motion.tr
                    key={card.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`hover:bg-gray-50 ${selectedIds.has(card.id) ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSelect(card.id)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                      >
                        {selectedIds.has(card.id) ? (
                          <CheckSquare size={20} className="text-[#1e3a8a]" />
                        ) : (
                          <Square size={20} className="text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{card.admission_no || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{card.roll_number || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{card.student_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{card.class_name || '-'}-{card.section || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{card.academic_year || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {card.created_at ? new Date(card.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {card.sent_at ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Sent {new Date(card.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Not sent
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleView(card.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View"><Eye size={18} /></button>
                        <button onClick={() => handleDownload(card.id, card.student_name, card.academic_year)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Download HTML"><Download size={18} /></button>
                        <button onClick={() => handlePrint(card.id)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Print"><Printer size={18} /></button>
                        <button onClick={() => handleDelete(card)} disabled={deletingId === card.id} className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50" title="Delete">{deletingId === card.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}</button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Send Report Card confirmation modal */}
      <AnimatePresence>
        {sendModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !sending && setSendModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Send className="text-emerald-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Send Report Cards</h3>
                  <p className="text-sm text-gray-500">Make them visible to students</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Send <strong>{selectedIds.size}</strong> report card(s) to the selected students? They will see them in their <strong>Report Card</strong> module on the student dashboard.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => !sending && setSendModalOpen(false)} disabled={sending} className="border-gray-300">
                  Cancel
                </Button>
                <Button onClick={handleSendReportCards} disabled={sending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {sending ? <><Loader2 size={18} className="animate-spin mr-2" />Sending...</> : <><Send size={18} className="mr-2" />Send</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
