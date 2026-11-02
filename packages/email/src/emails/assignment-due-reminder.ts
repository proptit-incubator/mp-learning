import * as z from 'zod';

import { defineEmail } from '../send';
import { ZEmailBranding } from '../core/branding';
import {
  getStudentEmailCopy,
  getLocalizedDueStatus,
  renderStudentEmail,
  renderStudentEmailSubject
} from '../core/student-email';

export const assignmentDueReminderEmail = defineEmail({
  id: 'assignmentDueReminder',
  subject: (fields, context) =>
    renderStudentEmailSubject(
      'assignmentDueReminder',
      { course_name: fields.courseName, org_name: fields.orgName },
      context
    ),
  schema: z.object({
    orgName: z.string().min(1),
    courseName: z.string().min(1),
    dueDate: z.string().min(1),
    daysUntilDue: z.number().int(),
    courseUrl: z.string().min(1),
    branding: ZEmailBranding
  }),
  render: (fields, context) => {
    const { locale } = getStudentEmailCopy('assignmentDueReminder', context);

    return renderStudentEmail({
      id: 'assignmentDueReminder',
      values: {
        org_name: fields.orgName,
        course_name: fields.courseName,
        due_date: fields.dueDate,
        due_status: getLocalizedDueStatus(fields.daysUntilDue, locale)
      },
      actionUrl: fields.courseUrl,
      branding: fields.branding,
      context
    });
  }
});
