import { isCourseTeamMemberOrOrgAdmin } from '@cio/db/queries/group';
import { isUserOrgAdmin } from '@cio/db/queries/organization';

/**
 * Whether `profileId` may act on someone else's community content: the course team when the question belongs to a
 * course, otherwise the organization's admins.
 */
export async function canModerateCommunityContent(
  content: { courseId: string | null; organizationId: string | null },
  profileId: string
): Promise<boolean> {
  if (content.courseId) return isCourseTeamMemberOrOrgAdmin(content.courseId, profileId);
  if (content.organizationId) return isUserOrgAdmin(content.organizationId, profileId);

  return false;
}
