import { getCourseLibrary } from '@cio/db/queries/course/library';
import { getEmployeeAccess } from '@cio/db/queries/organization';
import type { TGetRecommendedCourses } from '@cio/utils/validation/course';
import { AppError, ErrorCodes } from '@api/utils/errors';

async function assertLibraryMember(organizationId: string, profileId: string) {
  const access = await getEmployeeAccess(organizationId, profileId);
  if (!access) throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);
}

export async function listCourseLibrary(
  organizationId: string,
  profileId: string,
  query: TGetRecommendedCourses = {},
  recommended = false
) {
  await assertLibraryMember(organizationId, profileId);
  const options = { ...query, recommended };
  return getCourseLibrary(organizationId, profileId, options);
}

export async function getCourseLibraryDetails(organizationId: string, profileId: string, courseId: string) {
  await assertLibraryMember(organizationId, profileId);
  const result = await getCourseLibrary(organizationId, profileId, { courseId });
  const course = result.data[0];
  if (!course) throw new AppError('Course not found', ErrorCodes.COURSE_NOT_FOUND, 404);

  return course;
}
