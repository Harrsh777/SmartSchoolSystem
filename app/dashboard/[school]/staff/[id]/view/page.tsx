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
  MapPin, 
  Calendar, 
  Briefcase, 
  GraduationCap,
  Building2,
  FileText,
  CreditCard,
  Globe,
  Award,
  Clock,
  Heart,
  Shield,
  Hash
} from 'lucide-react';
import type { Staff } from '@/lib/supabase';

export default function ViewStaffPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolCode, id: staffId } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, schoolCode]);

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
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
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const safeString = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return String(value);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/staff-management/directory`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Staff Details</h1>
            <p className="text-gray-600">View complete staff information</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/dashboard/${schoolCode}/staff/${staffId}/edit`)}>
          Edit Staff
        </Button>
      </div>

      {/* Staff Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="p-6 bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200">
          <div className="text-center mb-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white text-5xl font-bold mx-auto mb-4 shadow-lg">
              {staff.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{safeString(staff.full_name)}</h2>
            <p className="text-gray-600">Staff ID: {safeString(staff.staff_id)}</p>
            {!!staff.employee_code && (
              <p className="text-gray-500 text-sm mt-1">Employee Code: {safeString(staff.employee_code)}</p>
            )}
            <span className={`inline-block mt-3 px-4 py-1 rounded-full text-sm font-semibold ${
              staff.is_active !== false
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {staff.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <div className="space-y-3 pt-6 border-t border-teal-200">
            {!!staff.role && (
              <div className="flex items-center gap-3 text-gray-700">
                <Briefcase size={18} className="text-teal-600" />
                <span>{safeString(staff.role)}</span>
              </div>
            )}
            {!!staff.designation && (
              <div className="flex items-center gap-3 text-gray-700">
                <Award size={18} className="text-teal-600" />
                <span>{safeString(staff.designation)}</span>
              </div>
            )}
            {!!staff.department && (
              <div className="flex items-center gap-3 text-gray-700">
                <Building2 size={18} className="text-teal-600" />
                <span>{safeString(staff.department)}</span>
              </div>
            )}
            {!!staff.email && (
              <div className="flex items-center gap-3 text-gray-700">
                <Mail size={18} className="text-teal-600" />
                <span className="truncate">{safeString(staff.email)}</span>
              </div>
            )}
            {!!staff.phone && (
              <div className="flex items-center gap-3 text-gray-700">
                <Phone size={18} className="text-teal-600" />
                <span>{safeString(staff.phone)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-black mb-4 flex items-center">
                <User size={24} className="mr-2" />
                Basic Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Staff ID</label>
                  <p className="text-lg font-medium text-black mt-1">{staff.staff_id}</p>
                </div>
                {!!staff.employee_code && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Employee Code</label>
                    <p className="text-lg font-medium text-black mt-1">{safeString(staff.employee_code)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-gray-600">Full Name</label>
                  <p className="text-lg font-medium text-black mt-1">{safeString(staff.full_name)}</p>
                </div>
                {!!staff.role && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Role</label>
                    <p className="text-lg font-medium text-black mt-1">{safeString(staff.role)}</p>
                  </div>
                )}
                {!!staff.designation && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Designation</label>
                    <p className="text-lg font-medium text-black mt-1">{safeString(staff.designation)}</p>
                  </div>
                )}
                {!!staff.department && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Department</label>
                    <p className="text-lg font-medium text-black mt-1">{safeString(staff.department)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-gray-600 flex items-center">
                    <Calendar size={16} className="mr-1" />
                    Date of Joining
                  </label>
                  <p className="text-lg font-medium text-black mt-1">{formatDate(typeof staff.date_of_joining === 'string' ? staff.date_of_joining : undefined)}</p>
                </div>
                {!!staff.dop && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600 flex items-center">
                      <Calendar size={16} className="mr-1" />
                      Date of Promotion
                    </label>
                    <p className="text-lg font-medium text-black mt-1">{formatDate(typeof staff.dop === 'string' ? staff.dop : undefined)}</p>
                  </div>
                )}
                {!!staff.gender && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Gender</label>
                    <p className="text-lg font-medium text-black mt-1">{safeString(staff.gender)}</p>
                  </div>
                )}
                {!!staff.dob && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600 flex items-center">
                      <Calendar size={16} className="mr-1" />
                      Date of Birth
                    </label>
                    <p className="text-lg font-medium text-black mt-1">{formatDate(typeof staff.dob === 'string' ? staff.dob : undefined)}</p>
                  </div>
                )}
                {!!staff.blood_group && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600 flex items-center">
                      <Heart size={16} className="mr-1" />
                      Blood Group
                    </label>
                    <p className="text-lg font-medium text-black mt-1">{safeString(staff.blood_group)}</p>
                  </div>
                )}
                {!!staff.short_code && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600 flex items-center">
                      <Hash size={16} className="mr-1" />
                      Short Code
                    </label>
                    <p className="text-lg font-medium text-black mt-1">{safeString(staff.short_code)}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Contact Information */}
          {(!!staff.email || !!staff.phone || !!staff.contact1 || !!staff.contact2) && (
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-black mb-4 flex items-center">
                  <Phone size={24} className="mr-2" />
                  Contact Information
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {!!staff.email && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <Mail size={16} className="mr-1" />
                        Email
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.email)}</p>
                    </div>
                  )}
                  {!!staff.phone && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <Phone size={16} className="mr-1" />
                        Phone
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.phone)}</p>
                    </div>
                  )}
                  {!!staff.contact1 && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <Phone size={16} className="mr-1" />
                        Primary Contact
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.contact1)}</p>
                    </div>
                  )}
                  {!!staff.contact2 && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <Phone size={16} className="mr-1" />
                        Secondary Contact
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.contact2)}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Employment Details */}
          {(!!staff.employment_type || !!staff.qualification || (staff.experience_years !== null && staff.experience_years !== undefined) || !!staff.alma_mater || !!staff.major) && (
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-black mb-4 flex items-center">
                  <Briefcase size={24} className="mr-2" />
                  Employment & Education Details
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {!!staff.employment_type && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Employment Type</label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.employment_type)}</p>
                    </div>
                  )}
                  {!!staff.qualification && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <GraduationCap size={16} className="mr-1" />
                        Qualification
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.qualification)}</p>
                    </div>
                  )}
                  {staff.experience_years !== null && staff.experience_years !== undefined && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <Clock size={16} className="mr-1" />
                        Experience
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{typeof staff.experience_years === 'number' ? String(staff.experience_years) : safeString(staff.experience_years)} years</p>
                    </div>
                  )}
                  {!!staff.alma_mater && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <GraduationCap size={16} className="mr-1" />
                        Alma Mater
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.alma_mater)}</p>
                    </div>
                  )}
                  {!!staff.major && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Subject Specialization</label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.major)}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Personal Details */}
          {(!!staff.religion || !!staff.category || !!staff.nationality || !!staff.adhar_no || !!staff.rfid || !!staff.uuid) && (
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-black mb-4 flex items-center">
                  <FileText size={24} className="mr-2" />
                  Personal & Identification Details
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {!!staff.religion && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Religion</label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.religion)}</p>
                    </div>
                  )}
                  {!!staff.category && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Category</label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.category)}</p>
                    </div>
                  )}
                  {!!staff.nationality && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Nationality</label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.nationality)}</p>
                    </div>
                  )}
                  {!!staff.adhar_no && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <CreditCard size={16} className="mr-1" />
                        Aadhaar Number
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.adhar_no)}</p>
                    </div>
                  )}
                  {!!staff.rfid && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <Shield size={16} className="mr-1" />
                        RFID Card Number
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{safeString(staff.rfid)}</p>
                    </div>
                  )}
                  {!!staff.uuid && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <Hash size={16} className="mr-1" />
                        UUID
                      </label>
                      <p className="text-lg font-medium text-black mt-1 font-mono text-sm">{safeString(staff.uuid)}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Address */}
          {!!staff.address && (
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-black mb-4 flex items-center">
                  <MapPin size={24} className="mr-2" />
                  Address
                </h2>
                <p className="text-gray-700 text-lg">{safeString(staff.address)}</p>
              </div>
            </Card>
          )}

          {/* Additional Information */}
          {(!!staff.website || !!staff.created_at || !!staff.updated_at) && (
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-black mb-4 flex items-center">
                  <Building2 size={24} className="mr-2" />
                  Additional Information
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {!!staff.website && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <Globe size={16} className="mr-1" />
                        Website
                      </label>
                      <p className="text-lg font-medium text-black mt-1">
                        <a href={safeString(staff.website)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {safeString(staff.website)}
                        </a>
                      </p>
                    </div>
                  )}
                  {!!staff.created_at && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Created At</label>
                      <p className="text-lg font-medium text-black mt-1">{formatDate(typeof staff.created_at === 'string' ? staff.created_at : undefined)}</p>
                    </div>
                  )}
                  {!!staff.updated_at && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Last Updated</label>
                      <p className="text-lg font-medium text-black mt-1">{formatDate(typeof staff.updated_at === 'string' ? staff.updated_at : undefined)}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
