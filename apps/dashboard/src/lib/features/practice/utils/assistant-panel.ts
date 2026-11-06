import type { Component } from 'svelte';
import SparklesIcon from '@lucide/svelte/icons/sparkles';

import type { SidePanelDefinition } from '$features/side-panel';
import ScenarioAssistantPanel from '../components/scenario-assistant-panel.svelte';

export const PRACTICE_ASSISTANT_PANEL_ID = 'practice-assistant';

export const practiceAssistantPanelDefinition: SidePanelDefinition = {
  id: PRACTICE_ASSISTANT_PANEL_ID,
  titleKey: 'practice.assistant.title',
  scope: 'course',
  component: ScenarioAssistantPanel as Component<Record<string, unknown>>,
  defaultWidth: 400,
  minWidth: 320,
  maxWidth: 640,
  widthStorageKey: 'practice-assistant-panel-width',
  toggleLabelKey: 'practice.assistant.open',
  toggleIcon: SparklesIcon
};
