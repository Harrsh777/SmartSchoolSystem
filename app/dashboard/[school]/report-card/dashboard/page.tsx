'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, FileText, Eye, Download, Printer, Plus, Search, Loader2, Trash2 } from 'lucide-react';

interface ReportCardItem {
  id: string;
  school_code: string;
  student_id: string;
  exam_id?: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  section: string;
  academic_year: string;
  created_at: string;
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

  const fetchReportCards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ school_code: schoolCode });
      if (classFilter) params.set('class_name', classFilter);
      if (sectionFilter) params.set('section', sectionFilter);
      const res = await fetch(`/api/marks/report-card/list?${params}`);
      const data = await res.json();
      setReportCards(data.data || []);
    } catch {
      setReportCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, classFilter, sectionFilter]);

  const filteredCards = reportCards.filter(
    (c) =>
      (c.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.admission_no || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const classes = [...new Set(reportCards.map((c) => c.class_name).filter(Boolean))].sort();
  const sections = [...new Set(reportCards.map((c) => c.section).filter(Boolean))].sort();

  const handleView = (id: string) => {
    window.open(`/api/marks/report-card/${id}?_t=${Date.now()}`, '_blank', 'noopener,noreferrer');
  };

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
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeletingId(null);
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
        <div className="flex gap-3">
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
              placeholder="Search by name or admission no..."
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            />
          </div>
          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Sections</option>
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 size={48} className="animate-spin mx-auto text-[#1e3a8a]" />
            <p className="mt-4 text-gray-500">Loading report cards...</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="py-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300" />
            <p className="mt-4 text-gray-500 font-medium">No report cards found</p>
            <p className="text-sm text-gray-400 mt-1">Generate report cards to see them here</p>
            <Button onClick={() => router.push(`/dashboard/${schoolCode}/report-card/generate`)} className="mt-4 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
              <Plus size={18} className="mr-2" />
              Generate Report Card
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Admission No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Class-Section</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Academic Year</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Generated</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCards.map((card, index) => (
                  <motion.tr key={card.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{card.admission_no || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{card.student_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{card.class_name || '-'}-{card.section || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{card.academic_year || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {card.created_at ? new Date(card.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
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
    </div>
  );
}
