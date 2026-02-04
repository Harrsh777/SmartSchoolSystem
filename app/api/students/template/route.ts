import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Create template data with headers and example rows
    const templateData = [
      {
        'Admission No': 'STU001',
        'Student Name': 'John Doe',
        'First Name': 'John',
        'Last Name': 'Doe',
        'Class': '10',
        'Section': 'A',
        'Date of Birth': '15-05-2010',
        'Gender': 'Male',
        'Email': 'john.doe@example.com',
        'Student Contact': '9876543210',
        'Aadhaar Number': '123456789012',
        'Blood Group': 'O+',
        'Date of Admission': '01-04-2024',
        'Academic Year': '2025',
        'Father Name': 'John Doe Sr',
        'Father Occupation': 'Engineer',
        'Father Contact': '9876543211',
        'Mother Name': 'Jane Doe',
        'Mother Occupation': 'Teacher',
        'Mother Contact': '9876543212',
        'Address': '123 Main Street',
        'City': 'Mumbai',
        'State': 'Maharashtra',
        'Pincode': '400001',
        'Religion': 'Hindu',
        'Category': 'General',
        'Nationality': 'Indian',
        'Roll Number': '1',
        'RFID': '',
        'RTE': 'false',
        'New Admission': 'true',
      },
      {
        'Admission No': 'STU002',
        'Student Name': 'Jane Smith',
        'First Name': 'Jane',
        'Last Name': 'Smith',
        'Class': '10',
        'Section': 'B',
        'Date of Birth': '20-08-2010',
        'Gender': 'Female',
        'Email': 'jane.smith@example.com',
        'Student Contact': '9876543213',
        'Aadhaar Number': '234567890123',
        'Blood Group': 'A+',
        'Date of Admission': '01-04-2024',
        'Academic Year': '2025',
        'Father Name': 'Robert Smith',
        'Father Occupation': 'Doctor',
        'Father Contact': '9876543214',
        'Mother Name': 'Mary Smith',
        'Mother Occupation': 'Nurse',
        'Mother Contact': '9876543215',
        'Address': '456 Park Avenue',
        'City': 'Delhi',
        'State': 'Delhi',
        'Pincode': '110001',
        'Religion': 'Christian',
        'Category': 'OBC',
        'Nationality': 'Indian',
        'Roll Number': '2',
        'RFID': '',
        'RTE': 'false',
        'New Admission': 'true',
      },
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 15 }, // Admission No
      { wch: 20 }, // Student Name
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 10 }, // Class
      { wch: 10 }, // Section
      { wch: 15 }, // Date of Birth
      { wch: 10 }, // Gender
      { wch: 25 }, // Email
      { wch: 15 }, // Student Contact
      { wch: 15 }, // Aadhaar Number
      { wch: 12 }, // Blood Group
      { wch: 18 }, // Date of Admission
      { wch: 15 }, // Academic Year
      { wch: 20 }, // Father Name
      { wch: 20 }, // Father Occupation
      { wch: 15 }, // Father Contact
      { wch: 20 }, // Mother Name
      { wch: 20 }, // Mother Occupation
      { wch: 15 }, // Mother Contact
      { wch: 30 }, // Address
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 10 }, // Pincode
      { wch: 12 }, // Religion
      { wch: 12 }, // Category
      { wch: 12 }, // Nationality
      { wch: 12 }, // Roll Number
      { wch: 15 }, // RFID
      { wch: 8 },  // RTE
      { wch: 15 }, // New Admission
    ];
    ws['!cols'] = colWidths;

    // Add instructions sheet
    const instructionsData = [
      ['Student Import Template - Instructions'],
      [''],
      ['Required Fields (marked with *):'],
      ['- Admission No*: Unique admission number for each student'],
      ['- Student Name*: Full name of the student (or use First Name + Last Name)'],
      ['- Class*: Class (e.g., 10, 9, 8, NUR, LKG, UKG)'],
      ['- Section*: Section (e.g., A, B, C)'],
      [''],
      ['Optional Fields:'],
      ['- First Name: First name of the student'],
      ['- Last Name: Last name of the student'],
      ['- Date of Birth: DD-MM-YYYY (e.g. 15-05-2010). YYYY-MM-DD also accepted'],
      ['- Gender: Male, Female, or Other'],
      ['- Email: Valid email address'],
      ['- Student Contact: 10-digit phone number'],
      ['- Aadhaar Number: 12-digit Aadhaar number'],
      ['- Blood Group: A+, A-, B+, B-, AB+, AB-, O+, O-'],
      ['- Date of Admission: DD-MM-YYYY (e.g. 01-04-2024). YYYY-MM-DD also accepted'],
      ['- Academic Year: Defaults to current year if not provided'],
      ['- Father Name: Father\'s full name'],
      ['- Father Occupation: Father\'s occupation'],
      ['- Father Contact: 10-digit phone number'],
      ['- Mother Name: Mother\'s full name'],
      ['- Mother Occupation: Mother\'s occupation'],
      ['- Mother Contact: 10-digit phone number'],
      ['- Address: Full address'],
      ['- City: City name'],
      ['- State: State name'],
      ['- Pincode: 6-digit pincode'],
      ['- Religion: Religion name'],
      ['- Category: General, SC, ST, OBC, etc.'],
      ['- Nationality: Defaults to Indian if not provided'],
      ['- Roll Number: Roll number in class'],
      ['- RFID: RFID card number'],
      ['- RTE: true or false (Right to Education)'],
      ['- New Admission: true or false'],
      [''],
      ['Important Notes:'],
      ['1. Admission No must be unique for each student'],
      ['2. Passwords will be auto-generated for each student'],
      ['3. Dates: Use DD-MM-YYYY or YYYY-MM-DD'],
      ['4. Phone numbers must be 10 digits'],
      ['5. Aadhaar numbers must be 12 digits'],
      ['6. Remove example rows before uploading'],
      ['7. Class and Section must match existing classes in the system'],
    ];

    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    const instructionsColWidths = [{ wch: 80 }];
    instructionsWs['!cols'] = instructionsColWidths;

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Student Data');
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="student_import_template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating student template:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}

