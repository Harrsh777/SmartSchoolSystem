/**
 * Integer rupee amount to Indian English words for official receipts.
 * Example: 8015 → "Eight Thousand Fifteen Rupees Only"
 */
const BELOW_20 = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return BELOW_20[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${TENS[t]} ${BELOW_20[o]}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(`${BELOW_20[h]} Hundred`);
  if (rest > 0) parts.push(twoDigits(rest));
  return parts.join(' ');
}

function intToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  if (n === 0) return 'Zero';
  if (n > 999999999) {
    return intToWords(999999999) + ' (amount too large)';
  }

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;

  const chunks: string[] = [];
  if (crore > 0) chunks.push(`${threeDigits(crore)} Crore`.replace(/^Zero /, ''));
  if (lakh > 0) chunks.push(`${twoDigits(lakh)} Lakh`);
  if (thousand > 0) chunks.push(`${twoDigits(thousand)} Thousand`);
  if (hundred > 0) chunks.push(threeDigits(hundred));

  return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

export function rupeesToWords(amount: number): string {
  const rupees = Math.floor(Math.round(Number(amount) * 100) / 100);
  const paise = Math.round((Math.round(Number(amount) * 100) / 100 - rupees) * 100);
  let w = intToWords(rupees);
  if (paise > 0) {
    w += ` and ${intToWords(paise)} Paise`;
  }
  return `${w} Rupees Only`;
}
