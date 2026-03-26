'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type TermRow = { id: string; name: string; serial?: number };
type ExamRow = {
  id: string;
  exam_name?: string;
  name?: string;
  term_id?: string | null;
  term?: { id?: string; name?: string; serial?: number } | null;
  subject_mappings?: Array<{ subject?: { name?: string }; max_marks?: number }>;
  exam_schedules?: Array<{ exam_date?: string; start_time?: string; end_time?: string }>;
};

export default function ExamStructurePage({ params }: { params: Promise<{ school: string }> }) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [activeTerm, setActiveTerm] = useState<string>('unassigned');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const [tRes, eRes] = await Promise.all([
          fetch(`/api/terms?school_code=${schoolCode}`),
          fetch(`/api/examinations/v2/list?school_code=${schoolCode}`),
        ]);
        const [tJson, eJson] = await Promise.all([tRes.json(), eRes.json()]);
        const apiTerms = ((tJson.data || []) as TermRow[]).map((t) => ({
          id: String(t.id),
          name: String(t.name || ''),
          serial: Number(t.serial || 0),
        }));
        const examRows = (eJson.data || []) as ExamRow[];
        const termsFromExams = examRows
          .map((e) => e.term)
          .filter(Boolean)
          .map((t) => ({
            id: String(t?.id || ''),
            name: String(t?.name || ''),
            serial: Number(t?.serial || 0),
          }))
          .filter((t) => t.id && t.name);
        const mergedMap = new Map<string, TermRow>();
        [...apiTerms, ...termsFromExams].forEach((t) => {
          if (!mergedMap.has(t.id)) mergedMap.set(t.id, t);
        });
        const mergedTerms = Array.from(mergedMap.values()).sort(
          (a, b) => Number(a.serial || 0) - Number(b.serial || 0)
        );
        setTerms(mergedTerms);
        setExams(examRows);
        if (mergedTerms.length > 0) {
          setActiveTerm(String(mergedTerms[0].id));
        } else {
          setActiveTerm('unassigned');
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Failed to load exam structure');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [schoolCode]);

  const examsInTerm = useMemo(() => {
    if (activeTerm === 'unassigned') {
      return exams.filter((e) => !e.term_id);
    }
    return exams.filter((e) => String(e.term_id || '') === activeTerm);
  }, [activeTerm, exams]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exam Structure View</h1>
        <Button onClick={() => router.push(`/dashboard/${schoolCode}/examinations/dashboard`)}>Back</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-3">
          <h2 className="font-semibold mb-2">Terms</h2>
          <div className="space-y-2">
            <button
              className={`w-full text-left px-3 py-2 rounded ${activeTerm === 'unassigned' ? 'bg-indigo-100' : 'bg-gray-50'}`}
              onClick={() => setActiveTerm('unassigned')}
            >
              No Term Assigned
            </button>
            {terms.map((term) => (
                <button
                  key={term.id}
                  className={`w-full text-left px-3 py-2 rounded ${activeTerm === String(term.id) ? 'bg-indigo-100' : 'bg-gray-50'}`}
                  onClick={() => setActiveTerm(String(term.id))}
                >
                  {term.serial ? `${term.serial}. ` : ''}{term.name}
                </button>
              ))}
          </div>
        </Card>

        <div className="md:col-span-2 space-y-3">
          {errorMsg ? <Card className="p-4 text-sm text-red-600">{errorMsg}</Card> : null}
          {!loading && terms.length === 0 ? (
            <Card className="p-4 text-sm text-gray-500">
              No terms found. Create terms from Add Term Structure and map examinations to those terms.
            </Card>
          ) : null}
          {loading ? <Card className="p-4 text-sm text-gray-500">Loading exam structure...</Card> : null}
          {examsInTerm.map((exam) => (
            <Card key={exam.id} className="p-4">
              <h3 className="font-semibold">{exam.exam_name || exam.name || 'Exam'}</h3>
              <div className="mt-2 text-sm text-gray-600">
                {(exam.subject_mappings || []).length > 0 ? (
                  <ul className="space-y-1">
                    {(exam.subject_mappings || []).map((s, i) => (
                      <li key={i}>
                        {(s.subject?.name || 'Subject')} - Max: {s.max_marks || 0}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No subjects mapped.</p>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {(exam.exam_schedules || []).map((sc, i) => (
                  <div key={i}>
                    {sc.exam_date || '-'} {sc.start_time || '-'} to {sc.end_time || '-'}
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {examsInTerm.length === 0 ? <Card className="p-4 text-sm text-gray-500">No exams in this term.</Card> : null}
        </div>
      </div>
    </div>
  );
}

