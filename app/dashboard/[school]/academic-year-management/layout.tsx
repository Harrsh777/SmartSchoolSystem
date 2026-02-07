'use client';

import { use } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function AcademicYearManagementLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const pathname = usePathname();
  const base = schoolCode ? `/dashboard/${schoolCode}/academic-year-management` : '';

  const segments = pathname?.split('/').filter(Boolean) || [];
  const isSubPage = segments.includes('year-setup') || segments.includes('promotion-engine') || segments.includes('year-closure') || segments.includes('audit-logs');
  const subPageName = segments[segments.length - 1];
  const breadcrumbLabel = subPageName === 'year-setup' ? 'Year Setup' : subPageName === 'promotion-engine' ? 'Promotion Engine' : subPageName === 'year-closure' ? 'Year Closure' : subPageName === 'audit-logs' ? 'Audit Logs' : null;

  return (
    <div className="space-y-4">
      {isSubPage && breadcrumbLabel && (
        <nav className="flex items-center gap-2 text-sm text-[#64748B]">
          <Link href={base} className="hover:text-[#2F6FED] transition-colors">
            Academic Year Management
          </Link>
          <ChevronRight size={14} className="opacity-60" />
          <span className="text-[#0F172A] font-medium">{breadcrumbLabel}</span>
        </nav>
      )}
      {children}
    </div>
  );
}
