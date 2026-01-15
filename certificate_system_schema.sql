-- ============================================
-- CERTIFICATE SYSTEM SCHEMA - SUPABASE
-- Complete schema for certificate management system
-- ============================================

-- ============================================
-- 1. CERTIFICATE TEMPLATES TABLE
-- Stores certificate template designs
-- ============================================

DROP TABLE IF EXISTS certificates_issued CASCADE;
DROP TABLE IF EXISTS certificate_templates CASCADE;
DROP TABLE IF EXISTS certificate_fields CASCADE;

-- Create certificate_templates table
CREATE TABLE certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- School information
    school_id UUID NOT NULL REFERENCES accepted_schools(id) ON DELETE CASCADE,
    school_code TEXT NOT NULL,
    
    -- Template metadata
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('student', 'staff')),
    
    -- Page settings
    page_size TEXT NOT NULL DEFAULT 'A4' CHECK (page_size IN ('A4', 'A3', 'Letter')),
    page_orientation TEXT NOT NULL DEFAULT 'portrait' CHECK (page_orientation IN ('portrait', 'landscape')),
    
    -- Canvas dimensions (in pixels at 96 DPI)
    -- A4 Portrait: 794 x 1123 px
    -- A4 Landscape: 1123 x 794 px
    canvas_width INTEGER NOT NULL DEFAULT 794,
    canvas_height INTEGER NOT NULL DEFAULT 1123,
    
    -- Background
    background_image_url TEXT,
    background_color TEXT DEFAULT '#FFFFFF',
    
    -- Design data (JSON structure for drag-and-drop designer)
    -- Stores all elements: text, images, shapes, etc.
    design_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Generated HTML/CSS (for rendering)
    html_template TEXT,
    css_styles TEXT,
    
    -- Settings
    margins_top INTEGER DEFAULT 50,
    margins_bottom INTEGER DEFAULT 50,
    margins_left INTEGER DEFAULT 50,
    margins_right INTEGER DEFAULT 50,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    CONSTRAINT certificate_templates_name_check CHECK (char_length(name) >= 1),
    CONSTRAINT certificate_templates_canvas_check CHECK (canvas_width > 0 AND canvas_height > 0)
);

-- Create indexes for certificate_templates
CREATE INDEX IF NOT EXISTS idx_certificate_templates_school_id ON certificate_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_school_code ON certificate_templates(school_code);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_type ON certificate_templates(type);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_is_active ON certificate_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_created_at ON certificate_templates(created_at DESC);

-- ============================================
-- 2. CERTIFICATES ISSUED TABLE
-- Stores issued certificates with verification
-- ============================================

CREATE TABLE certificates_issued (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- School information
    school_id UUID NOT NULL REFERENCES accepted_schools(id) ON DELETE CASCADE,
    school_code TEXT NOT NULL,
    
    -- Template reference
    template_id UUID NOT NULL REFERENCES certificate_templates(id) ON DELETE RESTRICT,
    
    -- Recipient information
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('student', 'staff')),
    recipient_id UUID NOT NULL, -- References students(id) or staff(id)
    
    -- Certificate details
    certificate_number TEXT NOT NULL UNIQUE,
    certificate_code TEXT NOT NULL UNIQUE, -- Short code for QR verification
    
    -- PDF storage
    pdf_url TEXT,
    pdf_path TEXT,
    
    -- Verification
    qr_code_url TEXT,
    verification_url TEXT, -- Public verification URL
    
    -- Status
    status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('DRAFT', 'ISSUED', 'SENT', 'ARCHIVED')),
    
    -- Issuance details
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    issued_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    
    -- Additional metadata (stores dynamic data used in certificate)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT certificates_issued_certificate_number_check CHECK (char_length(certificate_number) >= 1),
    CONSTRAINT certificates_issued_certificate_code_check CHECK (char_length(certificate_code) >= 1)
);

