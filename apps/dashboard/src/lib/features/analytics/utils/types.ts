import { classroomio, type InferResponseType } from '$lib/utils/services/api';

export type LandingStatsRequest = (typeof classroomio.dash)['landing-stats']['$get'];
export type CountryBreakdownRequest = (typeof classroomio.dash)['country-breakdown']['$get'];
export type CourseFunnelRequest = (typeof classroomio.dash)['course-funnel']['$get'];
export type TopCoursesRequest = (typeof classroomio.dash)['top-courses']['$get'];

export type LandingStatsSuccess = Extract<InferResponseType<LandingStatsRequest>, { success: true }>;
export type CountryBreakdownSuccess = Extract<InferResponseType<CountryBreakdownRequest>, { success: true }>;
export type CourseFunnelSuccess = Extract<InferResponseType<CourseFunnelRequest>, { success: true }>;
export type TopCoursesSuccess = Extract<InferResponseType<TopCoursesRequest>, { success: true }>;

export type LandingStatsData = LandingStatsSuccess['data'];
export type CountryBreakdownData = CountryBreakdownSuccess['data'];
export type CourseFunnelData = CourseFunnelSuccess['data'];
export type TopCoursesData = TopCoursesSuccess['data'];

export type AnalyticsRange = 7 | 30 | 90;

export type LearningAnalyticsRequest = (typeof classroomio.dash)['learning-analytics']['$get'];
export type LearningAnalyticsSuccess = Extract<InferResponseType<LearningAnalyticsRequest>, { success: true }>;
export type LearningReport = LearningAnalyticsSuccess['data'];
export type LearningReportCourse = LearningReport['snapshot']['courses'][number];
export type LearningReportDay = LearningReport['activity']['daily'][number];
export type LearningCourseFilter = 'all' | 'assigned' | 'overdue';
export type LearningAssignmentRow = LearningReport['snapshot']['rows'][number];
export type LearningBatch = LearningReport['snapshot']['batches'][number];
export type LearningState = LearningAssignmentRow['state'];
