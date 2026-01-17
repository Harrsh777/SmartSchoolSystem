# Daily Agenda Feature - Supabase Schema

## Overview
The Daily Agenda feature displays today's class schedule for teachers by fetching data from the existing `timetable_slots` table. No new tables are required as the feature uses the existing timetable infrastructure.

## Tables Used

### 1. `timetable_slots`
This table stores the weekly timetable schedule for classes and teachers.

**Key Fields Used:**
- `id` (uuid): Unique identifier for the slot
- `school_code` (text): School identifier
- `teacher_id` (uuid): Teacher assigned to this slot
- `teacher_ids` (uuid[]): Array of teacher IDs (for multiple teachers)
- `class_id` (uuid): Class this slot belongs to (nullable)
- `subject_id` (uuid): Subject being taught
- `day` (text): Day of the week (Monday, Tuesday, etc.)
- `period` (integer): Period number
- `period_order` (integer): Order of the period (alternative to period)
- `room` (text): Classroom/location (optional)
- `location` (text): Alternative location field (optional)
- `duration` (integer): Duration in minutes (optional, defaults to 40)

**Relations:**
- `subject:subject_id` → `subjects` table (for subject name and color)
- `class:class_id` → `classes` table (for class and section info)
- `class_reference` → Reference to class info for teacher timetables

### 2. `subjects`
Provides subject information.

**Fields Used:**
- `id` (uuid): Subject identifier
- `name` (text): Subject name
- `color` (text): Subject color code

### 3. `classes`
Provides class information.

**Fields Used:**
- `id` (uuid): Class identifier
- `class` (text): Class name (e.g., "12")
- `section` (text): Section name (e.g., "A")

### 4. `period_groups` (Optional)
If you need actual time ranges for periods, use this table.

**Fields:**
- `id` (uuid): Period group identifier
- `school_code` (text): School identifier
- `period` (integer): Period number
- `start_time` (time): Period start time
- `end_time` (time): Period end time

## API Endpoint

### GET `/api/timetable/daily-agenda`
Fetches today's timetable slots for a specific teacher.

**Query Parameters:**
- `school_code` (required): School code
- `teacher_id` (required): Teacher UUID

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "time": "Period 1",
      "duration": 40,
      "name": "Mathematics",
      "room": "Room 101",
      "class": "12-A",
      "period_order": 1,
      "subject_id": "uuid",
      "class_id": "uuid",
      "status": null
    }
  ]
}
```

**Logic:**
1. Gets current day of week (Monday, Tuesday, etc.)
2. Filters `timetable_slots` by:
   - `school_code` = provided school code
   - `day` = current day of week
   - `teacher_id` matches OR `teacher_id` is in `teacher_ids` array
3. Orders by `period_order` (or `period` if `period_order` is null)
4. Includes subject and class information via Supabase relations

## Implementation Notes

### Day Mapping
The system uses JavaScript's `Date.getDay()` which returns:
- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

The `timetable_slots.day` field should match: `'Monday'`, `'Tuesday'`, etc.

### Time Calculation
Currently, the API returns `"Period X"` as the time string. To get actual times:

1. Fetch `period_groups` for the school
2. Match `period_groups.period` with `timetable_slots.period_order`
3. Format as `"HH:MM - HH:MM"` using `start_time` and `end_time`

### Status Determination
The `status` field can be set based on:
- Current time vs period start/end time
- `"Upcoming"`: Period hasn't started
- `"Current"`: Period is ongoing
- `"Completed"`: Period has ended

This requires fetching period times from `period_groups` or using a fixed schedule.

## Example Query

```sql
-- Get today's agenda for a teacher
SELECT 
  ts.*,
  s.name as subject_name,
  s.color as subject_color,
  c.class,
  c.section
FROM timetable_slots ts
LEFT JOIN subjects s ON ts.subject_id = s.id
LEFT JOIN classes c ON ts.class_id = c.id
WHERE ts.school_code = 'SCH001'
  AND ts.day = 'Tuesday'  -- Current day
  AND (ts.teacher_id = 'teacher-uuid' OR 'teacher-uuid' = ANY(ts.teacher_ids))
ORDER BY ts.period_order NULLS LAST, ts.period NULLS LAST;
```

## No New Tables Required

The Daily Agenda feature is designed to work with existing infrastructure. The `timetable_slots` table already contains all necessary information for displaying a teacher's daily schedule.
