import { describe, expect, it } from 'vitest';
import { foldVietnamese, parseHelpFrontmatter, renderHelpMarkdown, slugifyHeading } from './help-markdown';
import { searchHelp } from './help-search';

describe('help markdown', () => {
  it('builds ascii heading ids from Vietnamese text', () => {
    expect(slugifyHeading('Xác thực chữ ký')).toBe('xac-thuc-chu-ky');
    expect(slugifyHeading('Đăng nhập & quên mật khẩu')).toBe('dang-nhap-quen-mat-khau');
    expect(foldVietnamese('Khóa HỌC')).toBe('khoa hoc');
  });

  it('reads frontmatter and keeps the body', () => {
    const { frontmatter, body } = parseHelpFrontmatter(
      '---\r\ntitle: Giao khóa học\r\ndescription: "Cách giao"\r\norder: 2\r\naudience: HR, L&D\r\n---\r\nNội dung'
    );
    expect(frontmatter).toEqual({ title: 'Giao khóa học', description: 'Cách giao', order: 2, audience: 'HR, L&D' });
    expect(body).toBe('Nội dung');
  });

  it('renders headings with ids, callouts and help links', () => {
    const { html, toc, text } = renderHelpMarkdown(
      '## Xác thực chữ ký\n\n> **Lưu ý:** Giữ bí mật.\n\n### Bước 1\n\nXem [webhook](/docs/tu-dong-hoa/webhook) hoặc [trang ngoài](https://example.com).'
    );

    expect(toc).toEqual([
      { id: 'xac-thuc-chu-ky', text: 'Xác thực chữ ký', level: 2 },
      { id: 'buoc-1', text: 'Bước 1', level: 3 }
    ]);
    expect(html).toContain('<h2 id="xac-thuc-chu-ky">');
    expect(html).toContain('class="help-callout help-callout-note"');
    expect(html).toContain('href="/help/tu-dong-hoa/webhook"');
    expect(html).toContain('href="https://example.com" target="_blank" rel="noopener noreferrer"');
    expect(text).not.toContain('#');
  });

  it('numbers repeated heading ids', () => {
    const { toc } = renderHelpMarkdown('## Các bước\n\n## Các bước');
    expect(toc.map((entry) => entry.id)).toEqual(['cac-buoc', 'cac-buoc-2']);
  });
});

describe('searchHelp', () => {
  const entries = [
    {
      title: 'Giao khóa học',
      description: 'Giao cho phòng ban',
      headings: 'Chọn người',
      text: 'Chọn khóa học rồi bấm giao.'
    },
    {
      title: 'Quên mật khẩu',
      description: 'Lấy lại mật khẩu',
      headings: '',
      text: 'Bấm Quên mật khẩu ở trang đăng nhập.'
    },
    { title: 'Chứng chỉ', description: '', headings: '', text: 'Sau khi hoàn thành khóa học bạn nhận chứng chỉ.' }
  ];

  it('matches without accents and ranks title hits first', () => {
    const results = searchHelp(entries, 'khoa hoc');
    expect(results.map((result) => result.entry.title)).toEqual(['Giao khóa học', 'Chứng chỉ']);
  });

  it('requires every word and returns a snippet', () => {
    const [result] = searchHelp(entries, 'mat khau dang nhap');
    expect(result.entry.title).toBe('Quên mật khẩu');
    expect(result.snippet).toContain('mật khẩu');
    expect(searchHelp(entries, 'khoa webhook')).toEqual([]);
  });
});
