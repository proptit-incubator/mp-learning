import { describe, expect, it } from 'vitest';

import { withPlaybackOffsets } from './transcript-playback';

const STARTED_AT = '2026-11-06 08:21:14.000+00';

describe('withPlaybackOffsets', () => {
  it('uses the recorded start of each turn', () => {
    const turns = withPlaybackOffsets(
      [
        { speaker: 'customer', text: 'Alo', at: '2026-11-06T08:21:20.000Z', startMs: 300 },
        { speaker: 'agent', text: 'Dạ em chào chị', at: '2026-11-06T08:21:26.000Z', startMs: 8_460 }
      ],
      STARTED_AT,
      30
    );

    expect(turns.map((turn) => turn.offsetSeconds)).toEqual([0.3, 8.5]);
  });

  it('estimates older turns from when they were logged', () => {
    const turns = withPlaybackOffsets(
      [
        { speaker: 'customer', text: 'Alo', at: '2026-11-06T08:21:16.000Z' },
        { speaker: 'agent', text: 'A lô, a lô.', at: '2026-11-06T08:21:32.700Z' },
        { speaker: 'customer', text: 'Hủy đi', at: '2026-11-06T08:21:34.000Z' },
        { speaker: 'agent', text: 'Dạ', at: '2026-11-06T08:21:35.000Z' }
      ],
      STARTED_AT,
      30
    );

    expect(turns.map((turn) => turn.offsetSeconds)).toEqual([0, 16.7, 18.7, 20]);
  });

  it('never points past the end of the recording', () => {
    const [turn] = withPlaybackOffsets(
      [{ speaker: 'agent', text: 'Cảm ơn chị', at: '2026-11-06T08:22:00.000Z', startMs: 45_000 }],
      STARTED_AT,
      40
    );

    expect(turn.offsetSeconds).toBe(40);
  });
});
