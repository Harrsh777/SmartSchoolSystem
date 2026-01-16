'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import ModuleGuideModal from './ModuleGuideModal';
import { getGuideByPath } from '@/lib/module-guides';

export default function ModuleGuideButton() {
  const pathname = usePathname();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const guide = getGuideByPath(pathname);

  if (!guide) return null;

  return (
    <>
      <Button
        onClick={() => setIsGuideOpen(true)}
        variant="outline"
        className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10 dark:border-[#6B9BB8]/30 dark:text-[#6B9BB8] dark:hover:bg-[#6B9BB8]/10"
      >
        <HelpCircle size={18} className="mr-2" />
        Guide
      </Button>

      <ModuleGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        moduleName={guide.moduleName}
        moduleIcon={guide.moduleIcon}
        steps={guide.steps}
        description={guide.description}
      />
    </>
  );
}
