import { describe, expect, it } from 'vitest';
import { AgentRole } from '@cio/ai-assistant';
import { buildSystemPrompt } from '@cio/ai-assistant/prompt';

const context = {
  orgId: 'org-1',
  courseId: 'course-1',
  courseTitle: 'An toàn thông tin',
  userId: 'user-1',
  role: AgentRole.TEACHER
};

describe('teacher system prompt language', () => {
  it('asks for Vietnamese content saved to the vi lesson record', () => {
    const prompt = buildSystemPrompt({ ...context, locale: 'vi' } as never);

    expect(prompt).toContain('Course content is written in Vietnamese (locale "vi")');
    expect(prompt).toContain('always save your edit back to "vi" with the full lesson');
    expect(prompt).not.toContain('ClassroomIO');
  });

  it('follows an organization that enforces English', () => {
    expect(buildSystemPrompt({ ...context, locale: 'en' } as never)).toContain('written in English (locale "en")');
  });
});
