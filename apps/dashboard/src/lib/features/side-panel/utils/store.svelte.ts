import { SvelteMap } from 'svelte/reactivity';
import type { SidePanelDefinition, SidePanelScope } from './types';

class SidePanelStore {
  private definitions = new SvelteMap<string, SidePanelDefinition>();
  private lastPropsById = new Map<string, Record<string, unknown>>();

  activePanelId = $state<string | null>(null);
  panelProps = $state<Record<string, unknown>>({});
  width = $state(0);

  register(definition: SidePanelDefinition) {
    this.definitions.set(definition.id, definition);
  }

  unregister(id: string) {
    this.definitions.delete(id);
    this.lastPropsById.delete(id);
    if (this.activePanelId === id) this.activePanelId = null;
  }

  list(): SidePanelDefinition[] {
    return Array.from(this.definitions.values());
  }

  get(id: string): SidePanelDefinition | undefined {
    return this.definitions.get(id);
  }

  get activeDefinition(): SidePanelDefinition | null {
    if (!this.activePanelId) return null;

    return this.definitions.get(this.activePanelId) ?? null;
  }

  /** Opens the panel; without `props` it reuses the props it was last opened with. */
  open(id: string, props?: Record<string, unknown>) {
    if (!this.definitions.has(id)) {
      console.warn(`sidePanel.open: no panel registered with id "${id}"`);

      return;
    }

    const nextProps = props ?? this.lastPropsById.get(id) ?? {};
    this.lastPropsById.set(id, nextProps);
    this.activePanelId = id;
    this.panelProps = nextProps;
  }

  get toggleable(): SidePanelDefinition[] {
    return this.list().filter((definition) => definition.toggleLabelKey);
  }

  toggle(id: string, props?: Record<string, unknown>) {
    if (this.activePanelId === id) {
      this.close();

      return;
    }

    this.open(id, props);
  }

  close() {
    this.activePanelId = null;
    this.panelProps = {};
    this.width = 0;
  }

  closeIfScope(scope: SidePanelScope) {
    if (!this.activePanelId) return;

    const def = this.definitions.get(this.activePanelId);
    if (!def) return;

    if (def.scope === scope) {
      this.close();
    }
  }

  reset() {
    this.close();
  }
}

export const sidePanel = new SidePanelStore();
