'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Award, TrendingUp, BarChart3, Loader2 } from 'lucide-react';

interface GradeScale {
  id: string;
  grade: string;
  min_marks: number;
  max_marks: number;
  grade_point: number;
  description?: string;
  display_order?: number;
}

export default function GradeScalePage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teacher, setTeacher] = useState<{ school_code: string } | null>(null);
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchGradeScales(teacherData.school_code);
    } else {
      setError('Teacher information not found');
      setLoading(false);
    }
  }, []);

  const fetchGradeScales = async (schoolCode: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/grade-scales?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        // Sort by display_order (descending) or grade_point (descending) as fallback
        const sorted = result.data.sort((a: GradeScale, b: GradeScale) => {
          if (a.display_order !== undefined && b.display_order !== undefined) {
            return b.display_order - a.display_order;
          }
          return b.grade_point - a.grade_point;
        });
        setGradeScales(sorted);
      } else {
        if (result.code === 'TABLE_NOT_FOUND') {
          setError('Grade scales table not found. Please contact the administrator to set up grade scales.');
        } else {
          setError(result.details || result.error || 'Failed to load grade scales');
        }
      }
    } catch (err) {
      console.error('Error fetching grade scales:', err);
      setError('Failed to load grade scales. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate grade distribution statistics
  const calculateGradeDistribution = () => {
    if (gradeScales.length === 0) return null;

    // Group grades into categories
    const aToB = gradeScales.filter(gs => {
      const grade = gs.grade.toUpperCase();
      return grade.startsWith('A') || grade.startsWith('B');
    }).length;

    const cToD = gradeScales.filter(gs => {
      const grade = gs.grade.toUpperCase();
      return grade.startsWith('C') || grade.startsWith('D');
    }).length;

    const belowE = gradeScales.filter(gs => {
      const grade = gs.grade.toUpperCase();
      return grade.startsWith('E') || grade.startsWith('F');
    }).length;

    return { aToB, cToD, belowE, total: gradeScales.length };
  };

  const distribution = calculateGradeDistribution();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#ECEDED]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#1e3a8a] mx-auto mb-4" />
          <p className="text-gray-600">Loading grade scales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a8a] mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <Award className="text-white" size={24} />
            </div>
            Grade Scale
          </h1>
          <p className="text-[#64748B]">View grade scales configured for examinations</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/teacher/dashboard')}
          className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {error && (
        <Card className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
          </div>
        </Card>
      )}

      {!error && gradeScales.length === 0 && (
        <Card className="p-6">
          <div className="text-center text-gray-600">
            <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">No Grade Scales Found</p>
            <p>Grade scales have not been configured yet. Please contact the administrator.</p>
          </div>
        </Card>
      )}

      {!error && gradeScales.length > 0 && (
        <>
          {/* Grade Scales Table */}
          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Grade</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Min Marks</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Max Marks</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Grade Point</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {gradeScales.map((scale, index) => (
                    <motion.tr
                      key={scale.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                          {scale.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{scale.min_marks}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{scale.max_marks}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{scale.grade_point}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{scale.description || '-'}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Grade Distribution Statistics */}
          {distribution && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">A-B Grades</p>
                    <p className="text-2xl font-bold text-[#1e3a8a]">
                      {distribution.aToB} {distribution.aToB === 1 ? 'Grade' : 'Grades'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {distribution.total > 0 ? Math.round((distribution.aToB / distribution.total) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="text-blue-600" size={24} />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">C-D Grades</p>
                    <p className="text-2xl font-bold text-[#1e3a8a]">
                      {distribution.cToD} {distribution.cToD === 1 ? 'Grade' : 'Grades'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {distribution.total > 0 ? Math.round((distribution.cToD / distribution.total) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <BarChart3 className="text-yellow-600" size={24} />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Below E Grades</p>
                    <p className="text-2xl font-bold text-[#1e3a8a]">
                      {distribution.belowE} {distribution.belowE === 1 ? 'Grade' : 'Grades'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {distribution.total > 0 ? Math.round((distribution.belowE / distribution.total) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Award className="text-red-600" size={24} />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
