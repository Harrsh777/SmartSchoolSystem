import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

function passTypeLabel(type: string): string {
  switch (type) {
    case 'early_leave':
      return 'Early Leave';
    case 'late_entry':
      return 'Late Entry';
    case 'half_day':
      return 'Half Day';
    default:
      return (type || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return 'N/A';
  return String(timeStr).substring(0, 5);
}

export interface GatePassRecord {
  id?: string;
  person_name?: string | null;
  person_type?: string | null;
  class?: string | null;
  section?: string | null;
  pass_type?: string | null;
  reason?: string | null;
  date?: string | null;
  time_out?: string | null;
  expected_return_time?: string | null;
  approved_by_name?: string | null;
  status?: string | null;
}

export async function generateGatePassPdf(pass: GatePassRecord): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const { width, height } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = height - margin;

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    size: number,
    font = helvetica,
    color = rgb(0, 0, 0)
  ) => {
    page.drawText(text, { x, y: yPos, size, font, color });
  };

  const title = 'GATE PASS';
  const titleWidth = helveticaBold.widthOfTextAtSize(title, 22);
  drawText(title, (width - titleWidth) / 2, y, 22, helveticaBold, rgb(0.2, 0.23, 0.55));
  y -= 36;

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.2, 0.23, 0.55),
  });
  y -= 24;

  const lineHeight = 20;
  const labelW = 140;

  const row = (label: string, value: string) => {
    drawText(label, margin, y, 10, helvetica, rgb(0.4, 0.4, 0.4));
    drawText(value, margin + labelW, y, 11, helveticaBold, rgb(0.1, 0.1, 0.1));
    y -= lineHeight;
  };

  const personName = pass.person_name || 'N/A';
  row('Name:', personName);
  row('Type:', (pass.person_type || 'N/A').replace(/\b\w/g, (c: string) => c.toUpperCase()));
  if (pass.class || pass.section) {
    row('Class / Section:', [pass.class, pass.section].filter(Boolean).join(' - '));
  }
  row('Pass Type:', passTypeLabel(pass.pass_type || ''));
  row('Reason:', pass.reason || 'N/A');
  row('Date:', formatDate(pass.date || ''));
  row('Time Out:', formatTime(pass.time_out || ''));
  if (pass.expected_return_time) {
    row('Expected Return:', formatTime(pass.expected_return_time));
  }
  row('Approved By:', pass.approved_by_name || 'N/A');
  row('Status:', (pass.status || 'N/A').replace(/\b\w/g, (c: string) => c.toUpperCase()));

  return pdfDoc.save();
}

export function getGatePassPdfFilename(personName: string): string {
  const safe = (personName || 'GatePass').replace(/[^a-zA-Z0-9\s.-]/g, '').trim() || 'GatePass';
  return `${safe} Gate Pass.pdf`;
}
