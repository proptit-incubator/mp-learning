import RocketIcon from '@lucide/svelte/icons/rocket';
import GraduationCapIcon from '@lucide/svelte/icons/graduation-cap';
import UsersIcon from '@lucide/svelte/icons/users';
import SendIcon from '@lucide/svelte/icons/send';
import PencilRulerIcon from '@lucide/svelte/icons/pencil-ruler';
import SparklesIcon from '@lucide/svelte/icons/sparkles';
import AwardIcon from '@lucide/svelte/icons/award';
import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
import SettingsIcon from '@lucide/svelte/icons/settings';
import WorkflowIcon from '@lucide/svelte/icons/workflow';
import LifeBuoyIcon from '@lucide/svelte/icons/life-buoy';
import BookOpenIcon from '@lucide/svelte/icons/book-open';

const ICONS: Record<string, typeof BookOpenIcon> = {
  'getting-started': RocketIcon,
  learning: GraduationCapIcon,
  employees: UsersIcon,
  assignments: SendIcon,
  'course-authoring': PencilRulerIcon,
  ai: SparklesIcon,
  'grading-certificates': AwardIcon,
  reports: ChartColumnIcon,
  settings: SettingsIcon,
  automation: WorkflowIcon,
  support: LifeBuoyIcon
};

export function helpCategoryIcon(slug: string): typeof BookOpenIcon {
  return ICONS[slug] ?? BookOpenIcon;
}
