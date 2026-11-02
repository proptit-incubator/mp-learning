import { db, type DbOrTxClient } from '@db/drizzle';
import { sql } from 'drizzle-orm';
import { enrollmentStateSql, type EnrollmentState } from '../course/enrollment';

export type LearningStateCounts = Record<EnrollmentState, number>;

export type LearningCourseReport = LearningStateCounts & {
  id: string;
  title: string;
  isPublished: boolean;
  recertificationMonths: number | null;
  assigned: number;
  progress: number | null;
};

export type LearningEmployeeReport = LearningStateCounts & {
  id: string;
  employeeId: string;
  fullname: string;
  employeeCode: string;
  department: string;
  avatarUrl: string | null;
  assigned: number;
};

export type LearningBatchReport = LearningStateCounts & {
  batchLabel: string;
  assigned: number;
  courses: number;
  employees: number;
};

export type LearningAssignmentRow = {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  employeeId: string;
  profileId: string | null;
  fullname: string;
  employeeCode: string;
  department: string;
  jobTitle: string;
  batchLabel: string | null;
  dueDate: string | null;
  state: EnrollmentState;
  progress: number;
  completedAt: string | null;
  validUntil: string | null;
};

export type LearningSnapshot = LearningStateCounts & {
  employees: number;
  enrolledEmployees: number;
  assignments: number;
  courses: LearningCourseReport[];
  attention: LearningEmployeeReport[];
  batches: LearningBatchReport[];
  rows: LearningAssignmentRow[];
};

export type LearningActivity = {
  activeLearners: number;
  lessonsCompleted: number;
  submissions: number;
  daily: Array<{ date: string; lessons: number; submissions: number }>;
};

const STATE_COUNT_COLUMNS = sql`
  COUNT(*) FILTER (WHERE ls.state = 'not_started')::int AS not_started,
  COUNT(*) FILTER (WHERE ls.state = 'in_progress')::int AS in_progress,
  COUNT(*) FILTER (WHERE ls.state = 'completed')::int AS completed,
  COUNT(*) FILTER (WHERE ls.state = 'overdue')::int AS overdue,
  COUNT(*) FILTER (WHERE ls.state = 'expired')::int AS expired,
  COUNT(*) FILTER (WHERE ls.state = 'waived')::int AS waived`;

/** Active courses of the org, active employees, and their live ASSIGNED enrollments with computed state. */
function learningPopulation(orgId: string) {
  return sql`
    active_courses AS (
      SELECT c.id, c.title, c.is_published, c.group_id, c.recertification_months
      FROM course c JOIN "group" g ON g.id = c.group_id
      WHERE g.organization_id = ${orgId} AND c.status = 'ACTIVE' AND c.is_template = false
    ),
    employees AS (
      SELECT e.id AS employee_id, om.profile_id, e.fullname, e.employee_code, e.department, e.job_title, p.avatar_url
      FROM employee e JOIN organizationmember om ON om.id = e.member_id
      LEFT JOIN profile p ON p.id = om.profile_id
      WHERE e.organization_id = ${orgId} AND e.status = 'ACTIVE' AND om.status = 'ACTIVE'
    ),
    enrollments AS (
      SELECT ce.id AS enrollment_id, ce.course_id, ce.employee_id, ce.due_date, ce.batch_label, emp.profile_id,
        gm.id AS member_id, ${enrollmentStateSql('ce')} AS state
      FROM course_enrollment ce
      JOIN active_courses ac ON ac.id = ce.course_id
      JOIN employees emp ON emp.employee_id = ce.employee_id
      LEFT JOIN groupmember gm ON gm.group_id = ac.group_id AND gm.profile_id = emp.profile_id
      WHERE ce.kind = 'ASSIGNED' AND ce.status <> 'REVOKED'
    )
  `;
}

