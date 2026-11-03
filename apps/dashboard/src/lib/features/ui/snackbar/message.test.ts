import { describe, expect, it } from 'vitest';
import { SNACKBAR_SEVERITY } from './constants';
import { resolveSnackbarMessage } from './message';

const translate = (key: string) =>
  ({ 'snackbar.something': 'Đã xảy ra lỗi', 'snackbar.success': 'Thành công' })[key] ?? key;
const resolve = (message: string, translated: string, locale = 'vi', severity = SNACKBAR_SEVERITY.ERROR) =>
  resolveSnackbarMessage({ message, translated, locale, severity, translate });

describe('resolveSnackbarMessage', () => {
  it('shows a translated key as is', () => {
    expect(resolve('snackbar.course_api.course_deleted', 'Đã xóa khóa học')).toBe('Đã xóa khóa học');
  });

  it('replaces English server text and missing keys with the generic Vietnamese message', () => {
    expect(resolve('Course not found', 'Course not found')).toBe('Đã xảy ra lỗi');
    expect(resolve('snackbar.never_added', 'snackbar.never_added')).toBe('Đã xảy ra lỗi');
    expect(resolve('Saved', 'Saved', 'vi', SNACKBAR_SEVERITY.SUCCESS)).toBe('Thành công');
  });

  it('keeps Vietnamese server text and English text in the English interface', () => {
    expect(resolve('Tài khoản chưa được cấp quyền.', 'Tài khoản chưa được cấp quyền.')).toBe(
      'Tài khoản chưa được cấp quyền.'
    );
    expect(resolve('Course not found', 'Course not found', 'en')).toBe('Course not found');
  });

  it('leaves loading and info text alone', () => {
    expect(resolve('Uploading', 'Uploading', 'vi', SNACKBAR_SEVERITY.LOADING)).toBe('Uploading');
  });
});
