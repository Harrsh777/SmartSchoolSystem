-- Teacher To-Do List Table Schema
-- This table stores to-do items for individual teachers

CREATE TABLE teacher_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  school_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  due_time TIME,
  reminder_date DATE,
  reminder_time TIME,
  category TEXT,
  tags TEXT[],
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_teacher_todos_teacher_id ON teacher_todos(teacher_id);
CREATE INDEX idx_teacher_todos_school_code ON teacher_todos(school_code);
CREATE INDEX idx_teacher_todos_status ON teacher_todos(status);
CREATE INDEX idx_teacher_todos_due_date ON teacher_todos(due_date);
CREATE INDEX idx_teacher_todos_priority ON teacher_todos(priority);

-- Enable Row Level Security
ALTER TABLE teacher_todos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view their own todos"
  ON teacher_todos FOR SELECT
  USING (auth.uid()::text = (SELECT id::text FROM staff WHERE id = teacher_todos.teacher_id LIMIT 1));

CREATE POLICY "Teachers can insert their own todos"
  ON teacher_todos FOR INSERT
  WITH CHECK (auth.uid()::text = (SELECT id::text FROM staff WHERE id = teacher_todos.teacher_id LIMIT 1));

CREATE POLICY "Teachers can update their own todos"
  ON teacher_todos FOR UPDATE
  USING (auth.uid()::text = (SELECT id::text FROM staff WHERE id = teacher_todos.teacher_id LIMIT 1));

CREATE POLICY "Teachers can delete their own todos"
  ON teacher_todos FOR DELETE
  USING (auth.uid()::text = (SELECT id::text FROM staff WHERE id = teacher_todos.teacher_id LIMIT 1));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teacher_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_teacher_todos_updated_at
  BEFORE UPDATE ON teacher_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_todos_updated_at();
