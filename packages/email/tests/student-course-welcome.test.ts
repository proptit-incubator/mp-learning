import { describe, expect, it } from 'vitest';

import { studentCourseWelcomeEmail } from '../src/emails/student-course-welcome';

describe('studentCourseWelcomeEmail', () => {
  it('uses the saved organization template before a legacy course welcome message', () => {
    const fields = {
      orgName: 'MP Transformation',
      courseName: 'Digital Skills',
      loginUrl: 'https://example.com/course',
      customMessage: '<p>Legacy message</p>',
      branding: {}
    };
    const rendered = studentCourseWelcomeEmail.template.render(fields, {
      locale: 'vi',
      contentOverride: '<p>{{org_name}} assigned {{course_name}}</p>'
    });
    expect(rendered).toContain('MP Transformation assigned Digital Skills');
    expect(rendered).not.toContain('Legacy message');
    expect(rendered).toContain('href="https://example.com/course"');
    const subject = studentCourseWelcomeEmail.template.subject;
    expect(typeof subject === 'function' && subject(fields, { subjectOverride: '{{org_name}}: {{course_name}}' })).toBe(
      'MP Transformation: Digital Skills'
    );
  });
  it('includes the course name in the subject, in Vietnamese unless another locale is set', () => {
    const resolveSubject = studentCourseWelcomeEmail.template.subject as (
      fields: { courseName: string },
      context?: { locale: 'en' }
    ) => string;

    expect(resolveSubject({ courseName: 'React Basics' })).toContain('React Basics');
    expect(resolveSubject({ courseName: 'React Basics' })).not.toBe('You have access to React Basics');
    expect(resolveSubject({ courseName: 'React Basics' }, { locale: 'en' })).toBe('You have access to React Basics');
  });

  it('uses a localized custom subject and fills its dynamic values', () => {
    const resolveSubject = studentCourseWelcomeEmail.template.subject;

    expect(typeof resolveSubject).toBe('function');
    expect(
      (resolveSubject as (fields: { courseName: string }, context: { subjectOverride: string }) => string)(
        { courseName: 'React Basics' },
        { subjectOverride: 'Bienvenue dans {{course_name}}' }
      )
    ).toBe('Bienvenue dans React Basics');
  });

  it('sends the course welcome message in place of the default body', () => {
    const rendered = studentCourseWelcomeEmail.template.render(
      {
        orgName: 'Academy',
        courseName: 'React Basics',
        loginUrl: 'https://example.com/course',
        customMessage: '<p>Welcome from your instructor.</p>',
        branding: {}
      },
      { locale: 'vi' }
    );

    expect(rendered).toContain('<html lang="vi">');
    expect(rendered).toContain('<p>Welcome from your instructor.</p>');
    expect(rendered).not.toContain('Bạn đã có quyền truy cập');
    expect(rendered).toContain('Mở khóa học');
  });

  it('sends the default body when the course has no welcome message', () => {
    const rendered = studentCourseWelcomeEmail.template.render(
      { orgName: 'Academy', courseName: 'React Basics', loginUrl: 'https://example.com/course', branding: {} },
      { locale: 'vi' }
    );

    expect(rendered).toContain('Bạn đã có quyền truy cập');
  });

  it('falls back to Vietnamese for a locale MP Learning no longer ships', () => {
    const rendered = studentCourseWelcomeEmail.template.render(
      { orgName: 'Academy', courseName: 'React Basics', loginUrl: 'https://example.com/course', branding: {} },
      { locale: 'fr' as never }
    );

    expect(rendered).toContain('Bạn đã có quyền truy cập');
  });

  it('resolves dynamic action links in organization overrides', () => {
    const rendered = studentCourseWelcomeEmail.template.render(
      {
        orgName: 'Academy',
        courseName: 'React Basics',
        loginUrl: 'https://example.com/course',
        branding: {}
      },
      {
        locale: 'vi',
        contentOverride: '<p>Continue learning.</p><a href="{{action_url}}">Open course</a>'
      }
    );

    expect(rendered).toContain('href="https://example.com/course"');
    expect(rendered).not.toContain('{{action_url}}');
  });
});
