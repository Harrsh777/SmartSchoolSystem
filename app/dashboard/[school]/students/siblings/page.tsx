'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, UsersRound, CheckCircle2 } from 'lucide-react';
import type { Student } from '@/lib/supabase';

interface SiblingGroup {
  id: string;
  students: Student[];
  matchCriteria: string[];
}

export default function StudentSiblingsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [siblingGroups, setSiblingGroups] = useState<SiblingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (students.length > 0) {
      findSiblings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Fetch all students regardless of status for sibling matching
      const response = await fetch(`/api/students?school_code=${schoolCode}&status=all`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStudents(result.data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const findSiblings = () => {
    setMatching(true);

    const normalizePhone = (value: string) => getString(value).replace(/\D/g, '').trim();
    const normalizeEmail = (value: string) => getString(value).toLowerCase().trim();

    // Collect for each student all parent contacts (father, mother, parent/guardian)
    const contactToStudentIds = new Map<string, Set<string>>();

    const addContact = (key: string, studentId: string) => {
      if (!key) return;
      if (key.startsWith('p_') && key.length < 10) return; // phone key "p_" + at least 8 digits
      if (!contactToStudentIds.has(key)) contactToStudentIds.set(key, new Set());
      contactToStudentIds.get(key)!.add(studentId);
    };

    students.forEach((student) => {
      const id = student.id as string;
      const fatherPhone = normalizePhone(getString(student.father_contact));
      const motherPhone = normalizePhone(getString(student.mother_contact));
      const parentPhone = normalizePhone(getString(student.parent_phone));
      const parentEmail = normalizeEmail(getString(student.parent_email));

      if (fatherPhone.length >= 8) addContact(`p_${fatherPhone}`, id);
      if (motherPhone.length >= 8) addContact(`p_${motherPhone}`, id);
      if (parentPhone.length >= 8) addContact(`p_${parentPhone}`, id);
      if (parentEmail) addContact(`e_${parentEmail}`, id);
    });

    // Union-Find: merge students that share any contact
    const parent = new Map<string, string>();
    const root = (id: string): string => {
      if (!parent.has(id)) parent.set(id, id);
      const p = parent.get(id)!;
      if (p === id) return id;
      const r = root(p);
      parent.set(id, r);
      return r;
    };
    const union = (a: string, b: string) => {
      const ra = root(a);
      const rb = root(b);
      if (ra !== rb) parent.set(ra, rb);
    };

    contactToStudentIds.forEach((ids) => {
      const arr = Array.from(ids);
      for (let i = 1; i < arr.length; i++) union(arr[0], arr[i]);
    });

    // Group students by root
    const rootToStudents = new Map<string, Student[]>();
    students.forEach((s) => {
      const id = s.id as string;
      const r = root(id);
      if (!rootToStudents.has(r)) rootToStudents.set(r, []);
      rootToStudents.get(r)!.push(s);
    });

    const studentToContacts = new Map<string, string[]>();
    students.forEach((s) => {
      const id = s.id as string;
      const contacts: string[] = [];
      const fp = normalizePhone(getString(s.father_contact));
      const mp = normalizePhone(getString(s.mother_contact));
      const pp = normalizePhone(getString(s.parent_phone));
      const pe = normalizeEmail(getString(s.parent_email));
      if (fp && fp.length >= 8) contacts.push('Father\'s contact');
      if (mp && mp.length >= 8) contacts.push('Mother\'s contact');
      if (pp && pp.length >= 8) contacts.push('Parent/Guardian phone');
      if (pe) contacts.push('Parent/Guardian email');
      studentToContacts.set(id, [...new Set(contacts)]);
    });

    const siblingGroupsArray = Array.from(rootToStudents.values())
      .filter((group) => group.length >= 2)
      .map((group, index) => {
        const criteria = new Set<string>();
        group.forEach((s) => studentToContacts.get(s.id as string)?.forEach((c) => criteria.add(c)));
        return {
          id: `sibling-group-${index + 1}`,
          students: group,
          matchCriteria: Array.from(criteria),
        };
      });

    setSiblingGroups(siblingGroupsArray);
    setMatching(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <UsersRound size={32} />
            Student Siblings List
          </h1>
          <p className="text-gray-600">Siblings are matched by shared Father&apos;s contact, Mother&apos;s contact, or Parent/Guardian phone or email</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={findSiblings}
            disabled={matching}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {matching ? 'Matching...' : 'Find Siblings'}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/students/directory`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </div>

      {siblingGroups.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <UsersRound className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 mb-2">No sibling groups found</p>
            <p className="text-sm text-gray-500 max-w-lg mx-auto">
              Siblings are identified by <strong>shared parent contact</strong>: same Father&apos;s contact, Mother&apos;s contact, or Parent/Guardian phone/email. Students with the same number or email in any of these fields are grouped together. Click &quot;Find Siblings&quot; to run the match.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {siblingGroups.map((group, index) => (
            <Card key={group.id}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Sibling Group {index + 1}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Matched by: {group.matchCriteria.join(' and ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span>{group.students.length} siblings</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Admission ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Father Contact</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Mother Contact</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Parent/Guardian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.students.map((student) => {
                      const admissionNo = getString(student.admission_no) || 'N/A';
                      const studentName = getString(student.student_name) || 'N/A';
                      const className = getString(student.class) || 'N/A';
                      const section = getString(student.section) || 'N/A';
                      const fatherContact = getString(student.father_contact) || '—';
                      const motherContact = getString(student.mother_contact) || '—';
                      const parentInfo = [getString(student.parent_name), getString(student.parent_phone), getString(student.parent_email)].filter(Boolean).join(' · ') || '—';
                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {admissionNo}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{studentName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{className}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{section}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{fatherContact}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{motherContact}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{parentInfo}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

