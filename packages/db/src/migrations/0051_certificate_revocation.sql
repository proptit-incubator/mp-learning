ALTER TABLE course_certificate_issue ADD COLUMN revoked_at timestamptz;
--> statement-breakpoint
ALTER TABLE course_certificate_issue ADD COLUMN revoked_by uuid REFERENCES profile(id);
--> statement-breakpoint
ALTER TABLE course_certificate_issue ADD COLUMN revoked_reason text;
--> statement-breakpoint
ALTER TABLE course_certificate_issue ADD CONSTRAINT course_certificate_issue_status_check CHECK (status IN ('valid', 'revoked'));
--> statement-breakpoint
CREATE INDEX course_certificate_issue_course_idx ON course_certificate_issue (course_id);
--> statement-breakpoint
CREATE INDEX course_certificate_issue_expires_idx ON course_certificate_issue (expires_at) WHERE status = 'valid';