-- Create indexes for certificates_issued
CREATE INDEX IF NOT EXISTS idx_certificates_issued_school_id ON certificates_issued(school_id);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_school_code ON certificates_issued(school_code);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_template_id ON certificates_issued(template_id);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_recipient ON certificates_issued(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_certificate_number ON certificates_issued(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_certificate_code ON certificates_issued(certificate_code);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_status ON certificates_issued(status);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_issued_at ON certificates_issued(issued_at DESC);

-- ============================================
-- 3. CERTIFICATE FIELDS TABLE (Optional)
-- Defines available placeholders/dynamic fields
-- ============================================

CREATE TABLE certificate_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Field identification
    field_key TEXT NOT NULL UNIQUE, -- e.g., 'student_name', 'roll_number'
    field_label TEXT NOT NULL, -- Display name: 'Student Name', 'Roll Number'
    
    -- Data source
    source_type TEXT NOT NULL CHECK (source_type IN ('student', 'staff', 'exam', 'system', 'custom')),
    source_table TEXT, -- e.g., 'students', 'staff', 'examinations'
    source_column TEXT, -- e.g., 'full_name', 'roll_number'
    
    -- Field metadata
    data_type TEXT NOT NULL DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'date', 'image', 'signature')),
    description TEXT,
    example_value TEXT,
    
    -- Display settings
    default_format TEXT, -- e.g., '{{field_key}}'
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for certificate_fields
CREATE INDEX IF NOT EXISTS idx_certificate_fields_key ON certificate_fields(field_key);
CREATE INDEX IF NOT EXISTS idx_certificate_fields_source_type ON certificate_fields(source_type);
CREATE INDEX IF NOT EXISTS idx_certificate_fields_is_active ON certificate_fields(is_active);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_certificate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_certificate_templates_updated_at
    BEFORE UPDATE ON certificate_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_certificate_updated_at();

CREATE TRIGGER update_certificates_issued_updated_at
    BEFORE UPDATE ON certificates_issued
    FOR EACH ROW
    EXECUTE FUNCTION update_certificate_updated_at();

CREATE TRIGGER update_certificate_fields_updated_at
    BEFORE UPDATE ON certificate_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_certificate_updated_at();

-- Function to generate unique certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
    cert_num TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Format: CERT-YYYYMMDD-XXXXXX (6 random alphanumeric)
        cert_num := 'CERT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        
        SELECT EXISTS(SELECT 1 FROM certificates_issued WHERE certificate_number = cert_num) INTO exists_check;
        
        EXIT WHEN NOT exists_check;
    END LOOP;
    
    RETURN cert_num;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique certificate code (for QR)
CREATE OR REPLACE FUNCTION generate_certificate_code()
RETURNS TEXT AS $$
DECLARE
    cert_code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Format: 8-character alphanumeric code
        cert_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
        
        SELECT EXISTS(SELECT 1 FROM certificates_issued WHERE certificate_code = cert_code) INTO exists_check;
        
        EXIT WHEN NOT exists_check;
    END LOOP;
    
    RETURN cert_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA: Certificate Fields
-- Pre-populate common certificate fields
-- ============================================

INSERT INTO certificate_fields (field_key, field_label, source_type, source_table, source_column, data_type, description, example_value) VALUES
-- Student fields
('student_name', 'Student Full Name', 'student', 'students', 'full_name', 'text', 'Full name of the student', 'John Doe'),
('student_first_name', 'Student First Name', 'student', 'students', 'first_name', 'text', 'First name of the student', 'John'),
('student_last_name', 'Student Last Name', 'student', 'students', 'last_name', 'text', 'Last name of the student', 'Doe'),
('student_roll_number', 'Roll Number', 'student', 'students', 'roll_number', 'text', 'Student roll number', '12345'),
('student_admission_number', 'Admission Number', 'student', 'students', 'admission_no', 'text', 'Student admission number', 'ADM-2024-001'),
('student_class', 'Class', 'student', 'students', 'class', 'text', 'Student class', '10'),
('student_section', 'Section', 'student', 'students', 'section', 'text', 'Student section', 'A'),
('student_class_section', 'Class Section', 'student', NULL, NULL, 'text', 'Class and section combined', '10-A'),
('student_photo', 'Student Photo', 'student', 'students', 'photo_url', 'image', 'Student photograph', NULL),
('student_date_of_birth', 'Date of Birth', 'student', 'students', 'date_of_birth', 'date', 'Student date of birth', '2010-01-15'),
('student_gender', 'Gender', 'student', 'students', 'gender', 'text', 'Student gender', 'Male'),
('student_address', 'Address', 'student', 'students', 'address', 'text', 'Student address', '123 Main Street'),
('student_mobile', 'Mobile Number', 'student', 'students', 'mobile', 'text', 'Student mobile number', '+1234567890'),
('student_email', 'Email', 'student', 'students', 'email', 'text', 'Student email', 'student@example.com'),
('student_admission_date', 'Admission Date', 'student', 'students', 'admission_date', 'date', 'Student admission date', '2024-01-01'),
('guardian_name', 'Guardian Name', 'student', 'students', 'guardian_name', 'text', 'Name of student guardian', 'Jane Doe'),
('guardian_mobile', 'Guardian Mobile', 'student', 'students', 'guardian_mobile', 'text', 'Guardian mobile number', '+1234567890'),
('guardian_email', 'Guardian Email', 'student', 'students', 'guardian_email', 'text', 'Guardian email address', 'guardian@example.com'),

