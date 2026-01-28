'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import { Building2, MapPin, Mail, Phone, User, Calendar, School, Award, AlertCircle } from 'lucide-react';
import type { AcceptedSchool } from '@/lib/supabase';

export default function InstituteInfoPage() {
  // router removed - not used
  const [school, setSchool] = useState<AcceptedSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const fetchSchoolData = async () => {
    try {
      setLoading(true);
      // Get school code from sessionStorage (teacher data)
      const storedTeacher = sessionStorage.getItem('teacher');
      if (!storedTeacher) {
        setError('Teacher information not found');
        setLoading(false);
        return;
      }

      const teacher = JSON.parse(storedTeacher);
      const schoolCode = teacher.school_code;

      if (!schoolCode) {
        setError('School code not found');
        setLoading(false);
        return;
      }

      // Try to get from sessionStorage first
      const storedSchool = sessionStorage.getItem('school');
      if (storedSchool) {
        const schoolData = JSON.parse(storedSchool);
        if (schoolData.school_code === schoolCode) {
          setSchool(schoolData);
          setLoading(false);
          return;
        }
      }

      // If not in sessionStorage, fetch from API
      const response = await fetch(`/api/schools/accepted`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        const schoolData = result.data.find((s: AcceptedSchool) => s.school_code === schoolCode);
        if (schoolData) {
          setSchool(schoolData);
          sessionStorage.setItem('school', JSON.stringify(schoolData));
        } else {
          setError('School not found');
        }
      } else {
        setError('Failed to load school information');
      }
    } catch (err) {
      console.error('Error fetching school:', err);
      setError('Failed to load school information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#ECEDED]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading institute information...</p>
        </div>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600">{error || 'School information not found'}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a8a] flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Institute Information
          </h1>
          <p className="text-gray-600 mt-1">View your school&apos;s basic information</p>
        </div>
      </div>

      {/* School Logo and Basic Info */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            {typeof school.logo_url === 'string' && school.logo_url ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                <Image
                  src={school.logo_url}
                  alt={school.school_name || 'School Logo'}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                <Building2 className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{school.school_name}</h2>
              <p className="text-sm text-gray-500">School Code: {school.school_code}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#1e3a8a] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Address</p>
                  <p className="text-sm text-gray-600">
                    {school.school_address || 'Not provided'}
                    {school.city && `, ${school.city}`}
                    {school.state && `, ${school.state}`}
                    {school.zip_code && ` ${school.zip_code}`}
                    {school.country && `, ${school.country}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-[#1e3a8a] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-600">{school.school_email || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-[#1e3a8a] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                  <p className="text-sm text-gray-600">{school.school_phone || 'Not provided'}</p>
                </div>
              </div>

              {school.established_year && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-[#1e3a8a] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Established</p>
                    <p className="text-sm text-gray-600">{school.established_year}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Principal Information */}
      {school.principal_name && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-[#1e3a8a]" />
            Principal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Name</p>
              <p className="text-sm text-gray-600">{school.principal_name}</p>
            </div>
            {school.principal_email && (
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-sm text-gray-600">{school.principal_email}</p>
              </div>
            )}
            {school.principal_phone && (
              <div>
                <p className="text-sm font-medium text-gray-700">Phone</p>
                <p className="text-sm text-gray-600">{school.principal_phone}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {school.school_type && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <School className="h-5 w-5 text-[#1e3a8a]" />
              <h3 className="text-lg font-semibold text-gray-800">School Type</h3>
            </div>
            <p className="text-sm text-gray-600">{school.school_type}</p>
          </Card>
        )}

        {school.affiliation && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Award className="h-5 w-5 text-[#1e3a8a]" />
              <h3 className="text-lg font-semibold text-gray-800">Affiliation</h3>
            </div>
            <p className="text-sm text-gray-600">{school.affiliation}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
