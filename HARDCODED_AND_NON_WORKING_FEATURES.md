# Hardcoded Data & Non-Working Features Analysis

This document identifies all functionality that is hardcoded (using mock/dummy data) or not fully implemented in the project.

## 🔴 CRITICAL - Fully Hardcoded Features (Mock Data Only)

### 1. **Pending Cheque Management**
   - **Location**: `app/dashboard/[school]/fees/pending-cheque/page.tsx`
   - **Status**: ❌ Fully hardcoded with mock data
   - **Issue**: Uses `mockCheques` array, no API integration
   - **TODO Comment**: Line 126 - "TODO: Fetch pending cheques"
   - **Impact**: HIGH - Cannot track real cheque payments

### 2. **Online Classes Management**
   - **Location**: `app/dashboard/[school]/online-classes/page.tsx`
   - **Status**: ❌ Fully hardcoded with mock data
   - **Issue**: Uses `mockClasses`, `mockTeachers`, `mockOnlineClasses` arrays
   - **TODO Comment**: Line 145 - "TODO: Fetch classes, teachers, and online classes"
   - **Impact**: HIGH - Cannot manage online classes

### 3. **Fee Schedule Mapper**
   - **Location**: `app/dashboard/[school]/fees/mapper/page.tsx`
   - **Status**: ❌ Fully hardcoded with mock data
   - **Issue**: Uses `mockFeeSchedules` and `mockMappings` arrays
   - **TODO Comment**: Line 115 - "TODO: Fetch mappings and fee schedules"
   - **TODO Comment**: Line 141 - "TODO: Implement API call" for save
   - **Impact**: HIGH - Cannot map fee schedules to classes

### 4. **Certificate Templates Management**
   - **Location**: `app/dashboard/[school]/certificates/templates/page.tsx`
   - **Status**: ❌ Fully hardcoded with mock data
   - **Issue**: Uses `setTimeout` with mock template data
   - **TODO Comment**: Line 55 - "TODO: Replace with actual API call"
   - **Impact**: MEDIUM - Cannot manage certificate templates

### 5. **Certificate Management (List View)**
   - **Location**: `app/dashboard/[school]/certificates/manage/page.tsx`
   - **Status**: ❌ Fully hardcoded with mock data
   - **Issue**: Uses `setTimeout` with mock certificate data
   - **TODO Comment**: Line 55 - "TODO: Replace with actual API call"
   - **Impact**: MEDIUM - Cannot view/manage issued certificates

### 6. **Teacher Recent Submissions**
   - **Location**: `app/api/teacher/recent-submissions/route.ts`
   - **Status**: ❌ Returns empty array (not implemented)
   - **Issue**: API returns empty array, commented code shows intended structure
   - **Comment**: Lines 38-56 - Placeholder implementation
   - **Impact**: MEDIUM - Teachers cannot see student submissions

## 🟠 PARTIALLY IMPLEMENTED / INCOMPLETE FEATURES

### 7. **Class Edit Functionality**
   - **Location**: `components/classes/ClassesTable.tsx`
   - **Status**: ⚠️ Not implemented
   - **Issue**: Line 96 - Shows alert "Edit functionality coming soon"
   - **Impact**: MEDIUM - Cannot edit class details

### 8. **Bulk Staff Attendance**
   - **Location**: `app/dashboard/[school]/staff-management/bulk-attendance/page.tsx`
   - **Status**: ⚠️ Placeholder page
   - **Issue**: Shows "This feature will be available soon"
   - **Impact**: MEDIUM - Cannot mark bulk attendance

### 9. **Student Attendance Marking Report**
   - **Location**: `app/dashboard/[school]/staff-management/student-attendance-report/page.tsx`
   - **Status**: ⚠️ Placeholder page
   - **Issue**: Shows "This feature will be available soon" (marked as PRO)
   - **Impact**: LOW - Reporting feature not available

### 10. **Financial Reports Tab**
   - **Location**: `app/dashboard/[school]/expense-income/page.tsx` (ReportsTab component)
   - **Status**: ⚠️ Placeholder
   - **Issue**: Shows "Reports feature coming soon" with list of planned features
   - **Impact**: MEDIUM - No financial reporting

### 11. **Academic Index (Dashboard)**
   - **Location**: `app/dashboard/[school]/page.tsx`
   - **Status**: ⚠️ Hardcoded value
   - **Issue**: Shows fixed value "92.8" instead of calculating from real data
   - **Impact**: LOW - Dashboard shows incorrect data

