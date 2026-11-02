/**
 * Auto-import all email definitions to register them in the registry
 *
 * When this module is imported, all emails are automatically registered
 * and available for use with the send() function.
 */

// Import all email definitions (side effect: registers them)
export * from './forgot-password';
export * from './employee-activation';
export * from './welcome';
export * from './verify-email';
export * from './on-password-reset';
export * from './invite-teacher';
export * from './newsfeed';
export * from './student-course-welcome';
export * from './student-course-completion';
export * from './student-course-invite';
export * from './teacher-student-joined';
export * from './teacher-student-buy-request';
export * from './student-prove-payment';
export * from './teacher-course-welcome';
export * from './student-org-invite';
export * from './assignment-due-reminder';
export * from './recertification-reopened';
export * from './quiz-assigned';
export * from './session';
export * from './submission-received';
export * from './submission-graded';
export * from './early-adopter-ready';
export * from './early-adopter-reminder';
export * from './student-limit-reached';
export * from './student-limit-approaching';
export * from './content-report-alert';
export * from './webhook-failing';
export * from './webhook-disabled';

import type { newsfeedCommentEmail, newsfeedPostEmail } from './newsfeed';

// Import types for schema mapping (must be after exports to avoid circular dependency)
import type { forgotPasswordEmail } from './forgot-password';
import type { employeeActivationEmail } from './employee-activation';
import type { inviteTeacherEmail } from './invite-teacher';
import type { onPasswordResetEmail } from './on-password-reset';
import type { studentCourseInviteEmail } from './student-course-invite';
import type { studentCourseCompletionEmail } from './student-course-completion';
import type { studentCourseWelcomeEmail } from './student-course-welcome';
import type { studentProvePaymentEmail } from './student-prove-payment';
import type { studentOrgInviteEmail } from './student-org-invite';
import type { assignmentDueReminderEmail } from './assignment-due-reminder';
import type { recertificationReopenedEmail } from './recertification-reopened';
import type { quizAssignedEmail } from './quiz-assigned';
import type { sessionReminderEmail, sessionUpdatedEmail } from './session';
import type { submissionReceivedEmail } from './submission-received';
import type { submissionGradedEmail } from './submission-graded';
import type { earlyAdopterReadyEmail } from './early-adopter-ready';
import type { earlyAdopterReminderEmail } from './early-adopter-reminder';
import type { studentLimitReachedEmail } from './student-limit-reached';
import type { studentLimitApproachingEmail } from './student-limit-approaching';
import type { contentReportAlertEmail } from './content-report-alert';
import type { webhookFailingEmail } from './webhook-failing';
import type { webhookDisabledEmail } from './webhook-disabled';
import type { teacherCourseWelcomeEmail } from './teacher-course-welcome';
import type { teacherStudentBuyRequestEmail } from './teacher-student-buy-request';
import type { teacherStudentJoinedEmail } from './teacher-student-joined';
import type { verifyEmailEmail } from './verify-email';
import type { welcomeEmail } from './welcome';

/**
 * Type mapping that maps each EmailId to its corresponding Zod schema type
 * This is used for compile-time type inference in sendEmail()
 *
 * **Important**: When adding a new email, add its schema mapping here!
 */
export type EmailSchemas = {
  employeeActivation: typeof employeeActivationEmail.template.schema;
  forgotPassword: typeof forgotPasswordEmail.template.schema;
  welcome: typeof welcomeEmail.template.schema;
  verifyEmail: typeof verifyEmailEmail.template.schema;
  onPasswordReset: typeof onPasswordResetEmail.template.schema;
  inviteTeacher: typeof inviteTeacherEmail.template.schema;
  newsfeedPost: typeof newsfeedPostEmail.template.schema;
  newsfeedComment: typeof newsfeedCommentEmail.template.schema;
  studentCourseWelcome: typeof studentCourseWelcomeEmail.template.schema;
  studentCourseCompletion: typeof studentCourseCompletionEmail.template.schema;
  studentCourseInvite: typeof studentCourseInviteEmail.template.schema;
  teacherStudentJoined: typeof teacherStudentJoinedEmail.template.schema;
  teacherStudentBuyRequest: typeof teacherStudentBuyRequestEmail.template.schema;
  studentProvePayment: typeof studentProvePaymentEmail.template.schema;
  teacherCourseWelcome: typeof teacherCourseWelcomeEmail.template.schema;
  studentOrgInvite: typeof studentOrgInviteEmail.template.schema;
  assignmentDueReminder: typeof assignmentDueReminderEmail.template.schema;
  recertificationReopened: typeof recertificationReopenedEmail.template.schema;
  quizAssigned: typeof quizAssignedEmail.template.schema;
  sessionReminder: typeof sessionReminderEmail.template.schema;
  sessionUpdated: typeof sessionUpdatedEmail.template.schema;
  submissionReceived: typeof submissionReceivedEmail.template.schema;
  submissionGraded: typeof submissionGradedEmail.template.schema;
  earlyAdopterReady: typeof earlyAdopterReadyEmail.template.schema;
  earlyAdopterReminder: typeof earlyAdopterReminderEmail.template.schema;
  studentLimitReached: typeof studentLimitReachedEmail.template.schema;
  studentLimitApproaching: typeof studentLimitApproachingEmail.template.schema;
  contentReportAlert: typeof contentReportAlertEmail.template.schema;
  webhookFailing: typeof webhookFailingEmail.template.schema;
  webhookDisabled: typeof webhookDisabledEmail.template.schema;
};
