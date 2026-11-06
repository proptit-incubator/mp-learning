import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TPracticeCall, TPracticeScenario } from '@cio/db/types';
import type { TPracticeServerEvent } from '@cio/utils/validation/practice';

const updatePracticeCall = vi.fn(async () => null);
const replies: string[][] = [];

vi.mock('@cio/core/config/env', () => ({
  env: { SONIOX_API_KEY: '', TTS_URL: '', TTS_TOKEN: '', TTS_VOICE_ID: 'vannt' }
}));
vi.mock('@cio/db/queries/practice', () => ({ updatePracticeCall }));
vi.mock('./customer-agent', () => ({
  streamCustomerReply: async function* () {
    for (const delta of replies.shift() ?? []) {
      yield delta;
    }
  }
}));

const { PracticeCallSession, getActivePracticeSession } = await import('./call-session');

function buildScenario(openingLine: string): TPracticeScenario {
  return {
    id: 'scenario-1',
    organizationId: 'org-1',
    title: 'Khách lớn tuổi',
    summary: '',
    topic: 'CSKH',
    difficulty: 'MEDIUM',
    customerName: 'Cô Thoa',
    persona: 'Bạn là cô Thoa',
    hiddenContext: '',
    objective: '',
    tip: '',
    openingLine,
    evaluationCriteria: '',
    voiceId: null,
    isPublished: true,
    createdBy: null,
    createdAt: '2026-11-06T00:00:00Z',
    updatedAt: '2026-11-06T00:00:00Z',
    deletedAt: null
  };
}

const TEST_VOICE = { model: 'gemini-3.5-flash-lite' as const, voiceId: 'vannt' };

function buildCall(): TPracticeCall {
  return {
    id: 'call-1',
    organizationId: 'org-1',
    scenarioId: 'scenario-1',
    profileId: 'profile-1',
    status: 'ACTIVE',
    transcript: [],
    score: null,
    feedback: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationSeconds: null,
    recordingKey: null,
    recordingContentType: null,
    recordingDeletedAt: null,
    reviewScore: null,
    reviewComment: '',
    reviewedBy: null,
    reviewedAt: null
  };
}

function createSocket() {
  const events: TPracticeServerEvent[] = [];
  const socket = {
    readyState: 1,
    send: (data: string | Uint8Array) => {
      if (typeof data === 'string') events.push(JSON.parse(data) as TPracticeServerEvent);
    },
    close: vi.fn(() => {
      socket.readyState = 3;
    })
  };

  return { socket, events };
}

async function settle() {
  for (let index = 0; index < 5; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('PracticeCallSession', () => {
  beforeEach(() => {
    replies.length = 0;
    updatePracticeCall.mockClear();
  });

  it('opens with the scripted line, then answers what the learner types', async () => {
    const { socket, events } = createSocket();
    const session = new PracticeCallSession(buildCall(), buildScenario('Alo, chào cháu.'), socket, TEST_VOICE);

    replies.push(['Dạ vâng, ', 'cô cảm ơn cháu nhé.']);
    session.start();
    await settle();

    session.handleMessage(JSON.stringify({ type: 'text', text: 'Cháu chào cô ạ' }));
    await settle();

    expect(events.map((event) => event.type)).toEqual([
      'ready',
      'customer_start',
      'customer_delta',
      'customer_end',
      'speech_end',
      'turn',
      'customer_start',
      'customer_delta',
      'customer_delta',
      'customer_end',
      'speech_end'
    ]);

    const transcript = await session.finish();
    expect(transcript.map((turn) => [turn.speaker, turn.text])).toEqual([
      ['customer', 'Alo, chào cháu.'],
      ['agent', 'Cháu chào cô ạ'],
      ['customer', 'Dạ vâng, cô cảm ơn cháu nhé.']
    ]);
    expect(getActivePracticeSession('call-1')).toBeUndefined();
    expect(socket.close).toHaveBeenCalled();
  });

  it('ignores malformed frames and empty text', async () => {
    const { socket, events } = createSocket();
    const session = new PracticeCallSession(buildCall(), buildScenario('Alo.'), socket, TEST_VOICE);

    session.start();
    await settle();
    session.handleMessage('not json');
    session.handleMessage(JSON.stringify({ type: 'text', text: '   ' }));
    await settle();

    expect(events.filter((event) => event.type === 'turn')).toHaveLength(0);
    session.dispose();
  });

  it('hands the call to a newer connection and closes the old one', async () => {
    const first = createSocket();
    const second = createSocket();
    const firstSession = new PracticeCallSession(buildCall(), buildScenario('Alo.'), first.socket, TEST_VOICE);
    const secondSession = new PracticeCallSession(buildCall(), buildScenario('Alo.'), second.socket, TEST_VOICE);

    firstSession.start();
    await settle();
    secondSession.start();

    expect(first.events.some((event) => event.type === 'notice' && event.code === 'REPLACED')).toBe(true);
    expect(first.socket.close).toHaveBeenCalledWith(4001, 'replaced');
    expect(getActivePracticeSession('call-1')).toBe(secondSession);
    secondSession.dispose();
  });
});
