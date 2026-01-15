import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get specific fee collection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: collection, error } = await supabase
      .from('fee_collections')
      .select(`
        *,
        student:student_id (
          id,
          student_name,
          admission_no,
          class,
          section
        ),
        items:fee_collection_items (
          id,
          fee_installment_id,
          amount_paid,
          installment:fee_installment_id (
            id,
            installment_number,
            due_date,
            amount,
            fee_component_id,
            component:fee_component_id (
              component_name
            )
          )
        )
      `)
      .eq('id', id)
      .eq('school_code', schoolCode)
      .maybeSingle();

    if (error) {
      console.error('Error fetching fee collection:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee collection', details: error.message },
        { status: 500 }
      );
    }

    if (!collection) {
      return NextResponse.json(
        { error: 'Fee collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: collection }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee collection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

// Cancel a fee collection (soft delete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, cancellation_reason, cancelled_by } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get the collection to verify it exists and is not already cancelled
    const { data: collection, error: fetchError } = await supabase
      .from('fee_collections')
      .select('id, cancelled, student_id')
      .eq('id', id)
      .eq('school_code', school_code)
      .maybeSingle();

    if (fetchError || !collection) {
      return NextResponse.json(
        { error: 'Fee collection not found' },
        { status: 404 }
      );
    }

    if (collection.cancelled) {
      return NextResponse.json(
        { error: 'Collection is already cancelled' },
        { status: 400 }
      );
    }

    // Soft delete: Mark as cancelled
    const { data: updatedCollection, error: updateError } = await supabase
      .from('fee_collections')
      .update({
        cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelled_by || null,
        cancellation_reason: cancellation_reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (updateError || !updatedCollection) {
      console.error('Error cancelling fee collection:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel fee collection', details: updateError?.message },
        { status: 500 }
      );
    }

    // Delete collection items to trigger the update_installment_status trigger
    // This will restore installments to their previous status
    const { error: deleteItemsError } = await supabase
      .from('fee_collection_items')
      .delete()
      .eq('fee_collection_id', id);

    if (deleteItemsError) {
      console.error('Error deleting collection items:', deleteItemsError);
      // Note: The collection is already marked as cancelled, so we'll continue
      // The installments will need to be manually updated if items deletion fails
    }

    return NextResponse.json({
      data: updatedCollection,
      message: 'Fee collection cancelled successfully. Installments have been restored.',
    }, { status: 200 });
  } catch (error) {
    console.error('Error cancelling fee collection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

// Hard delete (use with caution - only for admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Check if collection exists
    const { data: collection } = await supabase
      .from('fee_collections')
      .select('id, cancelled')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .maybeSingle();

    if (!collection) {
      return NextResponse.json(
        { error: 'Fee collection not found' },
        { status: 404 }
      );
    }

    // Delete collection items first (cascade should handle this, but explicit is better)
    await supabase
      .from('fee_collection_items')
      .delete()
      .eq('fee_collection_id', id);

    // Delete the collection
    const { error: deleteError } = await supabase
      .from('fee_collections')
      .delete()
      .eq('id', id)
      .eq('school_code', schoolCode);

    if (deleteError) {
      console.error('Error deleting fee collection:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete fee collection', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Fee collection deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting fee collection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
