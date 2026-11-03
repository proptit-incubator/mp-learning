import { AppError, ErrorCodes } from '@api/utils/errors';
import { getOrganizationByProfileId, isManagedEmployeeAccount } from '@cio/db/queries/organization';
import {
  getProfileByEmail,
  getProfileById,
  syncProfileEmailVerificationFromAuthUser,
  updateProfile
} from '@cio/db/queries/auth';
import type { OrganizationWithMemberAndPlans } from '@cio/db/queries/organization/types';
import type { TProfile } from '@cio/db/types';
import type { TUpdateProfile } from '@cio/utils/validation/account';
import { getLicenseStatus } from '@cio/core/services/license';
import { ensureLearningInstance } from '@api/services/learning-instance';

export type GetAccountDataResult = {
  profile: TProfile;
  organizations: OrganizationWithMemberAndPlans[];
  licenseFeatures: string[];
};

export async function getAccountData(userId: string): Promise<GetAccountDataResult> {
  let profile = await getProfileById(userId);
  if (!profile) {
    throw new AppError(`Account not found for user ID: ${userId}`, ErrorCodes.ACCOUNT_NOT_FOUND, 404);
  }

  profile = (await syncProfileEmailVerificationFromAuthUser(userId)) ?? profile;
  const organization = await ensureLearningInstance(userId, profile.email ?? '');
  const [memberships, licenseStatus] = await Promise.all([getOrganizationByProfileId(userId), getLicenseStatus()]);
  const organizations = memberships.filter((membership) => membership.id === organization.id);

  return { profile, organizations, licenseFeatures: licenseStatus.features };
}

export async function updateUser(userId: string, data: TUpdateProfile) {
  if (data.fullname !== undefined) {
    const current = await getProfileById(userId);
    if (
      current &&
      data.fullname.trim() !== (current.fullname ?? '').trim() &&
      (await isManagedEmployeeAccount(userId))
    ) {
      throw new AppError('Email and name are managed by HR', ErrorCodes.IDENTITY_MANAGED_BY_HR, 403, 'fullname');
    }
  }

  try {
    const updatedProfile = await updateProfile(userId, data);

    if (!updatedProfile) {
      throw new AppError(`Profile not found for user ID: ${userId}`, ErrorCodes.PROFILE_NOT_FOUND, 404);
    }

    return updatedProfile;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('profile_username_key')) {
      throw new AppError('Username already exists', ErrorCodes.VALIDATION_ERROR, 400, 'username');
    }

    throw new AppError(
      error instanceof Error ? error.message : 'Failed to update profile',
      ErrorCodes.PROFILE_UPDATE_FAILED,
      500
    );
  }
}

/**
 * Gets profile by email
 * @param email - The email address
 * @returns Profile or null if not found
 */
export async function getProfileByEmailService(email: string): Promise<TProfile | null> {
  try {
    const profile = await getProfileByEmail(email);
    return profile;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to fetch profile by email',
      ErrorCodes.PROFILE_NOT_FOUND,
      500
    );
  }
}