### 12. **Annual Revenue Calculation**
   - **Location**: `app/dashboard/[school]/page.tsx`
   - **Status**: ⚠️ Simplified calculation
   - **Issue**: Uses `feeCollection.total / 1000000` which may not represent actual annual revenue
   - **Impact**: MEDIUM - Dashboard metric may be inaccurate

## 🟡 FEATURES WITH PLACEHOLDER DATA / WORKAROUNDS

### 13. **Student Summary Stats**
   - **Location**: `app/api/student/summary-stats/route.ts`
   - **Status**: ⚠️ Uses workarounds
   - **Issue**: 
     - Lessons calculated from diary entries (proxy)
     - Quizzes/projects derived from exam types (simplified)
     - Comment: "In a real system, this might come from a lessons/completed_lessons table"
   - **Impact**: LOW - Data may not be accurate

### 14. **Grade Distribution Calculation**
   - **Location**: `app/api/teacher/grade-distribution/route.ts`
   - **Status**: ⚠️ Has fallback logic
   - **Issue**: Falls back to calculating from `student_subject_marks` if `exam_summaries` fails
   - **Impact**: LOW - Should work but may have edge cases

### 15. **Weekly Completion**
   - **Location**: `app/api/student/weekly-completion/route.ts`
   - **Status**: ✅ Working but simplified
   - **Issue**: Uses diary entries as proxy for assignments
   - **Impact**: LOW - Should work for most cases

## 🔵 FEATURES MARKED AS "COMING SOON" OR "NOT AVAILABLE"

### 16. **404 Page (Feature Under Maintenance)**
   - **Location**: `app/not-found.tsx`
   - **Status**: ⚠️ Generic maintenance message
   - **Issue**: Shows "Feature Under Maintenance" for all 404s
   - **Impact**: LOW - UX issue

## 📊 SUMMARY STATISTICS

### Hardcoded/Mock Data:
- **Fully Hardcoded Pages**: 5
- **Partially Hardcoded APIs**: 1
- **Placeholder Pages**: 3
- **Workaround Implementations**: 3

### Total Issues Found: **12 Critical/High Priority**

## 🎯 RECOMMENDED ACTION PLAN

### Phase 1 - Critical (Must Fix Before Production):
1. **Pending Cheque Management** - Implement API and database integration
2. **Online Classes Management** - Connect to real data source
3. **Fee Schedule Mapper** - Implement CRUD operations
4. **Certificate Templates** - Connect to API
5. **Certificate Management** - Connect to API
6. **Teacher Recent Submissions** - Implement submission tracking system

### Phase 2 - High Priority:
7. **Class Edit Functionality** - Implement edit modal and API
8. **Bulk Staff Attendance** - Implement bulk marking feature
9. **Financial Reports** - Implement reporting system
10. **Academic Index** - Calculate from real data
11. **Annual Revenue** - Use proper financial calculations

### Phase 3 - Medium Priority:
12. **Student Summary Stats** - Consider dedicated tables if needed
13. **Grade Distribution** - Test fallback logic thoroughly
14. **Weekly Completion** - Verify accuracy with real data

## 🔍 NOTES

- All mock data uses `setTimeout` to simulate API delays
- Many TODO comments indicate planned API endpoints
- Some features have UI but no backend integration
- Check `PRODUCTION_ISSUES.md` for additional security and code quality issues
- Console logs found in 261 API files (646 instances) - should be removed/replaced with proper logging

## 📝 FILES TO REVIEW

### Frontend Pages with Mock Data:
- `app/dashboard/[school]/fees/pending-cheque/page.tsx`
- `app/dashboard/[school]/online-classes/page.tsx`
- `app/dashboard/[school]/fees/mapper/page.tsx`
- `app/dashboard/[school]/certificates/templates/page.tsx`
- `app/dashboard/[school]/certificates/manage/page.tsx`

### API Routes Returning Empty/Placeholder Data:
- `app/api/teacher/recent-submissions/route.ts`

### Components with Incomplete Features:
- `components/classes/ClassesTable.tsx` (Edit functionality)

### Placeholder Pages:
- `app/dashboard/[school]/staff-management/bulk-attendance/page.tsx`
- `app/dashboard/[school]/staff-management/student-attendance-report/page.tsx`
- `app/dashboard/[school]/expense-income/page.tsx` (ReportsTab)
