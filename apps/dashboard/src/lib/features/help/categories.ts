export interface HelpCategory {
  slug: string;
  title: string;
  description: string;
}

/** Help center sections, in the order they appear in the menu. */
export const HELP_CATEGORIES: HelpCategory[] = [
  {
    slug: 'getting-started',
    title: 'Bắt đầu',
    description: 'Làm quen MP Learning: tài khoản, đăng nhập, vai trò và giao diện.'
  },
  {
    slug: 'learning',
    title: 'Học tập',
    description: 'Dành cho mọi nhân viên: học bài, làm bài tập, nhận chứng chỉ, hỏi đáp.'
  },
  {
    slug: 'employees',
    title: 'Quản lý nhân viên',
    description: 'HR và Admin: thêm, nhập từ Excel, phân quyền, phòng ban và quản lý trực tiếp.'
  },
  {
    slug: 'assignments',
    title: 'Giao đào tạo',
    description: 'Giao khóa học, theo dõi lượt giao, hạn hoàn thành, tự đăng ký và học lại định kỳ.'
  },
  {
    slug: 'course-authoring',
    title: 'Soạn khóa học',
    description: 'L&D: tạo khóa học, bài học, bài tập, điều kiện hoàn thành và xuất bản.'
  },
  {
    slug: 'ai',
    title: 'AI',
    description: 'Soạn khóa học bằng AI, trợ lý AI, trợ giảng AI và hạn mức sử dụng.'
  },
  {
    slug: 'grading-certificates',
    title: 'Chấm bài và chứng chỉ',
    description: 'Chấm bài nộp, bảng điểm, thiết kế chứng chỉ, sổ chứng chỉ và tra cứu.'
  },
  {
    slug: 'reports',
    title: 'Báo cáo',
    description: 'Tổng quan, phân tích đào tạo, báo cáo theo đội và xuất dữ liệu.'
  },
  {
    slug: 'settings',
    title: 'Cài đặt hệ thống',
    description: 'Hồ sơ, thông báo, cấu hình đào tạo, email mẫu, thẻ và thư viện tài liệu.'
  },
  {
    slug: 'automation',
    title: 'Tự động hóa và tích hợp',
    description: 'Kết nối MCP, khóa API và webhook cho đội kỹ thuật.'
  },
  {
    slug: 'support',
    title: 'Hỗ trợ và sự cố',
    description: 'Câu hỏi thường gặp, khắc phục sự cố, thuật ngữ và liên hệ hỗ trợ.'
  }
];
