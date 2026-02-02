'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ArrowLeft,
  Plus,
  Edit,
  X,
  Calendar,
  IndianRupee,
  Tag,
  Settings,
  FileText,
  Grid3x3,
  History,
} from 'lucide-react';

interface FeeSchedule {
  id: string;
  schedule_name: string;
  classes: string[];
  number_of_installments: number;
  start_date: string;
  end_date: string;
}

interface FeeComponent {
  id: string;
  head_name: string;
  component_name: string;
  admission_type: string;
  gender: string;
  display_order: number;
}

interface FeeDiscount {
  id: string;
  discount_name: string;
  remarks: string | null;
}

interface MiscFee {
  id: string;
  fee_name: string;
  amount: number | null;
  description: string | null;
}

interface FeeFine {
  id: string;
  fine_name: string;
  fine_type: string;
  is_active: boolean;
}

interface AcademicYear {
  id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface Stats {
  fee_schedules: number;
  fee_components: number;
  fee_discounts: number;
  misc_fees: number;
  fee_fines: number;
}

export default function FeeBasicsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [stats, setStats] = useState<Stats>({
    fee_schedules: 0,
    fee_components: 0,
    fee_discounts: 0,
    misc_fees: 0,
    fee_fines: 0,
  });
  const [schedules, setSchedules] = useState<FeeSchedule[]>([]);
  const [components, setComponents] = useState<FeeComponent[]>([]);
  const [discounts, setDiscounts] = useState<FeeDiscount[]>([]);
  const [, setMiscFees] = useState<MiscFee[]>([]);
  const [fines, setFines] = useState<FeeFine[]>([]);
  
