import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    // ✅ 1. Validate API Key
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const resend = new Resend(resendApiKey);

    // ✅ 2. Parse Body Safely
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { schoolName, schoolEmail, email } = body as {
      schoolName?: string;
      schoolEmail?: string;
      email?: string;
    };

    const toEmail = (schoolEmail || email)?.trim();
    const safeSchoolName = schoolName?.trim() || "your school";

    // ✅ 3. Validate Email
    if (!toEmail) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // ✅ 4. Sender Info
    const fromEmail = (process.env.RESEND_FROM_EMAIL || "hello@educorerp.in").trim();
    const fromName = (process.env.RESEND_FROM_NAME || "EduCore").trim();
    const from = `${fromName} <${fromEmail}>`;

    // 🎨 5. PROFESSIONAL EMAIL TEMPLATE
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
              Hello ${safeSchoolName},
            </h2>

            <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
              Thank you for showing interest in <strong>EduCore</strong>.
              We have successfully received your information.
            </p>

            <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
              Our team of experts is currently reviewing your details and will get back to you shortly with the next steps.
            </p>

            <div style="margin: 30px 0; text-align: center;">
              <span style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 20px; border-radius: 6px; font-size: 14px;">
                🚀 You're one step closer to smarter school management
              </span>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              If you have any urgent queries, feel free to reply to this email.
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

    // ✅ 6. Send Email
    const response = await resend.emails.send({
      from,
      to: [toEmail],
      subject: `Welcome to EduCore — We've received your request`,
      html,
    });

    console.log("Email sent:", response);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("send-signup-email error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}