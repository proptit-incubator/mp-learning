import { defaultUiLabels, type UiLabelKey, type UiLabels } from '@cio/ui/tools';

type Translate = (key: string, values?: Record<string, string>) => string;

const UI_LABEL_KEYS = Object.keys(defaultUiLabels) as UiLabelKey[];

function placeholdersOf(label: string): Record<string, string> {
  return Object.fromEntries([...label.matchAll(/\{(\w+)\}/g)].map(([token, name]) => [name, token]));
}

/**
 * The shared UI chrome strings (lesson editor, image upload, pagination…) in the active language. Each `{name}`
 * placeholder is passed back to itself so `formatUiLabel` can still fill it later; keys without a translation are left
 * out and keep their English default.
 */
export function translateUiLabels(translate: Translate): Partial<UiLabels> {
  const labels: Partial<UiLabels> = {};

  for (const key of UI_LABEL_KEYS) {
    const translationKey = `ui_labels.${key}`;
    const translated = translate(translationKey, placeholdersOf(defaultUiLabels[key]));
    if (translated && translated !== translationKey) labels[key] = translated;
  }

  return labels;
}
