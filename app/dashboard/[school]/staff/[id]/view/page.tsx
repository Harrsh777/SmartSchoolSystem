'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  FileText,
  CreditCard,
  Info,
  CheckCircle2,
  Home,
} from 'lucide-react';
import type { Staff } from '@/lib/supabase';

type HouseIncharge = { id: string; house_name: string; house_color?: string | null };

export default function ViewStaffPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolCode, id: staffId } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [houseInchargeOf, setHouseInchargeOf] = useState<HouseIncharge[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'payroll' | 'documents'>('overview');

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, schoolCode]);

  useEffect(() => {
    if (!schoolCode || !staff?.id) return;
    fetch(`/api/institute/houses?school_code=${encodeURIComponent(schoolCode)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.data || !Array.isArray(data.data)) return;
        const incharge = data.data.filter(
          (h: { staff_incharge_id?: string | null }) => h.staff_incharge_id === staff.id
        );
        setHouseInchargeOf(incharge.map((h: { id: string; house_name: string; house_color?: string | null }) => ({ id: h.id, house_name: h.house_name, house_color: h.house_color })));
      })
      .catch(() => {});
  }, [schoolCode, staff?.id]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/staff/${staffId}?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setStaff(result.data);
      } else {
        router.push(`/dashboard/${schoolCode}/staff-management/directory`);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
      router.push(`/dashboard/${schoolCode}/staff-management/directory`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4" />
          <p className="text-gray-600">Loading staff details...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-4">Staff member not found</p>
          <Button onClick={() => router.push(`/dashboard/${schoolCode}/staff-management/directory`)}>
            Back to Staff Directory
          </Button>
        </div>
      </Card>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not provided';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStaffPhotoUrl = (s: Staff & { profile_photo_url?: string; image_url?: string }): string => {
    const url = s.photo_url ?? s.profile_photo_url ?? s.image_url;
    return typeof url === 'string' && url.trim() !== '' ? url.trim() : '';
  };

  const safeString = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return String(value);
  };

  const staffPhotoUrl = getStaffPhotoUrl(staff);
  const isActive = staff.is_active !== false;

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'attendance' as const, label: 'Attendance' },
    { id: 'payroll' as const, label: 'Payroll & Salary' },
    { id: 'documents' as const, label: 'Documents' },
  ];

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#f8fafc]">
      {/* Back + Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/staff-management/directory`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Staff Details</h1>
            <p className="text-sm text-gray-600">View complete staff information</p>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/${schoolCode}/staff/${staffId}/edit`)}
          className="bg-[#1e3a8a] hover:bg-[#2563eb] text-white"
        >
          Edit Staff
        </Button>
      </div>

      {/* Header card: profile photo + name + ACTIVE + meta + contact row */}
      <Card className="p-6 bg-white border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="relative shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
              {staffPhotoUrl ? (
                <>
                  <img
                    src={staffPhotoUrl}
                    alt={safeString(staff.full_name)}
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <span className="absolute inset-0 hidden w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6]">
                    {staff.full_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </>
              ) : (
                staff.full_name?.[0]?.toUpperCase() || '?'
              )}
            </div>
            {isActive && (
              <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                <CheckCircle2 size={14} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{safeString(staff.full_name)}</h2>
              <span
                className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold ${
                  isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              {safeString(staff.staff_id)}
              {staff.role ? ` • ${safeString(staff.role)}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
              {staff.designation ? (
                <span className="flex items-center gap-1.5">
                  <User size={16} className="text-[#1e3a8a]" />
                  {safeString(staff.designation)}
                </span>
              ) : null}
              {staff.email ? (
                <a
                  href={`mailto:${safeString(staff.email)}`}
                  className="flex items-center gap-1.5 text-[#1e3a8a] hover:underline"
                >
                  <Mail size={16} />
                  {safeString(staff.email)}
                </a>
              ) : null}
              {staff.phone ? (
                <span className="flex items-center gap-1.5">
                  <Phone size={16} className="text-[#1e3a8a]" />
                  {safeString(staff.phone)}
                </span>
              ) : null}
            </div>
            {houseInchargeOf.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Home size={16} className="text-[#1e3a8a] shrink-0" />
                <span className="text-sm text-gray-700">
                  House Incharge: {houseInchargeOf.map((h) => h.house_name).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card className="p-0 overflow-hidden border border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex gap-0 p-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-[#1e3a8a] border-b-2 border-[#1e3a8a]'
                    : 'text-gray-600 hover:text-[#1e3a8a] hover:bg-white/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-white">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card className="p-5 border border-gray-200 shadow-none">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Info size={18} className="text-[#1e3a8a]" />
                  Basic Information
                </h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Staff ID</dt>
                    <dd className="font-medium text-gray-900 mt-0.5">{safeString(staff.staff_id)}</dd>
                  </div>
                  {staff.employee_code ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Staff Code</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">{safeString(staff.employee_code)}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</dt>
                    <dd className="font-medium text-gray-900 mt-0.5">{safeString(staff.full_name)}</dd>
                  </div>
                  {staff.role ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">{safeString(staff.role)}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Joining</dt>
                    <dd className="font-medium text-gray-900 mt-0.5">
                      {formatDate(
                        typeof staff.date_of_joining === 'string' ? staff.date_of_joining : (staff as { date_of_joining?: string }).date_of_joining
                      )}
                    </dd>
                  </div>
                  {staff.gender ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">{safeString(staff.gender)}</dd>
                    </div>
                  ) : null}
                </dl>
              </Card>

              {/* Employment & Education */}
              <Card className="p-5 border border-gray-200 shadow-none">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase size={18} className="text-[#1e3a8a]" />
                  Employment & Education
                </h3>
                <dl className="space-y-3 text-sm">
                  {staff.employment_type ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employment Type</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">{safeString(staff.employment_type)}</dd>
                    </div>
                  ) : null}
                  {staff.qualification ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Qualification</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">{safeString(staff.qualification)}</dd>
                    </div>
                  ) : null}
                  {staff.experience_years !== null && staff.experience_years !== undefined ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Experience</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">
                        {typeof staff.experience_years === 'number' ? staff.experience_years : safeString(staff.experience_years)} Years
                      </dd>
                    </div>
                  ) : null}
                  {safeString((staff as Record<string, unknown>).specialization) ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Specialization</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">{safeString((staff as Record<string, unknown>).specialization)}</dd>
                    </div>
                  ) : null}
                  {staff.major ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Major / Subject</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">{safeString(staff.major)}</dd>
                    </div>
                  ) : null}
                </dl>
              </Card>

              {/* Identification & Address */}
              <Card className="p-5 border border-gray-200 shadow-none">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={18} className="text-[#1e3a8a]" />
                  Identification & Address
                </h3>
                <dl className="space-y-3 text-sm">
                  {staff.nationality ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nationality</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">{safeString(staff.nationality)}</dd>
                    </div>
                  ) : null}
                  {(staff.dob || (staff as { date_of_birth?: string }).date_of_birth) && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">
                        {formatDate(
                          typeof staff.dob === 'string' ? staff.dob : (staff as { date_of_birth?: string }).date_of_birth
                        )}
                      </dd>
                    </div>
                  )}
                  {staff.address ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Permanent Address</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">{safeString(staff.address)}</dd>
                    </div>
                  ) : null}
                </dl>
              </Card>

              {/* Contact Details + Emergency */}
              <Card className="p-5 border border-gray-200 shadow-none">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Phone size={18} className="text-[#1e3a8a]" />
                  Contact Details
                </h3>
                <dl className="space-y-3 text-sm">
                  {staff.email ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Personal Email</dt>
                      <dd className="font-medium mt-0.5">
                        <a href={`mailto:${safeString(staff.email)}`} className="text-[#1e3a8a] hover:underline">
                          {safeString(staff.email)}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {staff.phone ? (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile Number</dt>
                      <dd className="font-medium text-gray-900 mt-0.5">{safeString(staff.phone)}</dd>
                    </div>
                  ) : null}
                  {(staff.contact1 || staff.contact2) ? (
                    <div className="pt-3 border-t border-gray-100">
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Emergency Contact
                      </dt>
                      <dd className="font-medium text-gray-900 text-sm space-y-1">
                        {staff.contact1 ? <p>Phone: {safeString(staff.contact1)}</p> : null}
                        {staff.contact2 ? <p>Alt: {safeString(staff.contact2)}</p> : null}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </Card>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="text-center py-12 text-gray-500">
              <Calendar size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Attendance data can be integrated here.</p>
            </div>
          )}
          {activeTab === 'payroll' && (
            <div className="text-center py-12 text-gray-500">
              <CreditCard size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Payroll & salary information can be integrated here.</p>
            </div>
          )}
          {activeTab === 'documents' && (
            <div className="text-center py-12 text-gray-500">
              <FileText size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Documents can be integrated here.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
