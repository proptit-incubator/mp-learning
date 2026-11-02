import * as z from 'zod';

import { defineEmail } from '../send';
import { ZEmailBranding } from '../core/branding';
import { renderStudentEmail, renderStudentEmailSubject } from '../core/student-email';

export const recertificationReopenedEmail = defineEmail({
  id: 'recertificationReopened',
  subject: (fields, context) =>
    renderStudentEmailSubject(
      'recertificationReopened',
      { course_name: fields.courseName, org_name: fields.orgName },
      context
    ),
  schema: z.object({
    orgName: z.string().min(1),
    courseName: z.string().min(1),
    validUntil: z.string().min(1),
    dueDate: z.string().min(1),
    courseUrl: z.string().min(1),
    branding: ZEmailBranding
  }),
  render: (fields, context) =>
    renderStudentEmail({
      id: 'recertificationReopened',
      values: {
        org_name: fields.orgName,
        course_name: fields.courseName,
        valid_until: fields.validUntil,
        due_date: fields.dueDate
      },
      actionUrl: fields.courseUrl,
      branding: fields.branding,
      context
    })
});
