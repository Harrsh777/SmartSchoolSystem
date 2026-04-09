'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Calendar, Clock, BookOpen, Users, FileText, Search, Trash2 } from 'lucide-react';

interface Exam {
  id: string;
  exam_name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  description?: string;
  created_at: string;
  term_id?: string | null;
  term?: {
    id: string;
    name?: string;
    serial?: number;
  } | null;
  class_mappings?: Array<{
    class_id: string;
    class: {
      id: string;
      class: string;
      section: string;
    };
  }>;
  subject_mappings?: Array<{
    subject_id: string;
    max_marks?: number;
    subject: {
      id: string;
      name: string;
    };
  }>;
}

interface TermOption {
  id: string;
  name: string;
  serial?: number;
  structure_id?: string | null;
}

interface StructureOption {
  id: string;
  name: string;
}

export default function ExaminationDashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [termFilter, setTermFilter] = useState<'all' | 'unassigned' | string>('all');
  const [structures, setStructures] = useState<StructureOption[]>([]);
  const [activeStructureId, setActiveStructureId] = useState('');
  const [activeStructureTerm, setActiveStructureTerm] = useState<string>('unassigned');
  const [structureTerms, setStructureTerms] = useState<Array<TermOption & { exams?: Array<{ id?: string; exam_name: string; serial?: number; weightage?: number }> }>>([]);
  const [loadingStructureDetail, setLoadingStructureDetail] = useState(false);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
    fetchTerms();
    fetchStructures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/examinations/v2/list?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setExams(result.data);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await fetch(`/api/terms?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && Array.isArray(result.data)) {
        setTerms(result.data);
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchStructures = async () => {
    try {
      const response = await fetch(`/api/term-structures?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && Array.isArray(result.data)) {
        const list = (result.data as StructureOption[]).map((s) => ({ id: String(s.id), name: String(s.name || '') }));
        setStructures(list);
        if (list.length > 0) {
          setActiveStructureId((prev) => prev || list[0].id);
        } else {
          setActiveStructureId('');
          setStructureTerms([]);
        }
      }
    } catch (error) {
      console.error('Error fetching structures:', error);
    }
  };

  const getExamStatus = (exam: Exam): 'upcoming' | 'ongoing' | 'completed' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(exam.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(exam.end_date);
    endDate.setHours(0, 0, 0, 0);

    if (today < startDate) {
      return 'upcoming';
    } else if (today >= startDate && today <= endDate) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ongoing':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredExams = exams.filter(exam => {
    // Filter by status
    if (filter !== 'all') {
      const examStatus = getExamStatus(exam);
      if (filter !== examStatus) return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        exam.exam_name.toLowerCase().includes(query) ||
        exam.academic_year.toLowerCase().includes(query)
      );
    }

    // Filter by term
    if (termFilter === 'unassigned') {
      return !exam.term_id;
    }
    if (termFilter !== 'all') {
      return String(exam.term_id || '') === termFilter;
    }

    return true;
  });

  const mergedTerms = useMemo(() => {
    const map = new Map<string, TermOption>();
    terms.forEach((t) => map.set(String(t.id), { id: String(t.id), name: String(t.name || ''), serial: Number(t.serial || 0) }));
    exams.forEach((e) => {
      const t = e.term;
      if (t?.id && !map.has(String(t.id))) {
        map.set(String(t.id), {
          id: String(t.id),
          name: String(t.name || ''),
          serial: Number(t.serial || 0),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => Number(a.serial || 0) - Number(b.serial || 0));
  }, [terms, exams]);

  const termNameById = useMemo(() => {
    const m = new Map<string, string>();
    mergedTerms.forEach((t) => m.set(String(t.id), `${t.serial ? `${t.serial}. ` : ''}${t.name}`.trim()));
    return m;
  }, [mergedTerms]);

  useEffect(() => {
    if (structureTerms.length > 0 && activeStructureTerm === 'unassigned') {
      setActiveStructureTerm(String(structureTerms[0].id));
    }
  }, [structureTerms, activeStructureTerm]);

  useEffect(() => {
    const loadStructureDetail = async () => {
      if (!activeStructureId) {
        setStructureTerms([]);
        setActiveStructureTerm('unassigned');
        return;
      }
      try {
        setLoadingStructureDetail(true);
        const response = await fetch(
          `/api/term-structures/${activeStructureId}?school_code=${encodeURIComponent(schoolCode)}`
        );
        const result = await response.json();
        if (response.ok && result.data) {
          const termsList = (result.data.terms || []) as Array<TermOption & { exams?: Array<{ id?: string; exam_name: string; serial?: number; weightage?: number }> }>;
          setStructureTerms(termsList);
          setActiveStructureTerm(termsList[0]?.id ? String(termsList[0].id) : 'unassigned');
        } else {
          setStructureTerms([]);
          setActiveStructureTerm('unassigned');
        }
      } catch (error) {
        console.error('Error fetching structure detail:', error);
        setStructureTerms([]);
        setActiveStructureTerm('unassigned');
      } finally {
        setLoadingStructureDetail(false);
      }
    };
    loadStructureDetail();
  }, [activeStructureId, schoolCode]);

  const structureViewExams = useMemo(() => {
    if (activeStructureTerm === 'unassigned') return exams.filter((e) => !e.term_id);
    return exams.filter((e) => String(e.term_id || '') === activeStructureTerm);
  }, [activeStructureTerm, exams]);
  const selectedStructureTerm = useMemo(
    () => structureTerms.find((t) => String(t.id) === activeStructureTerm) || null,
    [structureTerms, activeStructureTerm]
  );

  const handleDeleteExam = async (exam: Exam) => {
    const name = exam.exam_name?.trim() || 'this examination';
    if (
      !confirm(
        `Are you sure you want to delete "${name}"?\n\nThis will remove the exam and related marks, schedules, and mappings. This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      setDeletingExamId(exam.id);
      let performedBy = '';
      try {
        const raw = typeof window !== 'undefined' ? sessionStorage.getItem('staff') : null;
        const staff = raw ? (JSON.parse(raw) as { id?: string }) : null;
        if (staff?.id) performedBy = String(staff.id);
      } catch {
        /* ignore */
      }
      const qs = new URLSearchParams({ school_code: schoolCode });
      if (performedBy) qs.set('performed_by_staff_id', performedBy);
      const res = await fetch(`/api/examinations/${exam.id}?${qs.toString()}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(typeof data.error === 'string' ? data.error : 'Failed to delete examination');
        return;
      }
      await fetchExams();
    } catch (e) {
      console.error(e);
      alert('Failed to delete examination. Please try again.');
    } finally {
      setDeletingExamId(null);
    }
  };

  const upcomingExams = exams.filter(e => getExamStatus(e) === 'upcoming');
  const ongoingExams = exams.filter(e => getExamStatus(e) === 'ongoing');
  const completedExams = exams.filter(e => getExamStatus(e) === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A7A95] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5A7A95] font-medium">Loading examinations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
        
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Examination Dashboard</h1>
            <p className="text-gray-600">View all examinations - previous, ongoing, and upcoming</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/dashboard/${schoolCode}/examinations/create`)}>
          <FileText size={18} className="mr-2" />
          Create New Exam
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Exams</p>
              <p className="text-3xl font-bold text-gray-900">{exams.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Upcoming</p>
              <p className="text-3xl font-bold text-blue-600">{upcomingExams.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ongoing</p>
              <p className="text-3xl font-bold text-green-600">{ongoingExams.length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="text-green-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-gray-600">{completedExams.length}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <BookOpen className="text-gray-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by exam name or academic year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A95] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Terms</option>
              <option value="unassigned">No Term Assigned</option>
              {mergedTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.serial ? `${t.serial}. ` : ''}{t.name}
                </option>
              ))}
            </select>
            {(['all', 'upcoming', 'ongoing', 'completed'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === filterOption
                    ? 'bg-[#5A7A95] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Exams List */}
      {filteredExams.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg mb-2">No examinations found</p>
            <p className="text-gray-500 text-sm mb-6">
              {searchQuery || filter !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Create your first examination to get started'}
            </p>
            {!searchQuery && filter === 'all' && (
              <Button onClick={() => router.push(`/dashboard/${schoolCode}/examinations/create`)}>
                <FileText size={18} className="mr-2" />
                Create Examination
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => {
            const examStatus = getExamStatus(exam);
            const examTerm =
              exam.term_id != null
                ? terms.find((t) => String(t.id) === String(exam.term_id))
                : undefined;
            const examStructureName =
              examTerm && examTerm.structure_id
                ? structures.find((s) => String(s.id) === String(examTerm.structure_id))?.name
                : undefined;
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/${schoolCode}/examinations/${exam.id}`)}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{exam.exam_name}</h3>
                        <p className="text-sm text-gray-600">{exam.academic_year}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(examStatus)}`}>
                        {examStatus.charAt(0).toUpperCase() + examStatus.slice(1)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="font-medium">Term:</span>
                        <span>
                          {exam.term_id
                            ? termNameById.get(String(exam.term_id)) || (exam.term?.name ? `${exam.term.serial ? `${exam.term.serial}. ` : ''}${exam.term.name}` : 'No Term Assigned')
                            : 'No Term Assigned'}
                        </span>
                      </div>
                      {examStructureName && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="font-medium">Structure:</span>
                          <span>{examStructureName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={16} className="text-gray-500" />
                        <span>
                          {new Date(exam.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })} - {new Date(exam.end_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      {exam.class_mappings && exam.class_mappings.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Users size={16} className="text-gray-500" />
                          <span>
                            {exam.class_mappings.length} Class{exam.class_mappings.length !== 1 ? 'es' : ''}
                          </span>
                        </div>
                      )}

                      {exam.subject_mappings && exam.subject_mappings.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <BookOpen size={16} className="text-gray-500" />
                          <span>
                            {exam.subject_mappings.length} Subject{exam.subject_mappings.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/${schoolCode}/examinations/${exam.id}`);
                          }}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                          disabled={deletingExamId === exam.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteExam(exam);
                          }}
                          title="Delete examination"
                        >
                          {deletingExamId === exam.id ? (
                            <span className="text-xs px-1">…</span>
                          ) : (
                            <>
                              <Trash2 size={14} className="mr-1 inline" aria-hidden />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Integrated Exam Structure View */}
      <Card className="p-4 md:p-6 border border-violet-100 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Exam Structure, Terms & Schedule</h2>
          <p className="text-sm text-gray-500">Structure-first planning and live exam visibility</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <Card className="p-3 border border-slate-200 rounded-xl">
            <h3 className="font-semibold mb-2 text-slate-900">Structures</h3>
            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {structures.map((structure) => (
                <button
                  key={structure.id}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition ${
                    activeStructureId === structure.id
                      ? 'bg-violet-50 border-violet-300 text-violet-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-violet-200'
                  }`}
                  onClick={() => setActiveStructureId(structure.id)}
                >
                  <p className="font-medium">{structure.name}</p>
                </button>
              ))}
              {structures.length === 0 ? <p className="text-sm text-slate-500">No structures found.</p> : null}
            </div>
          </Card>

          <Card className="p-3 border border-slate-200 rounded-xl">
            <h3 className="font-semibold mb-2 text-slate-900">Terms in Structure</h3>
            <div className="space-y-2">
              {loadingStructureDetail ? (
                <p className="text-sm text-slate-500">Loading terms...</p>
              ) : structureTerms.length === 0 ? (
                <p className="text-sm text-slate-500">No terms in selected structure.</p>
              ) : null}
              {structureTerms.map((term) => (
                <button
                  key={term.id}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                    activeStructureTerm === String(term.id)
                      ? 'bg-violet-50 border-violet-300'
                      : 'bg-slate-50 border-slate-200 hover:border-violet-200'
                  }`}
                  onClick={() => setActiveStructureTerm(String(term.id))}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{term.serial ? `${term.serial}. ` : ''}{term.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200">
                      {(term.exams || []).length} exams
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <div className="xl:col-span-2 space-y-3">
            <Card className="p-4 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="font-semibold text-slate-900">
                  {selectedStructureTerm
                    ? `${selectedStructureTerm.serial ? `${selectedStructureTerm.serial}. ` : ''}${selectedStructureTerm.name}`
                    : 'Select a term'}
                </h3>
                {selectedStructureTerm ? (
                  <span className="text-xs px-2 py-1 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                    {(selectedStructureTerm.exams || []).length} template exam(s)
                  </span>
                ) : null}
              </div>
              {selectedStructureTerm && (selectedStructureTerm.exams || []).length > 0 ? (
                <div className="space-y-2">
                  {(selectedStructureTerm.exams || []).map((ex, idx) => (
                    <div key={`${ex.exam_name}-${idx}`} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-sm text-slate-800">{ex.serial ? `${ex.serial}. ` : ''}{ex.exam_name}</p>
                      <span className="text-xs text-slate-600">{Number(ex.weightage || 0).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No exam templates under this term.</p>
              )}
            </Card>

            <Card className="p-4 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="font-semibold text-slate-900">Created Examinations in this Term</h4>
                <button
                  className="text-xs px-2 py-1 rounded-md border border-slate-200 hover:border-violet-200"
                  onClick={() => setActiveStructureTerm('unassigned')}
                >
                  View Unassigned
                </button>
              </div>
              <div className="space-y-3">
                {structureViewExams.map((exam) => (
                  <div key={`structure-${exam.id}`} className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">{exam.exam_name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(getExamStatus(exam))}`}>
                        {getExamStatus(exam)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {(exam.subject_mappings || []).length} subject(s), {(exam.class_mappings || []).length} class mapping(s)
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {structureViewExams.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {activeStructureTerm === 'unassigned' ? 'No unassigned exams.' : 'No created examinations for this term yet.'}
                  </p>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
