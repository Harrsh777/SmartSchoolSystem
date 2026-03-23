'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, FileText, Loader2, Settings2, Save, Eye } from 'lucide-react';

type Config = Record<string, unknown>;

// Generate preview HTML with sample data
function generatePreviewHTML(cfg: Config): string {
  const logos = (cfg.logos as Record<string, unknown>) || {};
  const header = (cfg.header as Record<string, unknown>) || {};
  const sections = (cfg.sections as Record<string, unknown>) || {};
  const labels = (cfg.labels as Record<string, unknown>) || {};
  const branding = (cfg.branding as Record<string, unknown>) || {};
  const marks_table = (cfg.marks_table as Record<string, unknown>) || {};
  const content = (cfg.content as Record<string, unknown>) || {};

  const leftLogoSize = (logos.left_size as number) ?? 100;
  const rightLogoSize = (logos.right_size as number) ?? 100;
  const showRightLogo = logos.show_right_logo !== false;
  const schoolNameColor = (header.school_name_color as string) ?? '#8B0000';
  const schoolNameFontSize = (header.font_size as number) ?? 18;
  const subTitle = (header.sub_title as string) ?? 'SENIOR SECONDARY SCHOOL';
  const reportTitle = (labels.report_title as string) ?? 'REPORT CARD';
  const primaryColor = (branding.primary_color as string) ?? '#1e3a8a';
  const accentColor = (branding.accent_color as string) ?? '#15803d';
  const fontFamily = (branding.font_family as string) ?? 'Arial, sans-serif';
  const headerBgColor = (marks_table.header_bg_color as string) ?? '#e6f0e6';

  // Section titles (customizable)
  const sectionStudentProfile = (labels.section_student_profile as string) ?? 'Student Profile';
  const sectionAcademicPerformance = (labels.section_academic_performance as string) ?? 'Academic Performance';
  const sectionScholastic = (labels.section_scholastic as string) ?? 'Part I: Scholastic Areas';
  const sectionCoScholastic = (labels.section_co_scholastic as string) ?? 'Part II: Co-Scholastic Areas';
  const sectionRemarks = (labels.section_remarks as string) ?? 'Class Teacher Remarks';
  const sectionInstructions = (labels.section_instructions as string) ?? 'Important Instructions';

  const showStudentProfile = sections.show_student_profile !== false;
  const showMarksTable = sections.show_marks_table !== false;
  const showAttendance = sections.show_attendance !== false;
  const showCoScholastic = sections.show_co_scholastic !== false;
  const showRemarks = sections.show_remarks !== false;
  const showInstructions = sections.show_instructions !== false;
  const showGradingScale = sections.show_grading_scale !== false;

  // Editable content
  const schoolEmail = (content.school_email as string) ?? 'info@demo.edu';
  const schoolPhone = (content.school_phone as string) ?? '9876543210';
  const schoolAddress = (content.school_address as string) ?? '123 Education Street, New Delhi - 110001';
  const affiliation = (content.affiliation as string) ?? '1234567';
  const academicYear = (content.academic_year as string) ?? '2024-25';
  const examName = (content.exam_name as string) ?? 'Final Examination';
  const promotedTo = (content.promoted_to as string) ?? 'Class 11';
  const instructions = (content.instructions as string) ?? 'Minimum Passing Marks in Each Subject is 33%. Students can collect their Starter Kit from fee counter after enrolment in new class. Report any discrepancies within 7 days.';
  const customRemarks = (content.remarks as string) ?? '';

  // Watermark settings
  const watermark = (cfg.watermark as Record<string, unknown>) || {};
  const showWatermark = watermark.enabled !== false;
  const watermarkSize = (watermark.size as number) || 500;
  const watermarkOpacity = (watermark.opacity as number) || 0.08;

  // Sample data for preview (CBSE-style term columns; derived from same shape as before where possible)
  const sampleMarks = [
    { subject: 'English', max: 100, obtained: 85, pct: '85.0%', grade: 'A' },
    { subject: 'Mathematics', max: 100, obtained: 92, pct: '92.0%', grade: 'A+' },
    { subject: 'Science', max: 100, obtained: 78, pct: '78.0%', grade: 'B+' },
    { subject: 'Social Studies', max: 100, obtained: 88, pct: '88.0%', grade: 'A' },
    { subject: 'Hindi', max: 100, obtained: 75, pct: '75.0%', grade: 'B+' },
  ];
  const extraSubjects = ['General Knowledge', 'Computer', 'Sanskrit'] as const;
  const allSubjects = [
    ...sampleMarks,
    ...extraSubjects.map((subject, idx) => ({
      subject,
      max: 100,
      obtained: 72 + idx * 2,
      pct: `${72 + idx * 2}.0%`,
      grade: 'B',
    })),
  ];

  const marksRows = allSubjects
    .map((m) => {
      const fa1 = Math.min(25, Math.round(m.obtained * 0.22));
      const sa1 = Math.min(75, Math.round(m.obtained * 0.58));
      const t1 = fa1 + sa1;
      const g1 = m.grade;
      const fa2 = Math.min(25, Math.round(m.obtained * 0.24));
      const sa2 = Math.min(75, Math.round(m.obtained * 0.5));
      const ia = Math.min(25, Math.round(m.obtained * 0.2));
      const t2 = fa2 + sa2 + ia;
      const g2 = m.grade;
      const gt = t1 + t2;
      const fg = m.grade;
      return `
    <tr>
      <td class="td-subj">${m.subject}</td>
      <td class="td-num">${fa1}</td><td class="td-num">${sa1}</td><td class="td-num">${t1}</td><td class="td-c">${g1}</td>
      <td class="td-num">${fa2}</td><td class="td-num">${sa2}</td><td class="td-num">${ia}</td><td class="td-num">${t2}</td><td class="td-c">${g2}</td>
      <td class="td-num">${gt}</td><td class="td-c"><strong>${fg}</strong></td>
    </tr>`;
    })
    .join('');

  const coScholasticRows = `
    <tr><td class="td-left">Art and Craft</td><td class="td-c">A</td><td class="td-c">A</td></tr>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @media print {
      body { padding: 0; background: #fff; }
      .sample-badge { border: 1px solid #000; }
    }
    body {
      font-family: ${fontFamily};
      padding: 16px;
      background: #e5e5e5;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-card {
      width: 1120px;
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
      position: relative;
      border: 1px solid #000;
    }
    .sample-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 8px;
      border: 1px solid #000;
      background: #fff;
      z-index: 5;
    }
    ${showWatermark ? `
    .wm-wrap { position: relative; }
    .watermark {
      position: absolute;
      left: 50%;
      top: 42%;
      transform: translate(-50%, -50%);
      width: ${watermarkSize * 0.45}px;
      height: ${watermarkSize * 0.45}px;
      opacity: ${watermarkOpacity};
      pointer-events: none;
      z-index: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #bbb;
      font-size: 14px;
      font-weight: 700;
      border: 1px solid #ddd;
    }
    .wm-body { position: relative; z-index: 1; }
    ` : '.wm-wrap { } .wm-body { }'}
    .pink-strip {
      background: ${primaryColor};
      color: #fff;
      padding: 14px 20px;
      border-bottom: 1px solid #000;
    }
    .strip-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .logo-circle {
      width: ${leftLogoSize * 0.72}px;
      height: ${leftLogoSize * 0.72}px;
      min-width: ${leftLogoSize * 0.72}px;
      border: 2px solid #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      color: #fff;
      background: rgba(255,255,255,0.12);
    }
    .logo-circle.right {
      width: ${rightLogoSize * 0.72}px;
      height: ${rightLogoSize * 0.72}px;
      min-width: ${rightLogoSize * 0.72}px;
    }
    .strip-center {
      flex: 1;
      text-align: center;
      padding: 0 12px;
    }
    .strip-school {
      font-size: ${Math.min(26, Math.max(16, schoolNameFontSize))}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.15;
      color: ${schoolNameColor};
    }
    .strip-line {
      font-size: 10px;
      line-height: 1.35;
      margin-top: 4px;
      color: #fff;
      opacity: 0.95;
    }
    .strip-sub {
      font-size: 10px;
      margin-top: 2px;
      color: #fff;
      opacity: 0.9;
    }
    .annual-line {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 10px 12px 12px;
      border-bottom: 1px solid #000;
      background: #fff;
    }
    .body-pad { padding: 12px 16px 18px; }
    .section-h {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      margin: 10px 0 6px;
      border-bottom: 1px solid ${primaryColor};
      padding-bottom: 2px;
      color: ${primaryColor};
    }
    .student-wrap {
      display: flex;
      gap: 14px;
      align-items: stretch;
      margin-bottom: 10px;
      border: 1px solid #000;
      padding: 8px 10px;
    }
    .student-cols {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 28px;
      font-size: 10px;
    }
    .kv { display: flex; gap: 6px; line-height: 1.35; }
    .kv b { min-width: 108px; font-weight: 700; }
    .photo-box {
      width: 88px;
      min-width: 88px;
      border: 1px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #666;
      text-align: center;
      padding: 4px;
    }
    .tbl-wrap { position: relative; margin-bottom: 8px; }
    table.marks {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      border: 1px solid #000;
    }
    table.marks th, table.marks td {
      border: 1px solid #000;
      padding: 3px 4px;
      vertical-align: middle;
    }
    table.marks th {
      font-weight: 700;
      text-align: center;
      background: #fff;
    }
    .td-subj { text-align: left; font-weight: 600; }
    .td-num { text-align: center; }
    .td-c { text-align: center; font-weight: 600; }
    .tr-max td { font-weight: 700; background: #f5f5f5; }
    .scale-row td {
      font-size: 9px;
      line-height: 1.3;
      padding: 4px 6px;
    }
    .summary-row {
      display: flex;
      border: 1px solid #000;
      margin-bottom: 8px;
      font-size: 10px;
    }
    .summary-cell {
      flex: 1;
      border-right: 1px solid #000;
      padding: 6px 8px;
      text-align: center;
    }
    .summary-cell:last-child { border-right: 0; }
    .summary-cell .lbl { font-weight: 700; display: block; margin-bottom: 2px; }
    table.cos {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      border: 1px solid #000;
      margin-bottom: 8px;
    }
    table.cos th, table.cos td {
      border: 1px solid #000;
      padding: 4px 6px;
    }
    table.cos th { font-weight: 700; text-align: center; background: #fff; }
    .td-left { text-align: left; }
    .remark-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      font-size: 10px;
      border: 1px solid #000;
      padding: 8px 10px;
      margin-bottom: 10px;
      min-height: 48px;
    }
    .remark-main { flex: 1; }
    .remark-sig { width: 200px; text-align: center; font-size: 9px; padding-top: 20px; border-left: 1px solid #ccc; padding-left: 12px; }
    .sig-underline { border-bottom: 1px solid #000; min-height: 28px; margin-bottom: 4px; }
    .foot-sigs {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #000;
    }
    .foot-sigs .col { flex: 1; text-align: center; }
    .foot-sigs .col.date { text-align: left; flex: 0.9; }
    .foot-sigs .col.prin { text-align: right; flex: 0.9; }
    .sig-line-f {
      border-bottom: 1px solid #000;
      min-height: 36px;
      margin: 0 auto 4px;
      max-width: 220px;
    }
    .inst-box {
      margin-top: 10px;
      font-size: 9px;
      border: 1px solid #000;
      padding: 8px 10px;
      line-height: 1.45;
    }
    .inst-box strong { display: block; margin-bottom: 4px; font-size: 10px; }
    .att-inline { font-size: 9px; margin-bottom: 6px; border: 1px solid #000; padding: 4px 8px; }
  </style>
</head>
<body>
  <div class="report-card">
    <div class="sample-badge">Sample preview</div>

    <div class="pink-strip">
      <div class="strip-row">
        <div class="logo-circle">LOGO</div>
        <div class="strip-center">
          <div class="strip-school">DEMO PUBLIC SCHOOL</div>
          <div class="strip-line">Email: ${schoolEmail} | Affiliation No: ${affiliation} | Phone: ${schoolPhone}</div>
          <div class="strip-line">${schoolAddress}</div>
          <div class="strip-sub">${subTitle} · ${reportTitle}</div>
        </div>
        ${showRightLogo ? '<div class="logo-circle right">LOGO</div>' : '<div class="logo-circle right" style="visibility:hidden;border-color:transparent;background:transparent"></div>'}
      </div>
    </div>
    <div class="annual-line">ANNUAL REPORT – ${academicYear}</div>

    <div class="body-pad wm-wrap">
      ${showWatermark ? '<div class="watermark">LOGO</div>' : ''}
      <div class="wm-body">

      ${showStudentProfile ? `
      <div class="section-h">${sectionStudentProfile}</div>
      <div class="student-wrap">
        <div class="student-cols">
          <div class="kv"><b>Admission No.</b><span>ADM2024001</span></div>
          <div class="kv"><b>Roll No.</b><span>15</span></div>
          <div class="kv"><b>Student Name</b><span>John Doe</span></div>
          <div class="kv"><b>Class</b><span>Grade-10 10-A</span></div>
          <div class="kv"><b>${(labels.father_name as string) || "Father's Name"}</b><span>Mr. Robert Doe</span></div>
          <div class="kv"><b>Contact No.</b><span>${schoolPhone}</span></div>
          <div class="kv"><b>${(labels.mother_name as string) || "Mother's Name"}</b><span>Mrs. Jane Doe</span></div>
          <div class="kv"><b>Date of Birth</b><span>01/01/2010</span></div>
        </div>
        <div class="photo-box">Passport<br/>photo</div>
      </div>
      ` : ''}

      ${showMarksTable ? `
      <div class="section-h">${sectionScholastic} — ${examName}</div>
      <div class="tbl-wrap">
        <table class="marks" cellspacing="0" cellpadding="0">
          <thead>
            <tr>
              <th rowspan="2" style="min-width:88px;">Subject</th>
              <th colspan="4">Term-I</th>
              <th colspan="5">Term-II</th>
              <th rowspan="2">Grand Total<br/>(250)</th>
              <th rowspan="2">Grade</th>
            </tr>
            <tr>
              <th>F.A.-1</th><th>S.A.-1</th><th>Total</th><th>Grade</th>
              <th>F.A.-2</th><th>S.A.-2</th><th>I.A./PR.</th><th>Total</th><th>Grade</th>
            </tr>
          </thead>
          <tbody>
            <tr class="tr-max">
              <td class="td-subj">Maximum Marks</td>
              <td class="td-num">25</td><td class="td-num">75</td><td class="td-num">100</td><td class="td-c"></td>
              <td class="td-num">25</td><td class="td-num">75</td><td class="td-num">25</td><td class="td-num">200</td><td class="td-c"></td>
              <td class="td-num">250</td><td class="td-c"></td>
            </tr>
            ${marksRows}
            ${showGradingScale ? `
            <tr class="scale-row">
              <td colspan="12"><strong>Grading Scale:</strong> A1(91%-100%), A2(81%-90%), B1(71%-80%), B2(61%-70%), C1(51%-60%), C2(41%-50%), D(33%-40%), E1(0%-32%)</td>
            </tr>` : ''}
          </tbody>
        </table>
      </div>

      ${showAttendance ? `<div class="att-inline"><strong>${(labels.attendance as string) || 'Attendance'} (sample):</strong> 180 / 200 (90%)</div>` : ''}

      <div class="summary-row">
        <div class="summary-cell"><span class="lbl">Overall Marks</span>1008 / 2000</div>
        <div class="summary-cell"><span class="lbl">Percentage</span>50.4%</div>
        <div class="summary-cell"><span class="lbl">Grade</span>B1</div>
        <div class="summary-cell"><span class="lbl">Rank</span>—</div>
      </div>
      ` : ''}

      ${showCoScholastic ? `
      <div class="section-h">${sectionCoScholastic}</div>
      <table class="cos" cellspacing="0" cellpadding="0">
        <thead>
          <tr>
            <th style="text-align:left;">Activity</th>
            <th>Term-I</th>
            <th>Term-II</th>
          </tr>
        </thead>
        <tbody>${coScholasticRows}</tbody>
      </table>
      ` : ''}

      ${showRemarks ? `
      <div class="remark-row">
        <div class="remark-main">
          <strong>Remark:</strong>
          ${customRemarks || 'GOOD — Excellent performance throughout the academic year. Participates actively in class.'}
        </div>
        <div class="remark-sig">
          <div class="sig-underline"></div>
          <span>${sectionRemarks}</span>
        </div>
      </div>
      ` : ''}

      <div class="foot-sigs">
        <div class="col date">Date: _______________</div>
        <div class="col">
          <div class="sig-line-f"></div>
          <div>Class Teacher&apos;s Signature</div>
        </div>
        <div class="col prin">
          <div class="sig-line-f"></div>
          <div>Principal&apos;s Signature</div>
        </div>
      </div>

      <div style="font-size:9px;margin-top:8px;padding:4px 0;border-top:1px solid #000;">
        <strong>Result:</strong> PASS · <strong>Promoted To:</strong> ${promotedTo} · <strong>Result date (sample):</strong> 15 Mar 2025
      </div>

      ${showInstructions ? `
      <div class="inst-box">
        <strong>${sectionInstructions}</strong>
        <div>${instructions}</div>
      </div>
      ` : ''}

      </div>
    </div>
  </div>
</body>
</html>`;
}

