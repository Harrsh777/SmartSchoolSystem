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
    const groups: Map<string, SiblingGroup> = new Map();

    // Group students by parent matching criteria
    students.forEach(student => {
      if (!student.parent_name || (!student.parent_phone && !student.parent_email)) {
        return; // Skip students without parent info
      }

      // Create a key based on parent name and contact info
      const parentName = student.parent_name.toLowerCase().trim();
      const parentPhone = student.parent_phone?.replace(/\D/g, '') || '';
      const parentEmail = student.parent_email?.toLowerCase().trim() || '';

      // Try to match by name + phone
      if (parentPhone) {
        const phoneKey = `${parentName}_${parentPhone}`;
        if (groups.has(phoneKey)) {
          groups.get(phoneKey)!.students.push(student);
          if (!groups.get(phoneKey)!.matchCriteria.includes('Phone')) {
            groups.get(phoneKey)!.matchCriteria.push('Phone');
          }
        } else {
          groups.set(phoneKey, {
            id: phoneKey,
            students: [student],
            matchCriteria: ['Phone'],
          });
        }
      }

      // Try to match by name + email
      if (parentEmail) {
        const emailKey = `${parentName}_${parentEmail}`;
        if (groups.has(emailKey)) {
          const existingGroup = groups.get(emailKey)!;
          // Check if student is not already in the group
          if (!existingGroup.students.some(s => s.id === student.id)) {
            existingGroup.students.push(student);
            if (!existingGroup.matchCriteria.includes('Email')) {
              existingGroup.matchCriteria.push('Email');
            }
          }
        } else {
          // Check if this student is already in a phone-based group
          const existingPhoneGroup = Array.from(groups.values()).find(g =>
            g.students.some(s => s.id === student.id)
          );

          if (existingPhoneGroup) {
            // Add email to match criteria
            if (!existingPhoneGroup.matchCriteria.includes('Email')) {
              existingPhoneGroup.matchCriteria.push('Email');
            }
          } else {
            groups.set(emailKey, {
              id: emailKey,
              students: [student],
              matchCriteria: ['Email'],
            });
          }
        }
      }
    });

    // Filter groups to only include those with 2+ students (actual siblings)
    const siblingGroupsArray = Array.from(groups.values())
      .filter(group => group.students.length >= 2)
      .map((group, index) => ({
        ...group,
        id: `sibling-group-${index + 1}`,
      }));

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
          <p className="text-gray-600">Identify and manage student siblings based on parent information</p>
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
            <p className="text-sm text-gray-500">
              Siblings are identified by matching parent name with phone number or email address.
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Parent Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Parent Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Parent Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {student.admission_no || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{student.student_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.class || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.section || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.parent_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.parent_phone || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.parent_email || 'N/A'}</td>
                      </tr>
                    ))}
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

