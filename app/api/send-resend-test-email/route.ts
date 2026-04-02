import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST() {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ ok: false, error: 'Missing RESEND_API_KEY' }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: "EduCore <info@educorerp.in >",
      to: "harrshh077@gmail.com",
      subject: "EduCore Test Email",
      html: "<p>This is a test email from EduCore 🚀</p>",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('send-resend-test-email error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

