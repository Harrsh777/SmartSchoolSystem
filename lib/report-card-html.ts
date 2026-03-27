/**
 * Generate HTML report card matching the reference design
 * All data fetched from DB - no hardcoded values
 */

export interface ExamMarksData {
  exam_id: string;
  exam_name: string;
  term_id?: string | null;
  term_name?: string;
  term_serial?: number;
  marks_obtained: number | null;
  max_marks: number;
  grade?: string;
}

export interface MultiExamSubjectMarks {
  subject: { name: string };
  exams: ExamMarksData[];
  term_totals?: Array<{
    term_id: string;
    term_name: string;
    term_serial?: number;
    total_obtained: number;
    total_max: number;
    grade?: string;
  }>;
  overall_max_marks: number;
  overall_marks_obtained: number | null;
  overall_grade?: string;
}

export interface ReportCardData {
  school: {
    school_name: string;
    school_code: string;
    affiliation?: string;
    school_email?: string;
    school_phone?: string;
    school_address?: string;
    logo_url?: string | null;
    right_logo_url?: string | null;
    principal_name?: string;
    instructions?: string;
    sub_title?: string;
  };
  student: {
    student_name: string;
    admission_no: string;
    class: string;
    section: string;
    father_name?: string;
    mother_name?: string;
    address?: string;
    student_contact?: string;
    roll_number?: string;
    photo_url?: string | null;
  };
  exam: {
    exam_name: string;
    academic_year: string;
    result_date?: string;
  };
  // For single exam
  marks: Array<{
    subject: { name: string };
    max_marks: number;
    marks_obtained: number | null;
    percentage?: number;
    grade?: string;
    remarks?: string;
  }>;
  // For multiple exams (term-wise display)
  multiExamMarks?: MultiExamSubjectMarks[];
  examsList?: Array<{ id: string; name: string; max_marks_per_subject: number; term_id?: string | null; term_name?: string; term_serial?: number }>;
  summary: {
    total_marks?: number;
    total_max_marks?: number;
    percentage?: number;
    grade?: string;
  } | null;
  attendance: {
    present: number;
    total: number;
    percentage: number;
  } | null;
  coScholastic: Array<{ name: string; term1_grade?: string; term2_grade?: string }> | null;
  gradeScales: Array<{ grade: string; min_marks?: number; max_marks?: number; min_percentage?: number; max_percentage?: number }>;
  remarks?: string;
  rank?: string | number;
  result?: 'Pass' | 'Fail';
  promoted_to?: string;
}

export interface ReportCardTemplateConfig {
  logos?: { left_size?: number; right_size?: number; show_right_logo?: boolean; left_shape?: string; right_shape?: string };
  header?: { school_name_color?: string; font_size?: number; sub_title?: string; show_affiliation?: boolean; show_email?: boolean; show_contact?: boolean };
  labels?: Record<string, string>;
  branding?: { primary_color?: string; accent_color?: string; font_family?: string };
  watermark?: { enabled?: boolean; size?: number; opacity?: number };
  sections?: {
    show_student_profile?: boolean;
    show_marks_table?: boolean;
    show_attendance?: boolean;
    show_co_scholastic?: boolean;
    show_remarks?: boolean;
    show_instructions?: boolean;
    show_grading_scale?: boolean;
    [key: string]: boolean | undefined;
  };
  marks_table?: { header_bg_color?: string; show_sno?: boolean; show_percentage?: boolean; show_grade?: boolean; show_max_marks?: boolean; zebra_rows?: boolean; round_percentage?: boolean };
  student_profile_fields?: string[];
  layout?: { header_layout?: string; orientation?: string; table_density?: string };
  class_term_info?: { show_exam_name?: boolean; show_academic_session?: boolean; show_result_date?: boolean };
  attendance_display?: string;
  result_summary?: { show_total?: boolean; show_percentage?: boolean; show_grade?: boolean; show_rank?: boolean; show_pass_fail?: boolean };
  signatures?: { show_class_teacher?: boolean; show_principal?: boolean };
  output?: { watermark?: string };
}

