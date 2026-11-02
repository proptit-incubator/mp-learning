const ANSWER_KEY_SETTINGS = ['correctValue', 'acceptedAnswers', 'pairs', 'hotspots'] as const;

type RedactableOption = { isCorrect?: boolean | null };

type RedactableQuestion = {
  settings?: Record<string, unknown>;
  options?: RedactableOption[];
};

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item ?? '')) : [];
}

function redactSettings(settings: Record<string, unknown>, random: () => number): Record<string, unknown> {
  const redacted = { ...settings };
  for (const key of ANSWER_KEY_SETTINGS) delete redacted[key];

  if ('correctAnswers' in redacted) {
    const words = [...stringList(redacted.correctAnswers), ...stringList(redacted.distractors)];
    redacted.correctAnswers = [];
    redacted.distractors = shuffle(words, random);
  }
  if (Array.isArray(redacted.items)) redacted.items = shuffle(redacted.items, random);

  return redacted;
}

/**
 * Returns a copy of a question that a learner may see before answers are revealed: no correct-option flags, no
 * answer-key settings, and ordering items and word-bank words shuffled so their order gives nothing away.
 * Scoring keeps reading the stored question, so the redacted copy is only for display.
 */
export function redactAnswerKey<Q extends RedactableQuestion>(question: Q, random: () => number = Math.random): Q {
  const settings = question.settings ? redactSettings(question.settings, random) : question.settings;
  const options = question.options?.map((option) => ({ ...option, isCorrect: false }));
  const isOrdering = Array.isArray(question.settings?.items);

  return {
    ...question,
    settings,
    options: options && isOrdering ? shuffle(options, random) : options
  };
}