export default function ReportCardTemplatesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description?: string; is_system: boolean; config: Config }>>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [config, setConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/report-card/templates?school_code=${schoolCode}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setTemplates(res.data);
        if (res.data?.[0]) {
          setSelectedId(res.data[0].id);
          setConfig(res.data[0].config || {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [schoolCode]);

  useEffect(() => {
    const t = templates.find((x) => x.id === selectedId);
    if (t) setConfig(t.config || {});
  }, [selectedId, templates]);

  const handleSave = async () => {
    const t = templates.find((x) => x.id === selectedId);
    if (!t) return;
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
  const content = (config.content as Record<string, unknown>) || {};
  const selectedTemplate = templates.find((x) => x.id === selectedId);
  const isSystem = selectedTemplate?.is_system ?? false;

  // Generate preview HTML based on current config
  const previewHTML = useMemo(() => generatePreviewHTML(config), [config]);

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
          <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/report-card`)} className="border-[#1e3a8a] text-[#1e3a8a]">
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      <Card>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Template</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_system ? '(System)' : ''}
                </option>
              ))}
            </select>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name Font Size</label>
                <input type="number" min={12} max={28} value={Number(header.font_size) || 18} onChange={(e) => updateConfig(['header', 'font_size'], parseInt(e.target.value) || 18)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sub-title</label>
                <input type="text" value={(header.sub_title as string) ?? ''} onChange={(e) => updateConfig(['header', 'sub_title'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="SENIOR SECONDARY SCHOOL" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="showRightLogo" checked={logos.show_right_logo !== false} onChange={(e) => updateConfig(['logos', 'show_right_logo'], e.target.checked)} />
                <label htmlFor="showRightLogo" className="text-sm font-medium">Show Right Logo</label>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Section Visibility</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks Section Name</label>
                <input type="text" value={(labels.section_remarks as string) ?? 'Class Teacher Remarks'} onChange={(e) => updateConfig(['labels', 'section_remarks'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Class Teacher Remarks" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <input type="text" value={(content.academic_year as string) ?? ''} onChange={(e) => updateConfig(['content', 'academic_year'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="2024-25" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Name</label>
                <input type="text" value={(content.exam_name as string) ?? ''} onChange={(e) => updateConfig(['content', 'exam_name'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Final Examination" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Promoted To (Next Class)</label>
                <input type="text" value={(content.promoted_to as string) ?? ''} onChange={(e) => updateConfig(['content', 'promoted_to'], e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Class 11" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Remarks (Pre-printed)</label>
                <textarea 
                  value={(content.remarks as string) ?? ''} 
                  onChange={(e) => updateConfig(['content', 'remarks'], e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg" 
                  placeholder="Enter default remarks text (teachers can add handwritten remarks in the space provided)..."
                  rows={2}
                />
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
                  max={600} 
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
                  max="0.2" 
                  step="0.01"
                  value={String(Number((config.watermark as Record<string, unknown>)?.opacity) || 0.08)} 
                  onChange={(e) => updateConfig(['watermark', 'opacity'], parseFloat(e.target.value))} 
                  className="w-full" 
                />
                <span className="text-xs text-gray-500">{Math.round((Number((config.watermark as Record<string, unknown>)?.opacity) || 0.08) * 100)}%</span>
              </div>
            </div>
          </section>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
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
