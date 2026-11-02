ALTER TABLE course_completion_record ADD COLUMN reopened_at timestamptz;
--> statement-breakpoint
CREATE TABLE course_cycle_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  cycle_number integer NOT NULL,
  submissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX idx_course_cycle_archive_course_profile ON course_cycle_archive (course_id, profile_id);
