import type { EmailLocale, StudentEmailLocaleCopy } from './index';

const en: StudentEmailLocaleCopy = {
  footer: { rightsReserved: 'All rights reserved.', website: 'Website', terms: 'Terms', privacy: 'Privacy' },
  templates: {
    employeeActivation: {
      subject: 'Activate your MP Learning account',
      body: '<p>Hello {{employee_name}},</p><p>Your account at {{org_name}} is ready. Your employee code is <strong>{{employee_code}}</strong>.</p><p>Activate your account to set a password. This link expires at {{expires_at}}.</p>',
      cta: 'Activate account'
    },
    studentCourseInvite: {
      subject: 'You are invited to join a course',
      body: '<p>Hi there,</p><p>You have been invited to join <strong>{{course_name}}</strong> on {{org_name}}.</p><p>This invitation expires at <strong>{{expires_at}}</strong>.</p>',
      cta: 'Join course'
    },
    studentCourseWelcome: {
      subject: 'You have access to {{course_name}}',
      body: '<p>Hi there,</p><p>You now have access to <strong>{{course_name}}</strong> in <strong>{{org_name}}</strong>.</p><p>If you run into any issues, reach out to your instructor.</p><p>Due date: <strong>{{due_date}}</strong></p><p>Training batch: {{batch_label}}</p><p>Cheers,<br>{{org_name}}</p>',
      cta: 'Open course'
    },
    studentCourseCompletion: {
      subject: 'Congratulations — you completed the course requirements',
      body: '<p>Hi {{student_name}},</p><p>Congratulations! You have met the completion requirements for <strong>{{course_name}}</strong>.</p>{{course_message}}<p>Cheers,<br>{{org_name}}</p>',
      cta: 'View certificate'
    },
    studentOrgInvite: {
      subject: 'You have been invited to join as a student',
      body: '<p>Hi there,</p><p>You have been invited to join <strong>{{org_name}}</strong> as a student.</p>{{course_names}}<p>This invitation expires at <strong>{{expires_at}}</strong>.</p>',
      cta: 'Accept invitation'
    },
    studentProvePayment: {
      subject: 'One more step left',
      body: '<p>Hi {{student_name}},</p><p>You are one step closer to joining <strong>{{course_name}}</strong>.</p><p>Please send your proof of payment to <strong>{{teacher_email}}</strong> to join the course.</p><p>Talk to you soon and see you in class.</p><p>{{org_name}}</p>'
    },
    assignmentDueReminder: {
      subject: 'Completion deadline reminder: {{course_name}}',
      body: '<p>Hi there,</p><p>The course <strong>{{course_name}}</strong> at {{org_name}} is due on <strong>{{due_date}}</strong>.</p><p>{{due_status}}</p><p>Cheers,<br>{{org_name}}</p>',
      cta: 'Start learning'
    },
    recertificationReopened: {
      subject: 'Time to recertify: {{course_name}}',
      body: '<p>Hi there,</p><p>Your result for <strong>{{course_name}}</strong> at {{org_name}} expired on <strong>{{valid_until}}</strong>. Please complete the course again before <strong>{{due_date}}</strong>.</p><p>Cheers,<br>{{org_name}}</p>',
      cta: 'Retake course'
    },
    quizAssigned: {
      subject: 'You have a quiz to complete',
      body: '<p>Hi there,</p><p>A quiz — <strong>{{exercise_title}}</strong> — has been assigned to you in <strong>{{course_name}}</strong> at <strong>{{org_name}}</strong>.</p><p>Cheers,<br>{{org_name}}</p>',
      cta: 'Take the quiz'
    },
    sessionReminder: {
      subject: 'Reminder: your live session is coming up',
      body: '<p>Hi there,</p><p>Your live session <strong>{{session_title}}</strong> in <strong>{{course_name}}</strong> starts <strong>{{when}}</strong>.</p><p><strong>When:</strong> {{session_time}}</p><p>See you there,<br>{{org_name}}</p>',
      cta: 'Join the session'
    },
    sessionUpdated: {
      subject: 'Updated: your live session details changed',
      body: '<p>Hi there,</p><p>The live session <strong>{{session_title}}</strong> in <strong>{{course_name}}</strong> has been updated.</p><p><strong>New time:</strong> {{session_time}}</p><p>The attached calendar invitation will update the event on your calendar.</p><p>Cheers,<br>{{org_name}}</p>',
      cta: 'Join the session'
    },
    submissionGraded: {
      subject: 'Your exercise submission has been updated',
      body: '<p>Hello {{student_name}},</p><p>The status of your submission for <strong>{{exercise_title}}</strong> in <strong>{{course_name}}</strong> is now <strong>{{status}}</strong>.</p><p><strong>Your score:</strong> {{score}}</p><p>This exercise is part of the lesson <strong>{{lesson_title}}</strong>.</p>',
      cta: 'Open exercise',
      ctaWhenScored: 'View your result'
    },
    newsfeedPost: {
      subject: 'New post in course',
      body: '<p><strong>{{teacher_name}}</strong> made a post in a course you are taking: <strong>{{course_name}}</strong>.</p>{{post_content}}',
      cta: 'View post'
    }
  }
};

