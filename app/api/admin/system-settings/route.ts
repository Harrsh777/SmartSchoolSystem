import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET - Fetch system settings
export async function GET() {
  try {
    const supabase = getServiceRoleClient();
    
    // Fetch system settings from a dedicated table (create if doesn't exist)
    // For now, return default settings structure
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      // Table doesn't exist yet, return defaults
      return NextResponse.json({
        data: {
          features: {
            student_portal: true,
            staff_portal: true,
            parent_portal: true,
            fees_management: true,
            library_management: true,
            transport_management: true,
            certificate_management: true,
            communication: true,
            reports: true,
          },
          defaults: {
            academic_year: new Date().getFullYear().toString(),
            date_format: 'DD/MM/YYYY',
            timezone: 'Asia/Kolkata',
            currency: 'INR',
            language: 'en',
          },
          integrations: {
            sms_provider: null,
            email_provider: null,
            payment_gateway: null,
          },
          notifications: {
            email_enabled: true,
            sms_enabled: false,
            push_enabled: false,
          },
        },
      });
    }

    return NextResponse.json({ data: settings || {} });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

// PATCH - Update system settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getServiceRoleClient();

    // Upsert system settings
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'default',
        ...body,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating system settings:', error);
      return NextResponse.json(
        { error: 'Failed to update system settings', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating system settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
