import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Fetch classes from classes table
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('class, section')
      .eq('school_code', schoolCode)
      .order('class', { ascending: true })
      .order('section', { ascending: true });

    if (classesError) {
      return NextResponse.json(
        { error: 'Failed to fetch classes', details: classesError.message },
        { status: 500 }
      );
    }

    // Group by class and get unique sections
    const classMap = new Map<string, string[]>();
    
    classes?.forEach((cls) => {
      if (!classMap.has(cls.class)) {
        classMap.set(cls.class, []);
      }
      if (!classMap.get(cls.class)!.includes(cls.section)) {
        classMap.get(cls.class)!.push(cls.section);
      }
    });

    const result = Array.from(classMap.entries()).map(([class_name, sections]) => ({
      class: class_name,
      sections: sections.sort(),
    }));

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

