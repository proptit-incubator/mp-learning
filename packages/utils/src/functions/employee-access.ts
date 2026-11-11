import type { EmployeeRole } from '../validation/organization/employees';

export type EmployeeCapabilities = {
  canManagePeople: boolean;
  canManageCourses: boolean;
  canAssignTraining: boolean;
  canViewOrgReports: boolean;
  canGrantRoles: boolean;
};

/**
 * Maps the roles an employee holds to what they may do. Department managers get their narrower rights from their
 * reporting line, not from a role.
 */
export function getEmployeeCapabilities(roles: readonly EmployeeRole[]): EmployeeCapabilities {
  const isAdmin = roles.includes('ADMIN');
  const isLearningAndDevelopment = roles.includes('LND');
  const isHumanResources = roles.includes('HR');

  return {
    canManagePeople: isAdmin || isHumanResources,
    canManageCourses: isAdmin || isLearningAndDevelopment,
    canAssignTraining: isAdmin || isLearningAndDevelopment || isHumanResources,
    canViewOrgReports: isAdmin || isLearningAndDevelopment || isHumanResources,
    canGrantRoles: isAdmin
  };
}

/** The organization membership role the classroom layer expects for these employee roles. */
export function employeeMembershipRoleId(roles: readonly EmployeeRole[]): 1 | 2 | 3 {
  if (roles.includes('ADMIN')) return 1;
  if (roles.includes('LND')) return 2;

  return 3;
}
