import { describe, expect, it } from 'vitest';
import vi from '../translations/vi.json';
import en from '../translations/en.json';
import { defaultUiLabels } from '@cio/ui/tools';
import { translateUiLabels } from './ui-labels';

function translatorFor(dictionary: { ui_labels: Record<string, string> }) {
  return (key: string, values: Record<string, string> = {}) => {
    const label = dictionary.ui_labels[key.replace('ui_labels.', '')];
    if (label === undefined) return key;

    return label.replace(/\{(\w+)\}/g, (token, name: string) => values[name] ?? token);
  };
}

describe('translateUiLabels', () => {
  it('gives the lesson editor Vietnamese labels and keeps placeholders for later formatting', () => {
    const labels = translateUiLabels(translatorFor(vi));

    expect(labels.editor_callout_style).toBe('Kiểu hộp ghi chú');
    expect(labels.editor_iframe).toBe('Nhúng trang (iframe)');
    expect(labels.comment_view_replies_other).toBe('Xem {count} câu trả lời');
  });

  it('leaves untranslated keys at their English default', () => {
    const labels = translateUiLabels(translatorFor(vi));

    expect(labels).not.toHaveProperty('landing_learning_report');
  });

  it('has the same labels in both locales, and English matches the built-in defaults', () => {
    expect(Object.keys(vi.ui_labels).sort()).toEqual(Object.keys(en.ui_labels).sort());
    for (const [key, label] of Object.entries(en.ui_labels)) {
      expect(label).toBe(defaultUiLabels[key as keyof typeof defaultUiLabels]);
    }
  });
});
