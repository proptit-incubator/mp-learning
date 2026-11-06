import type { TPracticeDifficulty, TPracticeScenarioContent } from '@cio/utils/validation/practice';
import type { ManagedPracticeScenario, PracticeChatMessage, PracticeScenarioDraft } from './types';

export const DIFFICULTY_LEVELS: Record<TPracticeDifficulty, number> = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3
};

export const DIFFICULTY_LABEL_KEYS: Record<TPracticeDifficulty, string> = {
  EASY: 'practice.difficulty.easy',
  MEDIUM: 'practice.difficulty.medium',
  HARD: 'practice.difficulty.hard'
};

export const DIFFICULTY_TONE_CLASSES: Record<TPracticeDifficulty, string> = {
  EASY: 'ui:text-success-foreground',
  MEDIUM: 'ui:text-warning-foreground',
  HARD: 'ui:text-danger-foreground'
};

export function toDifficulty(value: string): TPracticeDifficulty {
  return value === 'EASY' || value === 'HARD' ? value : 'MEDIUM';
}

export function customerInitial(customerName: string): string {
  return customerName.trim().charAt(0).toUpperCase() || '?';
}

export function formatCallDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatCallTimestamp(value: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return '—';

  return new Intl.DateTimeFormat(locale, options).format(timestamp);
}

export function formatCallDate(value: string, locale: string): string {
  return formatCallTimestamp(value, locale, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatRecordingDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

export function formatCallClockTime(value: string, locale: string): string {
  return formatCallTimestamp(value, locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function scoreToneClass(score: number | null): string {
  if (score === null) return 'ui:text-muted-foreground';
  if (score >= 80) return 'ui:text-success-foreground';
  if (score >= 50) return 'ui:text-warning-foreground';

  return 'ui:text-danger-foreground';
}

export function emptyScenarioDraft(): PracticeScenarioDraft {
  return {
    title: '',
    summary: '',
    topic: '',
    difficulty: 'MEDIUM',
    customerName: '',
    persona: '',
    hiddenContext: '',
    objective: '',
    tip: '',
    openingLine: '',
    evaluationCriteria: '',
    voiceId: '',
    isPublished: true
  };
}

export function scenarioToDraft(scenario: ManagedPracticeScenario): PracticeScenarioDraft {
  return {
    title: scenario.title,
    summary: scenario.summary,
    topic: scenario.topic,
    difficulty: toDifficulty(scenario.difficulty),
    customerName: scenario.customerName,
    persona: scenario.persona,
    hiddenContext: scenario.hiddenContext,
    objective: scenario.objective,
    tip: scenario.tip,
    openingLine: scenario.openingLine,
    evaluationCriteria: scenario.evaluationCriteria,
    voiceId: scenario.voiceId ?? '',
    isPublished: scenario.isPublished
  };
}

/** WebSocket URL for a call's live stream, through the same API base the RPC client uses. */
export function buildPracticeStreamUrl(apiBaseUrl: string, callId: string): string {
  const streamUrl = new URL(`${apiBaseUrl.replace(/\/$/, '')}/practice/calls/${callId}/stream`, window.location.href);
  streamUrl.protocol = streamUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  return streamUrl.toString();
}

export function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;

  return items[Math.floor(Math.random() * items.length)];
}

/** The scenario text the AI assistant may read and rewrite; voice and publish state stay with the author. */
export function draftToAssistantContent(draft: PracticeScenarioDraft): TPracticeScenarioContent {
  return {
    title: draft.title,
    summary: draft.summary,
    topic: draft.topic,
    difficulty: draft.difficulty,
    customerName: draft.customerName,
    persona: draft.persona,
    hiddenContext: draft.hiddenContext,
    objective: draft.objective,
    tip: draft.tip,
    openingLine: draft.openingLine,
    evaluationCriteria: draft.evaluationCriteria
  };
}

export function scoreToneBgClass(score: number | null): string {
  if (score === null) return 'ui:bg-muted-foreground';
  if (score >= 80) return 'ui:bg-success';
  if (score >= 50) return 'ui:bg-warning';

  return 'ui:bg-danger';
}

/** Whole minutes in `totalSeconds`, rounded so a short call still counts as one minute. */
export function toPracticeMinutes(totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;

  return Math.max(1, Math.round(totalSeconds / 60));
}

/** "40–49" style label for a 10-point score bucket; the last bucket also holds 100. */
export function scoreBucketLabel(bucket: number): string {
  const low = bucket * 10;
  const high = bucket === 9 ? 100 : low + 9;

  return `${low}–${high}`;
}

/** Bar height as a percentage of the largest value, keeping zero bars flat. */
export function barHeightPercent(value: number, maximum: number): number {
  if (maximum <= 0 || value <= 0) return 0;

  return Math.max(4, (value / maximum) * 100);
}

/** SVG polyline points for scores (0–100) laid out across a `width` × `height` box. */
export function scoreTrendPoints(scores: number[], width: number, height: number): Array<{ x: number; y: number }> {
  if (scores.length === 0) return [];
  if (scores.length === 1) return [{ x: width / 2, y: height - (scores[0] / 100) * height }];

  return scores.map((score, index) => ({
    x: (index / (scores.length - 1)) * width,
    y: height - (score / 100) * height
  }));
}

/** Weakest criteria first, so learners see what to practise next. */
export function weakestCriteria<T extends { averageScore: number }>(criteria: T[], limit: number): T[] {
  return [...criteria].sort((left, right) => left.averageScore - right.averageScore).slice(0, limit);
}

/** The transcript turn being heard at `seconds` into the recording: the last one that started by then. */
export function activeTranscriptMessageId(messages: PracticeChatMessage[], seconds: number): string | null {
  let activeId: string | null = null;

  for (const message of messages) {
    if (message.offsetSeconds === undefined || message.offsetSeconds > seconds) continue;

    activeId = message.id;
  }

  return activeId;
}
