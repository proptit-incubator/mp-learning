CREATE TABLE course_enrollment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  kind varchar(20) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE',
  assigned_by uuid REFERENCES profile(id) ON DELETE SET NULL,
  due_date timestamptz,
  batch_label varchar(120),
  message text NOT NULL DEFAULT '',
  waived_by uuid REFERENCES profile(id) ON DELETE SET NULL,
  waiver_reason text,
  waiver_expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profile(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_enrollment_kind_check CHECK (kind IN ('ASSIGNED', 'SELF')),
  CONSTRAINT course_enrollment_status_check CHECK (status IN ('ACTIVE', 'WAIVED', 'REVOKED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX course_enrollment_active_unique ON course_enrollment(course_id, employee_id, kind) WHERE status <> 'REVOKED';
--> statement-breakpoint
CREATE INDEX course_enrollment_employee_idx ON course_enrollment(employee_id, course_id);
--> statement-breakpoint
CREATE INDEX course_enrollment_course_status_idx ON course_enrollment(course_id, status);
--> statement-breakpoint
CREATE INDEX course_enrollment_batch_label_idx ON course_enrollment(batch_label) WHERE batch_label IS NOT NULL;
--> statement-breakpoint
INSERT INTO course_enrollment (course_id, employee_id, kind, status, assigned_by, due_date, message, revoked_at, revoked_by, created_at)
SELECT s.course_id, e.id,
  CASE WHEN s.kind = 'DIRECT' THEN 'ASSIGNED' ELSE 'SELF' END,
  CASE WHEN s.revoked_at IS NULL THEN 'ACTIVE' ELSE 'REVOKED' END,
  a.assigned_by, a.due_date, coalesce(a.message, ''), s.revoked_at, s.revoked_by, s.created_at
FROM course_enrollment_source s
LEFT JOIN course_training_assignment a ON a.enrollment_source_id = s.id
JOIN course co ON co.id = s.course_id
JOIN "group" cg ON cg.id = co.group_id
JOIN organizationmember om ON om.profile_id = s.profile_id AND om.organization_id = cg.organization_id
JOIN employee e ON e.member_id = om.id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO course_enrollment (course_id, employee_id, kind, status, created_at)
SELECT ec.course_id, ec.employee_id, 'ASSIGNED', 'ACTIVE', now()
FROM employee_course ec
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO course_enrollment (course_id, employee_id, kind, status, created_at)
SELECT co.id, e.id, 'SELF', 'ACTIVE', coalesce(gm.created_at, now())
FROM groupmember gm
JOIN course co ON co.group_id = gm.group_id
JOIN "group" cg ON cg.id = co.group_id
JOIN organizationmember om ON om.profile_id = gm.profile_id AND om.organization_id = cg.organization_id
JOIN employee e ON e.member_id = om.id
WHERE gm.role_id = 3 AND gm.profile_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM course_enrollment ce WHERE ce.course_id = co.id AND ce.employee_id = e.id AND ce.status <> 'REVOKED')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DROP TABLE course_training_assignment;
--> statement-breakpoint
DROP TABLE course_enrollment_source;
--> statement-breakpoint
DROP TABLE employee_course;
--> statement-breakpoint
DROP TABLE employee_cohort;
--> statement-breakpoint
ALTER TABLE groupmember DROP COLUMN learning_access_managed;
--> statement-breakpoint
DROP TABLE course_completion_notification_event;
--> statement-breakpoint
DELETE FROM course_completion_record WHERE completed_at IS NULL;
--> statement-breakpoint
ALTER TABLE course_completion_record
  DROP COLUMN status,
  DROP COLUMN due_date,
  DROP COLUMN expired_at,
  DROP COLUMN attempts,
  DROP COLUMN time_spent_minutes,
  DROP COLUMN waived_by,
  DROP COLUMN waiver_reason,
  DROP COLUMN waiver_expires_at;
--> statement-breakpoint
ALTER TABLE course_completion_record ALTER COLUMN completed_at SET NOT NULL;
--> statement-breakpoint
ALTER TABLE course ADD COLUMN recertification_months integer;
--> statement-breakpoint
UPDATE course SET recertification_months = coalesce((compliance->>'retakeIntervalMonths')::integer, 12) WHERE type = 'COMPLIANCE';
--> statement-breakpoint
UPDATE course SET certificate = certificate - 'deadline' WHERE certificate ? 'deadline';
--> statement-breakpoint
ALTER TABLE course
  DROP COLUMN type,
  DROP COLUMN compliance,
  DROP COLUMN callout,
  DROP COLUMN cost,
  DROP COLUMN currency;
--> statement-breakpoint
DROP TYPE "COURSE_TYPE";
--> statement-breakpoint
DELETE FROM invite_link WHERE resource_type = 'COHORT';
--> statement-breakpoint
ALTER TABLE invite_link
  DROP CONSTRAINT IF EXISTS invite_link_resource_target_check,
  DROP CONSTRAINT IF EXISTS invite_link_cohort_id_role_id_unique,
  DROP CONSTRAINT IF EXISTS invite_link_cohort_id_fkey;
--> statement-breakpoint
ALTER TABLE invite_link DROP COLUMN cohort_id;
--> statement-breakpoint
ALTER TYPE "INVITE_LINK_RESOURCE_TYPE" RENAME TO "INVITE_LINK_RESOURCE_TYPE_OLD";
--> statement-breakpoint
CREATE TYPE "INVITE_LINK_RESOURCE_TYPE" AS ENUM ('COURSE');
--> statement-breakpoint
ALTER TABLE invite_link ALTER COLUMN resource_type TYPE "INVITE_LINK_RESOURCE_TYPE" USING resource_type::text::"INVITE_LINK_RESOURCE_TYPE";
--> statement-breakpoint
DROP TYPE "INVITE_LINK_RESOURCE_TYPE_OLD";
--> statement-breakpoint
ALTER TABLE invite_link ADD CONSTRAINT invite_link_resource_target_check CHECK (resource_type = 'COURSE' AND course_id IS NOT NULL);
--> statement-breakpoint
DROP TABLE IF EXISTS cohort_goal_assignment;
--> statement-breakpoint
DROP TABLE IF EXISTS cohort_goal;
--> statement-breakpoint
DROP TABLE IF EXISTS cohort_newsfeed_comment;
--> statement-breakpoint
DROP TABLE IF EXISTS cohort_newsfeed;
--> statement-breakpoint
DROP TABLE IF EXISTS cohort_member;
--> statement-breakpoint
DROP TABLE IF EXISTS cohort_course;
--> statement-breakpoint
DROP TABLE IF EXISTS cohort;
--> statement-breakpoint
DROP TABLE IF EXISTS program_goal_assignment;
--> statement-breakpoint
DROP TABLE IF EXISTS program_goal;
--> statement-breakpoint
DROP TABLE IF EXISTS program_newsfeed_comment;
--> statement-breakpoint
DROP TABLE IF EXISTS program_newsfeed;
--> statement-breakpoint
DROP TABLE IF EXISTS program_member;
--> statement-breakpoint
DROP TABLE IF EXISTS program_course;
--> statement-breakpoint
DROP TABLE IF EXISTS program;
--> statement-breakpoint
DROP TYPE IF EXISTS "COHORT_GOAL_ASSIGNMENT_STATUS";
--> statement-breakpoint
DROP TYPE IF EXISTS "COHORT_GOAL_DEADLINE_KIND";
--> statement-breakpoint
DROP TYPE IF EXISTS "COHORT_GOAL_STATUS";
--> statement-breakpoint
DROP TYPE IF EXISTS "COHORT_GOAL_TYPE";
--> statement-breakpoint
DROP TYPE IF EXISTS "COHORT_STATUS";
--> statement-breakpoint
DROP TYPE IF EXISTS "PROGRAM_GOAL_ASSIGNMENT_STATUS";
--> statement-breakpoint
DROP TYPE IF EXISTS "PROGRAM_GOAL_DEADLINE_KIND";
--> statement-breakpoint
DROP TYPE IF EXISTS "PROGRAM_GOAL_STATUS";
--> statement-breakpoint
DROP TYPE IF EXISTS "PROGRAM_GOAL_TYPE";
--> statement-breakpoint
DROP TYPE IF EXISTS "PROGRAM_STATUS";
--> statement-breakpoint
DELETE FROM content_report WHERE target_type IN ('cohort_newsfeed_post', 'cohort_newsfeed_comment');
--> statement-breakpoint
UPDATE organization_api_key SET scopes = (scopes - 'cohort:read') - 'cohort:write' WHERE scopes ?| array['cohort:read', 'cohort:write'];
--> statement-breakpoint
INSERT INTO course_completion_record (course_id, group_member_id, profile_id, cycle_number, started_at, completed_at, valid_until)
SELECT co.id, gm.id, gm.profile_id, 1, gm.completed_at, gm.completed_at,
  CASE WHEN co.recertification_months IS NOT NULL
    THEN gm.completed_at + make_interval(months => co.recertification_months) END
FROM groupmember gm
JOIN course co ON co.group_id = gm.group_id
WHERE gm.role_id = 3 AND gm.profile_id IS NOT NULL AND gm.completed_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM course_completion_record r WHERE r.course_id = co.id AND r.profile_id = gm.profile_id);
