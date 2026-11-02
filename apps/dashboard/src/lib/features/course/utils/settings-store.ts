import type { CourseProgressionMode } from '@cio/utils/functions/course-progression';
import { writable } from 'svelte/store';

import type { LiveSessionReminderRow } from './types';

export type CourseSettings = {
  bannerImage: string;
  courseTitle: string;
  courseDescription: string;
  grading: boolean;
  allowSelfEnrollment: boolean;
  tabs: { id: number; name: string }[];
  lessonDownload: boolean;
  allowMarkdownExport: boolean;
  isPublished: boolean;
  isContentGroupingEnabled: boolean;
  progressionMode: CourseProgressionMode;
  commentsEnabled: boolean;
  welcomeEmailMessage: string;
  liveSessionReminders: LiveSessionReminderRow[];
  recertificationMonths: number | null;
};

export function createCourseSettings() {
  return writable<CourseSettings>({
    bannerImage: '',
    courseTitle: '',
    courseDescription: '',
    grading: false,
    allowSelfEnrollment: true,
    tabs: [
      { id: 3, name: 'course.navItem.lessons.materials.tabs.video.title' },
      { id: 1, name: 'course.navItem.lessons.materials.tabs.note.title' },
      { id: 2, name: 'course.navItem.lessons.materials.tabs.slide.title' },
      { id: 4, name: 'course.navItem.lessons.materials.tabs.document.title' }
    ],
    lessonDownload: false,
    allowMarkdownExport: false,
    isPublished: false,
    isContentGroupingEnabled: true,
    progressionMode: 'free',
    commentsEnabled: true,
    welcomeEmailMessage: '',
    liveSessionReminders: [],
    recertificationMonths: null
  });
}
