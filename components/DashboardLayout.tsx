'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Users, 
  UserCheck, 
  BookOpen, 
  Calendar, 
  FileText, 
  DollarSign, 
  Library, 
  Bus, 
  MessageSquare, 
  Settings,
  Menu,
  X,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardLayoutProps {
  children: ReactNode;
  schoolName: string;
}

const menuItems = [
  { icon: Home, label: 'Home', path: '' },
  { icon: Users, label: 'Students', path: '/students' },
  { icon: UserCheck, label: 'Staff', path: '/staff' },
  { icon: BookOpen, label: 'Classes', path: '/classes' },
  { icon: Calendar, label: 'Attendance', path: '/attendance' },
  { icon: CalendarDays, label: 'Calendars', path: '/calendars' },
  { icon: FileText, label: 'Examinations', path: '/examinations' },
  { icon: DollarSign, label: 'Fees', path: '/fees' },
  { icon: Library, label: 'Library', path: '/library' },
  { icon: Bus, label: 'Transport', path: '/transport' },
  { icon: MessageSquare, label: 'Communication', path: '/communication' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function DashboardLayout({ children, schoolName }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const basePath = pathname.split('/').slice(0, 3).join('/');
  
  const isActive = (path: string) => {
    if (path === '') {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(`${basePath}${path}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <Link href="/" className="text-xl font-bold text-black">
                Edu<span className="text-gray-600">-Yan</span>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-gray-300" />
              <span className="hidden sm:block text-gray-700 font-medium">{schoolName}</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-sm text-gray-600 hover:text-black">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {(sidebarOpen || isDesktop) && (
            <>
              {/* Mobile Overlay */}
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                  className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                />
              )}

              {/* Sidebar */}
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                className="fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-70 bg-white border-r border-gray-200 z-50 lg:z-auto overflow-y-auto"
                style={{ width: '280px' }}
              >
                <nav className="p-4 space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.label}
                        href={`${basePath}${item.path}`}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          active
                            ? 'bg-black text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

