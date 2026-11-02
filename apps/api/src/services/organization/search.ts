import {
  searchLmsCourses,
  searchOrgAudience,
  searchOrgCourses,
  searchOrgTagsAndGroups,
  searchOrgWidgets
} from '@cio/db/queries';

export async function searchOrganization(orgId: string, search: string, limit: number, includeAudience: boolean) {
  const audiencePromise = includeAudience ? searchOrgAudience(orgId, search, limit) : Promise.resolve([]);
  const [courses, widgets, tags, audience] = await Promise.all([
    searchOrgCourses(orgId, search, limit),
    searchOrgWidgets(orgId, search, limit),
    searchOrgTagsAndGroups(orgId, search, limit),
    audiencePromise
  ]);

  return {
    courses,
    widgets,
    tags,
    audience
  };
}

export async function searchLmsOrganization(orgId: string, profileId: string, search: string, limit: number) {
  const courses = await searchLmsCourses(orgId, profileId, search, limit);

  return {
    courses
  };
}
