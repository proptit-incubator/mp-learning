import type { EmailLocale } from './index';

const localizedSamples: Record<EmailLocale, Record<string, string>> = {
  en: {
    course_name: 'Example course',
    student_name: 'Alex Student',
    teacher_name: 'Taylor Teacher',
    teacher_email: 'teacher@example.com',
    exercise_title: 'Example exercise',
    session_title: 'Example live session',
    status: 'Reviewed',
    score: '8/10',
    lesson_title: 'Example lesson',
    course_message: 'A note from your instructor.',
    course_names: 'Example course',
    post_content: 'An example course post.'
  },
  vi: {
    course_name: 'Khóa học mẫu',
    student_name: 'Alex Học viên',
    teacher_name: 'Taylor Giảng viên',
    teacher_email: 'teacher@example.com',
    exercise_title: 'Bài tập mẫu',
    session_title: 'Buổi học trực tuyến mẫu',
    status: 'Đã chấm',
    score: '8/10',
    lesson_title: 'Bài học mẫu',
    course_message: 'Lời nhắn từ giảng viên của bạn.',
    course_names: 'Khóa học mẫu',
    post_content: 'Một bài đăng mẫu trong khóa học.'
  }
};

export function getStudentEmailSampleValues(locale: EmailLocale, organizationName: string): Record<string, string> {
  const formatDate = (date: string, withTime = false) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      ...(withTime ? { timeStyle: 'short' as const } : {}),
      timeZone: 'UTC'
    }).format(new Date(date));

  const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  return {
    ...localizedSamples[locale],
    org_name: organizationName,
    due_date: formatDate('2026-11-30T00:00:00.000Z'),
    due_status: locale === 'vi' ? 'Còn 7 ngày để hoàn thành.' : '7 days left to complete it.',
    valid_until: formatDate('2026-10-01T00:00:00.000Z'),
    batch_label: 'Q4 2026',
    employee_name: localizedSamples[locale].student_name,
    employee_code: 'MP001',
    session_time: formatDate('2026-10-10T10:00:00.000Z', true),
    when: relativeTime.format(2, 'day'),
    expires_at: formatDate('2026-10-31T00:00:00.000Z')
  };
}
