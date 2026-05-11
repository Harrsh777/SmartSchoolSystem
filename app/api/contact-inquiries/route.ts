import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Strict email validator (RFC 5322 friendly subset).
 * Permits common patterns and rejects trailing dots, double dots, and missing TLD.
 */
const EMAIL_RE =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Phone validator. Accepts 10–15 digits, optional leading "+", spaces/dashes/parens stripped.
 * Examples that pass: "+91 93053 29875", "9305329875", "+1 (888) 123-4567".
 */
function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/[\s()\-]/g, '');
  if (!/^\+?\d{10,15}$/.test(digits)) return false;
  return true;
}

function trimOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * POST /api/contact-inquiries
 * Public endpoint — landing-page "Send Us a Message" form posts here.
 * Validates payload server-side, then inserts into `contact_inquiries`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const fullName = trimOrEmpty(body.full_name);
    const email = trimOrEmpty(body.email).toLowerCase();
    const phone = trimOrEmpty(body.phone);
    const institutionName = trimOrEmpty(body.institution_name);
    const message = trimOrEmpty(body.message);

    const errors: Record<string, string> = {};

    if (!fullName) {
      errors.full_name = 'Full name is required.';
    } else if (fullName.length > 120) {
      errors.full_name = 'Full name is too long (max 120 chars).';
    }

    if (!email) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_RE.test(email)) {
      errors.email = 'Enter a valid email address.';
    } else if (email.length > 200) {
      errors.email = 'Email is too long (max 200 chars).';
    }

    if (phone && !isValidPhone(phone)) {
      errors.phone = 'Enter a valid phone number (10–15 digits, optional +).';
    }

    if (!institutionName) {
      errors.institution_name = 'Institution name is required.';
    } else if (institutionName.length > 160) {
      errors.institution_name = 'Institution name is too long (max 160 chars).';
    }

    if (!message) {
      errors.message = 'Message is required.';
    } else if (message.length < 5) {
      errors.message = 'Please write at least a few words.';
    } else if (message.length > 2000) {
      errors.message = 'Message is too long (max 2000 chars).';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: 'Please fix the highlighted fields.', fields: errors },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    const { data, error } = await supabase
      .from('contact_inquiries')
      .insert({
        full_name: fullName,
        email,
        phone: phone || null,
        institution_name: institutionName,
        message,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Error inserting contact inquiry:', error);
      return NextResponse.json(
        { error: 'Could not send your message. Please try again in a moment.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: data?.id, created_at: data?.created_at },
    });
  } catch (err) {
    console.error('Error in POST /api/contact-inquiries:', err);
    return NextResponse.json(
      { error: 'Unexpected error. Please try again.' },
      { status: 500 }
    );
  }
}
