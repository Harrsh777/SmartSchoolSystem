'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { Bus, Settings, Car, Route, Users } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function TransportPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const transportSections = [
    {
      id: 'dashboard',
      title: 'Transport Dashboard',
      description: 'Overview of all vehicles, stops, routes, and students',
      icon: Bus,
      path: `/dashboard/${schoolCode}/transport/dashboard`,
      color: 'from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3]',
    },
    {
      id: 'vehicles',
      title: 'Vehicles',
      description: 'Manage transport vehicles and their details',
      icon: Car,
      path: `/dashboard/${schoolCode}/transport/vehicles`,
      color: 'from-[#5A7A95] to-[#6B9BB8]',
    },
    {
      id: 'stops',
      title: 'Stops',
      description: 'Create and manage pickup and drop locations',
      icon: Settings,
      path: `/dashboard/${schoolCode}/transport/stops`,
      color: 'from-[#6B9BB8] to-[#7DB5D3]',
    },
    {
      id: 'routes',
      title: 'Routes',
      description: 'Create and manage transport routes',
      icon: Route,
      path: `/dashboard/${schoolCode}/transport/routes`,
      color: 'from-[#567C8D] to-[#5A7A95]',
    },
    {
      id: 'route-students',
      title: 'Route Students',
      description: 'Assign students to transport routes',
      icon: Users,
      path: `/dashboard/${schoolCode}/transport/route-students`,
      color: 'from-[#5A7A95] to-[#6B9BB8]',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
                <Bus className="text-white" size={28} />
              </div>
              Transport Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage transportation system for {schoolCode}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Transport Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {transportSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-transparent hover:border-[#5A7A95]/30 dark:hover:border-[#6B9BB8]/30"
                  onClick={() => router.push(section.path)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-4 rounded-xl bg-gradient-to-br ${section.color} shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="text-white" size={32} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-[#5A7A95] dark:group-hover:text-[#6B9BB8] transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        {section.description}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="group-hover:border-[#5A7A95] dark:group-hover:border-[#6B9BB8] group-hover:text-[#5A7A95] dark:group-hover:text-[#6B9BB8]"
                      >
                        Open →
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