export function generateReportCardHTML(data: ReportCardData, templateConfig?: ReportCardTemplateConfig): string {
  // Use the same landscape HTML structure as the template live preview.
  // This ensures generated report cards match the updated "new format".
  return generateLandscapeReportCardHTML(data, templateConfig);
  const { school, student, exam, marks, summary, attendance, coScholastic, gradeScales, multiExamMarks, examsList } = data;
  const cfg = templateConfig || {};
  const labels = cfg.labels || {};
  const content = (cfg as Record<string, unknown>).content as Record<string, unknown> || {};

  const examName = exam.exam_name || 'Examination';
  const academicYear = exam.academic_year || 'N/A';
  const schoolName = (school.school_name || 'School').toUpperCase();
  const leftLogo = school.logo_url || '';
  const showRightLogo = cfg.logos?.show_right_logo !== false;
  const rightLogo = showRightLogo ? (school.right_logo_url || school.logo_url || '') : '';
  const leftLogoSize = cfg.logos?.left_size ?? 100;
  const rightLogoSize = cfg.logos?.right_size ?? 100;
  const schoolNameColor = cfg.header?.school_name_color ?? '#8B0000';
  const schoolNameFontSize = cfg.header?.font_size ?? 18;
  const subTitle = cfg.header?.sub_title ?? school.sub_title ?? 'SENIOR SECONDARY SCHOOL';
  const reportTitle = labels.report_title ?? 'REPORT CARD';
  const headerBgColor = cfg.marks_table?.header_bg_color ?? '#e6f0e6';
  const fontFamily = cfg.branding?.font_family ?? 'Arial, sans-serif';
  const primaryColor = cfg.branding?.primary_color ?? '#1e3a8a';
  const accentColor = cfg.branding?.accent_color ?? '#3B82F6';

  // Watermark settings
  const watermark = (cfg as Record<string, unknown>).watermark as Record<string, unknown> || {};
  const showWatermark = watermark.enabled !== false && Boolean(leftLogo);
  const watermarkSize = Math.min(Math.max((watermark.size as number) || 500, 100), 900);
  const watermarkOpacity = Math.min(Math.max((watermark.opacity as number) ?? 0.08, 0.02), 0.35);

  // Section titles (customizable)
  const sectionStudentProfile = (labels.section_student_profile as string) ?? 'Student Profile';
  const sectionAcademicPerformance = (labels.section_academic_performance as string) ?? 'Academic Performance';
  const sectionScholastic = (labels.section_scholastic as string) ?? 'Part I: Scholastic Areas';
  const sectionCoScholastic = (labels.section_co_scholastic as string) ?? 'Part II: Co-Scholastic Areas';
  const sectionRemarks = (labels.section_remarks as string) ?? 'Class Teacher Remarks';
  const sectionGradingScale = (labels.section_grading_scale as string) ?? 'Grading Scale';
  const sectionInstructions = (labels.section_instructions as string) ?? 'Important Instructions';

  // Section visibility - default to true if not specified
  const sections = cfg.sections || {};
  const showStudentProfile = sections.show_student_profile !== false;
  const showMarksTable = sections.show_marks_table !== false;
  const showAttendance = sections.show_attendance !== false;
  const showCoScholastic = sections.show_co_scholastic !== false;
  const showRemarks = sections.show_remarks !== false;
  const showInstructions = sections.show_instructions !== false;
  const showGradingScale = sections.show_grading_scale !== false;

  // Editable content from template config (or fallback to school data)
  const schoolEmail = (content.school_email as string) || school.school_email || '';
  const schoolPhone = (content.school_phone as string) || school.school_phone || '';
  const schoolAddress = (content.school_address as string) || school.school_address || '';
  const affiliation = (content.affiliation as string) || school.affiliation || '';
  const promotedTo = (content.promoted_to as string) || data.promoted_to || '';
  const instructionsText = (content.instructions as string) || school.instructions || 'Minimum Passing Marks in Each Subject is 33%. Students can collect their Starter Kit from fee counter after enrolment in new class. Report any discrepancies within 7 days.';
  const customRemarks = (content.remarks as string) || data.remarks || '';

  const totalObtained = summary?.total_marks ?? marks.reduce((s, m) => s + (m.marks_obtained ?? 0), 0);
  const totalMax = summary?.total_max_marks ?? marks.reduce((s, m) => s + (m.max_marks || 0), 0);
  const overallPct = summary?.percentage ?? (totalMax > 0 ? (totalObtained / totalMax) * 100 : 0);
  const overallGrade = summary?.grade ?? (gradeScales.length ? getGradeFromMarks(gradeScales, totalObtained, totalMax) : '-');
  const isPass = overallPct >= 33;

  // Check if multi-exam mode (term-wise display)
  const isMultiExam = (multiExamMarks?.length ?? 0) > 0 && (examsList?.length ?? 0) > 1;

  // Horizontal grading scale items (smaller)
  const gradeScaleItems = gradeScales
    .sort((a, b) => (b.max_marks ?? b.max_percentage ?? 0) - (a.max_marks ?? a.max_percentage ?? 0))
    .map((g) => `
      <div class="grade-item">
        <div class="grade-letter">${g.grade}</div>
        <div class="grade-range">${g.min_marks ?? g.min_percentage ?? '-'}-${g.max_marks ?? g.max_percentage ?? '-'}</div>
      </div>
    `)
    .join('');

  // Single exam marks rows
  const marksRows = marks
    .map((m, i) => {
      const max = m.max_marks || 0;
      const obtained = m.marks_obtained;
      const isAbsent = obtained === null || String(m.remarks || '').toLowerCase() === 'absent';
      const pct = !isAbsent && max > 0 ? ((obtained ?? 0) / max) * 100 : 0;
      const grade = m.grade || (gradeScales.length ? getGradeFromMarks(gradeScales, obtained ?? 0, max) : '-');
      return `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td><strong>${m.subject?.name || 'N/A'}</strong></td>
          <td style="text-align: center;">${max}</td>
          <td style="text-align: center;"><strong>${isAbsent ? 'AB' : obtained ?? '-'}</strong></td>
          <td style="text-align: center;">${isAbsent ? '-' : pct.toFixed(1) + '%'}</td>
          <td style="text-align: center;"><strong style="color: ${primaryColor};">${grade}</strong></td>
        </tr>
      `;
    })
    .join('');

  // Multi-exam marks rows (term-wise like the image)
  const multiExamMarksRows = isMultiExam ? multiExamMarks!.map((m, i) => {
    let row = `<tr>
      <td style="text-align: center;">${i + 1}</td>
      <td><strong>${m.subject?.name || 'N/A'}</strong></td>`;
    
    // Add columns for each exam
    for (const examData of m.exams) {
      const obtained = examData.marks_obtained;
      const isAbsent = obtained === null;
      row += `
        <td style="text-align: center;">${isAbsent ? '-' : obtained}</td>
        <td style="text-align: center;"><strong style="color: ${primaryColor};">${examData.grade || '-'}</strong></td>`;
    }
    
    // Overall columns
    const overallObtained = m.overall_marks_obtained;
    row += `
      <td style="text-align: center;"><strong>${overallObtained ?? '-'}</strong></td>
      <td style="text-align: center;"><strong style="color: ${primaryColor};">${m.overall_grade || '-'}</strong></td>
    </tr>`;
    return row;
  }).join('') : '';

  // Multi-exam table headers
  const multiExamHeaders = isMultiExam ? (() => {
    let headers = `<tr>
      <th rowspan="2" style="text-align: center; width: 30px; font-size: 7px;">S.No</th>
      <th rowspan="2" style="font-size: 8px;">Subject</th>`;
    
    for (const examInfo of examsList!) {
      headers += `<th colspan="2" style="text-align: center; background: ${headerBgColor}; font-size: 8px;">${examInfo.name}</th>`;
    }
    headers += `<th colspan="2" style="text-align: center; background: ${accentColor}; color: white; font-size: 8px;">Overall</th>
    </tr>
    <tr>`;
    
    for (let j = 0; j < examsList!.length; j++) {
      headers += `
        <th style="text-align: center; font-size: 7px;">Marks</th>
        <th style="text-align: center; font-size: 7px;">Grade</th>`;
    }
    headers += `
      <th style="text-align: center; font-size: 7px; background: ${accentColor}; color: white;">Total</th>
      <th style="text-align: center; font-size: 7px; background: ${accentColor}; color: white;">Grade</th>
    </tr>`;
    return headers;
  })() : '';

  const coScholasticRows =
    coScholastic?.map(
      (c) =>
        `<tr>
          <td>${c.name}</td>
          <td style="text-align: center;">${c.term1_grade ?? '-'}</td>
          <td style="text-align: center;">${c.term2_grade ?? '-'}</td>
        </tr>`
    ).join('') ?? '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Card - ${student.student_name} - ${academicYear}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html {
      font-size: 11px;
    }
    body { 
      font-family: ${fontFamily}; 
      padding: 5mm; 
      background: #fff; 
      color: #000; 
    }
    .report-card { 
      width: 190mm;
      max-width: 190mm;
      height: 277mm;
      max-height: 277mm;
      margin: 0 auto; 
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
      position: relative;
      padding-bottom: 10px;
      font-size: 10px;
      page-break-inside: avoid;
    }
    ${showWatermark ? `
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${watermarkSize}px;
      height: ${watermarkSize}px;
      opacity: ${watermarkOpacity};
      pointer-events: none;
      z-index: 0;
    }
    .watermark img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .content {
      position: relative;
      z-index: 1;
    }
    ` : ''}
    .header-border {
      height: 5px;
      background: linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%);
    }
    .header { 
      display: flex; 
      align-items: flex-start; 
      justify-content: space-between; 
      padding: 12px 15px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border-bottom: 2px solid ${primaryColor};
    }
    .logo-left { 
      width: ${Math.min(Math.max(Number(leftLogoSize) || 100, 40), 200)}px; 
      height: ${Math.min(Math.max(Number(leftLogoSize) || 100, 40), 200)}px; 
      object-fit: contain;
      background: linear-gradient(135deg, ${primaryColor}, ${accentColor}); 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 12px; 
      color: white;
      font-weight: bold;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .logo-right { 
      width: ${Math.min(Math.max(Number(rightLogoSize) || 100, 40), 200)}px; 
      height: ${Math.min(Math.max(Number(rightLogoSize) || 100, 40), 200)}px; 
      object-fit: contain;
      background: linear-gradient(135deg, ${accentColor}, ${primaryColor}); 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 10px; 
      color: white;
      font-weight: bold;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .logo-left img, .logo-right img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 50%;
    }
    .header-center { text-align: center; flex: 1; padding: 0 10px; }
    .school-name { 
      color: ${schoolNameColor}; 
      font-size: ${Math.min(Math.max(Number(schoolNameFontSize) || 18, 10), 36)}px; 
      font-weight: 900; 
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }
    .subtitle { font-size: 9px; color: #555; font-weight: 600; margin: 1px 0; }
    .contact-info { font-size: 8px; color: #666; margin: 1px 0; }
    .session-badge { 
      display: inline-block;
      background: linear-gradient(135deg, ${primaryColor}, ${accentColor});
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 9px;
      margin-top: 5px;
    }
    .content { padding: 12px 15px; }
    .section-title { 
      font-size: 10px; 
      font-weight: 800; 
      color: white;
      background: linear-gradient(135deg, ${primaryColor}, ${accentColor});
      margin: 10px -15px 8px;
      padding: 6px 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .part-title { 
      font-size: 9px; 
      font-weight: 700; 
      color: ${accentColor}; 
      margin: 8px 0 5px;
      padding-bottom: 3px;
      border-bottom: 1px solid ${accentColor};
    }
    .profile-grid { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 4px 15px; 
      margin-bottom: 8px; 
      background: #f8f9fa;
      padding: 8px 10px;
      border-radius: 4px;
      border-left: 3px solid ${primaryColor};
    }
    .profile-item { 
      display: flex; 
      gap: 5px; 
      font-size: 9px;
      align-items: baseline;
    }
    .profile-label { 
      font-weight: 700; 
      min-width: 90px; 
      color: #555;
    }
    .profile-value { color: #000; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 8px;
      font-size: 9px;
    }
    th, td { border: 1px solid #ddd; padding: 4px 5px; font-size: 9px; }
    th { 
      background: ${headerBgColor}; 
      font-weight: 700; 
      text-align: left;
      color: #333;
      text-transform: uppercase;
      font-size: 8px;
      letter-spacing: 0.3px;
    }
    tr:nth-child(even) { background: #f9fafb; }
    .summary-box {
      display: flex;
      gap: 20px;
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      padding: 8px 15px;
      border-radius: 4px;
      margin: 8px 0;
      border: 1px solid ${primaryColor};
      align-items: center;
      justify-content: center;
    }
    .summary-item {
      text-align: center;
    }
    .summary-label {
      font-size: 8px;
      color: #666;
      font-weight: 600;
      text-transform: uppercase;
    }
    .summary-value {
      font-size: 12px;
      font-weight: 800;
      color: ${primaryColor};
      margin-top: 2px;
    }
    .remarks-box {
      background: #fffef7;
      border: 1px dashed ${accentColor};
      border-radius: 4px;
      padding: 10px 12px;
      min-height: 50px;
      margin: 8px 0;
      position: relative;
    }
    .remarks-label {
      position: absolute;
      top: -8px;
      left: 10px;
      background: white;
      padding: 0 5px;
      font-weight: 700;
      font-size: 8px;
      color: ${accentColor};
      text-transform: uppercase;
    }
    .remarks-content {
      font-size: 9px;
      color: #333;
      font-style: italic;
      line-height: 1.5;
    }
    .result-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #d4edda, #c3e6cb);
      border: 1px solid #28a745;
      border-radius: 4px;
      padding: 6px 12px;
      margin: 8px 0;
    }
    .result-item {
      font-size: 9px;
    }
    .result-label {
      font-weight: 700;
      color: #155724;
    }
    .result-value {
      font-weight: 800;
      color: #28a745;
      font-size: 10px;
    }
    .signatures { 
      display: flex; 
      justify-content: space-around; 
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e9ecef;
    }
    .sig-block { text-align: center; }
    .sig-line { 
      width: 100px; 
      border-bottom: 1px solid #333; 
      margin: 25px auto 5px;
    }
    .sig-label {
      font-size: 8px;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
    }
    .grade-scale { 
      margin-top: 10px;
      background: #f8f9fa;
      padding: 6px 8px;
      border-radius: 4px;
      border-left: 2px solid ${accentColor};
    }
    .grade-scale-title {
      font-size: 8px;
      font-weight: 700;
      color: ${accentColor};
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .grade-scale-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
    }
    .grade-item {
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 2px;
      padding: 2px 5px;
      text-align: center;
      min-width: 35px;
    }
    .grade-letter {
      font-size: 9px;
      font-weight: 700;
      color: ${primaryColor};
    }
    .grade-range {
      font-size: 7px;
      color: #666;
    }
    .instructions { 
      margin-top: 10px; 
      font-size: 8px;
      background: #fff3cd;
      border-left: 2px solid #ffc107;
      padding: 6px 10px;
      border-radius: 3px;
    }
    .instructions strong {
      color: #856404;
      display: block;
      margin-bottom: 3px;
      font-size: 8px;
    }
    .instructions-text {
      color: #856404;
      line-height: 1.4;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      html { 
        font-size: 10px; 
        width: 210mm;
        height: 297mm;
      }
      body { 
        background: white; 
        padding: 0; 
        margin: 0;
        width: 210mm;
        min-height: 297mm;
        max-height: 297mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report-card { 
        box-shadow: none; 
        border-radius: 0; 
        width: 194mm;
        max-width: 194mm;
        max-height: 281mm;
        overflow: hidden;
        page-break-inside: avoid;
      }
      .watermark {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="report-card">
    ${showWatermark ? `<div class="watermark"><img src="${leftLogo}" alt="" /></div>` : ''}
    <div class="header-border"></div>
    <div class="header">
      ${leftLogo ? `<div class="logo-left"><img src="${leftLogo}" alt="School Logo" /></div>` : `<div class="logo-left">LOGO</div>`}
      <div class="header-center">
        <div class="contact-info">School Code: ${school.school_code || '-'} | Affiliation No: ${affiliation || '-'}</div>
        <div class="school-name">${schoolName}</div>
        <div class="subtitle">${subTitle}</div>
        <div class="contact-info">(Affiliated to C.B.S.E New Delhi)</div>
        <div class="contact-info">${schoolAddress}</div>
        <div class="contact-info">Email: ${schoolEmail || '-'} | Phone: ${schoolPhone || '-'}</div>
        <div class="session-badge">${reportTitle} | ${academicYear}</div>
      </div>
      ${showRightLogo && rightLogo ? `<div class="logo-right"><img src="${rightLogo}" alt="Board Logo" /></div>` : showRightLogo ? `<div class="logo-right">LOGO</div>` : ''}
    </div>

    <div class="content">
      ${showStudentProfile ? `
      <div class="section-title">📋 ${sectionStudentProfile}</div>
      <div class="profile-grid">
        <div class="profile-item"><span class="profile-label">Student Name:</span> <span class="profile-value">${student.student_name || 'N/A'}</span></div>
        <div class="profile-item"><span class="profile-label">Class & Section:</span> <span class="profile-value">${student.class || 'N/A'}-${student.section || 'A'}</span></div>
        <div class="profile-item"><span class="profile-label">${labels.father_name || "Father's Name"}:</span> <span class="profile-value">${student.father_name ? 'Mr. ' + student.father_name : 'N/A'}</span></div>
        <div class="profile-item"><span class="profile-label">${labels.mother_name || "Mother's Name"}:</span> <span class="profile-value">${student.mother_name ? 'Mrs. ' + student.mother_name : 'N/A'}</span></div>
        <div class="profile-item"><span class="profile-label">Address:</span> <span class="profile-value">${student.address || 'N/A'}</span></div>
        <div class="profile-item"><span class="profile-label">Admission No:</span> <span class="profile-value">${student.admission_no || 'N/A'}</span></div>
        <div class="profile-item"><span class="profile-label">Contact No:</span> <span class="profile-value">${student.student_contact || 'N/A'}</span></div>
        <div class="profile-item"><span class="profile-label">Roll Number:</span> <span class="profile-value">${student.roll_number || 'N/A'}</span></div>
      </div>
      ` : ''}

      ${showMarksTable ? `
      <div class="section-title">📊 ${sectionAcademicPerformance}</div>
      <div class="part-title">${sectionScholastic} (${examName})</div>
      ${isMultiExam ? `
      <table style="font-size: 11px;">
        <thead>
          ${multiExamHeaders}
        </thead>
        <tbody>${multiExamMarksRows}</tbody>
      </table>
      ` : `
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
      `}

      <div class="summary-box">
        ${showAttendance && attendance ? `
        <div class="summary-item">
          <div class="summary-label">${labels.attendance || 'Attendance'}</div>
          <div class="summary-value">${attendance?.present ?? 0}/${attendance?.total ?? 0}</div>
          <div class="summary-label">${attendance?.percentage?.toFixed(1) ?? '0.0'}%</div>
        </div>` : ''}
        <div class="summary-item">
          <div class="summary-label">Grand Total</div>
          <div class="summary-value">${totalObtained}/${totalMax}</div>
          <div class="summary-label">${overallPct.toFixed(1)}%</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Overall Grade</div>
          <div class="summary-value">${overallGrade}</div>
        </div>
      </div>
      ` : ''}

      ${showCoScholastic && (coScholastic?.length ?? 0) > 0 ? `
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
          ${customRemarks || data.remarks || ''}
        </div>
        <div style="margin-top: 8px; border-top: 1px dashed #ccc; padding-top: 5px;">
          <div style="font-size: 7px; color: #666; margin-bottom: 3px;">Teacher's Handwritten Remarks:</div>
          <div style="min-height: 25px; border-bottom: 1px solid #ddd; margin-bottom: 4px;"></div>
          <div style="min-height: 1px; border-bottom: 1px solid #ddd;"></div>
        </div>
      </div>
      ` : ''}

      <div class="result-box">
        <div class="result-item">
          <span class="result-label">Result:</span> 
          <span class="result-value">${isPass ? '✓ PASS' : '✗ FAIL'}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Rank:</span> 
          <span class="result-value">${data.rank ?? '-'}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Promoted To:</span> 
          <span class="result-value">${promotedTo || '-'}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Result Date:</span> 
          <span class="result-value">${exam.result_date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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

      ${showGradingScale && gradeScales.length > 0 ? `
      <div class="grade-scale">
        <div class="grade-scale-title">📌 ${sectionGradingScale}</div>
        <div class="grade-scale-grid">
          ${gradeScaleItems}
        </div>
      </div>
      ` : ''}

      ${showInstructions ? `
      <div class="instructions">
        <strong>⚠️ ${sectionInstructions}</strong>
        <div class="instructions-text">${instructionsText}</div>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}

function getGradeFromMarks(
  scales: Array<{ grade: string; min_marks?: number; max_marks?: number; min_percentage?: number; max_percentage?: number }>,
  obtained: number,
  max: number
): string {
  if (max <= 0) return '-';
  const pct = (obtained / max) * 100;
  const minKey = (s: (typeof scales)[0]) => s.min_marks ?? s.min_percentage ?? 0;
  const maxKey = (s: (typeof scales)[0]) => s.max_marks ?? s.max_percentage ?? 100;
  const scale = scales.find((s) => pct >= minKey(s) && pct <= maxKey(s));
  return scale?.grade ?? '-';
}

function generateLandscapeReportCardHTML(
  data: ReportCardData,
  templateConfig?: ReportCardTemplateConfig
): string {
  const { school, student, } = data;
  const cfg = templateConfig || {};
  const logos = (cfg.logos as Record<string, unknown>) || {};
  const header = (cfg.header as Record<string, unknown>) || {};
  const sectionsCfg = (cfg.sections as Record<string, unknown>) || {};
  const labels = (cfg.labels as Record<string, unknown>) || {};
  const branding = (cfg.branding as Record<string, unknown>) || {};
  const marksTable = (cfg.marks_table as Record<string, unknown>) || {};
  const content = (cfg as Record<string, unknown>).content as Record<string, unknown> || {};

  const leftLogoSize = (logos.left_size as number) ?? 100;
  const rightLogoSize = (logos.right_size as number) ?? 100;
  const showRightLogo = logos.show_right_logo !== false;
  const leftLogo = school.logo_url || '';
  const rightLogo = showRightLogo ? (school.right_logo_url || school.logo_url || '') : '';

  const schoolNameColor = (header.school_name_color as string) ?? '#8B0000';
  const schoolNameFontSize = (header.font_size as number) ?? 18;
  const subTitle = (header.sub_title as string) ?? (data.school.sub_title || 'SENIOR SECONDARY SCHOOL');
  const reportTitle = (labels.report_title as string) ?? 'REPORT CARD';

  const primaryColor = (branding.primary_color as string) ?? '#1e3a8a';
  const fontFamily = (branding.font_family as string) ?? 'Arial, sans-serif';
  // Section titles
  const sectionStudentProfile = (labels.section_student_profile as string) ?? 'Student Profile';
  const sectionAcademicPerformance = (labels.section_academic_performance as string) ?? 'Academic Performance';
  const sectionScholastic = (labels.section_scholastic as string) ?? 'Part I: Scholastic Areas';
  const sectionCoScholastic = (labels.section_co_scholastic as string) ?? 'Part II: Co-Scholastic Areas';
  const sectionRemarks = (labels.section_remarks as string) ?? 'Class Teacher Remarks';
  const sectionInstructions = (labels.section_instructions as string) ?? 'Important Instructions';
  const sectionGradingScale = (labels.section_grading_scale as string) ?? 'Grading Scale';

  // Visibility
  const showStudentProfile = sectionsCfg.show_student_profile !== false;
  const showMarksTable = sectionsCfg.show_marks_table !== false;
  const showAttendance = sectionsCfg.show_attendance !== false;
  const showCoScholastic = sectionsCfg.show_co_scholastic !== false;
  const showRemarks = sectionsCfg.show_remarks !== false;
  const showInstructions = sectionsCfg.show_instructions !== false;
  const showGradingScale = sectionsCfg.show_grading_scale !== false;

  // Editable content
  const schoolEmail = (content.school_email as string) ?? data.school.school_email ?? '';
  const schoolPhone = (content.school_phone as string) ?? data.school.school_phone ?? '';
  const schoolAddress = (content.school_address as string) ?? data.school.school_address ?? '';
  const affiliation = (content.affiliation as string) ?? data.school.affiliation ?? '';
  const academicYear = (content.academic_year as string) ?? data.exam.academic_year ?? 'N/A';
  const examName = (content.exam_name as string) ?? data.exam.exam_name ?? 'Examination';
  const promotedTo = (content.promoted_to as string) ?? data.promoted_to ?? 'Class 11';
  const instructionsText =
    (content.instructions as string) ??
    data.school.instructions ??
    'Minimum Passing Marks in Each Subject is 33%.';
  const customRemarks = (content.remarks as string) ?? data.remarks ?? '';

  // Watermark
  const watermark = (cfg.watermark as Record<string, unknown>) || {};
  const showWatermark = watermark.enabled !== false;
  const watermarkSize = Math.min(Math.max((watermark.size as number) || 500, 100), 900);
  const watermarkOpacity = Math.min(Math.max((watermark.opacity as number) ?? 0.08, 0.02), 0.35);

  const attendanceLabel = (labels.attendance as string) ?? 'Attendance';
  const fatherLabel = (labels.father_name as string) ?? "Father's Name";
  const motherLabel = (labels.mother_name as string) ?? "Mother's Name";

  const marksSource = Array.isArray(data.marks) ? data.marks : [];
  const subjects = marksSource.map((m) => m.subject?.name).filter(Boolean) as string[];

  const computeGrade = (m: ReportCardData['marks'][number]): string => {
    if (m.grade) return m.grade;
    // Fallback to percentage ranges if grade is missing.
    const totalMax = m.max_marks || 0;
    const obtained = m.marks_obtained ?? 0;
    const pct = totalMax > 0 ? (obtained / totalMax) * 100 : 0;
    const scale =
      data.gradeScales?.find((g) => {
        const min = g.min_percentage ?? g.min_marks ?? 0;
        const max = g.max_percentage ?? g.max_marks ?? 100;
        return pct >= min && pct <= max;
      }) || null;
    return scale?.grade ?? '-';
  };

  const isMultiExamLandscape = Array.isArray(data.multiExamMarks) && data.multiExamMarks.length > 0 && Array.isArray(data.examsList) && data.examsList.length > 0;
  const multiExams = data.examsList || [];
  const groupedTermMeta = isMultiExamLandscape
    ? multiExams.reduce((acc, e) => {
        const key = String(e.term_id || 'unassigned');
        if (!acc.find((x) => x.term_id === key)) {
          acc.push({
            term_id: key,
            term_name: e.term_name || (key === 'unassigned' ? 'Unassigned' : 'Term'),
            term_serial: e.term_serial,
          });
        }
        return acc;
      }, [] as Array<{ term_id: string; term_name: string; term_serial?: number }>)
    : [];
  const marksRows = isMultiExamLandscape
    ? (data.multiExamMarks || [])
        .map((row) => {
          const termCells = groupedTermMeta
            .map((t) => {
              const termExams = multiExams.filter((e) => String(e.term_id || 'unassigned') === t.term_id);
              const examCells = termExams
                .map((e) => {
                  const examMark = row.exams.find((em) => em.exam_id === e.id);
                  return `<td class="td-num">${examMark?.marks_obtained == null ? '-' : examMark.marks_obtained}</td>`;
                })
                .join('');
              const termTotal = (row.term_totals || []).find((x) => String(x.term_id) === String(t.term_id));
              return `${examCells}<td class="td-num"><strong>${termTotal ? `${termTotal.total_obtained}` : '-'}</strong></td><td class="td-c"><strong>${termTotal?.grade || '-'}</strong></td>`;
            })
            .join('');
          return `<tr><td class="td-subj">${row.subject?.name || '-'}</td>${termCells}<td class="td-num"><strong>${row.overall_marks_obtained == null ? '-' : row.overall_marks_obtained}</strong></td><td class="td-c"><strong>${row.overall_grade || '-'}</strong></td></tr>`;
        })
        .join('')
    : marksSource
        .map((m) => {
          const max = Number(m.max_marks || 0);
          const obtained = m.marks_obtained == null ? null : Number(m.marks_obtained);
          const pct = max > 0 && obtained != null ? (obtained / max) * 100 : 0;
          const grade = computeGrade(m);
          return `
            <tr>
              <td class="td-subj">${m.subject?.name || '-'}</td>
              <td class="td-num">${max}</td>
              <td class="td-num">${obtained == null ? '-' : obtained}</td>
              <td class="td-num">${obtained == null ? '-' : pct.toFixed(1) + '%'}</td>
              <td class="td-c"><strong>${grade}</strong></td>
            </tr>`;
        })
        .join('');

  const coScholasticRows =
    data.coScholastic && data.coScholastic.length
      ? data.coScholastic
          .map(
            (c) => `
        <tr>
          <td class="td-left">${c.name}</td>
          <td class="td-c">${c.term1_grade ?? '-'}</td>
          <td class="td-c">${c.term2_grade ?? '-'}</td>
        </tr>
      `
          )
          .join('')
      : `<tr><td class="td-left">Art and Craft</td><td class="td-c">A</td><td class="td-c">A</td></tr>`;

  const gradingScaleRow =
    showGradingScale && data.gradeScales && data.gradeScales.length
      ? (() => {
          const sorted = [...data.gradeScales].sort((a, b) => {
            const aMax = a.max_percentage ?? a.max_marks ?? 0;
            const bMax = b.max_percentage ?? b.max_marks ?? 0;
            return bMax - aMax;
          });
          const scaleStr = sorted
            .map((g) => {
              const min = g.min_percentage ?? g.min_marks;
              const max = g.max_percentage ?? g.max_marks;
              if (min == null || max == null) return `${g.grade}`;
              return `${g.grade}(${min}%-${max}%)`;
            })
            .join(', ');
          return `<tr class="scale-row"><td colspan="12"><strong>Grading Scale:</strong> ${scaleStr}</td></tr>`;
        })()
      : '';

  const attendance = data.attendance;
  const attendanceText = attendance
    ? `${attendance.present} / ${attendance.total} (${attendance.percentage.toFixed(1)}%)`
    : '0 / 0 (0.0%)';

  const totalObtained = data.summary?.total_marks ?? marksSource.reduce((s, m) => s + (m.marks_obtained ?? 0), 0);
  const totalMax = data.summary?.total_max_marks ?? marksSource.reduce((s, m) => s + (m.max_marks ?? 0), 0);
  const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  const overallGrade = data.summary?.grade ?? '-';
  const rank = data.rank ?? '—';
  const resultDate = data.exam?.result_date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const autoRemark = (() => {
    if (overallPct >= 91) return 'Outstanding performance. Keep up the exceptional consistency and leadership.';
    if (overallPct >= 81) return 'Excellent result with strong subject understanding. Continue the good momentum.';
    if (overallPct >= 71) return 'Very good performance. Focus on precision to move into top grade bands.';
    if (overallPct >= 61) return 'Good performance overall. Regular revision can improve scores further.';
    if (overallPct >= 51) return 'Satisfactory progress. Needs better consistency in core subjects.';
    if (overallPct >= 41) return 'Average performance. More guided practice is recommended.';
    if (overallPct >= 33) return 'Pass. Requires focused effort and structured study support.';
    return 'Below passing benchmark. Immediate academic intervention is recommended.';
  })();

  const maxMarksRowMulti = isMultiExamLandscape
    ? (() => {
        const termCells = groupedTermMeta
          .map((t) => {
            const termExams = multiExams.filter((e) => String(e.term_id || 'unassigned') === t.term_id);
            const examMaxCells = termExams
              .map((e) => {
                const sample = (data.multiExamMarks || []).find((r) => (r.exams || []).some((ex) => ex.exam_id === e.id));
                const examData = sample?.exams?.find((ex) => ex.exam_id === e.id);
                return `<td class="td-num"><strong>${Number(examData?.max_marks || 0)}</strong></td>`;
              })
              .join('');
            const termMax = termExams.reduce((sum, e) => {
              const sample = (data.multiExamMarks || []).find((r) => (r.exams || []).some((ex) => ex.exam_id === e.id));
              const examData = sample?.exams?.find((ex) => ex.exam_id === e.id);
              return sum + Number(examData?.max_marks || 0);
            }, 0);
            return `${examMaxCells}<td class="td-num"><strong>${termMax}</strong></td><td class="td-c"></td>`;
          })
          .join('');
        const grandMax = Number((data.multiExamMarks || [])[0]?.overall_max_marks || 0);
        return `<tr class="tr-max"><td class="td-subj">Maximum Marks</td>${termCells}<td class="td-num"><strong>${grandMax}</strong></td><td class="td-c"></td></tr>`;
      })()
    : '';

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
    .att-inline { font-size: 9px; margin-bottom: 6px; border: 1px solid #000; padding: 4px 8px; }
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
  </style>
</head>
<body>
  <div class="report-card">
    ${showWatermark ? `<div class="watermark" style="pointer-events:none;opacity:${watermarkOpacity};">${leftLogo ? `<img src="${leftLogo}" alt="Watermark Logo" style="width:100%;height:100%;object-fit:contain;display:block;" />` : 'LOGO'}</div>` : ''}
    <div class="pink-strip">
      <div class="strip-row">
        <div class="logo-circle">
          ${leftLogo ? `<img src="${leftLogo}" alt="School Logo" style="width:100%;height:100%;object-fit:contain;border-radius:50%;display:block;" />` : 'LOGO'}
        </div>
        <div class="strip-center">
          <div class="strip-school">${(data.school.school_name || '').toString() || 'DEMO PUBLIC SCHOOL'}</div>
          <div class="strip-line">Email: ${schoolEmail} | Affiliation No: ${affiliation} | Phone: ${schoolPhone}</div>
          <div class="strip-line">${schoolAddress}</div>
          <div class="strip-sub">${subTitle} · ${reportTitle}</div>
        </div>
        ${showRightLogo
          ? `<div class="logo-circle right">${rightLogo ? `<img src="${rightLogo}" alt="Right Logo" style="width:100%;height:100%;object-fit:contain;border-radius:50%;display:block;" />` : 'LOGO'}</div>`
          : `<div class="logo-circle right" style="visibility:hidden;border-color:transparent;background:transparent"></div>`}
      </div>
    </div>
    <div class="annual-line">ANNUAL REPORT – ${academicYear}</div>

    <div class="body-pad wm-wrap">
      <div class="wm-body">
        ${showStudentProfile ? `
        <div class="section-h">${sectionStudentProfile}</div>
        <div class="student-wrap">
          <div class="student-cols">
            <div class="kv"><b>Admission No.</b><span>${student.admission_no || '-'}</span></div>
            <div class="kv"><b>Roll No.</b><span>${student.roll_number || '-'}</span></div>
            <div class="kv"><b>Student Name</b><span>${student.student_name || '-'}</span></div>
            <div class="kv"><b>Class</b><span>Grade-${student.class} ${student.section || 'A'}</span></div>
            <div class="kv"><b>${fatherLabel}</b><span>${student.father_name || '-'}</span></div>
            <div class="kv"><b>Contact No.</b><span>${schoolPhone || '-'}</span></div>
            <div class="kv"><b>${motherLabel}</b><span>${student.mother_name || '-'}</span></div>
            <div class="kv"><b>Date of Birth</b><span>${(student as any).dob || (student as any).date_of_birth || '—'}</span></div>
          </div>
          <div class="photo-box">
            ${student.photo_url ? `<img src="${student.photo_url}" alt="Student Photo" style="width:72px;height:88px;object-fit:cover;border-radius:2px;" />` : 'Passport<br/>photo'}
          </div>
        </div>
        ` : ''}

        ${showMarksTable ? `
        <div class="section-h">${isMultiExamLandscape ? `${sectionScholastic} — ${multiExams.map((e) => e.name).join(' + ')}` : `${sectionScholastic} — ${examName}`}</div>
        <div class="tbl-wrap">
          <table class="marks" cellspacing="0" cellpadding="0">
            <thead>
              ${
                isMultiExamLandscape
                  ? `<tr>
                      <th rowspan="2" style="min-width:88px;">Subject</th>
                      ${groupedTermMeta.map((t) => {
                        const termExams = multiExams.filter((e) => String(e.term_id || 'unassigned') === t.term_id);
                        const span = termExams.length + 2;
                        const label = `${t.term_serial ? `${t.term_serial}. ` : ''}${t.term_name}`;
                        return `<th colspan="${span}">${label}</th>`;
                      }).join('')}
                      <th colspan="2">Grand Total</th>
                    </tr>
                    <tr>
                      ${groupedTermMeta.map((t) => {
                        const termExams = multiExams.filter((e) => String(e.term_id || 'unassigned') === t.term_id);
                        return `${termExams.map((e) => `<th>${e.name}</th>`).join('')}<th>Total</th><th>Grade</th>`;
                      }).join('')}
                      <th>Total</th><th>Grade</th>
                    </tr>`
                  : `<tr>
                      <th style="min-width:88px;">Subject</th>
                      <th>Max Marks</th>
                      <th>Marks Obtained</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                    </tr>`
              }
            </thead>
            <tbody>
              ${isMultiExamLandscape ? maxMarksRowMulti : ''}
              ${marksRows}
              ${gradingScaleRow}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${showAttendance ? `<div class="att-inline"><strong>${attendanceLabel}</strong>: ${attendanceText}</div>` : ''}

        ${showMarksTable ? `
        <div class="summary-row">
          <div class="summary-cell"><span class="lbl">Overall Marks</span>${totalObtained} / ${totalMax}</div>
          <div class="summary-cell"><span class="lbl">Percentage</span>${overallPct.toFixed(1)}%</div>
          <div class="summary-cell"><span class="lbl">Grade</span>${overallGrade || '-'}</div>
          <div class="summary-cell"><span class="lbl">Rank</span>${rank}</div>
        </div>
        ` : ''}

        ${showRemarks ? `
        <div class="remark-row">
          <div class="remark-main">
            <strong>Remark:</strong>
            ${customRemarks || data.remarks || autoRemark}
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
          <strong>Result:</strong> ${overallPct >= 33 ? 'PASS' : 'FAIL'} ·
          <strong>Promoted To:</strong> ${promotedTo} ·
          <strong>Result date (sample):</strong> ${resultDate}
        </div>

        ${showInstructions ? `
        <div class="inst-box">
          <strong>${sectionInstructions}</strong>
          <div>${instructionsText}</div>
        </div>
        ` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}
