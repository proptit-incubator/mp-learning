import { PRACTICE_ASSISTANT_MAX_MESSAGES } from '@cio/utils/validation/practice';

import { practiceApi } from './practice.svelte';
import { draftToAssistantContent, emptyScenarioDraft, scenarioToDraft } from '../utils/practice-utils';
import type { ManagedPracticeScenario, PracticeAssistantChatMessage, PracticeScenarioDraft } from '../utils/types';

/** Admin chat that refines one working scenario draft, new or existing, for the form dialog to save. */
class ScenarioAssistantStore {
  messages = $state<PracticeAssistantChatMessage[]>([]);
  isThinking = $state(false);
  draft = $state<PracticeScenarioDraft>(emptyScenarioDraft());
  /** The scenario being edited, or null while drafting a new one. */
  scenario = $state<ManagedPracticeScenario | null>(null);
  /** True once the AI has written into the draft, so it is worth opening in the form. */
  hasDraft = $state(false);
  private nextId = 0;

  startNew() {
    this.messages = [];
    this.draft = emptyScenarioDraft();
    this.scenario = null;
    this.hasDraft = false;
  }

  editScenario(scenario: ManagedPracticeScenario) {
    this.startNew();
    this.scenario = scenario;
    this.draft = scenarioToDraft(scenario);
  }

  /** Clears the conversation after the draft is saved, leaving a note that is never sent to the AI. */
  finish(title: string) {
    this.startNew();
    this.addMessage('assistant', title, true);
  }

  async send(text: string) {
    const content = text.trim();
    if (!content || this.isThinking) return;

    this.addMessage('user', content);
    this.isThinking = true;

    const history = this.messages
      .filter((message) => !message.isNotice)
      .slice(-PRACTICE_ASSISTANT_MAX_MESSAGES)
      .map((message) => ({ role: message.role, content: message.content }));
    const result = await practiceApi.runAssistant({ messages: history, draft: draftToAssistantContent(this.draft) });

    this.isThinking = false;
    if (!result) return;

    Object.assign(this.draft, result.draft);
    this.hasDraft = true;
    this.addMessage('assistant', result.reply);
  }

  private addMessage(role: PracticeAssistantChatMessage['role'], content: string, isNotice = false) {
    this.nextId += 1;
    this.messages.push({ id: this.nextId, role, content, isNotice });
  }
}

export const scenarioAssistant = new ScenarioAssistantStore();
