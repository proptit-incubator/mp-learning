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
  hi: {
    course_name: 'नमूना पाठ्यक्रम',
    student_name: 'आरव विद्यार्थी',
    teacher_name: 'तारा शिक्षक',
    teacher_email: 'teacher@example.com',
    exercise_title: 'नमूना अभ्यास',
    session_title: 'नमूना लाइव सत्र',
    status: 'समीक्षित',
    score: '8/10',
    lesson_title: 'नमूना पाठ',
    course_message: 'आपके प्रशिक्षक का संदेश।',
    course_names: 'नमूना पाठ्यक्रम',
    post_content: 'पाठ्यक्रम की एक नमूना पोस्ट।'
  },
  fr: {
    course_name: 'Cours exemple',
    student_name: 'Alex Étudiant',
    teacher_name: 'Taylor Enseignant',
    teacher_email: 'teacher@example.com',
    exercise_title: 'Exercice exemple',
    session_title: 'Session en direct exemple',
    status: 'Évalué',
    score: '8/10',
    lesson_title: 'Leçon exemple',
    course_message: 'Un message de votre formateur.',
    course_names: 'Cours exemple',
    post_content: 'Une publication exemple du cours.'
  },
  pt: {
    course_name: 'Curso de exemplo',
    student_name: 'Alex Estudante',
    teacher_name: 'Taylor Professor',
    teacher_email: 'teacher@example.com',
    exercise_title: 'Exercício de exemplo',
    session_title: 'Sessão ao vivo de exemplo',
    status: 'Revisado',
    score: '8/10',
    lesson_title: 'Lição de exemplo',
    course_message: 'Uma mensagem do seu instrutor.',
    course_names: 'Curso de exemplo',
    post_content: 'Uma publicação de exemplo do curso.'
  },
  de: {
    course_name: 'Beispielkurs',
    student_name: 'Alex Lernende',
    teacher_name: 'Taylor Lehrkraft',
    teacher_email: 'teacher@example.com',
    exercise_title: 'Beispielübung',
    session_title: 'Beispiel-Live-Sitzung',
    status: 'Bewertet',
    score: '8/10',
    lesson_title: 'Beispielllektion',
    course_message: 'Eine Nachricht Ihrer Lehrkraft.',
    course_names: 'Beispielkurs',
    post_content: 'Ein Beispielbeitrag aus dem Kurs.'
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
  },
  ru: {
    course_name: 'Пример курса',
    student_name: 'Алекс Студент',
    teacher_name: 'Тейлор Преподаватель',
    teacher_email: 'teacher@example.com',
    exercise_title: 'Пример задания',
    session_title: 'Пример онлайн-занятия',
    status: 'Проверено',
    score: '8/10',
    lesson_title: 'Пример урока',
    course_message: 'Сообщение от преподавателя.',
    course_names: 'Пример курса',
    post_content: 'Пример публикации в курсе.'
  },
  es: {
    course_name: 'Curso de ejemplo',
    student_name: 'Alex Estudiante',
    teacher_name: 'Taylor Docente',
    teacher_email: 'teacher@example.com',
    exercise_title: 'Ejercicio de ejemplo',
    session_title: 'Sesión en directo de ejemplo',
    status: 'Revisado',
    score: '8/10',
    lesson_title: 'Lección de ejemplo',
    course_message: 'Un mensaje de tu instructor.',
    course_names: 'Curso de ejemplo',
    post_content: 'Una publicación de ejemplo del curso.'
  },
  pl: {
    course_name: 'Przykładowy kurs',
    student_name: 'Alex Uczeń',
    teacher_name: 'Taylor Nauczyciel',
    teacher_email: 'teacher@example.com',
    exercise_title: 'Przykładowe ćwiczenie',
    session_title: 'Przykładowa sesja na żywo',
    status: 'Oceniono',
    score: '8/10',
    lesson_title: 'Przykładowa lekcja',
    course_message: 'Wiadomość od prowadzącego.',
    course_names: 'Przykładowy kurs',
    post_content: 'Przykładowy wpis w kursie.'
  },
  da: {
    course_name: 'Eksempelkursus',
    student_name: 'Alex Kursist',
    teacher_name: 'Taylor Underviser',
    teacher_email: 'teacher@example.com',
    exercise_title: 'Eksempeløvelse',
    session_title: 'Eksempel på live-session',
    status: 'Bedømt',
    score: '8/10',
    lesson_title: 'Eksempellektion',
    course_message: 'En besked fra din underviser.',
    course_names: 'Eksempelkursus',
    post_content: 'Et eksempelopslag fra kurset.'
  },
  tr: {
    course_name: 'Örnek kurs',
    student_name: 'Alex Öğrenci',
    teacher_name: 'Taylor Öğretmen',
    teacher_email: 'teacher@example.com',
    exercise_title: 'Örnek alıştırma',
    session_title: 'Örnek canlı oturum',
    status: 'Değerlendirildi',
    score: '8/10',
    lesson_title: 'Örnek ders',
    course_message: 'Eğitmeninizden bir not.',
    course_names: 'Örnek kurs',
    post_content: 'Kurstan örnek bir gönderi.'
  },
  it: {
    course_name: 'Corso di esempio',
    student_name: 'Alex Studente',
    teacher_name: 'Taylor Docente',
    teacher_email: 'teacher@example.com',
    exercise_title: 'Esercizio di esempio',
    session_title: 'Sessione live di esempio',
    status: 'Revisionato',
    score: '8/10',
    lesson_title: 'Lezione di esempio',
    course_message: 'Una nota del tuo istruttore.',
    course_names: 'Corso di esempio',
    post_content: 'Un post di esempio del corso.'
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
