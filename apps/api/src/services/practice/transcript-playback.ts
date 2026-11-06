import type { TPracticeTurn } from '@cio/utils/validation/practice';

export type TPracticePlaybackTurn = TPracticeTurn & { offsetSeconds: number };

const SPOKEN_WORDS_PER_SECOND = 4;
const SPEECH_ENDPOINT_DELAY_SECONDS = 1;

function estimatedSpeechSeconds(text: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return wordCount / SPOKEN_WORDS_PER_SECOND + SPEECH_ENDPOINT_DELAY_SECONDS;
}

/**
 * Where a turn saved before `startMs` existed starts, in seconds: customer speech follows the previous turn, and a
 * learner turn was logged when they stopped talking, so it is walked back by how long the words take to say.
 */
function estimatedStartSeconds(transcript: TPracticeTurn[], index: number, callStartMs: number): number {
  const turn = transcript[index];
  const previousLoggedSeconds = index === 0 ? 0 : (Date.parse(transcript[index - 1].at) - callStartMs) / 1000;
  if (turn.speaker === 'customer') return previousLoggedSeconds;

  const loggedSeconds = (Date.parse(turn.at) - callStartMs) / 1000;

  return Math.max(previousLoggedSeconds, loggedSeconds - estimatedSpeechSeconds(turn.text));
}

/** Seconds into the call recording where each turn starts, clamped to the recording length. */
export function withPlaybackOffsets(
  transcript: TPracticeTurn[],
  startedAt: string,
  durationSeconds: number | null
): TPracticePlaybackTurn[] {
  const callStartMs = Date.parse(startedAt);
  const maxSeconds = durationSeconds ?? Number.POSITIVE_INFINITY;

  return transcript.map((turn, index) => {
    const seconds =
      turn.startMs === undefined ? estimatedStartSeconds(transcript, index, callStartMs) : turn.startMs / 1000;
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const offsetSeconds = Math.round(Math.min(Math.max(safeSeconds, 0), maxSeconds) * 10) / 10;

    return { ...turn, offsetSeconds };
  });
}
