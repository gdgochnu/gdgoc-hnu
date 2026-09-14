-- Migration 32: Add duration_minutes and deadline to course_sessions table
-- Enables tracking explicit session duration and task/assignment submission deadlines

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS duration_minutes INT,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- Add index for querying sessions by upcoming deadlines
CREATE INDEX IF NOT EXISTS idx_course_sessions_deadline 
  ON public.course_sessions(deadline) 
  WHERE deadline IS NOT NULL;