-- Staff fields
('staff_name', 'Staff Full Name', 'staff', 'staff', 'full_name', 'text', 'Full name of the staff member', 'Jane Smith'),
('staff_first_name', 'Staff First Name', 'staff', 'staff', 'first_name', 'text', 'First name of the staff member', 'Jane'),
('staff_last_name', 'Staff Last Name', 'staff', 'staff', 'last_name', 'text', 'Last name of the staff member', 'Smith'),
('staff_id', 'Staff ID', 'staff', 'staff', 'staff_id', 'text', 'Staff identification number', 'STF-001'),
('staff_photo', 'Staff Photo', 'staff', 'staff', 'photo_url', 'image', 'Staff photograph', NULL),
('staff_designation', 'Designation', 'staff', 'staff', 'designation', 'text', 'Staff designation/role', 'Teacher'),
('staff_email', 'Email', 'staff', 'staff', 'email', 'text', 'Staff email address', 'staff@example.com'),
('staff_mobile', 'Mobile Number', 'staff', 'staff', 'mobile', 'text', 'Staff mobile number', '+1234567890'),

-- Exam/Academic fields
('exam_name', 'Exam Name', 'exam', 'examinations', 'name', 'text', 'Name of the examination', 'Annual Examination 2024'),
('exam_type', 'Exam Type', 'exam', 'examinations', 'exam_type', 'text', 'Type of examination', 'Final'),
('total_marks', 'Total Marks', 'exam', NULL, NULL, 'number', 'Total marks for the exam', '100'),
('obtained_marks', 'Obtained Marks', 'exam', NULL, NULL, 'number', 'Marks obtained by student', '85'),
('percentage', 'Percentage', 'exam', NULL, NULL, 'number', 'Percentage of marks', '85%'),
('grade', 'Grade', 'exam', NULL, NULL, 'text', 'Grade achieved', 'A+'),
('rank', 'Rank', 'exam', NULL, NULL, 'number', 'Rank in class/exam', '1'),
('session_year', 'Session Year', 'system', NULL, NULL, 'text', 'Academic session year', '2024-2025'),

-- System fields
('issue_date', 'Issue Date', 'system', NULL, NULL, 'date', 'Date when certificate was issued', CURRENT_DATE),
('certificate_number', 'Certificate Number', 'system', NULL, NULL, 'text', 'Unique certificate number', 'CERT-20240101-ABC123'),
('school_name', 'School Name', 'system', 'accepted_schools', 'school_name', 'text', 'Name of the school', 'Global Tech Solutions School'),
('school_logo', 'School Logo', 'system', 'accepted_schools', 'logo_url', 'image', 'School logo image', NULL),
('principal_name', 'Principal Name', 'system', NULL, NULL, 'text', 'Name of the principal', 'Dr. Principal Name'),
('principal_signature', 'Principal Signature', 'system', NULL, NULL, 'signature', 'Principal signature image', NULL),
('signature', 'Signature', 'system', NULL, NULL, 'signature', 'Signature image', NULL),
('qr_code', 'QR Code', 'system', NULL, NULL, 'image', 'QR code for verification', NULL);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE certificate_templates IS 'Stores certificate template designs with JSON design data';
COMMENT ON TABLE certificates_issued IS 'Stores issued certificates with verification codes and PDF paths';
COMMENT ON TABLE certificate_fields IS 'Defines available dynamic fields/placeholders for certificates';

COMMENT ON COLUMN certificate_templates.design_json IS 'JSON structure storing all design elements (text, images, shapes, etc.)';
COMMENT ON COLUMN certificate_templates.html_template IS 'Generated HTML template for certificate rendering';
COMMENT ON COLUMN certificate_templates.css_styles IS 'Generated CSS styles for certificate rendering';
COMMENT ON COLUMN certificates_issued.certificate_code IS 'Short unique code for QR code verification';
COMMENT ON COLUMN certificates_issued.metadata IS 'JSON data containing all dynamic values used in the certificate';