export async function getLearningAnalyticsSnapshot(orgId: string, dbClient: DbOrTxClient = db) {
  const population = learningPopulation(orgId);
  const rows = await dbClient.execute<LearningSnapshot>(sql`
    WITH ${population},
    lesson_totals AS (
      SELECT l.course_id, COUNT(*)::int AS total FROM lesson l
      JOIN active_courses ac ON ac.id = l.course_id GROUP BY l.course_id
    ),
    exercise_totals AS (
      SELECT ac.id AS course_id, COUNT(ex.id)::int AS total FROM active_courses ac
      JOIN exercise ex ON ex.course_id = ac.id OR EXISTS (
        SELECT 1 FROM lesson el WHERE el.id = ex.lesson_id AND el.course_id = ac.id
      ) GROUP BY ac.id
    ),
    lesson_progress AS (
      SELECT en.enrollment_id, COUNT(DISTINCT lc.lesson_id)::int AS completed
      FROM enrollments en JOIN lesson l ON l.course_id = en.course_id
      JOIN lesson_completion lc ON lc.lesson_id = l.id AND lc.profile_id = en.profile_id AND lc.is_complete = true
      GROUP BY en.enrollment_id
    ),
    exercise_progress AS (
      SELECT en.enrollment_id, COUNT(DISTINCT s.exercise_id)::int AS completed
      FROM enrollments en JOIN submission s ON s.submitted_by = en.member_id
      JOIN exercise ex ON ex.id = s.exercise_id
      LEFT JOIN lesson el ON el.id = ex.lesson_id
      WHERE ex.course_id = en.course_id OR el.course_id = en.course_id
      GROUP BY en.enrollment_id
    ),
    learning_state AS (
      SELECT en.*, COALESCE(lt.total, 0) + COALESCE(et.total, 0) AS total_items,
        COALESCE(lp.completed, 0) + COALESCE(ep.completed, 0) AS completed_items,
        latest.completed_at, latest.valid_until
      FROM enrollments en
      LEFT JOIN lesson_totals lt ON lt.course_id = en.course_id
      LEFT JOIN exercise_totals et ON et.course_id = en.course_id
      LEFT JOIN lesson_progress lp ON lp.enrollment_id = en.enrollment_id
      LEFT JOIN exercise_progress ep ON ep.enrollment_id = en.enrollment_id
      LEFT JOIN LATERAL (
        SELECT completed_at, valid_until FROM course_completion_record
        WHERE course_id = en.course_id AND profile_id = en.profile_id
        ORDER BY cycle_number DESC LIMIT 1
      ) latest ON true
    ),
    course_metrics AS (
      SELECT ac.id, ac.title, ac.is_published AS "isPublished", ac.recertification_months AS "recertificationMonths",
        COUNT(ls.course_id)::int AS assigned, ${STATE_COUNT_COLUMNS},
        ROUND(AVG(CASE WHEN ls.state IN ('completed', 'waived') THEN 100
          WHEN ls.total_items > 0 THEN LEAST(100, ls.completed_items * 100.0 / ls.total_items)
          WHEN ls.enrollment_id IS NOT NULL THEN 0 END))::int AS progress
      FROM active_courses ac LEFT JOIN learning_state ls ON ls.course_id = ac.id
      GROUP BY ac.id, ac.title, ac.is_published, ac.recertification_months
    ),
    employee_metrics AS (
      SELECT COALESCE(emp.profile_id::text, emp.employee_id::text) AS id, emp.employee_id AS "employeeId", emp.fullname,
        emp.employee_code AS "employeeCode", emp.department, emp.avatar_url AS "avatarUrl",
        COUNT(ls.course_id)::int AS assigned, ${STATE_COUNT_COLUMNS}
      FROM employees emp LEFT JOIN learning_state ls ON ls.employee_id = emp.employee_id
      GROUP BY emp.profile_id, emp.employee_id, emp.fullname, emp.employee_code, emp.department, emp.avatar_url
    ),
    batch_metrics AS (
      SELECT ls.batch_label AS "batchLabel", COUNT(*)::int AS assigned,
        COUNT(DISTINCT ls.course_id)::int AS courses, COUNT(DISTINCT ls.employee_id)::int AS employees,
        ${STATE_COUNT_COLUMNS}
      FROM learning_state ls WHERE ls.batch_label IS NOT NULL GROUP BY ls.batch_label
    ),
    assignment_rows AS (
      SELECT ls.enrollment_id AS "enrollmentId", ls.course_id AS "courseId", ac.title AS "courseTitle",
        ls.employee_id AS "employeeId", ls.profile_id AS "profileId", emp.fullname, emp.employee_code AS "employeeCode",
        emp.department, emp.job_title AS "jobTitle", ls.batch_label AS "batchLabel", ls.due_date AS "dueDate", ls.state,
        CASE WHEN ls.state IN ('completed', 'waived') THEN 100
          WHEN ls.total_items > 0 THEN LEAST(100, ROUND(ls.completed_items * 100.0 / ls.total_items)) ELSE 0 END::int AS progress,
        ls.completed_at AS "completedAt", ls.valid_until AS "validUntil"
      FROM learning_state ls JOIN active_courses ac ON ac.id = ls.course_id
      JOIN employees emp ON emp.employee_id = ls.employee_id
    )
    SELECT (SELECT COUNT(*)::int FROM employees) AS employees,
      (SELECT COUNT(DISTINCT employee_id)::int FROM enrollments) AS "enrolledEmployees",
      COUNT(*)::int AS assignments,
      ${STATE_COUNT_COLUMNS},
      COALESCE((SELECT json_agg(cm ORDER BY cm.overdue DESC, cm.assigned DESC, cm.title, cm.id) FROM course_metrics cm), '[]'::json) AS courses,
      COALESCE((SELECT json_agg(attention) FROM (
        SELECT * FROM employee_metrics WHERE assigned = 0 OR not_started > 0 OR overdue > 0 OR expired > 0
        ORDER BY overdue DESC, expired DESC, (assigned = 0) DESC, not_started DESC, fullname, id LIMIT 5
      ) attention), '[]'::json) AS attention,
      COALESCE((SELECT json_agg(bm ORDER BY bm."batchLabel") FROM batch_metrics bm), '[]'::json) AS batches,
      COALESCE((SELECT json_agg(ar ORDER BY
        CASE ar.state WHEN 'overdue' THEN 0 WHEN 'expired' THEN 1 WHEN 'not_started' THEN 2 WHEN 'in_progress' THEN 3 WHEN 'completed' THEN 4 ELSE 5 END,
        ar."dueDate" NULLS LAST, ar.fullname) FROM assignment_rows ar), '[]'::json) AS rows
    FROM learning_state ls
  `);
  const snapshot = rows[0];
  if (!snapshot) throw new Error('Learning snapshot unavailable');

  return snapshot;
}

