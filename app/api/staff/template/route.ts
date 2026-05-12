import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Create template data with headers and example rows
    const templateData = [
      {
        'Full Name': 'John Doe',
        'Department': 'Teaching',
        'Role': 'Mathematics',
        'Designation': 'Mathematics',
        'Email': 'john.doe@example.com',
        'Phone': '9876543210',
        'Date of Joining': '2024-01-15',
        'Employment Type': 'Full-time',
        'Date of Birth': '1990-05-20',
        'Gender': 'Male',
        'Aadhaar Number': '123456789012',
        'Blood Group': 'O+',
        'Religion': 'Hindu',
        'Category': 'General',
        'Nationality': 'Indian',
        'Primary Contact': '9876543210',
        'Secondary Contact': '9876543211',
        'Address': '123 Main Street, City, State, PIN',
        'Date of Promotion': '',
        'Qualification': 'M.Sc, B.Ed',
        'Experience (Years)': '5',
        'Alma Mater': 'University of Example',
        'Major/Specialization': 'Mathematics',
        'Website': '',
      },
      {
        'Full Name': 'Jane Smith',
        'Department': 'Non-Teaching',
        'Role': 'Admission',
        'Designation': 'Physics',
        'Email': 'jane.smith@example.com',
        'Phone': '9876543212',
        'Date of Joining': '2024-02-01',
        'Employment Type': 'Full-time',
        'Date of Birth': '1992-08-15',
        'Gender': 'Female',
        'Aadhaar Number': '234567890123',
        'Blood Group': 'A+',
        'Religion': 'Christian',
        'Category': 'OBC',
        'Nationality': 'Indian',
        'Primary Contact': '9876543212',
        'Secondary Contact': '',
        'Address': '456 Park Avenue, City, State, PIN',
        'Date of Promotion': '',
        'Qualification': 'M.Sc, B.Ed',
        'Experience (Years)': '3',
        'Alma Mater': 'State University',
        'Major/Specialization': 'Physics',
        'Website': '',
      },
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 20 }, // Full Name
      { wch: 15 }, // Role
      { wch: 15 }, // Department
      { wch: 15 }, // Designation
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 18 }, // Date of Joining
      { wch: 18 }, // Employment Type
      { wch: 15 }, // Date of Birth
      { wch: 10 }, // Gender
      { wch: 15 }, // Aadhaar Number
      { wch: 12 }, // Blood Group
      { wch: 12 }, // Religion
      { wch: 12 }, // Category
      { wch: 12 }, // Nationality
      { wch: 18 }, // Primary Contact
      { wch: 18 }, // Secondary Contact
      { wch: 40 }, // Address
      { wch: 18 }, // Date of Promotion
      { wch: 20 }, // Qualification
      { wch: 18 }, // Experience (Years)
      { wch: 25 }, // Alma Mater
      { wch: 20 }, // Major/Specialization
      { wch: 30 }, // Website
    ];
    ws['!cols'] = colWidths;

    // Add instructions sheet
    const instructionsData = [
      ['Staff Import Template - Instructions'],
      [''],
      ['Required Fields (all of the following):'],
      ['- Full Name*'],
      ['- Department* (one of: Teaching, Non-Teaching, DRIVER/SUPPORTING STAFF, ADMIN)'],
      ['- Phone* (10 digits)'],
      ['- Date of Joining* (YYYY-MM-DD or DD-MM-YYYY; "Date of Join" also works)'],
      ['- Date of Birth* (must be before Date of Joining)'],
      ['- Gender* (Male, Female, Other)'],
      ['- Category* (SC, ST, OBC, General)'],
      ['- Email*'],
      [''],
      ['Optional Fields:'],
      ['- Role (free text, e.g. Mathematics, Admission, Cashier, Accountant)'],
      ['- Designation / subject (if filled, must match a subject from your timetable)'],
      ['- Primary Contact (if empty, Phone is used)'],
      ['- Aadhaar Number: 12 digits; must be unique per staff member when provided'],
      ['- Employment Type: Full-time, Part-time, Contract, Temporary'],
      ['- Blood Group: A+, A-, B+, B-, AB+, AB-, O+, O-'],
      ['- Religion: Hindu, Muslim, Sikh, Christian, Jain'],
      ['- Nationality: Default is Indian'],
      ['- Secondary Contact: 10-digit phone number'],
      ['- Address: Full address'],
      ['- Date of Promotion: Date in YYYY-MM-DD format'],
      ['- Qualification: Educational qualifications'],
      ['- Experience (Years): Number of years of experience'],
      ['- Alma Mater: University/Institution name'],
      ['- Major/Specialization: Subject specialization'],
      ['- Website: Personal website URL'],
      [''],
      ['Important Notes:'],
      ['1. Staff ID will be auto-generated (STF001, STF002, etc.)'],
      ['2. Passwords will be auto-generated for each staff member'],
      ['3. Do not include Staff ID column in your file'],
      ['4. Dates must be in YYYY-MM-DD format'],
      ['5. Phone numbers must be 10 digits'],
      ['6. Aadhaar is optional; if provided it must be 12 digits and unique (no duplicates in file or vs existing staff)'],
      ['7. If you use the same Aadhaar twice, or one already in the system, only those rows will fail — others can still import'],
      ['8. Remove example rows before uploading'],
    ];

    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    const instructionsColWidths = [{ wch: 80 }];
    instructionsWs['!cols'] = instructionsColWidths;

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Data');
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="staff_import_template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating staff template:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}

