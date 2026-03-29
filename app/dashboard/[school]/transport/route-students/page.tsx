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
  ArrowLeft,
  UserPlus,
  MapPin,
  Bus,
  Pencil,
  IndianRupee,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { computeTransportFeeFromStops } from '@/lib/transport/compute-student-transport-fee';

interface RouteStop {
  id: string;
  name: string;
  pickup_fare: number;
  drop_fare: number;
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

const emptyForm = () => ({
  pickup_stop_id: '' as string,
  drop_stop_id: '' as string,
  custom_fare: '' as string,
});

export default function RouteStudentsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
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
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterSection, setFilterSection] = useState<string>('');
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

  useEffect(() => {
    setFilterSection('');
  }, [filterClass]);

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
      setForm({
        pickup_stop_id: s.transport_pickup_stop_id ? String(s.transport_pickup_stop_id) : '',
        drop_stop_id: s.transport_dropoff_stop_id ? String(s.transport_dropoff_stop_id) : '',
        custom_fare:
          s.transport_custom_fare != null && Number.isFinite(Number(s.transport_custom_fare))
            ? String(s.transport_custom_fare)
            : '',
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
    return computeTransportFeeFromStops({
      pickupStop: p,
      dropStop: d,
      customFare: hasCustom ? Number(customRaw) : null,
    });
  }, [form.pickup_stop_id, form.drop_stop_id, form.custom_fare, stopById]);

  const formValidationMessage = useMemo(() => {
    const customRaw = form.custom_fare.trim();
    const hasCustom = customRaw !== '' && Number.isFinite(Number(customRaw)) && Number(customRaw) >= 0;
    if (!form.pickup_stop_id && !form.drop_stop_id && !hasCustom) {
      return 'Choose at least a pickup stop, a drop-off stop, or enter a custom fare.';
    }
    if (!hasCustom && farePreview.total <= 0 && (form.pickup_stop_id || form.drop_stop_id)) {
      return 'Selected stop(s) have ₹0 for the chosen leg(s). Set fares on the stop or use custom fare.';
    }
    return null;
  }, [form, farePreview.total]);

  const submitAssignments = async (studentIds: string[]) => {
    if (!selectedRoute || studentIds.length === 0) return;
    const customRaw = form.custom_fare.trim();
    const hasCustom = customRaw !== '' && Number.isFinite(Number(customRaw)) && Number(customRaw) >= 0;
    const payload = {
      school_code: schoolCode,
      route_id: selectedRoute,
      assignments: studentIds.map((student_id) => ({
        student_id,
        pickup_stop_id: form.pickup_stop_id || null,
        drop_stop_id: form.drop_stop_id || null,
        custom_fare: hasCustom ? Number(customRaw) : null,
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

  const classOptions = Array.from(new Set(students.map((s) => s.class).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true })
  );
  const sectionOptions =
    filterClass.length > 0
      ? Array.from(
          new Set(
            students.filter((s) => s.class === filterClass).map((s) => s.section).filter((x) => x != null && x !== '')
          )
        ).sort((a, b) => String(a).localeCompare(String(b)))
      : Array.from(new Set(students.map((s) => s.section).filter((x) => x != null && x !== ''))).sort((a, b) =>
          String(a).localeCompare(String(b))
        );

  const filteredStudents = students.filter((student) => {
    if (filterClass && student.class !== filterClass) return false;
    if (filterSection && student.section !== filterSection) return false;
    const matchesSearch =
      !searchTerm ||
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${student.class}-${student.section}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const routeStudents = filteredStudents.filter((s) => s.transport_route_id === selectedRoute);
  const availableStudents = filteredStudents.filter(
    (s) => !s.transport_route_id || s.transport_route_id !== selectedRoute
  );

  const selectedRouteData = routes.find((r) => r.id === selectedRoute);
  const currentCount = routeStudents.length;
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
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/transport`)}
                className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
                <Users className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Route Students</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Assign students to transport routes for {schoolCode} — set pickup / drop stops and fares
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Route *</label>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8]"
              >
                <option value="">Select a route</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.route_name}
                    {route.vehicle && ` (${route.vehicle.vehicle_code} — ${route.vehicle.seats} seats)`}
                  </option>
                ))}
              </select>
            </div>

            {selectedRoute && selectedRouteData && (
              <div className="bg-gradient-to-r from-[#5A7A95]/10 via-[#6B9BB8]/10 to-[#7DB5D3]/10 dark:from-[#5A7A95]/20 dark:via-[#6B9BB8]/20 dark:to-[#7DB5D3]/20 border-2 border-[#5A7A95]/30 dark:border-[#6B9BB8]/30 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Bus className="text-[#5A7A95] dark:text-[#6B9BB8]" size={22} />
                    <div>
                      <p className="font-semibold text-[#5A7A95] dark:text-[#6B9BB8]">{selectedRouteData.route_name}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Capacity: {currentCount} / {capacity} students
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      currentCount >= capacity
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : currentCount >= capacity * 0.8
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                  >
                    {capacity > 0 ? `${Math.round((currentCount / capacity) * 100)}% full` : 'No capacity set'}
                  </div>
                </div>
                {loadingRouteStops ? (
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <Loader2 className="animate-spin" size={14} /> Loading stops…
                  </p>
                ) : routeStops.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {routeStops.map((s, i) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                      >
                        <span className="text-gray-400 font-mono">{i + 1}</span>
                        {s.name}
                        <span className="text-emerald-600 dark:text-emerald-400">P ₹{s.pickup_fare}</span>
                        <span className="text-sky-600 dark:text-sky-400">D ₹{s.drop_fare}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-amber-700 dark:text-amber-300">No stops on this route — add stops to the route first.</p>
                )}
              </div>
            )}
          </div>
        </Card>

        {selectedRoute && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search students..."
                    className="pl-10"
                  />
                </div>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] min-w-[140px]"
                >
                  <option value="">All Classes</option>
                  {classOptions.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] min-w-[120px]"
                >
                  <option value="">All Sections</option>
                  {sectionOptions.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleOpenBulkPicker}
                disabled={currentCount >= capacity || loadingRouteStops || routeStops.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 shrink-0"
              >
                <Plus size={18} className="mr-2" />
                Add students
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  On this route ({routeStudents.length})
                </h2>
                <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                  {routeStudents.map((student) => {
                    const pu = describeStopLine(student, 'pickup');
                    const dr = describeStopLine(student, 'drop');
                    return (
                      <div
                        key={student.id}
                        className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#5A7A95]/50 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{student.student_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {student.admission_no} · {student.class}-{student.section}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => openAssignModal({ type: 'single', student })}
                              className="border-[#5A7A95]/40 text-[#5A7A95]"
                            >
                              <Pencil size={14} className="mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => handleRemoveStudent(student.id)}
                              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                            >
                              <UserMinus size={14} />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {pu && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800">
                              <MapPin size={12} />
                              Pickup: {pu.label}
                              {pu.fare != null && ` · ₹${pu.fare}`}
                            </span>
                          )}
                          {dr && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-50 dark:bg-sky-900/30 text-sky-900 dark:text-sky-200 border border-sky-200/60 dark:border-sky-800">
                              <ArrowRight size={12} />
                              Drop: {dr.label}
                              {dr.fare != null && ` · ₹${dr.fare}`}
                            </span>
                          )}
                          {!pu && !dr && student.transport_custom_fare != null && (
                            <span className="px-2 py-1 rounded-md bg-violet-50 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 border border-violet-200/60">
                              Custom fare only
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-gray-200/80 dark:border-gray-600/80">
                          <span className="text-xs text-gray-500">Transport fee (stored)</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-0.5">
                            <IndianRupee size={14} />
                            {student.transport_fee != null ? Number(student.transport_fee).toLocaleString('en-IN') : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {routeStudents.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">No students on this route yet.</p>
                  )}
                </div>
              </Card>

              <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Available ({availableStudents.length})
                </h2>
                <div className="space-y-2 max-h-[640px] overflow-y-auto">
                  {availableStudents.map((student) => {
                    const isOtherRoute = !!student.transport_route_id && student.transport_route_id !== selectedRoute;
                    const canAssign = !isOtherRoute && currentCount < capacity && routeStops.length > 0;
                    return (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#5A7A95] dark:hover:border-[#6B9BB8] transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{student.student_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {student.admission_no} · {student.class}-{student.section}
                          </p>
                          {isOtherRoute && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              On another route — remove there first to assign here
                            </p>
                          )}
                        </div>
                        {!isOtherRoute && (
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => openAssignModal({ type: 'single', student })}
                            disabled={!canAssign || saving}
                            className="border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 shrink-0"
                          >
                            <UserPlus size={14} className="mr-1" />
                            Assign
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {availableStudents.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No students in this filter.</p>
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
            <p className="text-gray-600 dark:text-gray-400">Choose a route to map students, stops, and fares</p>
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
                                const maxPick = Math.max(0, capacity - currentCount);
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
                  <p className="text-xs text-gray-500">{selectedStudents.size} selected · {capacity - currentCount} seats free</p>
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
                    Pickup-only and drop-off-only are supported. Different stops sum both fares. Custom fare overrides the calculated total.
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
                          {s.name} — pickup ₹{s.pickup_fare}
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
                          {s.name} — drop ₹{s.drop_fare}
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
                          <span className="text-slate-400">Total transport fee</span>
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
