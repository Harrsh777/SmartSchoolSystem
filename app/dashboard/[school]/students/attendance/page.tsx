'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Calendar } from 'lucide-react';

export default function StudentAttendancePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Calendar size={32} />
            Student Attendance
          </h1>
          <p className="text-gray-600">View and manage student attendance records</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/students/directory`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Student attendance feature coming soon...</p>
          <p className="text-sm text-gray-500">
            This will display student attendance records, statistics, and allow marking attendance.
          </p>
        </div>
      </Card>
    </div>
  );
}

