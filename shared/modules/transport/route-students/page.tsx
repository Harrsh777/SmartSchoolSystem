'use client';

import { use, useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Users,
  Plus,
  X,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
  Search,
  UserMinus,
  MapPin,
  Bus,
  Pencil,
  IndianRupee,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { computePeriodicTransportFeeFromStops } from '@/lib/transport/compute-student-transport-fee';
import type { TransportBillingFrequency } from '@/lib/transport/transport-billing-period';

interface RouteStop {
  id: string;
  name: string;
  pickup_fare: number;
  drop_fare: number;
  monthly_pickup_fee?: number;
  monthly_drop_fee?: number;
  quarterly_pickup_fee?: number;
  quarterly_drop_fee?: number;
  is_active?: boolean;
}

interface Student {
  id: string;
  admission_no: string;
  student_name: string;
  class: string;
  section: string;
  transport_route_id: string | null;
  transport_pickup_stop_id?: string | null;
  transport_dropoff_stop_id?: string | null;
  transport_custom_fare?: number | null;
  transport_fee?: number | null;
  transport_billing_frequency?: string | null;
}

interface Route {
  id: string;
  route_name: string;
  vehicle?: {
    seats: number;
    vehicle_code: string;
  };
}

type AssignMode = 'bulk' | { type: 'single'; student: Student };

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const emptyForm = () => ({
  pickup_stop_id: '' as string,
  drop_stop_id: '' as string,
  custom_fare: '' as string,
  billing_frequency: 'MONTHLY' as TransportBillingFrequency,
  effective_from: '' as string,
  end_month: '' as string,
});

export default function RouteStudentsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [loadingRouteStops, setLoadingRouteStops] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [assignMode, setAssignMode] = useState<AssignMode | null>(null);
  const [form, setForm] = useState(emptyForm());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [routesRes, studentsRes] = await Promise.all([
        fetch(`/api/transport/routes?school_code=${schoolCode}`),
        fetch(`/api/students?school_code=${schoolCode}&status=active`),
      ]);

      const routesData = await routesRes.json();
      const studentsData = await studentsRes.json();

      if (routesRes.ok && routesData.data) {
        setRoutes(routesData.data);
      }
      if (studentsRes.ok && studentsData.data) {
        setStudents(studentsData.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selectedRoute) {
      setRouteStops([]);
      return;
    }
    let cancelled = false;
    setLoadingRouteStops(true);
    fetch(`/api/transport/routes/${selectedRoute}?school_code=${encodeURIComponent(schoolCode)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const raw = d.data?.route_stops;
        const list: RouteStop[] = Array.isArray(raw)
          ? raw.map((s: Record<string, unknown>) => ({
              id: String(s.id),
              name: String(s.name ?? 'Stop'),
              pickup_fare: Number(s.pickup_fare ?? 0),
              drop_fare: Number(s.drop_fare ?? 0),
              monthly_pickup_fee: Number(s.monthly_pickup_fee ?? 0),
              monthly_drop_fee: Number(s.monthly_drop_fee ?? 0),
              quarterly_pickup_fee: Number(s.quarterly_pickup_fee ?? 0),
              quarterly_drop_fee: Number(s.quarterly_drop_fee ?? 0),
              is_active: s.is_active !== false,
            }))
          : [];
        setRouteStops(list.filter((s) => s.is_active !== false));
      })
      .catch(() => {
        if (!cancelled) setRouteStops([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRouteStops(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRoute, schoolCode]);

  const openAssignModal = (mode: AssignMode) => {
    if (!selectedRoute) {
      setError('Please select a route first');
      return;
    }
    if (routeStops.length === 0 && !loadingRouteStops) {
      setError('This route has no stops. Add stops under Transport → Stops and link them to the route.');
      return;
    }
    setError('');
    setSuccess('');
    setAssignMode(mode);
    if (mode === 'bulk') {
      setForm(emptyForm());
    } else {
      const s = mode.student;
      const bf = String(s.transport_billing_frequency || 'MONTHLY').toUpperCase();
      setForm({
        pickup_stop_id: s.transport_pickup_stop_id ? String(s.transport_pickup_stop_id) : '',
        drop_stop_id: s.transport_dropoff_stop_id ? String(s.transport_dropoff_stop_id) : '',
        custom_fare:
          s.transport_custom_fare != null && Number.isFinite(Number(s.transport_custom_fare))
            ? String(s.transport_custom_fare)
            : '',
        billing_frequency: bf === 'QUARTERLY' ? 'QUARTERLY' : 'MONTHLY',
        effective_from: '',
        end_month: '',
      });
    }
  };

  const closeAssignModal = () => {
    setAssignMode(null);
    setForm(emptyForm());
  };

  const stopById = useMemo(() => {
    const m = new Map<string, RouteStop>();
    for (const s of routeStops) m.set(s.id, s);
    return m;
  }, [routeStops]);

  const farePreview = useMemo(() => {
    const customRaw = form.custom_fare.trim();
    const hasCustom = customRaw !== '' && Number.isFinite(Number(customRaw)) && Number(customRaw) >= 0;
    const p = form.pickup_stop_id ? stopById.get(form.pickup_stop_id) ?? null : null;
    const d = form.drop_stop_id ? stopById.get(form.drop_stop_id) ?? null : null;
    const freq = form.billing_frequency;
    return computePeriodicTransportFeeFromStops({
      pickupStop: p,
      dropStop: d,
      frequency: freq,
      customFare: hasCustom ? Number(customRaw) : null,
    });
  }, [form.pickup_stop_id, form.drop_stop_id, form.custom_fare, form.billing_frequency, stopById]);

  const formValidationMessage = useMemo(() => {
    const customRaw = form.custom_fare.trim();
    const hasCustom = customRaw !== '' && Number.isFinite(Number(customRaw)) && Number(customRaw) >= 0;
    if (!form.pickup_stop_id && !form.drop_stop_id && !hasCustom) {
      return 'Choose at least a pickup stop, a drop-off stop, or enter a custom fare.';
    }
    if (!/^\d{4}-\d{2}$/.test(form.effective_from.trim())) {
      return 'Effective From is mandatory.';
    }
    if (!/^\d{4}-\d{2}$/.test(form.end_month.trim())) {
      return 'End Month is mandatory.';
    }
    if (form.end_month.trim() < form.effective_from.trim()) {
      return 'End month cannot be before effective month';
    }
    if (!hasCustom && farePreview.total <= 0 && (form.pickup_stop_id || form.drop_stop_id)) {
      return form.billing_frequency === 'QUARTERLY'
        ? 'Selected stop(s) have ₹0 for this quarter (set quarterly amounts or monthly amounts, or use custom fare).'
        : 'Selected stop(s) have ₹0 for the chosen leg(s). Set monthly amounts on the stop or use custom fare.';
    }
    return null;
  }, [form, farePreview.total]);

  const submitAssignments = async (studentIds: string[]) => {
    if (!selectedRoute || studentIds.length === 0) return;
    const customRaw = form.custom_fare.trim();
    const hasCustom = customRaw !== '' && Number.isFinite(Number(customRaw)) && Number(customRaw) >= 0;
    const eff = form.effective_from.trim();
    const end = form.end_month.trim();
    const payload = {
      school_code: schoolCode,
      route_id: selectedRoute,
      billing_frequency: form.billing_frequency,
      effective_from: /^\d{4}-\d{2}$/.test(eff) ? `${eff}-01` : '',
      end_month: /^\d{4}-\d{2}$/.test(end) ? `${end}-01` : '',
      assignments: studentIds.map((student_id) => ({
        student_id,
        pickup_stop_id: form.pickup_stop_id || null,
        drop_stop_id: form.drop_stop_id || null,
        custom_fare: hasCustom ? Number(customRaw) : null,
        billing_frequency: form.billing_frequency,
      })),
    };

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/transport/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok) {
        setSuccess(result.message || 'Saved successfully.');
        closeAssignModal();
        setBulkModalOpen(false);
        setSelectedStudents(new Set());
        await fetchData();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(result.error || result.details || 'Failed to save');
      }
    } catch (e) {
      console.error(e);
      setError('Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBulkPicker = () => {
    if (!selectedRoute) {
      setError('Please select a route first');
      return;
    }
    setSelectedStudents(new Set());
    setBulkModalOpen(true);
    setError('');
  };

  const handleBulkContinueToStops = () => {
    if (selectedStudents.size === 0) {
      setError('Select at least one student');
      return;
    }
    setBulkModalOpen(false);
    openAssignModal('bulk');
  };

  const handleAssignBulkSave = () => {
    if (formValidationMessage) {
      setError(formValidationMessage);
      return;
    }
    submitAssignments(Array.from(selectedStudents));
  };

  const handleAssignSingleSave = () => {
    if (assignMode == null || assignMode === 'bulk') return;
    if (formValidationMessage) {
      setError(formValidationMessage);
      return;
    }
    submitAssignments([assignMode.student.id]);
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Remove this student from the route? Transport stops and fare will be cleared.')) {
      return;
    }
    try {
      const response = await fetch(`/api/transport/students?school_code=${schoolCode}&student_ids=${studentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSuccess('Student removed from route.');
        await fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to remove student');
      }
    } catch (err) {
      console.error('Error removing student:', err);
      setError('Failed to remove student');
    }
  };

  const uniqueClasses = useMemo(
    () =>
      Array.from(new Set(students.map((s) => String(s.class || '').trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      ),
    [students]
  );

  const uniqueSections = useMemo(() => {
    if (!classFilter) return [] as string[];
    return Array.from(
      new Set(
        students
          .filter((s) => String(s.class || '').trim() === classFilter)
          .map((s) => String(s.section || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students, classFilter]);

  const scopedStudents = students.filter((student) => {
    if (!classFilter) return false;
    if (String(student.class || '').trim() !== classFilter) return false;
    if (!sectionFilter) return false;
    if (String(student.section || '').trim() !== sectionFilter) return false;
    return true;
  });

  const filteredStudents = scopedStudents.filter((student) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      student.student_name.toLowerCase().includes(q) ||
      student.admission_no.toLowerCase().includes(q) ||
      `${student.class}-${student.section}`.toLowerCase().includes(q)
    );
  });

  const routeStudents = filteredStudents.filter((s) => s.transport_route_id === selectedRoute);
  const availableStudents = filteredStudents.filter((s) => !s.transport_route_id || s.transport_route_id !== selectedRoute);

  const selectedRouteData = routes.find((r) => r.id === selectedRoute);
  /** Total seats in use on this route (all classes/sections) — capacity must not depend on class-section filter. */
  const assignedOnRouteTotal = useMemo(
    () =>
      selectedRoute
        ? students.filter((s) => String(s.transport_route_id || '') === String(selectedRoute)).length
        : 0,
    [students, selectedRoute]
  );
  const capacity = selectedRouteData?.vehicle?.seats || 0;

  const describeStopLine = (student: Student, leg: 'pickup' | 'drop') => {
    const id = leg === 'pickup' ? student.transport_pickup_stop_id : student.transport_dropoff_stop_id;
    if (!id) return null;
    const st = stopById.get(String(id));
    const fare =
      leg === 'pickup'
        ? st != null
          ? st.pickup_fare
          : null
        : st != null
          ? st.drop_fare
          : null;
    return {
      label: st?.name ?? `Stop ${String(id).slice(0, 8)}…`,
      fare: fare != null ? fare : null,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#5A7A95] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5EFEB] dark:bg-[#0f172a]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
                <Users className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Route Students</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Assign students to transport routes for{' '}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{schoolCode.toUpperCase()}</span>
                  {' — '}pickup / drop stops and fares
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3"
          >
            <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            <p className="text-green-800 dark:text-green-300 text-sm">{success}</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
            <button type="button" onClick={() => setError('')} className="text-red-600 dark:text-red-400 hover:text-red-800">
              <X size={18} />
            </button>
          </motion.div>
        )}

        <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Route</label>
              <div className="relative">
                <Bus
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-[1]"
                  size={18}
                />
                <ChevronDown
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={18}
                />
                <select
                  value={selectedRoute}
                  onChange={(e) => setSelectedRoute(e.target.value)}
                  className="w-full pl-11 pr-11 py-3.5 border border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-[15px] focus:outline-none focus:ring-2 focus:ring-[#5A7A95]/40 dark:focus:ring-[#6B9BB8]/40 focus:border-[#5A7A95] dark:focus:border-[#6B9BB8] appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">Choose a route…</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.route_name}
                      {route.vehicle && ` (${route.vehicle.vehicle_code} — ${route.vehicle.seats} seats)`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Class</label>
                <select
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value);
                    setSectionFilter('');
                  }}
                  className="w-full px-3 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-[15px]"
                >
                  <option value="">Select class</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Section</label>
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  disabled={!classFilter}
                  className="w-full px-3 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-[15px] disabled:opacity-60"
                >
                  <option value="">{classFilter ? 'Select section' : 'Select class first'}</option>
                  {uniqueSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedRoute && selectedRouteData && (
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-600/60 bg-gradient-to-br from-white to-gray-50/80 dark:from-slate-800/50 dark:to-slate-900/40 p-5 space-y-4 shadow-inner">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                      {selectedRouteData.route_name}
                    </p>
                    {selectedRouteData.vehicle && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {selectedRouteData.vehicle.vehicle_code} · {selectedRouteData.vehicle.seats} seats
                      </p>
                    )}
                  </div>
                  <div
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                      capacity <= 0
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        : assignedOnRouteTotal >= capacity
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                          : assignedOnRouteTotal >= capacity * 0.8
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                    }`}
                  >
                    {capacity > 0 ? `${Math.round((assignedOnRouteTotal / capacity) * 100)}% full` : 'Capacity not set'}
                  </div>
                </div>
                {capacity > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>
                        {assignedOnRouteTotal} assigned
                        {classFilter && sectionFilter && routeStudents.length !== assignedOnRouteTotal ? (
                          <span className="text-gray-400 dark:text-gray-500 font-normal">
                            {' '}
                            ({routeStudents.length} in selected class-section)
                          </span>
                        ) : null}
                      </span>
                      <span>
                        {Math.max(0, capacity - assignedOnRouteTotal)} free
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          assignedOnRouteTotal >= capacity
                            ? 'bg-red-500'
                            : assignedOnRouteTotal >= capacity * 0.8
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, capacity ? (assignedOnRouteTotal / capacity) * 100 : 0)}%` }}
                      />
                    </div>
                  </div>
                )}
                {loadingRouteStops ? (
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} /> Loading stops…
                  </p>
                ) : routeStops.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Stop order & fares
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {routeStops.map((s, i) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 shadow-sm"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gray-100 dark:bg-slate-700 text-[10px] font-bold text-gray-500 dark:text-gray-300">
                            {i + 1}
                          </span>
                          <span className="font-medium">{s.name}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">P ₹{s.pickup_fare}</span>
                          <span className="text-sky-600 dark:text-sky-400 tabular-nums">D ₹{s.drop_fare}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl px-3 py-2">
                    No stops on this route. Add stops under Transport, then link them here.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {selectedRoute && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
              <div className="relative flex-1 min-w-0 max-w-2xl">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, admission no., or class-section…"
                  className="pl-11 pr-10 py-3 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm"
                  aria-label="Search students"
                />
                {searchTerm.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Clear search"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <Button
                onClick={handleOpenBulkPicker}
                disabled={assignedOnRouteTotal >= capacity || loadingRouteStops || routeStops.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shrink-0 rounded-xl px-5 py-3 h-auto shadow-md shadow-emerald-600/15"
              >
                <Plus size={18} className="mr-2" />
                Add students
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 sm:-mt-1">
              Showing {filteredStudents.length} of {scopedStudents.length} students in selected class-section
            </p>

            <div className="grid grid-cols-1 gap-5 lg:gap-6">
              <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 overflow-hidden flex flex-col min-h-[420px] lg:min-h-[560px]">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/80 dark:bg-slate-800/40">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">On this route</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {classFilter && sectionFilter ? (
                      <>
                        {routeStudents.length} student{routeStudents.length !== 1 ? 's' : ''} in this class-section
                        {assignedOnRouteTotal !== routeStudents.length
                          ? ` · ${assignedOnRouteTotal} total on route`
                          : ''}
                        {' '}
                        · pickup, drop, and fee
                      </>
                    ) : (
                      <>
                        {assignedOnRouteTotal} student{assignedOnRouteTotal !== 1 ? 's' : ''} on this route (all classes)
                        {' '}
                        · select class and section to filter the list
                      </>
                    )}
                  </p>
                </div>
                <div className="p-4 space-y-2 flex-1 overflow-y-auto max-h-[640px]">
                  {routeStudents.map((student) => {
                    const pu = describeStopLine(student, 'pickup');
                    const dr = describeStopLine(student, 'drop');
                    return (
                      <div
                        key={student.id}
                        className="group rounded-2xl border border-gray-200/90 dark:border-gray-600/60 bg-white dark:bg-slate-800/30 p-4 shadow-sm hover:shadow-md hover:border-[#5A7A95]/35 dark:hover:border-[#6B9BB8]/40 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] text-xs font-bold text-white shadow-inner">
                            {studentInitials(student.student_name)}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white leading-tight truncate">
                                  {student.student_name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 tabular-nums">
                                  {student.admission_no}
                                  <span className="text-gray-300 dark:text-gray-600 mx-1.5">·</span>
                                  <span className="text-gray-600 dark:text-gray-300">
                                    {student.class}-{student.section}
                                  </span>
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 opacity-90 group-hover:opacity-100">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={() => openAssignModal({ type: 'single', student })}
                                  className="border-[#5A7A95]/35 text-[#5A7A95] dark:text-[#6B9BB8] rounded-lg h-8 px-2.5"
                                >
                                  <Pencil size={14} className="mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={() => handleRemoveStudent(student.id)}
                                  className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 rounded-lg h-8 w-8 p-0"
                                  title="Remove from route"
                                >
                                  <UserMinus size={14} />
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {pu && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs border border-emerald-200/70 dark:border-emerald-800/60">
                                  <MapPin size={11} className="shrink-0" />
                                  <span className="truncate max-w-[200px]">
                                    Pickup {pu.label}
                                    {pu.fare != null && ` · ₹${pu.fare}`}
                                  </span>
                                </span>
                              )}
                              {dr && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 text-xs border border-sky-200/70 dark:border-sky-800/60">
                                  <ArrowRight size={11} className="shrink-0" />
                                  <span className="truncate max-w-[200px]">
                                    Drop {dr.label}
                                    {dr.fare != null && ` · ₹${dr.fare}`}
                                  </span>
                                </span>
                              )}
                              {!pu && !dr && student.transport_custom_fare != null && (
                                <span className="px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200 text-xs border border-violet-200/70">
                                  Custom fare only
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/80">
                              <span className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
                                Stored fee (
                                {String(student.transport_billing_frequency || 'MONTHLY').toUpperCase() === 'QUARTERLY'
                                  ? 'quarter'
                                  : 'month'}
                                )
                              </span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-0.5 tabular-nums">
                                <IndianRupee size={14} />
                                {student.transport_fee != null
                                  ? Number(student.transport_fee).toLocaleString('en-IN')
                                  : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {routeStudents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="rounded-2xl bg-gray-100 dark:bg-slate-800/80 p-4 mb-3">
                        <Users className="text-gray-400 dark:text-gray-500" size={36} />
                      </div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">No one on this route yet</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                        Use <span className="font-medium text-emerald-700 dark:text-emerald-400">Add students</span> or assign
                        from the list on the right.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}

        {!selectedRoute && (
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-12 text-center">
            <Users className="mx-auto mb-4 text-gray-400" size={64} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Select a route</h3>
            <p className="text-gray-600 dark:text-gray-400">Choose route, class and section to map students, stops, and fares</p>
          </Card>
        )}

        {/* Pick students for bulk */}
        <AnimatePresence>
          {bulkModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
              >
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Choose students</h2>
                  <button
                    type="button"
                    onClick={() => setBulkModalOpen(false)}
                    className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    <X size={22} />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-2">
                  {availableStudents
                    .filter((s) => !s.transport_route_id)
                    .map((student) => {
                      const sel = selectedStudents.has(student.id);
                      return (
                        <label
                          key={student.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            sel
                              ? 'border-[#5A7A95] bg-[#5A7A95]/10 dark:border-[#6B9BB8] dark:bg-[#6B9BB8]/15'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={(e) => {
                              const next = new Set(selectedStudents);
                              if (e.target.checked) {
                                const maxPick = Math.max(0, capacity - assignedOnRouteTotal);
                                if (next.size < maxPick) next.add(student.id);
                              } else next.delete(student.id);
                              setSelectedStudents(next);
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-[#5A7A95] focus:ring-[#5A7A95]"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{student.student_name}</p>
                            <p className="text-xs text-gray-500">
                              {student.admission_no} · {student.class}-{student.section}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center gap-3">
                  <p className="text-xs text-gray-500">
                    {selectedStudents.size} selected · {Math.max(0, capacity - assignedOnRouteTotal)} seats free
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => setBulkModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleBulkContinueToStops} className="bg-[#5A7A95] hover:bg-[#4a6578]">
                      Continue to stops & fare
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Stops & fare assignment */}
        <AnimatePresence>
          {assignMode !== null && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
              >
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur z-10">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white pr-6">
                      {assignMode === 'bulk'
                        ? `Stops for ${selectedStudents.size} student(s)`
                        : assignMode.type === 'single'
                          ? `Stops — ${assignMode.student.student_name}`
                          : 'Stops'}
                    </h2>
                    <button
                      type="button"
                      onClick={closeAssignModal}
                      className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 shrink-0"
                    >
                      <X size={22} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Pickup-only and drop-off-only are supported. Different stops sum both charges. Custom fare overrides the calculated total.
                  </p>
                </div>

                <div className="p-5 space-y-5">
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Pickup stop
                    </label>
                    <select
                      value={form.pickup_stop_id}
                      onChange={(e) => setForm((f) => ({ ...f, pickup_stop_id: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">Not using school pickup</option>
                      {routeStops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.monthly_pickup_fee ? ` · M₹${s.monthly_pickup_fee}` : ''}
                          {s.quarterly_pickup_fee ? ` · Q₹${s.quarterly_pickup_fee}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      Drop-off stop
                    </label>
                    <select
                      value={form.drop_stop_id}
                      onChange={(e) => setForm((f) => ({ ...f, drop_stop_id: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">Not using school drop-off</option>
                      {routeStops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.monthly_drop_fee ? ` · M₹${s.monthly_drop_fee}` : ''}
                          {s.quarterly_drop_fee ? ` · Q₹${s.quarterly_drop_fee}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-2">
                    <label className="text-sm font-semibold text-violet-900 dark:text-violet-200">Custom fare override (optional)</label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Leave empty to use stop fares"
                      value={form.custom_fare}
                      onChange={(e) => setForm((f) => ({ ...f, custom_fare: e.target.value }))}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-violet-800/80 dark:text-violet-300/80">
                      When set, this amount is stored as the student&apos;s transport fee instead of summing pickup + drop from stops.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Billing frequency</label>
                    <select
                      value={form.billing_frequency}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          billing_frequency: e.target.value === 'QUARTERLY' ? 'QUARTERLY' : 'MONTHLY',
                        }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="MONTHLY">Monthly collection</option>
                      <option value="QUARTERLY">Quarterly collection</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      Fee is taken from stop monthly or quarterly amounts (or 3× monthly when quarterly is 0).
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Effective From
                    </label>
                    <Input
                      type="month"
                      value={form.effective_from}
                      onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-gray-500">
                      Month from which transport service starts.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      End Month
                    </label>
                    <Input
                      type="month"
                      value={form.end_month}
                      onChange={(e) => setForm((f) => ({ ...f, end_month: e.target.value }))}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-gray-500">
                      Last month till which transport fees should be generated.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 space-y-3 shadow-lg">
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Preview</p>
                    {farePreview.fromCustom ? (
                      <p className="text-2xl font-bold flex items-center gap-1">
                        <IndianRupee size={24} />
                        {farePreview.total.toLocaleString('en-IN')}
                        <span className="text-sm font-normal text-slate-400 ml-2">custom total</span>
                      </p>
                    ) : (
                      <>
                        <div className="space-y-1 text-sm text-slate-300">
                          {form.pickup_stop_id && (
                            <div className="flex justify-between">
                              <span>Pickup leg</span>
                              <span>₹{farePreview.pickupPortion.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {form.drop_stop_id && (
                            <div className="flex justify-between">
                              <span>Drop leg</span>
                              <span>₹{farePreview.dropPortion.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-end pt-2 border-t border-slate-600">
                          <span className="text-slate-400">
                            Total ({form.billing_frequency === 'QUARTERLY' ? 'per quarter' : 'per month'})
                          </span>
                          <span className="text-2xl font-bold flex items-center gap-0.5">
                            <IndianRupee size={22} />
                            {farePreview.total.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {formValidationMessage && (
                    <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <AlertCircle size={16} />
                      {formValidationMessage}
                    </p>
                  )}
                </div>

                <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-[#1e293b]">
                  <Button variant="outline" type="button" onClick={closeAssignModal} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={assignMode === 'bulk' ? handleAssignBulkSave : handleAssignSingleSave}
                    disabled={saving || !!formValidationMessage}
                    className="bg-green-600 hover:bg-green-700 min-w-[140px]"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={18} className="mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save size={18} className="mr-2" />
                        Save mapping
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