const vi: StudentEmailLocaleCopy = {
  footer: {
    rightsReserved: 'Đã đăng ký bản quyền.',
    website: 'Trang web',
    terms: 'Điều khoản',
    privacy: 'Quyền riêng tư'
  },
  templates: {
    employeeActivation: {
      subject: 'Kích hoạt tài khoản MP Learning',
      body: '<p>Xin chào {{employee_name}},</p><p>Bạn đã được cấp tài khoản tại {{org_name}}. Mã nhân viên của bạn là <strong>{{employee_code}}</strong>.</p><p>Kích hoạt tài khoản để đặt mật khẩu. Liên kết hết hạn vào {{expires_at}}.</p>',
      cta: 'Kích hoạt tài khoản'
    },
    studentCourseInvite: {
      subject: 'Bạn được mời tham gia một khóa học',
      body: '<p>Xin chào,</p><p>Bạn được mời tham gia <strong>{{course_name}}</strong> tại {{org_name}}.</p><p>Lời mời này hết hạn vào <strong>{{expires_at}}</strong>.</p>',
      cta: 'Tham gia khóa học'
    },
    studentCourseWelcome: {
      subject: 'Bạn đã có quyền truy cập {{course_name}}',
      body: '<p>Xin chào,</p><p>Bạn đã có quyền truy cập <strong>{{course_name}}</strong> tại <strong>{{org_name}}</strong>.</p><p>Nếu gặp vấn đề, hãy liên hệ với giảng viên.</p><p>Hạn hoàn thành: <strong>{{due_date}}</strong></p><p>Đợt đào tạo: {{batch_label}}</p><p>Thân mến,<br>{{org_name}}</p>',
      cta: 'Mở khóa học'
    },
    studentCourseCompletion: {
      subject: 'Chúc mừng — bạn đã hoàn thành khóa học',
      body: '<p>Xin chào {{student_name}},</p><p>Chúc mừng! Bạn đã đáp ứng yêu cầu hoàn thành <strong>{{course_name}}</strong>.</p>{{course_message}}<p>Thân mến,<br>{{org_name}}</p>',
      cta: 'Xem chứng chỉ'
    },
    studentOrgInvite: {
      subject: 'Bạn được mời tham gia với tư cách học viên',
      body: '<p>Xin chào,</p><p>Bạn được mời tham gia <strong>{{org_name}}</strong> với tư cách học viên.</p>{{course_names}}<p>Lời mời này hết hạn vào <strong>{{expires_at}}</strong>.</p>',
      cta: 'Chấp nhận lời mời'
    },
    studentProvePayment: {
      subject: 'Chỉ còn một bước nữa',
      body: '<p>Xin chào {{student_name}},</p><p>Bạn đã tiến gần hơn đến việc tham gia <strong>{{course_name}}</strong>.</p><p>Hãy gửi bằng chứng thanh toán đến <strong>{{teacher_email}}</strong> để tham gia khóa học.</p><p>Hẹn gặp bạn trong lớp.</p><p>{{org_name}}</p>'
    },
    assignmentDueReminder: {
      subject: 'Nhắc hạn hoàn thành: {{course_name}}',
      body: '<p>Chào bạn,</p><p>Khóa học <strong>{{course_name}}</strong> tại {{org_name}} có hạn hoàn thành vào <strong>{{due_date}}</strong>.</p><p>{{due_status}}</p><p>Trân trọng,<br>{{org_name}}</p>',
      cta: 'Vào học'
    },
    recertificationReopened: {
      subject: 'Đến kỳ học lại: {{course_name}}',
      body: '<p>Chào bạn,</p><p>Kết quả khóa <strong>{{course_name}}</strong> tại {{org_name}} đã hết hiệu lực từ <strong>{{valid_until}}</strong>. Vui lòng hoàn thành lại trước <strong>{{due_date}}</strong>.</p><p>Trân trọng,<br>{{org_name}}</p>',
      cta: 'Học lại'
    },
    quizAssigned: {
      subject: 'Bạn có một bài kiểm tra cần hoàn thành',
      body: '<p>Xin chào,</p><p>Bài kiểm tra <strong>{{exercise_title}}</strong> đã được giao cho bạn trong <strong>{{course_name}}</strong> tại <strong>{{org_name}}</strong>.</p><p>Thân mến,<br>{{org_name}}</p>',
      cta: 'Làm bài kiểm tra'
    },
    sessionReminder: {
      subject: 'Nhắc nhở: buổi học trực tiếp sắp bắt đầu',
      body: '<p>Xin chào,</p><p>Buổi học <strong>{{session_title}}</strong> trong <strong>{{course_name}}</strong> bắt đầu <strong>{{when}}</strong>.</p><p><strong>Thời gian:</strong> {{session_time}}</p><p>Hẹn gặp bạn,<br>{{org_name}}</p>',
      cta: 'Tham gia buổi học'
    },
    sessionUpdated: {
      subject: 'Cập nhật: thông tin buổi học đã thay đổi',
      body: '<p>Xin chào,</p><p>Buổi học <strong>{{session_title}}</strong> trong <strong>{{course_name}}</strong> đã được cập nhật.</p><p><strong>Thời gian mới:</strong> {{session_time}}</p><p>Lời mời lịch đính kèm sẽ cập nhật sự kiện của bạn.</p><p>Thân mến,<br>{{org_name}}</p>',
      cta: 'Tham gia buổi học'
    },
    submissionGraded: {
      subject: 'Bài nộp của bạn đã được cập nhật',
      body: '<p>Xin chào {{student_name}},</p><p>Trạng thái bài nộp <strong>{{exercise_title}}</strong> trong khóa học <strong>{{course_name}}</strong> hiện là <strong>{{status}}</strong>.</p><p><strong>Điểm của bạn:</strong> {{score}}</p><p>Bài tập này thuộc bài học <strong>{{lesson_title}}</strong>.</p>',
      cta: 'Mở bài tập',
      ctaWhenScored: 'Xem kết quả của bạn'
    },
    newsfeedPost: {
      subject: 'Bài đăng mới trong khóa học',
      body: '<p><strong>{{teacher_name}}</strong> đã đăng bài trong khóa học <strong>{{course_name}}</strong>.</p>{{post_content}}',
      cta: 'Xem bài đăng'
    }
  }
};

export const STUDENT_EMAIL_CATALOG: Record<EmailLocale, StudentEmailLocaleCopy> = {
  en,
  vi
};
