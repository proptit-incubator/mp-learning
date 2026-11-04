import { describe, expect, it, vi } from 'vitest';

vi.mock('@cio/core/utils/redis/redis', () => ({ redis: {} }));

import { collectDocumentIds } from '@cio/core/services/agent/chat-context';

describe('collectDocumentIds', () => {
  it('gathers documents from single and multi-file messages and the current request, once each', () => {
    const messages = [
      { role: 'user', metadata: { attachment: { documentId: 'old-1', name: 'a.pdf' } } },
      {
        role: 'user',
        metadata: {
          attachments: [
            { documentId: 'new-1', name: 'b.docx' },
            { documentId: 'new-2', name: 'c.docx' }
          ]
        }
      },
      { role: 'assistant', metadata: {} }
    ];

    expect(collectDocumentIds(messages, ['new-2', 'new-3'])).toEqual(['old-1', 'new-1', 'new-2', 'new-3']);
  });
});
