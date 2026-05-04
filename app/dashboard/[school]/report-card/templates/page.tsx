'use client';

import { use, useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {FileText, Loader2, Settings2, Save, Eye } from 'lucide-react';
import {
  buildDemoReportCardData,
  generateReportCardHTML,
  getDefaultReportCardTemplateConfig,
  type ReportCardData,
  type ReportCardTemplateConfig,
} from '@/lib/report-card-html';

type Config = Record<string, unknown>;

export default function ReportCardTemplatesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);

  type TemplateRow = {
    id: string;
    name: string;
    description?: string;
    is_system: boolean;
    school_code?: string | null;
    config: Config;
  };

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [config, setConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [schoolPreviewData, setSchoolPreviewData] = useState<{
    school_name?: string;
    school_address?: string;
    school_email?: string;
    school_phone?: string;
    affiliation?: string;
    affiliation_number?: string;
    logo_url?: string | null;
  } | null>(null);
  /** Shown on live preview when template “Academic year” is left blank (same source as generated cards). */
  const [runningAcademicYear, setRunningAcademicYear] = useState<string | null>(null);

  const normSchool = useCallback((s: string) => String(s || '').trim().toUpperCase(), []);
  /** Prefer this school’s rows so the picker isn’t a long list of system duplicates. */
  const templatesForPicker = useMemo(() => {
    const mine = templates.filter((t) => normSchool(t.school_code || '') === normSchool(schoolCode));
    return mine.length > 0 ? mine : templates;
  }, [templates, schoolCode, normSchool]);

  const loadTemplates = useCallback(async () => {
    setLoadError(null);
    const res = await fetch(`/api/report-card/templates?school_code=${encodeURIComponent(schoolCode)}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setTemplates([]);
      setLoadError(String(json.error || json.message || 'Failed to load templates'));
      return;
    }
    const raw = Array.isArray(json.data) ? json.data : [];
    const list: TemplateRow[] = raw
      .filter((row: Record<string, unknown>) => row.id != null && String(row.id).length > 0)
      .map((row: Record<string, unknown>) => ({
        id: String(row.id),
        name: String(row.name ?? 'Template'),
        description: row.description != null ? String(row.description) : undefined,
        is_system: Boolean(row.is_system),
        school_code: (row.school_code as string | null | undefined) ?? null,
        config: (row.config && typeof row.config === 'object' ? row.config : {}) as Config,
      }));
    setTemplates(list);
    if (list.length === 0 && json.message && typeof json.message === 'string') {
      setLoadError(json.message);
    }
  }, [schoolCode]);

  useEffect(() => {
    setLoading(true);
    loadTemplates()
      .catch(() => setLoadError('Failed to load templates'))
      .finally(() => setLoading(false));
  }, [loadTemplates]);

  useEffect(() => {
    const loadSchoolPreviewData = async () => {
      try {
        const res = await fetch('/api/schools/accepted');
        const json = await res.json().catch(() => ({}));
        const rows = Array.isArray(json.data) ? json.data : [];
        const row = rows.find(
          (x: Record<string, unknown>) =>
            String(x.school_code ?? '').trim().toUpperCase() ===
            String(schoolCode ?? '').trim().toUpperCase()
        );
        if (row) {
          setSchoolPreviewData({
            school_name: String(row.school_name ?? ''),
            school_address: String(row.school_address ?? ''),
            school_email: String(row.school_email ?? ''),
            school_phone: String(row.school_phone ?? ''),
            affiliation: String(row.affiliation ?? ''),
            affiliation_number: String(row.affiliation_number ?? ''),
            logo_url: row.logo_url ? String(row.logo_url) : null,
          });
        }
      } catch {
        setSchoolPreviewData(null);
      }
    };
    loadSchoolPreviewData();
  }, [schoolCode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/schools/current-academic-year?school_code=${encodeURIComponent(schoolCode)}`
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          const y = String(json.current_academic_year || json.data || '').trim();
          setRunningAcademicYear(y || null);
        } else {
          setRunningAcademicYear(null);
        }
      } catch {
        if (!cancelled) setRunningAcademicYear(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolCode]);

  /** Keep select value in sync when the list loads (avoids blank HTML selects). */
  useEffect(() => {
    if (!templatesForPicker.length) return;
    const ids = new Set(templatesForPicker.map((x) => x.id));
    if (!selectedId || !ids.has(selectedId)) {
      const first = templatesForPicker[0];
      setSelectedId(first.id);
      setConfig(first.config || {});
    }
  }, [templatesForPicker, selectedId]);

  useEffect(() => {
    const t = templatesForPicker.find((x) => x.id === selectedId);
    if (t) setConfig(t.config || {});
  }, [selectedId, templatesForPicker]);

  const handleCreateSchoolTemplate = async () => {
    setCreating(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/report-card/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_code: schoolCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create template');
      const row = data.data as Record<string, unknown> | undefined;
      if (!row?.id) throw new Error('Invalid response from server');
      const newRow: TemplateRow = {
        id: String(row.id),
        name: String(row.name ?? 'School Report Card'),
        description: row.description != null ? String(row.description) : undefined,
        is_system: false,
        school_code: schoolCode,
        config: (row.config && typeof row.config === 'object' ? row.config : getDefaultReportCardTemplateConfig()) as Config,
      };
      setTemplates((prev) => [...prev.filter((p) => p.id !== newRow.id), newRow]);
      setSelectedId(newRow.id);
      setConfig(newRow.config || {});
      alert('Template created. You can customize it and click Save.');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    const t = templates.find((x) => x.id === selectedId);
    if (!t || !selectedId) {
      alert('No template selected. Create a template first, or refresh the page.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/report-card/templates/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, school_code: schoolCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      if (data.data?.id && data.data.id !== selectedId) {
        setTemplates((prev) => [...prev, { id: data.data.id, name: (templates.find((x) => x.id === selectedId)?.name || 'Custom') + ' (Copy)', is_system: false, config }]);
        setSelectedId(data.data.id);
      } else {
        setTemplates((prev) =>
          prev.map((x) => (x.id === selectedId ? { ...x, config } : x))
        );
      }
      alert('Template saved successfully');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (path: string[], value: unknown) => {
    setConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let curr: Record<string, unknown> = next;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        if (!(k in curr) || typeof curr[k] !== 'object') curr[k] = {};
        curr = curr[k] as Record<string, unknown>;
      }
      curr[path[path.length - 1]] = value;
      return next;
    });
  };

  const logos = (config.logos as Record<string, unknown>) || {};
  const header = (config.header as Record<string, unknown>) || {};
  const sections = (config.sections as Record<string, unknown>) || {};
  const labels = (config.labels as Record<string, unknown>) || {};
  const branding = (config.branding as Record<string, unknown>) || {};
  const marks_table = (config.marks_table as Record<string, unknown>) || {};
  const profile_fields = (config.profile_fields as Record<string, unknown>) || {};
  const footer_fields = (config.footer_fields as Record<string, unknown>) || {};
  const content = (config.content as Record<string, unknown>) || {};
  const selectedTemplate = templates.find((x) => x.id === selectedId);
  const isSystem = selectedTemplate?.is_system ?? false;

  const setAllSectionToggles = (on: boolean) => {
    setConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as Config;
      const s = (next.sections as Record<string, boolean>) || {};
      for (const key of [
        'show_student_profile',
        'show_marks_table',
        'show_attendance',
        'show_co_scholastic',
        'show_remarks',
        'show_instructions',
        'show_grading_scale',
      ]) {
        s[key] = on;
      }
      next.sections = s;
      return next;
    });
  };

  const setAllProfileFields = (on: boolean) => {
    setConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as Config;
      next.profile_fields = {
        show_admission: on,
        show_roll: on,
        show_father: on,
        show_mother: on,
        show_contact: on,
        show_dob: on,
        show_address: on,
      };
      return next;
    });
  };

  const setAllFooterFields = (on: boolean) => {
    setConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as Config;
      next.footer_fields = {
        show_promoted_to: on,
        show_rank: on,
        show_result_status: on,
        show_class_in_summary: on,
        show_overall_grade: on,
        show_result_date: on,
      };
      return next;
    });
  };

  // Same HTML path as generate (landscape engine + saved config)
  const previewHTML = useMemo(() => {
    const previewData: ReportCardData = buildDemoReportCardData();
    if (schoolPreviewData) {
      previewData.school = {
        ...previewData.school,
        school_name: schoolPreviewData.school_name || previewData.school.school_name,
        school_address: schoolPreviewData.school_address || previewData.school.school_address,
        school_email: schoolPreviewData.school_email || previewData.school.school_email,
        school_phone: schoolPreviewData.school_phone || previewData.school.school_phone,
        affiliation:
          schoolPreviewData.affiliation_number ||
          schoolPreviewData.affiliation ||
          previewData.school.affiliation,
        logo_url: schoolPreviewData.logo_url ?? previewData.school.logo_url,
      };
    }
    const manualAy = String((content.academic_year as string) ?? '').trim();
    if (!manualAy && runningAcademicYear) {
      previewData.exam = { ...previewData.exam, academic_year: runningAcademicYear };
    }
    return generateReportCardHTML(previewData, config as ReportCardTemplateConfig);
  }, [config, schoolPreviewData, content.academic_year, runningAcademicYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={48} className="animate-spin text-[#1e3a8a]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8B5CF6] flex items-center justify-center shadow-lg">
              <Settings2 className="text-white" size={24} />
            </div>
            Customize Report Card Template
          </h1>
          <p className="text-gray-600">Configure logos, colors, sections, labels, and layout</p>
        </div>
        <div className="flex gap-3">
        
        </div>
      </motion.div>

      <Card>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Template</label>
            {loadError && (
              <p className="text-sm text-red-700 rounded-lg border border-red-200 bg-red-50 px-3 py-2 mb-2">
                {loadError}
              </p>
            )}
            {templatesForPicker.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  No templates are set up for this school yet. Create one to enable saving and report card generation with your branding.
                </p>
                <Button
                  type="button"
                  onClick={handleCreateSchoolTemplate}
                  disabled={creating}
                  className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                >
                  {creating ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Creating…
                    </>
                  ) : (
                    'Create school report card template'
                  )}
                </Button>
              </div>
            ) : templatesForPicker.length === 1 ? (
              <div className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-900 font-medium">
                {templatesForPicker[0].name}
                {templatesForPicker[0].is_system ? ' (System)' : ''}
              </div>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              >
                {templatesForPicker.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.is_system ? ' (System)' : ''}
                  </option>
                ))}
              </select>
            )}
            {isSystem && (
              <p className="mt-2 text-xs text-amber-600">
                Editing a system template creates a school-specific copy. Changes apply to your school only.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} />
              Logos & Header
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Left Logo Size (px)</label>
                <input type="number" min={40} max={200} value={Number(logos.left_size) || 100} onChange={(e) => updateConfig(['logos', 'left_size'], parseInt(e.target.value) || 100)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Right Logo Size (px)</label>
                <input type="number" min={40} max={200} value={Number(logos.right_size) || 100} onChange={(e) => updateConfig(['logos', 'right_size'], parseInt(e.target.value) || 100)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name Color</label>
                <div className="flex gap-2">
                  <input type="color" value={(header.school_name_color as string) ?? '#8B0000'} onChange={(e) => updateConfig(['header', 'school_name_color'], e.target.value)} className="w-12 h-10 border rounded-lg cursor-pointer" />
                  <input type="text" value={(header.school_name_color as string) ?? '#8B0000'} onChange={(e) => updateConfig(['header', 'school_name_color'], e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" placeholder="#8B0000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School details color (email, affiliation, phone, address, subtitle)</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={
                      (header.school_details_color as string)?.trim() ||
                      (header.school_name_color as string) ||
                      '#ffffff'
                    }
                    onChange={(e) => updateConfig(['header', 'school_details_color'], e.target.value)}
                    className="w-12 h-10 border rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={(header.school_details_color as string) ?? ''}
                    onChange={(e) => updateConfig(['header', 'school_details_color'], e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg"
                    placeholder="Leave blank to match school name color"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name Font Size</label>
                <input type="number" min={14} max={36} value={Number(header.font_size) || 22} onChange={(e) => updateConfig(['header', 'font_size'], parseInt(e.target.value) || 22)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sub-title</label>
                <input type="text" value={(header.sub_title as string) ?? ''} onChange={(e) => updateConfig(['header', 'sub_title'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="SENIOR SECONDARY SCHOOL" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="showRightLogo" checked={logos.show_right_logo !== false} onChange={(e) => updateConfig(['logos', 'show_right_logo'], e.target.checked)} />
                <label htmlFor="showRightLogo" className="text-sm font-medium">Show Right Logo</label>
              </div>
              <div className="md:col-span-2 lg:col-span-3 pt-2 border-t border-gray-100 mt-1">
                <p className="text-sm font-medium text-gray-700 mb-2">Header contact line (first line under school name)</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={header.show_email !== false}
                      onChange={(e) => updateConfig(['header', 'show_email'], e.target.checked)}
                    />
                    <span className="text-sm">Show school email</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={header.show_affiliation !== false}
                      onChange={(e) => updateConfig(['header', 'show_affiliation'], e.target.checked)}
                    />
                    <span className="text-sm">Show affiliation number</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={header.show_contact !== false}
                      onChange={(e) => updateConfig(['header', 'show_contact'], e.target.checked)}
                    />
                    <span className="text-sm">Show phone number</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Section Visibility</h2>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAllSectionToggles(true)}>
                  Select all sections
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAllSectionToggles(false)}>
                  Deselect all sections
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {['show_student_profile', 'show_marks_table', 'show_attendance', 'show_co_scholastic', 'show_remarks', 'show_instructions', 'show_grading_scale'].map((key) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={sections[key] !== false} onChange={(e) => updateConfig(['sections', key], e.target.checked)} />
                  <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Student profile fields</h2>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAllProfileFields(true)}>
                  Select all
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAllProfileFields(false)}>
                  Deselect all
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">Toggle DOB, parents, contact, etc. (shown when student profile section is on).</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(
                [
                  ['show_admission', 'Admission no.'],
                  ['show_roll', 'Roll no.'],
                  ['show_father', "Father's name"],
                  ['show_mother', "Mother's name"],
                  ['show_contact', 'Contact no.'],
                  ['show_dob', 'Date of birth'],
                  ['show_address', 'Address'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile_fields[key] !== false}
                    onChange={(e) => updateConfig(['profile_fields', key], e.target.checked)}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Footer & summary</h2>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAllFooterFields(true)}>
                  Select all
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAllFooterFields(false)}>
                  Deselect all
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Summary row shows <strong>Class</strong> by default (not overall grade). Enable &quot;Overall grade in summary&quot; to show grade instead.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(
                [
                  ['show_class_in_summary', 'Show class in summary row'],
                  ['show_overall_grade', 'Show overall grade in summary (replaces class)'],
                  ['show_rank', 'Show rank in summary'],
                  ['show_promoted_to', 'Show promoted to (footer)'],
                  ['show_result_status', 'Show pass/fail (footer)'],
                  ['show_result_date', 'Show result date (footer)'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      key === 'show_overall_grade'
                        ? footer_fields[key] === true
                        : footer_fields[key] !== false
                    }
                    onChange={(e) => updateConfig(['footer_fields', key], e.target.checked)}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Labels</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'father_name', label: "Father's Name" },
                { key: 'mother_name', label: "Mother's Name" },
                { key: 'attendance', label: 'Attendance' },
                { key: 'report_title', label: 'Report Title' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type="text" value={(labels[key] as string) ?? label} onChange={(e) => updateConfig(['labels', key], e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Section Titles</h2>
            <p className="text-sm text-gray-500 mb-4">Rename the main section headings shown on the report card. Changes appear in the preview below.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Profile</label>
                <input type="text" value={(labels.section_student_profile as string) ?? 'Student Profile'} onChange={(e) => updateConfig(['labels', 'section_student_profile'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Student Profile" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Performance</label>
                <input type="text" value={(labels.section_academic_performance as string) ?? 'Academic Performance'} onChange={(e) => updateConfig(['labels', 'section_academic_performance'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Academic Performance" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scholastic Part Title</label>
                <input type="text" value={(labels.section_scholastic as string) ?? 'Part I: Scholastic Areas'} onChange={(e) => updateConfig(['labels', 'section_scholastic'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Part I: Scholastic Areas" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Co-Scholastic Part Title</label>
                <input type="text" value={(labels.section_co_scholastic as string) ?? 'Part II: Co-Scholastic Areas'} onChange={(e) => updateConfig(['labels', 'section_co_scholastic'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Part II: Co-Scholastic Areas" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks box title</label>
                <input type="text" value={(labels.section_remarks as string) ?? 'Remarks'} onChange={(e) => updateConfig(['labels', 'section_remarks'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Remarks" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grading Scale</label>
                <input type="text" value={(labels.section_grading_scale as string) ?? 'Grading Scale'} onChange={(e) => updateConfig(['labels', 'section_grading_scale'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Grading Scale" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions Section Title</label>
                <input type="text" value={(labels.section_instructions as string) ?? 'Important Instructions'} onChange={(e) => updateConfig(['labels', 'section_instructions'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Important Instructions" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Branding</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color (Section Titles)</label>
                <div className="flex gap-2">
                  <input type="color" value={(branding.primary_color as string) ?? '#1e3a8a'} onChange={(e) => updateConfig(['branding', 'primary_color'], e.target.value)} className="w-12 h-10 border rounded-lg cursor-pointer" />
                  <input type="text" value={(branding.primary_color as string) ?? '#1e3a8a'} onChange={(e) => updateConfig(['branding', 'primary_color'], e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color (Part Titles)</label>
                <div className="flex gap-2">
                  <input type="color" value={(branding.accent_color as string) ?? '#15803d'} onChange={(e) => updateConfig(['branding', 'accent_color'], e.target.value)} className="w-12 h-10 border rounded-lg cursor-pointer" />
                  <input type="text" value={(branding.accent_color as string) ?? '#15803d'} onChange={(e) => updateConfig(['branding', 'accent_color'], e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
                <select value={(branding.font_family as string) ?? 'Arial, sans-serif'} onChange={(e) => updateConfig(['branding', 'font_family'], e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="'Segoe UI', sans-serif">Segoe UI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table Header Background</label>
                <div className="flex gap-2">
                  <input type="color" value={(marks_table.header_bg_color as string) ?? '#e6f0e6'} onChange={(e) => updateConfig(['marks_table', 'header_bg_color'], e.target.value)} className="w-12 h-10 border rounded-lg cursor-pointer" />
                  <input type="text" value={(marks_table.header_bg_color as string) ?? '#e6f0e6'} onChange={(e) => updateConfig(['marks_table', 'header_bg_color'], e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="flex items-center gap-2 md:col-span-3">
                <input
                  type="checkbox"
                  id="showSubjectGrade"
                  checked={marks_table.show_grade !== false}
                  onChange={(e) => updateConfig(['marks_table', 'show_grade'], e.target.checked)}
                />
                <label htmlFor="showSubjectGrade" className="text-sm font-medium text-gray-700">
                  Show per-subject grade column (single-exam marks table)
                </label>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Editable Content</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Email</label>
                <input type="email" value={(content.school_email as string) ?? ''} onChange={(e) => updateConfig(['content', 'school_email'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="info@school.edu" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Phone</label>
                <input type="text" value={(content.school_phone as string) ?? ''} onChange={(e) => updateConfig(['content', 'school_phone'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="9876543210" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">School Address</label>
                <input type="text" value={(content.school_address as string) ?? ''} onChange={(e) => updateConfig(['content', 'school_address'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="123 Education Street, City - 110001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Affiliation Number</label>
                <input type="text" value={(content.affiliation as string) ?? ''} onChange={(e) => updateConfig(['content', 'affiliation'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="1234567" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic year (optional override)</label>
                <input
                  type="text"
                  value={(content.academic_year as string) ?? ''}
                  onChange={(e) => updateConfig(['content', 'academic_year'], e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder={runningAcademicYear ? `${runningAcademicYear} (school current)` : '2025-26'}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank to use each examination&apos;s academic year, or the school&apos;s current running year when the exam has none (shown on the &quot;ANNUAL REPORT&quot; line).
                  {runningAcademicYear ? ` Current year: ${runningAcademicYear}.` : ''}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Name</label>
                <input type="text" value={(content.exam_name as string) ?? ''} onChange={(e) => updateConfig(['content', 'exam_name'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Final Examination" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Promoted To (Next Class)</label>
                <input type="text" value={(content.promoted_to as string) ?? ''} onChange={(e) => updateConfig(['content', 'promoted_to'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Class 11" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result date (printed as “Result date: …” in footer)</label>
                <input
                  type="text"
                  value={(content.result_date as string) ?? ''}
                  onChange={(e) => updateConfig(['content', 'result_date'], e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g. 15 Apr 2026 (leave blank to use exam date or today)"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Default remarks (pre-printed, optional)</label>
                <textarea 
                  value={(content.remarks as string) ?? ''} 
                  onChange={(e) => updateConfig(['content', 'remarks'], e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg" 
                  placeholder="Leave blank to auto-fill remarks from overall % (e.g. 40–50%, 50–60%). Type here only if you want the same fixed text on every card."
                  rows={2}
                />
                <p className="mt-1 text-xs text-gray-500">
                  When empty, each report uses standard remarks based on overall performance (no percentage or grade repeated here).
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea 
                  value={(content.instructions as string) ?? ''} 
                  onChange={(e) => updateConfig(['content', 'instructions'], e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg" 
                  placeholder="Enter instructions for parents and students..."
                  rows={3}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Watermark Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="watermarkEnabled" 
                  checked={(config.watermark as Record<string, unknown>)?.enabled !== false} 
                  onChange={(e) => updateConfig(['watermark', 'enabled'], e.target.checked)} 
                />
                <label htmlFor="watermarkEnabled" className="text-sm font-medium">Enable Logo Watermark</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Watermark Size (px)</label>
                <input 
                  type="number" 
                  min={100} 
                  max={900} 
                  value={Number((config.watermark as Record<string, unknown>)?.size) || 500} 
                  onChange={(e) => updateConfig(['watermark', 'size'], parseInt(e.target.value) || 500)} 
                  className="w-full px-3 py-2 border rounded-lg" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Watermark Opacity</label>
                <input 
                  type="range" 
                  min="0.02" 
                  max="0.5" 
                  step="0.01"
                  value={String(Number((config.watermark as Record<string, unknown>)?.opacity) || 0.14)} 
                  onChange={(e) => updateConfig(['watermark', 'opacity'], parseFloat(e.target.value))} 
                  className="w-full" 
                />
                <span className="text-xs text-gray-500">{Math.round((Number((config.watermark as Record<string, unknown>)?.opacity) || 0.14) * 100)}%</span>
              </div>
            </div>
          </section>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !selectedId || templatesForPicker.length === 0}
              className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
            >
              {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
              Save Template
            </Button>
          </div>
        </div>
      </Card>

      {/* Live Preview Section */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Eye className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Live Preview</h2>
            <p className="text-sm text-gray-500">This is how your report card will look with the current settings</p>
          </div>
        </div>
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
          <iframe
            srcDoc={previewHTML}
            title="Report Card Preview"
            className="w-full h-[800px] border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </Card>
    </div>
  );
}
