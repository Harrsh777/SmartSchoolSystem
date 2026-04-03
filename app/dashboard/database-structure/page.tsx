'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import DatabaseStructurePanel from '@/components/database-structure/DatabaseStructurePanel';

export default function DatabaseStructurePage() {
  return (
    <div className="min-h-screen bg-[#F5EFEB] dark:bg-[#0f172a]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 dark:text-cyan-400 hover:underline"
          >
            <ArrowLeft size={18} />
            Back to Admin
          </Link>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-sm text-slate-600 dark:text-slate-400">Standalone schema viewer</span>
        </div>
      </header>
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DatabaseStructurePanel />
      </main>
    </div>
  );
}
