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

  // Sample data for preview
  const sampleMarks = [
    { subject: 'English', max: 100, obtained: 85, pct: '85.0%', grade: 'A' },
    { subject: 'Mathematics', max: 100, obtained: 92, pct: '92.0%', grade: 'A+' },
    { subject: 'Science', max: 100, obtained: 78, pct: '78.0%', grade: 'B+' },
    { subject: 'Social Studies', max: 100, obtained: 88, pct: '88.0%', grade: 'A' },
    { subject: 'Hindi', max: 100, obtained: 75, pct: '75.0%', grade: 'B+' },
  ];

  const marksRows = sampleMarks.map((m, i) => `
    <tr>
      <td style="text-align: center;">${i + 1}</td>
      <td><strong>${m.subject}</strong></td>
      <td style="text-align: center;">${m.max}</td>
      <td style="text-align: center;"><strong>${m.obtained}</strong></td>
      <td style="text-align: center;">${m.pct}</td>
      <td style="text-align: center;"><strong style="color: ${primaryColor};">${m.grade}</strong></td>
    </tr>
  `).join('');

  const coScholasticRows = `
    <tr><td>Work Education</td><td class="text-center">A</td><td class="text-center">A</td></tr>
    <tr><td>Art Education</td><td class="text-center">B</td><td class="text-center">A</td></tr>
    <tr><td>Health & Physical Education</td><td class="text-center">A</td><td class="text-center">A</td></tr>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${fontFamily}; 
      padding: 20px; 
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); 
      color: #000; 
    }
    .report-card { 
      max-width: 900px; 
      margin: 0 auto; 
      background: white;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }
    ${showWatermark ? `
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${watermarkSize * 0.5}px;
      height: ${watermarkSize * 0.5}px;
      opacity: ${watermarkOpacity};
      pointer-events: none;
      z-index: 0;
      background: linear-gradient(135deg, ${primaryColor}, ${accentColor});
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
      font-weight: bold;
    }
    .content {
      position: relative;
      z-index: 1;
    }
    ` : ''}
    .header-border {
      height: 8px;
      background: linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%);
    }
    .header { 
      display: flex; 
      align-items: flex-start; 
      justify-content: space-between; 
      padding: 25px 30px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border-bottom: 3px solid ${primaryColor};
    }
    .logo-left { 
      width: ${leftLogoSize * 0.7}px; 
      height: ${leftLogoSize * 0.7}px; 
      background: linear-gradient(135deg, ${primaryColor}, ${accentColor}); 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 10px; 
      color: white;
      font-weight: bold;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .logo-right { 
      width: ${rightLogoSize * 0.7}px; 
      height: ${rightLogoSize * 0.7}px; 
      background: linear-gradient(135deg, ${accentColor}, ${primaryColor}); 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 10px; 
      color: white;
      font-weight: bold;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .header-center { text-align: center; flex: 1; padding: 0 20px; }
    .school-name { 
      color: ${schoolNameColor}; 
      font-size: ${schoolNameFontSize * 0.8}px; 
      font-weight: 900; 
      margin-bottom: 4px;
      letter-spacing: 1px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
    }
    .subtitle { font-size: 12px; color: #555; font-weight: 600; margin: 2px 0; }
    .contact-info { font-size: 10px; color: #666; margin: 2px 0; }
    .session-badge { 
      display: inline-block;
      background: linear-gradient(135deg, ${primaryColor}, ${accentColor});
      color: white;
      padding: 6px 20px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 11px;
      margin-top: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .content { padding: 30px; }
    .section-title { 
      font-size: 13px; 
      font-weight: 800; 
      color: white;
      background: linear-gradient(135deg, ${primaryColor}, ${accentColor});
      margin: 20px -30px 15px;
      padding: 10px 30px;
      text-transform: uppercase;
      letter-spacing: 1px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .part-title { 
      font-size: 12px; 
      font-weight: 700; 
      color: ${accentColor}; 
      margin: 15px 0 8px;
      padding-bottom: 4px;
      border-bottom: 2px solid ${accentColor};
    }
    .profile-grid { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 8px 25px; 
      margin-bottom: 15px; 
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid ${primaryColor};
    }
    .profile-item { 
      display: flex; 
      gap: 8px; 
      font-size: 11px;
      align-items: baseline;
    }
    .profile-label { 
      font-weight: 700; 
      min-width: 130px; 
      color: #555;
    }
    .profile-value { color: #000; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td { border: 1px solid #ddd; padding: 10px 8px; font-size: 11px; }
    th { 
      background: ${headerBgColor}; 
      font-weight: 700; 
      text-align: left;
      color: #333;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    tr:nth-child(even) { background: #f9fafb; }
    tr:hover { background: #f0f4f8; }
    .text-center { text-align: center; }
    .summary-box {
      display: flex;
      gap: 30px;
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      padding: 15px 20px;
      border-radius: 8px;
      margin: 15px 0;
      border: 2px solid ${primaryColor};
      align-items: center;
      justify-content: center;
    }
    .summary-item {
      text-align: center;
    }
    .summary-label {
      font-size: 10px;
      color: #666;
      font-weight: 600;
      text-transform: uppercase;
    }
    .summary-value {
      font-size: 18px;
      font-weight: 800;
      color: ${primaryColor};
      margin-top: 2px;
    }
    .remarks-box {
      background: #fffef7;
      border: 2px dashed ${accentColor};
      border-radius: 8px;
      padding: 20px;
      min-height: 80px;
      margin: 15px 0;
      position: relative;
    }
    .remarks-label {
      position: absolute;
      top: -10px;
      left: 15px;
      background: white;
      padding: 0 8px;
      font-weight: 700;
      font-size: 10px;
      color: ${accentColor};
      text-transform: uppercase;
    }
    .remarks-content {
      font-size: 11px;
      color: #333;
      font-style: italic;
      line-height: 1.6;
    }
    .result-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #d4edda, #c3e6cb);
      border: 2px solid #28a745;
      border-radius: 8px;
      padding: 12px 20px;
      margin: 15px 0;
    }
    .result-item {
      font-size: 11px;
    }
    .result-label {
      font-weight: 700;
      color: #155724;
    }
    .result-value {
      font-weight: 800;
      color: #28a745;
      font-size: 13px;
    }
    .signatures { 
      display: flex; 
      justify-content: space-around; 
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
    }
    .sig-block { text-align: center; }
    .sig-line { 
      width: 150px; 
      border-bottom: 2px solid #333; 
      margin: 50px auto 8px;
    }
    .sig-label {
      font-size: 10px;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
    }
    .grade-scale { 
      margin-top: 15px;
      background: #f8f9fa;
      padding: 10px 12px;
      border-radius: 6px;
      border-left: 3px solid ${accentColor};
    }
    .grade-scale-title {
      font-size: 9px;
      font-weight: 700;
      color: ${accentColor};
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .grade-scale-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .grade-item {
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 3px 6px;
      text-align: center;
      min-width: 40px;
    }
    .grade-letter {
      font-size: 11px;
      font-weight: 700;
      color: ${primaryColor};
    }
    .grade-range {
      font-size: 7px;
      color: #666;
    }
    .instructions { 
      margin-top: 20px; 
      font-size: 10px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px 15px;
      border-radius: 6px;
    }
    .instructions strong {
      color: #856404;
      display: block;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .instructions-text {
      color: #856404;
      line-height: 1.6;
    }
    .sample-badge { 
      position: absolute; 
      top: 15px; 
      right: 15px; 
      background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
      color: white; 
      padding: 6px 12px; 
      border-radius: 20px; 
      font-size: 10px; 
      font-weight: 800;
      box-shadow: 0 4px 10px rgba(255,107,107,0.3);
      z-index: 10;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="report-card">
    <div class="sample-badge">SAMPLE PREVIEW</div>
    ${showWatermark ? '<div class="watermark">LOGO</div>' : ''}
    <div class="header-border"></div>
    <div class="header">
      <div class="logo-left">LOGO</div>
      <div class="header-center">
        <div class="contact-info">School Code: SCH001 | Affiliation No: ${affiliation}</div>
        <div class="school-name">DEMO PUBLIC SCHOOL</div>
        <div class="subtitle">${subTitle}</div>
        <div class="contact-info">(Affiliated to C.B.S.E New Delhi)</div>
        <div class="contact-info">${schoolAddress}</div>
        <div class="contact-info">Email: ${schoolEmail} | Phone: ${schoolPhone}</div>
        <div class="session-badge">${reportTitle} | ${academicYear}</div>
      </div>
      ${showRightLogo ? '<div class="logo-right">LOGO</div>' : '<div style="width: 60px;"></div>'}
    </div>

    <div class="content">
      ${showStudentProfile ? `
      <div class="section-title">📋 ${sectionStudentProfile}</div>
      <div class="profile-grid">
        <div class="profile-item"><span class="profile-label">Student Name:</span> <span class="profile-value">John Doe</span></div>
        <div class="profile-item"><span class="profile-label">Class & Section:</span> <span class="profile-value">10-A</span></div>
        <div class="profile-item"><span class="profile-label">${(labels.father_name as string) || "Father's Name"}:</span> <span class="profile-value">Mr. Robert Doe</span></div>
        <div class="profile-item"><span class="profile-label">${(labels.mother_name as string) || "Mother's Name"}:</span> <span class="profile-value">Mrs. Jane Doe</span></div>
        <div class="profile-item"><span class="profile-label">Address:</span> <span class="profile-value">456 Sample Street, Delhi</span></div>
        <div class="profile-item"><span class="profile-label">Admission No:</span> <span class="profile-value">ADM2024001</span></div>
        <div class="profile-item"><span class="profile-label">Contact No:</span> <span class="profile-value">9876543210</span></div>
        <div class="profile-item"><span class="profile-label">Roll Number:</span> <span class="profile-value">15</span></div>
      </div>
      ` : ''}

      ${showMarksTable ? `
      <div class="section-title">📊 ${sectionAcademicPerformance}</div>
      <div class="part-title">${sectionScholastic} (${examName})</div>
      <table>
        <thead>
          <tr>
            <th style="width: 60px; text-align: center;">S.No</th>
            <th>Subject</th>
            <th style="width: 100px; text-align: center;">Max Marks</th>
            <th style="width: 120px; text-align: center;">Marks Obtained</th>
            <th style="width: 100px; text-align: center;">Percentage</th>
            <th style="width: 80px; text-align: center;">Grade</th>
          </tr>
        </thead>
        <tbody>${marksRows}</tbody>
      </table>

      <div class="summary-box">
        ${showAttendance ? `
        <div class="summary-item">
          <div class="summary-label">${(labels.attendance as string) || 'Attendance'}</div>
          <div class="summary-value">180/200</div>
          <div class="summary-label">90.0%</div>
        </div>` : ''}
        <div class="summary-item">
          <div class="summary-label">Grand Total</div>
          <div class="summary-value">418/500</div>
          <div class="summary-label">83.6%</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Overall Grade</div>
          <div class="summary-value">A</div>
        </div>
      </div>
      ` : ''}

      ${showCoScholastic ? `
      <div class="part-title">${sectionCoScholastic}</div>
      <table>
        <thead>
          <tr>
            <th>Co-Scholastic Area</th>
            <th style="width: 120px; text-align: center;">Term-1 Grade</th>
            <th style="width: 120px; text-align: center;">Term-2 Grade</th>
          </tr>
        </thead>
        <tbody>${coScholasticRows}</tbody>
      </table>
      ` : ''}

      ${showRemarks ? `
      <div class="remarks-box">
        <div class="remarks-label">${sectionRemarks}</div>
        <div class="remarks-content">
          ${customRemarks || 'Excellent performance throughout the academic year. Shows great enthusiasm in learning and participates actively in class discussions.'}
        </div>
        <div style="margin-top: 12px; border-top: 1px dashed #ccc; padding-top: 8px;">
          <div style="font-size: 9px; color: #666; margin-bottom: 4px;">Teacher's Handwritten Remarks:</div>
          <div style="min-height: 35px; border-bottom: 1px solid #ddd; margin-bottom: 6px;"></div>
          <div style="min-height: 1px; border-bottom: 1px solid #ddd;"></div>
        </div>
      </div>
      ` : ''}

      <div class="result-box">
        <div class="result-item">
          <span class="result-label">Result:</span> 
          <span class="result-value">✓ PASS</span>
        </div>
        <div class="result-item">
          <span class="result-label">Rank:</span> 
          <span class="result-value">3rd</span>
        </div>
        <div class="result-item">
          <span class="result-label">Promoted To:</span> 
          <span class="result-value">${promotedTo}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Result Date:</span> 
          <span class="result-value">15 Mar 2025</span>
        </div>
      </div>

      <div class="signatures">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-label">Class Teacher</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-label">Principal</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-label">Parent / Guardian</div>
        </div>
      </div>

      ${showGradingScale ? `
      <div class="grade-scale">
        <div class="grade-scale-title">📌 Grading Scale</div>
        <div class="grade-scale-grid">
          <div class="grade-item">
            <div class="grade-letter">A+</div>
            <div class="grade-range">91-100</div>
          </div>
          <div class="grade-item">
            <div class="grade-letter">A</div>
            <div class="grade-range">81-90</div>
          </div>
          <div class="grade-item">
            <div class="grade-letter">B+</div>
            <div class="grade-range">71-80</div>
          </div>
          <div class="grade-item">
            <div class="grade-letter">B</div>
            <div class="grade-range">61-70</div>
          </div>
          <div class="grade-item">
            <div class="grade-letter">C</div>
            <div class="grade-range">51-60</div>
          </div>
          <div class="grade-item">
            <div class="grade-letter">D</div>
            <div class="grade-range">33-50</div>
          </div>
        </div>
      </div>
      ` : ''}

      ${showInstructions ? `
      <div class="instructions">
        <strong>⚠️ ${sectionInstructions}</strong>
        <div class="instructions-text">${instructions}</div>
      </div>
      ` : ''}
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
