'use client';

import { use } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { CalendarRange, Play, Lock, FileText, ChevronRight, Info } from 'lucide-react';

const SUB_MODULES = [
  {
    label: 'Year Setup',
    path: 'year-setup',
    icon: CalendarRange,
    description: 'Create and list academic years. Add an upcoming year (e.g. 2026–2027), set start/end dates. No students or classes are changed.',
  },
  {
    label: 'Promotion Engine',
    path: 'promotion-engine',
    icon: Play,
    description: 'Define promotion rules (from class → to class, on pass/fail). Run a dry run to fetch all students in the source year, preview actions, override per student, then execute. Creates new enrollment rows only; history is never overwritten.',
  },
  {
    label: 'Year Closure',
    path: 'year-closure',
    icon: Lock,
    description: 'Close the previous academic year and activate the new one. Updates the school’s current academic year. Closed year becomes read-only for marks, attendance, and fees.',
  },
  {
    label: 'Audit Logs',
    path: 'audit-logs',
    icon: FileText,
    description: 'View who ran promotion or year closure and when. Full audit trail for compliance.',
  },
];

export default function AcademicYearManagementOverviewPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const base = schoolCode ? `/dashboard/${schoolCode}/academic-year-management` : '';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A]">Academic Year Management</h1>
          <p className="text-sm text-[#64748B] mt-1">Year setup, promotion engine, year closure, and audit logs (admin only).</p>
        </div>
        <div className="sm:w-80 flex-shrink-0">
          <div className="p-4 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC]">
            <div className="flex items-center gap-2 mb-2 text-[#0F172A] font-medium text-sm">
              <Info size={16} className="text-[#2F6FED]" />
              How this works
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              <strong>1. Year Setup</strong> — Create the next academic year (e.g. 2026–2027) so it appears in dropdowns. No student or class data is changed.
              <br /><br />
              <strong>2. Promotion Engine</strong> — Set rules (class → next class, pass/fail actions). Run <em>Dry run</em> to load all active students for the source year and see proposed promote/detain/graduate. Override per student if needed, then <em>Execute</em> to create new enrollment rows and update students for the target year. Old data is never overwritten.
              <br /><br />
              <strong>3. Year Closure</strong> — After promotion, close the previous year and activate the new one. This sets the school’s current academic year and marks the old year read-only.
              <br /><br />
              <strong>4. Audit Logs</strong> — View who ran promotion or closure and when, for compliance.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {SUB_MODULES.map(({ label, path, icon: Icon, description }) => (
          <Link key={path} href={`${base}/${path}`}>
            <Card className="p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg shadow-sm hover:border-[#2F6FED]/40 transition-colors h-full">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={20} className="text-[#2F6FED] flex-shrink-0" />
                    <h2 className="text-sm font-semibold text-[#0F172A]">{label}</h2>
                  </div>
                  <p className="text-xs text-[#64748B]">{description}</p>
                </div>
                <ChevronRight size={18} className="text-[#64748B] flex-shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
