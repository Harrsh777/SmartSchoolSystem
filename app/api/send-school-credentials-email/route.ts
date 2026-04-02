import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ success: false, error: 'Missing RESEND_API_KEY' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      to,
      schoolId,
      password,
    } = body as { to?: string; schoolId?: string; password?: string };

    const toEmail = String(to ?? '').trim();
    const sid = String(schoolId ?? '').trim();
    const pwd = String(password ?? '').trim();

    if (!toEmail || !sid || !pwd) {
      return NextResponse.json(
        { success: false, error: 'to, schoolId, and password are required' },
        { status: 400 }
      );
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = (process.env.RESEND_FROM_EMAIL ?? 'info@educorerp.in').trim();
    const fromName = (process.env.RESEND_FROM_NAME ?? 'EduCore').trim();

    const html = `
  <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 40px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      
      <!-- Header -->
      <div style="background: #111827; color: #ffffff; padding: 20px 30px;">
        <h1 style="margin: 0; font-size: 20px;">EduCore</h1>
      </div>

      <!-- Body -->
      <div style="padding: 30px;">
        <h2 style="color: #111827; margin-bottom: 10px;">
          Your EduCore Account is Ready 🚀
        </h2>

        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          Your school has been successfully registered with <strong>EduCore</strong>.
          You can now access your dashboard using the credentials below.
        </p>

        <!-- Credentials Box -->
        <div style="margin: 25px 0; padding: 20px; background: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">School ID</p>
          <p style="margin: 5px 0 15px; font-size: 16px; font-weight: bold; color: #111827;">
            ${sid}
          </p>

          <p style="margin: 0; font-size: 14px; color: #6b7280;">Password</p>
          <p style="margin: 5px 0; font-size: 16px; font-weight: bold; color: #111827;">
            ${pwd}
          </p>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://educorerp.in/login" 
             style="background: #111827; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">
            Login to EduCore
          </a>
        </div>

        <!-- 🔒 Strong Security Warning -->
        <p style="margin-top: 20px; font-size: 14px; color: #b91c1c; font-weight: bold;">
          ⚠️ Important: Please change your password immediately after logging in to ensure your account security.
        </p>

        <p style="margin-top: 20px; color: #4b5563; font-size: 14px;">
          If you did not request this account or face any issues, please contact our support team immediately.
        </p>

        <p style="margin-top: 30px; color: #111827; font-weight: 500;">
          — Team EduCore
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
        © ${new Date().getFullYear()} EduCore. All rights reserved.
      </div>
    </div>
  </div>
`;

    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [toEmail],
      subject: 'Your EduCore Login Credentials – Action Required',
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('send-school-credentials-email error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

