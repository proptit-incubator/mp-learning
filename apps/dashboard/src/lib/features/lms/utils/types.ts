import { classroomio, type InferResponseType, type InferRequestType } from '$lib/utils/services/api';

export type LibraryRequest = typeof classroomio.organization.courses.library.$get;
export type LibrarySuccess = Extract<InferResponseType<LibraryRequest>, { success: true }>;
export type LibraryCourse = LibrarySuccess['data'][number];
export type LibraryPagination = LibrarySuccess['pagination'];
export type LibraryDetailRequest = (typeof classroomio.organization.courses.library)[':courseId']['$get'];
export type LibraryDetailSuccess = Extract<InferResponseType<LibraryDetailRequest>, { success: true }>;
export type LibraryEnrollRequest = (typeof classroomio.course)[':courseId']['enroll']['$post'];
type LibraryRequestQuery = InferRequestType<LibraryRequest>['query'];
export type LibraryQuery = Omit<LibraryRequestQuery, 'limit' | 'page'> & { limit?: number; page?: number };
