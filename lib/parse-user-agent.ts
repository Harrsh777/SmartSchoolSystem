/**
 * Parse User-Agent into a short readable summary: "OS • Browser • Device type".
 * Raw UA is kept in DB; this is for display only. Non-exhaustive heuristics.
 */
export function parseUserAgentSummary(ua: string | null | undefined): string {
  if (!ua || typeof ua !== 'string') return '—';
  const s = ua.trim();
  if (!s) return '—';

  let os = 'Unknown OS';
  if (/Windows NT 10/.test(s)) os = 'Windows 10';
  else if (/Windows NT 11/.test(s) || /Windows 11/.test(s)) os = 'Windows 11';
  else if (/Windows/.test(s)) os = 'Windows';
  else if (/Mac OS X/.test(s) || /Macintosh/.test(s)) os = 'macOS';
  else if (/iPhone|iPad/.test(s)) os = /iPad/.test(s) ? 'iPadOS' : 'iOS';
  else if (/Android/.test(s)) os = 'Android';
  else if (/X11|Linux/.test(s)) os = 'Linux';
  else if (/CrOS/.test(s)) os = 'Chrome OS';

  let browser = 'Unknown';
  if (/Edg\//.test(s)) browser = 'Edge';
  else if (/Chrome\//.test(s) && !/Edg/.test(s)) browser = 'Chrome';
  else if (/Firefox\//.test(s)) browser = 'Firefox';
  else if (/Safari\//.test(s) && !/Chrome/.test(s)) browser = 'Safari';
  else if (/OPR\//.test(s)) browser = 'Opera';

  let device = 'Desktop';
  if (/Mobile|Android|iPhone|webOS|BlackBerry|IEMobile/.test(s)) device = 'Mobile';
  else if (/iPad|Tablet/.test(s)) device = 'Tablet';

  return `${os} • ${browser} • ${device}`;
}
