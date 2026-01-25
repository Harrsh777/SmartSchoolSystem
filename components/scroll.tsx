'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

const BRAND_GRADIENT =
  'bg-gradient-to-r from-[#667EEA] via-[#764BA2] to-[#F093FB]';

const FEATURES = [
  {
    label: 'Smart Attendance',
    title: 'Attendance that runs itself',
    desc: 'Automated student & staff attendance with instant visibility.',
    points: ['Period-wise tracking', 'Instant alerts', 'Exportable reports'],
    image:
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
  },
  {
    label: 'Digital Enrollment',
    title: 'Paperless student onboarding',
    desc: 'Admit students faster with zero paperwork.',
    points: ['Online forms', 'Bulk imports', 'Auto roll numbers'],
    image:
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80',
  },
  {
    label: 'Virtual Learning',
    title: 'Modern classroom experience',
    desc: 'Homework, diary, and digital content in one place.',
    points: ['Digital diary', 'Content sharing', 'Teacher interaction'],
    image:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80',
  },
  {
    label: 'Digital Finance',
    title: 'Smart fees & accounting',
    desc: 'Secure, digital, and audit-ready fee management.',
    points: ['Online payments', 'Late fee automation', 'Reports'],
    image:
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=80',
  },
  {
    label: 'Communication',
    title: 'Unified school communication',
    desc: 'One platform for parents, teachers, and admins.',
    points: ['SMS & email', 'Announcements', 'Emergency alerts'],
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80',
  },
  {
    label: 'Examinations',
    title: 'Exams made effortless',
    desc: 'Create exams, enter marks, generate report cards.',
    points: ['Grade scales', 'Report cards', 'Analytics'],
    image:
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80',
  },
  
];

export default function FeaturesSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const i = setInterval(() => {
      setActive((p) => (p + 1) % FEATURES.length);
    }, 6000);
    return () => clearInterval(i);
  }, []);

  const f = FEATURES[active];

  return (
    <section className="w-full py-14 bg-gradient-to-b from-white to-[#667EEA]/5">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-[#667EEA] to-[#764BA2] bg-clip-text text-transparent">
            One ERP. Every School Function.
          </h2>
          <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
            Designed to simplify operations, improve transparency, and scale effortlessly.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {FEATURES.map((item, i) => (
            <button
              key={item.label}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                active === i
                  ? `${BRAND_GRADIENT} text-white shadow`
                  : 'bg-white text-gray-700 border hover:border-[#667EEA]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-white rounded-3xl shadow-xl p-8"
          >
            {/* Text */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                {f.title}
              </h3>
              <p className="text-gray-600 mb-6">{f.desc}</p>

              <ul className="space-y-3">
                {f.points.map((p) => (
                  <li key={p} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#667EEA]/15 flex items-center justify-center">
                      <Check size={14} className="text-[#667EEA]" />
                    </span>
                    <span className="text-gray-800 font-medium">{p}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => {
                  const element = document.querySelector('#pricing');
                  if (element) {
                    const offset = 80;
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                  }
                }}
                className="mt-8 px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-[#667EEA] via-[#764BA2] to-[#F5576C] hover:opacity-90 transition cursor-pointer"
              >
                Explore this feature →
              </button>
            </div>

            {/* Image */}
            <div className="relative w-full h-[280px] rounded-2xl overflow-hidden">
              <Image
                src={f.image}
                alt={f.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
