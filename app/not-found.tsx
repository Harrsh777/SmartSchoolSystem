'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { 
  Home, 
  ArrowLeft, 
  Search, 
  DollarSign, 
  Calendar, 
  Settings,
  BookOpen,
  GraduationCap,
  FileText,
  MessageSquare,
  HelpCircle
} from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    // Get school code and user type from sessionStorage
    const school = sessionStorage.getItem('school');
    const teacher = sessionStorage.getItem('teacher');
    
    if (teacher) {
      try {
        const teacherData = JSON.parse(teacher);
        setSchoolCode(teacherData.school_code);
        setIsTeacher(true);
      } catch {
        // Ignore
      }
    } else if (school) {
      try {
        const schoolData = JSON.parse(school);
        setSchoolCode(schoolData.school_code);
      } catch {
        // Ignore
      }
    }
  }, []);

  const basePath = isTeacher ? '/teacher/dashboard' : `/dashboard/${schoolCode || 'SCH001'}`;

  const suggestedLinks = [
    { label: 'Dashboard', icon: Home, path: basePath, color: 'bg-blue-500' },
    { label: 'Fees', icon: DollarSign, path: `${basePath}/fees`, color: 'bg-green-500' },
    { label: 'Students', icon: GraduationCap, path: `${basePath}/students`, color: 'bg-purple-500' },
    { label: 'Attendance', icon: Calendar, path: `${basePath}/attendance`, color: 'bg-orange-500' },
    { label: 'Classes', icon: BookOpen, path: `${basePath}/classes`, color: 'bg-indigo-500' },
    { label: 'Examinations', icon: FileText, path: `${basePath}/examinations`, color: 'bg-pink-500' },
    { label: 'Communication', icon: MessageSquare, path: `${basePath}/communication`, color: 'bg-teal-500' },
    { label: 'Settings', icon: Settings, path: `${basePath}/settings`, color: 'bg-gray-500' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results or filter suggested links
      const query = searchQuery.toLowerCase();
      const matchedLink = suggestedLinks.find(link => 
        link.label.toLowerCase().includes(query)
      );
      if (matchedLink) {
        router.push(matchedLink.path);
      } else {
        // Default to dashboard with search query
        router.push(`${basePath}?search=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg"
            >
              <HelpCircle className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-5xl font-bold">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                404
              </span>
            </h1>
            <h2 className="text-2xl font-semibold text-gray-800">
              Page Not Found
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>

          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6"
          >
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center justify-center gap-2">
                <Search className="w-5 h-5 text-blue-500" />
                Looking for something?
              </h3>
            </div>
            
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for pages, features, or modules..."
                className="w-full px-5 py-4 pl-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Search
              </button>
            </form>
          </motion.div>

          {/* Suggested Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">
              Quick Links
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {suggestedLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <Link
                      href={link.path}
                      className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all group"
                    >
                      <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                        {link.label}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4"
          >
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl"
            >
              <ArrowLeft size={18} />
              Go Back
            </Button>
            <Button
              onClick={() => router.push(basePath)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg"
            >
              <Home size={18} />
              Go to Dashboard
            </Button>
          </motion.div>

          {/* Help Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-sm text-gray-500"
          >
            Need help? Contact your administrator or check the{' '}
            <Link href={`${basePath}/settings`} className="text-blue-600 hover:underline">
              settings
            </Link>{' '}
            page.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
