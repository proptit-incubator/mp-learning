ALTER TABLE course_certificate_issue ALTER COLUMN expires_at DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE course_certificate_issue ADD COLUMN code varchar(20);
--> statement-breakpoint
UPDATE course_certificate_issue SET code = upper(substr(md5(id::text || random()::text), 1, 10)) WHERE code IS NULL;
--> statement-breakpoint
INSERT INTO course_certificate_issue (course_id, profile_id, course_completion_record_id, cycle_number, issued_at, expires_at, code)
SELECT ccr.course_id, ccr.profile_id, ccr.id, ccr.cycle_number, gm.certificate_earned_at, ccr.valid_until,
  upper(substr(md5(ccr.id::text || random()::text), 1, 10))
FROM course_completion_record ccr
JOIN groupmember gm ON gm.id = ccr.group_member_id
WHERE gm.certificate_earned_at IS NOT NULL
  AND ccr.cycle_number = (SELECT max(latest.cycle_number) FROM course_completion_record latest
    WHERE latest.course_id = ccr.course_id AND latest.profile_id = ccr.profile_id)
ON CONFLICT (course_completion_record_id) DO NOTHING;
--> statement-breakpoint
ALTER TABLE course_certificate_issue ALTER COLUMN code SET NOT NULL;
--> statement-breakpoint
ALTER TABLE course_certificate_issue ADD CONSTRAINT course_certificate_issue_code_key UNIQUE (code);
