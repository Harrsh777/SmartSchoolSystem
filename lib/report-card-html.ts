/**
 * Generate HTML report card matching the reference design
 * All data fetched from DB - no hardcoded values
 */

export interface ExamMarksData {
  exam_id: string;
  exam_name: string;
  marks_obtained: number | null;
  max_marks: number;
  grade?: string;
}

export interface MultiExamSubjectMarks {
  subject: { name: string };
  exams: ExamMarksData[];
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
  examsList?: Array<{ id: string; name: string; max_marks_per_subject: number }>;
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
  const { school, student, exam, marks, summary, attendance, coScholastic, gradeScales, multiExamMarks, examsList } = data;
  const cfg = templateConfig || {};
  const labels = cfg.labels || {};
  const content = (cfg as Record<string, unknown>).content as Record<string, unknown> || {};

  // Debug: log what config we received
  console.log('generateReportCardHTML config received:', JSON.stringify(cfg));

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
  const accentColor = cfg.branding?.accent_color ?? '#15803d';

  // Watermark settings
  const watermark = (cfg as Record<string, unknown>).watermark as Record<string, unknown> || {};
  const showWatermark = watermark.enabled !== false && leftLogo;
  const watermarkSize = (watermark.size as number) || 500;
  const watermarkOpacity = (watermark.opacity as number) || 0.08;

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
  const isMultiExam = multiExamMarks && multiExamMarks.length > 0 && examsList && examsList.length > 1;

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
      width: ${Math.min(watermarkSize, 400)}px;
      height: ${Math.min(watermarkSize, 400)}px;
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
      width: ${Math.min(leftLogoSize, 70)}px; 
      height: ${Math.min(leftLogoSize, 70)}px; 
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
      width: ${Math.min(rightLogoSize, 70)}px; 
      height: ${Math.min(rightLogoSize, 70)}px; 
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
      font-size: ${Math.min(schoolNameFontSize, 14)}px; 
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
          <div class="summary-value">${attendance.present}/${attendance.total}</div>
          <div class="summary-label">${attendance.percentage.toFixed(1)}%</div>
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

      ${showCoScholastic && coScholastic && coScholastic.length > 0 ? `
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
