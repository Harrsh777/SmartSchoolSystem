'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap } from 'lucide-react';
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
        router.push(`/dashboard/${schoolCode}/staff`);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
      router.push(`/dashboard/${schoolCode}/staff`);
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
          <Button onClick={() => router.push(`/dashboard/${schoolCode}/staff`)}>
            Back to Staff
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/staff`)}
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-black mb-6 flex items-center">
                <User size={24} className="mr-2" />
                Basic Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Staff ID</label>
                  <p className="text-lg font-medium text-black mt-1">{staff.staff_id}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Full Name</label>
                  <p className="text-lg font-medium text-black mt-1">{staff.full_name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Role</label>
                  <p className="text-lg font-medium text-black mt-1">{staff.role}</p>
                </div>
                {staff.department && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Department</label>
                    <p className="text-lg font-medium text-black mt-1">{staff.department}</p>
                  </div>
                )}
                {staff.designation && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Designation</label>
                    <p className="text-lg font-medium text-black mt-1">{staff.designation}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-gray-600 flex items-center">
                    <Calendar size={16} className="mr-1" />
                    Date of Joining
                  </label>
                  <p className="text-lg font-medium text-black mt-1">{formatDate(staff.date_of_joining)}</p>
                </div>
                {staff.gender && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Gender</label>
                    <p className="text-lg font-medium text-black mt-1">{staff.gender}</p>
                  </div>
                )}
              </div>
            </div>

            {(staff.email || staff.phone) && (
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-xl font-bold text-black mb-6 flex items-center">
                  <Phone size={24} className="mr-2" />
                  Contact Information
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {staff.email && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <Mail size={16} className="mr-1" />
                        Email
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{staff.email}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-semibold text-gray-600 flex items-center">
                      <Phone size={16} className="mr-1" />
                      Phone
                    </label>
                    <p className="text-lg font-medium text-black mt-1">{staff.phone}</p>
                  </div>
                </div>
              </div>
            )}

            {(staff.qualification || staff.experience_years || staff.employment_type) && (
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-xl font-bold text-black mb-6 flex items-center">
                  <Briefcase size={24} className="mr-2" />
                  Employment Details
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {staff.employment_type && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Employment Type</label>
                      <p className="text-lg font-medium text-black mt-1">{staff.employment_type}</p>
                    </div>
                  )}
                  {staff.qualification && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <GraduationCap size={16} className="mr-1" />
                        Qualification
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{staff.qualification}</p>
                    </div>
                  )}
                  {staff.experience_years !== null && staff.experience_years !== undefined && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Experience</label>
                      <p className="text-lg font-medium text-black mt-1">{staff.experience_years} years</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {staff.address && (
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-xl font-bold text-black mb-6 flex items-center">
                  <MapPin size={24} className="mr-2" />
                  Address
                </h2>
                <p className="text-gray-700">{staff.address}</p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

