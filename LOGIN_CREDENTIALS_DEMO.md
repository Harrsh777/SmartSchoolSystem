# Demo Login Credentials

This document contains the demo login credentials for testing the role-based authentication system.

## Student Login Credentials

### Student 1: John Doe
- **School Code:** SCH001
- **Admission No:** STU001
- **Password:** `student123`
- **Full Name:** John Doe
- **Class:** 10-A

### Student 2: Jane Smith
- **School Code:** SCH002
- **Admission No:** STU002
- **Password:** `student123`
- **Full Name:** Jane Smith
- **Class:** 10-B

## Staff/Teacher Login Credentials

### Staff 1: Dr. Anjali Mehta (Principal)
- **School Code:** SCH002
- **Staff ID:** STF001
- **Password:** `teacher123`
- **Full Name:** Dr. Anjali Mehta
- **Role:** Principal

### Staff 2: Prof. Rajesh Singh (Teacher)
- **School Code:** SCH002
- **Staff ID:** STF002
- **Password:** `teacher123`
- **Full Name:** Prof. Rajesh Singh
- **Role:** Teacher (Mathematics)

## Principal Login Credentials

Use the existing school login credentials from the `accepted_schools` table:
- **School Code:** SCH001 or SCH002
- **Password:** (Use the password from accepted_schools table)

## How to Use

1. **Run the SQL migration:**
   - Execute `supabase-login-tables-schema.sql` in Supabase SQL Editor
   
2. **Insert demo credentials:**
   - Execute `insert-demo-login-credentials.sql` in Supabase SQL Editor

3. **Test Login:**
   - Go to `/login`
   - Select a role (Student, Teacher, or Principal)
   - Enter the credentials above
   - You should be redirected to the respective dashboard

## Security Notes

- These are demo passwords for testing only
- In production, use strong, unique passwords
- Passwords are hashed using bcrypt (10 salt rounds)
- Never store plain passwords in the database

