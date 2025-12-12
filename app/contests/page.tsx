'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { mockContests, type Contest, getStoredSchools } from '@/lib/demoData';
import { Trophy, Calendar, Users, Award, CheckCircle, X, Search, Filter, Mail, Phone, MapPin, User } from 'lucide-react';

interface RegistrationData {
  schoolName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  participants: string;
}

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>(mockContests);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [enrolledContests, setEnrolledContests] = useState<Set<string>>(new Set());
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    schoolName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    participants: '',
  });
  const [registrationErrors, setRegistrationErrors] = useState<Partial<RegistrationData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load enrolled contests from localStorage
    const stored = localStorage.getItem('enrolled_contests');
    if (stored) {
      setEnrolledContests(new Set(JSON.parse(stored)));
    }
  }, []);

  const categories = ['All', 'Sports', 'Technology', 'Academics', 'Science', 'Arts', 'Performing Arts'];
  const filteredContests = contests.filter(contest => {
    const matchesCategory = selectedCategory === 'All' || contest.category === selectedCategory;
    const matchesSearch = contest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contest.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const isRegistrationOpen = (contest: Contest) => {
    const deadline = new Date(contest.registrationDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(23, 59, 59, 999); // Set to end of day
    const hasSpace = contest.enrolledSchools.length < contest.maxParticipants;
    const notPastDeadline = deadline >= today;
    return notPastDeadline && hasSpace;
  };

  const handleOpenRegistration = (contest: Contest) => {
    if (!isRegistrationOpen(contest)) return;
    setSelectedContest(contest);
    setShowRegistrationModal(true);
    // Pre-fill with stored school data if available
    const schools = getStoredSchools();
    if (schools.length > 0) {
      const school = schools[0];
      setRegistrationData({
        schoolName: school.name,
        contactPerson: '',
        email: school.email,
        phone: '',
        address: school.address,
        participants: '',
      });
    }
  };

  const handleRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationErrors({});

    // Validation
    const errors: Partial<RegistrationData> = {};
    if (!registrationData.schoolName.trim()) errors.schoolName = 'School name is required';
    if (!registrationData.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
    if (!registrationData.email.trim() || !/\S+@\S+\.\S+/.test(registrationData.email)) {
      errors.email = 'Valid email is required';
    }
    if (!registrationData.phone.trim()) errors.phone = 'Phone number is required';
    if (!registrationData.address.trim()) errors.address = 'Address is required';
    if (!registrationData.participants.trim()) errors.participants = 'Number of participants is required';

    if (Object.keys(errors).length > 0) {
      setRegistrationErrors(errors);
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      if (selectedContest) {
        const updated = new Set(enrolledContests);
        updated.add(selectedContest.id);
        setEnrolledContests(updated);
        localStorage.setItem('enrolled_contests', JSON.stringify(Array.from(updated)));

        // Store registration details
        const registrations = JSON.parse(localStorage.getItem('contest_registrations') || '[]');
        registrations.push({
          contestId: selectedContest.id,
          contestName: selectedContest.name,
          ...registrationData,
          registeredAt: new Date().toISOString(),
        });
        localStorage.setItem('contest_registrations', JSON.stringify(registrations));

        // Update contest enrollment count
        setContests(contests.map(c =>
          c.id === selectedContest.id
            ? { ...c, enrolledSchools: [...c.enrolledSchools, registrationData.schoolName] }
            : c
        ));
      }

      setIsSubmitting(false);
      setShowRegistrationModal(false);
      setRegistrationData({
        schoolName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        participants: '',
      });
      setSelectedContest(null);
    }, 1500);
  };

  const handleUnenroll = (contestId: string) => {
    if (confirm('Are you sure you want to unenroll from this contest?')) {
      const updated = new Set(enrolledContests);
      updated.delete(contestId);
      setEnrolledContests(updated);
      localStorage.setItem('enrolled_contests', JSON.stringify(Array.from(updated)));

      // Update contest enrollment count
      setContests(contests.map(c =>
        c.id === contestId
          ? { ...c, enrolledSchools: c.enrolledSchools.filter(s => s !== 'current-school') }
          : c
      ));
    }
  };

  const statusColors = {
    'Upcoming': 'bg-blue-100 text-blue-800',
    'Ongoing': 'bg-green-100 text-green-800',
    'Completed': 'bg-gray-100 text-gray-800',
  };

  const categoryColors: Record<string, string> = {
    'Sports': 'bg-red-100 text-red-800',
    'Technology': 'bg-blue-100 text-blue-800',
    'Academics': 'bg-purple-100 text-purple-800',
    'Science': 'bg-green-100 text-green-800',
    'Arts': 'bg-pink-100 text-pink-800',
    'Performing Arts': 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-black mb-4">
              Inter-School <span className="text-gray-600">Contests</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Compete, learn, and excel in various competitions across sports, academics, technology, and arts
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="px-4 sm:px-6 lg:px-8 mb-12">
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search contests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Contests Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContests.map((contest, index) => {
              const isEnrolled = enrolledContests.has(contest.id);
              const canEnroll = contest.enrolledSchools.length < contest.maxParticipants;
              const isPastDeadline = new Date(contest.registrationDeadline) < new Date();
              const registrationOpen = isRegistrationOpen(contest);

              return (
                <motion.div
                  key={contest.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card hover className="h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            categoryColors[contest.category] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {contest.category}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            statusColors[contest.status]
                          }`}>
                            {contest.status}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-black mb-2">{contest.name}</h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{contest.description}</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-200 flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar size={16} />
                          <span>Start: {new Date(contest.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Users size={16} />
                          <span>{contest.enrolledSchools.length} / {contest.maxParticipants} schools</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Award size={16} />
                          <span className="font-medium text-black">{contest.prize}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Registration closes: {new Date(contest.registrationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {isEnrolled ? (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="text-green-600" size={20} />
                          <span className="text-sm font-medium text-green-600">Enrolled</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto"
                            onClick={() => handleUnenroll(contest.id)}
                          >
                            <X size={16} className="mr-1" />
                            Unenroll
                          </Button>
                        </div>
                      ) : registrationOpen ? (
                        <Button
                          variant="primary"
                          className="w-full"
                          onClick={() => handleOpenRegistration(contest)}
                        >
                          Register Now
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          {isPastDeadline
                            ? 'Registration Closed'
                            : !canEnroll
                            ? 'Full'
                            : 'Registration Not Available'}
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {filteredContests.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-gray-600 text-lg">No contests found matching your criteria.</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-black mb-4">Contest Statistics</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="text-center">
                <Trophy className="mx-auto mb-3 text-blue-500" size={32} />
                <p className="text-3xl font-bold text-black mb-1">{contests.length}</p>
                <p className="text-sm text-gray-600">Total Contests</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <Calendar className="mx-auto mb-3 text-green-500" size={32} />
                <p className="text-3xl font-bold text-black mb-1">
                  {contests.filter(c => c.status === 'Upcoming').length}
                </p>
                <p className="text-sm text-gray-600">Upcoming</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <Users className="mx-auto mb-3 text-purple-500" size={32} />
                <p className="text-3xl font-bold text-black mb-1">
                  {contests.reduce((sum, c) => sum + c.enrolledSchools.length, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Enrollments</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <Award className="mx-auto mb-3 text-orange-500" size={32} />
                <p className="text-3xl font-bold text-black mb-1">
                  {new Set(contests.map(c => c.category)).size}
                </p>
                <p className="text-sm text-gray-600">Categories</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Registration Modal */}
      <AnimatePresence>
        {showRegistrationModal && selectedContest && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-2">Register for Contest</h2>
                    <p className="text-gray-600">{selectedContest.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowRegistrationModal(false);
                      setSelectedContest(null);
                      setRegistrationData({
                        schoolName: '',
                        contactPerson: '',
                        email: '',
                        phone: '',
                        address: '',
                        participants: '',
                      });
                      setRegistrationErrors({});
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Contest Info */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Category</p>
                      <p className="font-semibold text-black">{selectedContest.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Start Date</p>
                      <p className="font-semibold text-black">
                        {new Date(selectedContest.startDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Prize</p>
                      <p className="font-semibold text-black">{selectedContest.prize}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Available Spots</p>
                      <p className="font-semibold text-black">
                        {selectedContest.maxParticipants - selectedContest.enrolledSchools.length} remaining
                      </p>
                    </div>
                  </div>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleRegistrationSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <Input
                      label="School Name *"
                      value={registrationData.schoolName}
                      onChange={(e) => setRegistrationData({ ...registrationData, schoolName: e.target.value })}
                      placeholder="Enter your school name"
                      error={registrationErrors.schoolName}
                      required
                    />

                    <Input
                      label="Contact Person *"
                      value={registrationData.contactPerson}
                      onChange={(e) => setRegistrationData({ ...registrationData, contactPerson: e.target.value })}
                      placeholder="Name of contact person"
                      error={registrationErrors.contactPerson}
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <Input
                      label="Email Address *"
                      type="email"
                      value={registrationData.email}
                      onChange={(e) => setRegistrationData({ ...registrationData, email: e.target.value })}
                      placeholder="school@example.com"
                      error={registrationErrors.email}
                      required
                    />

                    <Input
                      label="Phone Number *"
                      type="tel"
                      value={registrationData.phone}
                      onChange={(e) => setRegistrationData({ ...registrationData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      error={registrationErrors.phone}
                      required
                    />
                  </div>

                  <Input
                    label="School Address *"
                    value={registrationData.address}
                    onChange={(e) => setRegistrationData({ ...registrationData, address: e.target.value })}
                    placeholder="Complete school address"
                    error={registrationErrors.address}
                    required
                  />

                  <Input
                    label="Number of Participants *"
                    type="number"
                    value={registrationData.participants}
                    onChange={(e) => setRegistrationData({ ...registrationData, participants: e.target.value })}
                    placeholder="Enter number of participants"
                    error={registrationErrors.participants}
                    required
                    min="1"
                    max={selectedContest.maxParticipants - selectedContest.enrolledSchools.length}
                  />

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Registration deadline is{' '}
                      {new Date(selectedContest.registrationDeadline).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      . Please ensure all information is accurate.
                    </p>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowRegistrationModal(false);
                        setSelectedContest(null);
                        setRegistrationData({
                          schoolName: '',
                          contactPerson: '',
                          email: '',
                          phone: '',
                          address: '',
                          participants: '',
                        });
                        setRegistrationErrors({});
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} className="mr-2" />
                          Submit Registration
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