  // Modal states
  const [showYearModal, setShowYearModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [, setShowComponentReorder] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [, setShowDiscountLogs] = useState(false);
  const [showMiscModal, setShowMiscModal] = useState(false);
  const [, setShowMiscLogs] = useState(false);
  const [showFineModal, setShowFineModal] = useState(false);
  const [, setShowFineLogs] = useState(false);
  
  // Editing states
  const [editingSchedule, setEditingSchedule] = useState<FeeSchedule | null>(null);
  const [editingComponent, setEditingComponent] = useState<FeeComponent | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<FeeDiscount | null>(null);
  const [editingMisc, setEditingMisc] = useState<MiscFee | null>(null);
  const [editingFine, setEditingFine] = useState<FeeFine | null>(null);

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAcademicYears(),
        fetchStats(),
        fetchSchedules(),
        fetchComponents(),
        fetchDiscounts(),
        fetchMiscFees(),
        fetchFines(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch(`/api/fees/academic-years?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setAcademicYears(result.data);
        const current = result.data.find((y: AcademicYear) => y.is_current);
        setSelectedYear(current || result.data[0] || null);
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/fees/basics/stats?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await fetch(`/api/fees/schedules?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setSchedules(result.data);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  const fetchComponents = async () => {
    try {
      const response = await fetch(`/api/fees/components?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setComponents(result.data);
      }
    } catch (err) {
      console.error('Error fetching components:', err);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const response = await fetch(`/api/fees/discounts?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setDiscounts(result.data);
      }
    } catch (err) {
      console.error('Error fetching discounts:', err);
    }
  };

  const fetchMiscFees = async () => {
    try {
      const response = await fetch(`/api/fees/misc?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setMiscFees(result.data);
      }
    } catch (err) {
      console.error('Error fetching misc fees:', err);
    }
  };

  const fetchFines = async () => {
    try {
      const response = await fetch(`/api/fees/fines?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setFines(result.data);
      }
    } catch (err) {
      console.error('Error fetching fines:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const formatClasses = (classes: string[]) => {
    if (!classes || classes.length === 0) return 'N/A';
    return classes.join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Calendar size={32} />
            Fee Basics
          </h1>
          <p className="text-gray-600">Manage fee schedules, components, discounts, and fines</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Academic Year Selector */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Academic Year</label>
            <select
              value={selectedYear?.id || ''}
              onChange={(e) => {
                const year = academicYears.find(y => y.id === e.target.value);
                setSelectedYear(year || null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[200px]"
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year_name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => setShowYearModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus size={18} className="mr-2" />
            ADD ACADEMIC YEAR
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
              <IndianRupee className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">No. of Fee schedule created</p>
              <p className="text-2xl font-bold text-gray-900">{stats.fee_schedules}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">No. of Fee component created</p>
              <p className="text-2xl font-bold text-gray-900">{stats.fee_components}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
              <Tag className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">No. of Fee discounts created</p>
              <p className="text-2xl font-bold text-gray-900">{stats.fee_discounts}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-yellow-500 flex items-center justify-center">
              <Settings className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">No. of Misc Fee created</p>
              <p className="text-2xl font-bold text-gray-900">{stats.misc_fees}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gray-50 border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-500 flex items-center justify-center">
              <IndianRupee className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">No. of Fee fine created</p>
              <p className="text-2xl font-bold text-gray-900">{stats.fee_fines}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Section 1: Fee Schedule */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">1. Fee Schedule</h2>
          <Button
            onClick={() => {
              setEditingSchedule(null);
              setShowScheduleModal(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus size={18} className="mr-2" />
            ADD FEE SCHEDULE
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-teal-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Classes</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">No. of Installments</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Schedule Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {schedules.length > 0 ? (
                schedules.map((schedule, index) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {String(index + 1).padStart(2, '0')}. {formatClasses(schedule.classes)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{schedule.number_of_installments}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{schedule.schedule_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDateRange(schedule.start_date, schedule.end_date)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => {
                          setEditingSchedule(schedule);
                          setShowScheduleModal(true);
                        }}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No fee schedules found. Click &quot;ADD FEE SCHEDULE&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 2: Fee Component */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">2. Fee Component</h2>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowComponentReorder(true)}
              variant="outline"
              className="bg-orange-50 text-orange-600 border-orange-300 hover:bg-orange-100"
            >
              <Grid3x3 size={18} className="mr-2" />
              COMPONENT REORDERING
            </Button>
            <Button
              onClick={() => {
                setEditingComponent(null);
                setShowComponentModal(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              ADD FEE COMPONENT
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-teal-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Head Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Component Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Admission Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Gender</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {components.length > 0 ? (
                components.map((component, index) => {
                  const prevComponent = index > 0 ? components[index - 1] : null;
                  const showHeadName = !prevComponent || prevComponent.head_name !== component.head_name;
                  
                  return (
                    <tr key={component.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {showHeadName ? (
                          <span className="font-medium">{String(index + 1).padStart(2, '0')}. {component.head_name}</span>
                        ) : (
                          <span className="text-gray-400">{String(index + 1).padStart(2, '0')}.</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{component.component_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{component.admission_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{component.gender}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => {
                            setEditingComponent(component);
                            setShowComponentModal(true);
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No fee components found. Click &quot;ADD FEE COMPONENT&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 3: Fee Discounts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">3. Fee Discounts</h2>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowDiscountLogs(true)}
              variant="outline"
              className="bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
            >
              <History size={18} className="mr-2" />
              SHOW LOGS
            </Button>
            <Button
              onClick={() => {
                setEditingDiscount(null);
                setShowDiscountModal(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              ADD FEE DISCOUNTS
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-teal-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Discount name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Remarks</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {discounts.length > 0 ? (
                discounts.map((discount, index) => (
                  <tr key={discount.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {String(index + 1).padStart(2, '0')}. {discount.discount_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{discount.remarks || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => {
                          setEditingDiscount(discount);
                          setShowDiscountModal(true);
                        }}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No fee discounts found. Click &quot;ADD FEE DISCOUNTS&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 4: Misc. Fee */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">4. Misc. Fee</h2>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowMiscLogs(true)}
              variant="outline"
              className="bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
            >
              <History size={18} className="mr-2" />
              SHOW LOGS
            </Button>
            <Button
              onClick={() => {
                setEditingMisc(null);
                setShowMiscModal(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              ADD MISC. FEE
            </Button>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          No misc fees configured yet. Click &quot;ADD MISC. FEE&quot; to create one.
        </div>
      </Card>

      {/* Section 5: Fee fine */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">5. Fee fine</h2>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowFineLogs(true)}
              variant="outline"
              className="bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
            >
              <History size={18} className="mr-2" />
              SHOW LOGS
            </Button>
            <Button
              onClick={() => {
                setEditingFine(null);
                setShowFineModal(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              ADD FEE FINE
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-teal-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Fine name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Fine Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Fine Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fines.length > 0 ? (
                fines.map((fine, index) => (
                  <tr key={fine.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {String(index + 1).padStart(2, '0')}. {fine.fine_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{fine.fine_type}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/fees/fines/${fine.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ is_active: !fine.is_active }),
                            });
                            if (response.ok) {
                              fetchFines();
                            }
                          } catch (err) {
                            console.error('Error toggling fine status:', err);
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          fine.is_active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            fine.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => {
                          setEditingFine(fine);
                          setShowFineModal(true);
                        }}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No fee fines found. Click &quot;ADD FEE FINE&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals will be added here - for now, just placeholders */}
      {showYearModal && (
        <AcademicYearModal
          schoolCode={schoolCode}
          onClose={() => {
            setShowYearModal(false);
            fetchAcademicYears();
          }}
        />
      )}
      {showScheduleModal && (
        <FeeScheduleModal
          schoolCode={schoolCode}
          schedule={editingSchedule}
          onClose={() => {
            setShowScheduleModal(false);
            setEditingSchedule(null);
            fetchSchedules();
            fetchStats();
          }}
        />
      )}
      {showComponentModal && (
        <FeeComponentModal
          schoolCode={schoolCode}
          component={editingComponent}
          onClose={() => {
            setShowComponentModal(false);
            setEditingComponent(null);
            fetchComponents();
            fetchStats();
          }}
        />
      )}
      {showDiscountModal && (
        <FeeDiscountModal
          schoolCode={schoolCode}
          discount={editingDiscount}
          onClose={() => {
            setShowDiscountModal(false);
            setEditingDiscount(null);
            fetchDiscounts();
            fetchStats();
          }}
        />
      )}
      {showMiscModal && (
        <MiscFeeModal
          schoolCode={schoolCode}
          miscFee={editingMisc}
          onClose={() => {
            setShowMiscModal(false);
            setEditingMisc(null);
            fetchMiscFees();
            fetchStats();
          }}
        />
      )}
      {showFineModal && (
        <FeeFineModal
          schoolCode={schoolCode}
          fine={editingFine}
          onClose={() => {
            setShowFineModal(false);
            setEditingFine(null);
            fetchFines();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

// Academic Year Modal
function AcademicYearModal({ schoolCode, onClose }: { schoolCode: string; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    year_name: '',
    start_date: '',
    end_date: '',
    is_current: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/fees/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
        }),
      });
      if (response.ok) {
        onClose();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to create academic year');
      }
    } catch (err) {
      console.error('Error creating academic year:', err);
      alert('Failed to create academic year. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-lg shadow-xl"
      >
        <Card className="m-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">Add Academic Year</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Year Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.year_name}
                onChange={(e) => setFormData({ ...formData, year_name: e.target.value })}
                required
                placeholder="e.g., Apr 2025 - Mar 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_current}
                onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <label className="text-sm text-gray-700">Set as current academic year</label>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? 'Saving...' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

// Fee Schedule Modal
function FeeScheduleModal({
  schoolCode,
  schedule,
  onClose,
}: {
  schoolCode: string;
  schedule: FeeSchedule | null;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    schedule_name: schedule?.schedule_name || '',
    classes: schedule?.classes || [],
    number_of_installments: schedule?.number_of_installments || 1,
    start_date: schedule?.start_date || '',
    end_date: schedule?.end_date || '',
  });

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        interface ClassData {
          class?: string;
          [key: string]: unknown;
        }
        const uniqueClasses = Array.from(new Set(result.data.map((c: ClassData) => c.class).filter(Boolean))) as string[];
        setClasses(uniqueClasses.sort());
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = schedule ? `/api/fees/schedules/${schedule.id}` : '/api/fees/schedules';
      const method = schedule ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
        }),
      });
      if (response.ok) {
        onClose();
      } else {
        const result = await response.json();
        alert(result.error || `Failed to ${schedule ? 'update' : 'create'} schedule`);
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert(`Failed to ${schedule ? 'update' : 'create'} schedule. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const toggleClass = (className: string) => {
    setFormData((prev) => ({
      ...prev,
      classes: prev.classes.includes(className)
        ? prev.classes.filter((c) => c !== className)
        : [...prev.classes, className],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="m-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {schedule ? 'Edit Fee Schedule' : 'Add Fee Schedule'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Schedule Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.schedule_name}
                onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
                required
                placeholder="e.g., fees schedule 1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Classes <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {classes.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        formData.classes.includes(cls)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Installments <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.number_of_installments}
                  onChange={(e) => setFormData({ ...formData, number_of_installments: parseInt(e.target.value) || 1 })}
                  required
                  min="1"
                  max="12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? 'Saving...' : schedule ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

// Fee Component Modal
function FeeComponentModal({
  schoolCode,
  component,
  onClose,
}: {
  schoolCode: string;
  component: FeeComponent | null;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    head_name: component?.head_name || '',
    component_name: component?.component_name || '',
    admission_type: component?.admission_type || 'All Students',
    gender: component?.gender || 'All Students',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = component ? `/api/fees/components/${component.id}` : '/api/fees/components';
      const method = component ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
        }),
      });
      if (response.ok) {
        onClose();
      } else {
        const result = await response.json();
        alert(result.error || `Failed to ${component ? 'update' : 'create'} component`);
      }
    } catch (err) {
      console.error('Error saving component:', err);
      alert(`Failed to ${component ? 'update' : 'create'} component. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-lg shadow-xl"
      >
        <Card className="m-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {component ? 'Edit Fee Component' : 'Add Fee Component'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Head Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.head_name}
                onChange={(e) => setFormData({ ...formData, head_name: e.target.value })}
                required
                placeholder="e.g., School Fee"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Component Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.component_name}
                onChange={(e) => setFormData({ ...formData, component_name: e.target.value })}
                required
                placeholder="e.g., Transport Fee"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Admission Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.admission_type}
                  onChange={(e) => setFormData({ ...formData, admission_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="All Students">All Students</option>
                  <option value="New">New</option>
                  <option value="Old">Old</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="All Students">All Students</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? 'Saving...' : component ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

// Fee Discount Modal
function FeeDiscountModal({
  schoolCode,
  discount,
  onClose,
}: {
  schoolCode: string;
  discount: FeeDiscount | null;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    discount_name: discount?.discount_name || '',
    remarks: discount?.remarks || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = discount ? `/api/fees/discounts/${discount.id}` : '/api/fees/discounts';
      const method = discount ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
        }),
      });
      if (response.ok) {
        onClose();
      } else {
        const result = await response.json();
        alert(result.error || `Failed to ${discount ? 'update' : 'create'} discount`);
      }
    } catch (err) {
      console.error('Error saving discount:', err);
      alert(`Failed to ${discount ? 'update' : 'create'} discount. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-lg shadow-xl"
      >
        <Card className="m-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {discount ? 'Edit Fee Discount' : 'Add Fee Discount'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Discount Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.discount_name}
                onChange={(e) => setFormData({ ...formData, discount_name: e.target.value })}
                required
                placeholder="e.g., Sibling Discount"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Optional remarks"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? 'Saving...' : discount ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

// Misc Fee Modal
function MiscFeeModal({
  schoolCode,
  miscFee,
  onClose,
}: {
  schoolCode: string;
  miscFee: MiscFee | null;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fee_name: miscFee?.fee_name || '',
    amount: miscFee?.amount?.toString() || '',
    description: miscFee?.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = miscFee ? `/api/fees/misc/${miscFee.id}` : '/api/fees/misc';
      const method = miscFee ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
        }),
      });
      if (response.ok) {
        onClose();
      } else {
        const result = await response.json();
        alert(result.error || `Failed to ${miscFee ? 'update' : 'create'} misc fee`);
      }
    } catch (err) {
      console.error('Error saving misc fee:', err);
      alert(`Failed to ${miscFee ? 'update' : 'create'} misc fee. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-lg shadow-xl"
      >
        <Card className="m-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {miscFee ? 'Edit Misc. Fee' : 'Add Misc. Fee'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fee Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.fee_name}
                onChange={(e) => setFormData({ ...formData, fee_name: e.target.value })}
                required
                placeholder="e.g., Library Fee"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? 'Saving...' : miscFee ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

// Fee Fine Modal
function FeeFineModal({
  schoolCode,
  fine,
  onClose,
}: {
  schoolCode: string;
  fine: FeeFine | null;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fine_name: fine?.fine_name || '',
    fine_type: fine?.fine_type || 'Fixed Amount',
    fine_amount: '',
    fine_percentage: '',
    daily_fine_amount: '',
    is_active: fine?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = fine ? `/api/fees/fines/${fine.id}` : '/api/fees/fines';
      const method = fine ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          fine_name: formData.fine_name,
          fine_type: formData.fine_type,
          fine_amount: formData.fine_amount ? parseFloat(formData.fine_amount) : null,
          fine_percentage: formData.fine_percentage ? parseFloat(formData.fine_percentage) : null,
          daily_fine_amount: formData.daily_fine_amount ? parseFloat(formData.daily_fine_amount) : null,
          is_active: formData.is_active,
        }),
      });
      if (response.ok) {
        onClose();
      } else {
        const result = await response.json();
        alert(result.error || `Failed to ${fine ? 'update' : 'create'} fine`);
      }
    } catch (err) {
      console.error('Error saving fine:', err);
      alert(`Failed to ${fine ? 'update' : 'create'} fine. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-lg shadow-xl"
      >
        <Card className="m-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {fine ? 'Edit Fee Fine' : 'Add Fee Fine'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fine Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.fine_name}
                onChange={(e) => setFormData({ ...formData, fine_name: e.target.value })}
                required
                placeholder="e.g., late fine"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fine Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.fine_type}
                onChange={(e) => setFormData({ ...formData, fine_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="Fixed Amount">Fixed Amount</option>
                <option value="Percentage">Percentage</option>
                <option value="Daily">Daily</option>
              </select>
            </div>
            {formData.fine_type === 'Fixed Amount' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fine Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fine_amount}
                  onChange={(e) => setFormData({ ...formData, fine_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}
            {formData.fine_type === 'Percentage' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fine Percentage</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fine_percentage}
                  onChange={(e) => setFormData({ ...formData, fine_percentage: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}
            {formData.fine_type === 'Daily' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Daily Fine Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.daily_fine_amount}
                  onChange={(e) => setFormData({ ...formData, daily_fine_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <label className="text-sm text-gray-700">Active</label>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? 'Saving...' : fine ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