export async function getLearningAnalyticsActivity(orgId: string, days: number, dbClient: DbOrTxClient = db) {
  const population = learningPopulation(orgId);
  const rows = await dbClient.execute<LearningActivity>(sql`
    WITH ${population},
    learners AS (
      SELECT DISTINCT ce.course_id, emp.profile_id, gm.id AS member_id
      FROM course_enrollment ce
      JOIN active_courses ac ON ac.id = ce.course_id
      JOIN employees emp ON emp.employee_id = ce.employee_id
      LEFT JOIN groupmember gm ON gm.group_id = ac.group_id AND gm.profile_id = emp.profile_id
      WHERE ce.status <> 'REVOKED'
    ),
    boundaries AS (
      SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS today,
        (((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - (${days}::int - 1))::timestamp
          AT TIME ZONE 'Asia/Ho_Chi_Minh') AS since
    ),
    events AS (
      SELECT en.profile_id, COALESCE(lc.updated_at, lc.created_at) AS happened_at, 'lesson' AS kind
      FROM learners en JOIN lesson l ON l.course_id = en.course_id
      JOIN lesson_completion lc ON lc.lesson_id = l.id AND lc.profile_id = en.profile_id AND lc.is_complete = true
      CROSS JOIN boundaries b
      WHERE COALESCE(lc.updated_at, lc.created_at) >= b.since AND COALESCE(lc.updated_at, lc.created_at) <= now()
      UNION ALL
      SELECT en.profile_id, s.created_at AS happened_at, 'submission' AS kind
      FROM learners en JOIN submission s ON s.submitted_by = en.member_id
      JOIN exercise ex ON ex.id = s.exercise_id
      LEFT JOIN lesson l ON l.id = ex.lesson_id
      CROSS JOIN boundaries b
      WHERE (ex.course_id = en.course_id OR l.course_id = en.course_id)
        AND s.created_at >= b.since AND s.created_at <= now()
    ),
    daily AS (
      SELECT to_char(b.today - (${days}::int - 1) + day_index, 'YYYY-MM-DD') AS date,
        COUNT(*) FILTER (WHERE ev.kind = 'lesson')::int AS lessons,
        COUNT(*) FILTER (WHERE ev.kind = 'submission')::int AS submissions
      FROM boundaries b CROSS JOIN generate_series(0, ${days}::int - 1) AS day_index
      LEFT JOIN events ev ON (ev.happened_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = b.today - (${days}::int - 1) + day_index
      GROUP BY b.today, day_index
    )
    SELECT COUNT(DISTINCT profile_id)::int AS "activeLearners",
      COUNT(*) FILTER (WHERE kind = 'lesson')::int AS "lessonsCompleted",
      COUNT(*) FILTER (WHERE kind = 'submission')::int AS submissions,
      COALESCE((SELECT json_agg(daily ORDER BY date) FROM daily), '[]'::json) AS daily
    FROM events
  `);
  const activity = rows[0];
  if (!activity) throw new Error('Learning activity unavailable');

  return activity;
}
