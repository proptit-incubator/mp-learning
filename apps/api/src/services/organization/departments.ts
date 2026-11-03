import { db } from '@cio/db/drizzle';
import {
  deleteEmptyDepartment,
  findDepartment,
  listDepartments,
  lockEmployeeOrganization,
  renameDepartment
} from '@cio/db/queries/organization';
import { ZRenameDepartment, type RenameDepartment } from '@cio/utils/validation/organization';
import { AppError, ErrorCodes } from '@api/utils/errors';
import { requireEmployeeAccess } from './employees';

function rejectDepartment(key: string, status = 400): never {
  throw new AppError(`employees.departments.errors.${key}`, ErrorCodes.VALIDATION_ERROR, status);
}

export async function getDepartments(orgId: string, actorId: string) {
  await requireEmployeeAccess(orgId, actorId);
  return listDepartments(orgId);
}

/** Renames a department, merging it into another one that already has the new name. */
export async function renameOrMergeDepartment(
  orgId: string,
  actorId: string,
  departmentId: string,
  input: RenameDepartment
) {
  const { name } = ZRenameDepartment.parse(input);
  return db.transaction(async (tx) => {
    await lockEmployeeOrganization(orgId, tx);
    await requireEmployeeAccess(orgId, actorId, true, tx);
    if (!(await findDepartment(orgId, departmentId, tx))) rejectDepartment('missing', 404);

    const id = await renameDepartment(orgId, departmentId, name, tx);
    return { id, merged: id !== departmentId };
  });
}

export async function removeDepartment(orgId: string, actorId: string, departmentId: string) {
  return db.transaction(async (tx) => {
    await lockEmployeeOrganization(orgId, tx);
    await requireEmployeeAccess(orgId, actorId, true, tx);
    if (!(await findDepartment(orgId, departmentId, tx))) rejectDepartment('missing', 404);
    if (!(await deleteEmptyDepartment(orgId, departmentId, tx))) rejectDepartment('not_empty', 409);

    return { id: departmentId };
  });
}
