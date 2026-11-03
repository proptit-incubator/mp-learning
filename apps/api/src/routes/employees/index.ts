import { Hono } from '@api/utils/hono';
import { authMiddleware } from '@api/middlewares/auth';
import { createRateLimiter } from '@api/middlewares/rate-limiter';
import { handleError } from '@api/utils/errors';
import { zValidator } from '@hono/zod-validator';
import { getEmployeeAccess } from '@cio/db/queries/organization';
import { userKeyGenerator } from '@api/utils/redis/key-generators';
import {
  ZActivateEmployee,
  ZCreateEmployee,
  ZEmployeeList,
  ZEmployeeStatus,
  ZEmployeeToken,
  ZImportEmployees,
  ZDepartmentParam,
  ZRenameDepartment,
  ZUpdateEmployee
} from '@cio/utils/validation/organization';
import { getDepartments, removeDepartment, renameOrMergeDepartment } from '@api/services/organization/departments';
import { ZAssignCourses, ZAssignmentPreview } from '@cio/utils/validation/course/enrollment';
import { assignCourses, previewAssignment } from '@api/services/course/enrollment';
import {
  activateEmployee,
  createEmployee,
  editEmployee,
  getEmployeeDetails,
  getEmployeeOptions,
  getEmployees,
  importEmployees,
  hashEmployeeToken,
  previewEmployeeActivation,
  sendEmployeeActivation,
  setEmployeeStatus
} from '@api/services/organization/employees';

const activationRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  failClosed: true,
  keyGenerator: (context) => {
    const fields = context.req.valid('json');
    const tokenHash = hashEmployeeToken(fields.token);
    const clientKey = userKeyGenerator(context);
    return `employee-activation:${clientKey}:${tokenHash}`;
  }
});

export const employeesRouter = new Hono()
  .post('/activation/preview', zValidator('json', ZEmployeeToken), activationRateLimit, async (context) => {
    try {
      const data = await previewEmployeeActivation(context.req.valid('json').token);
      context.header('Cache-Control', 'no-store');
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.activation');
    }
  })
  .post('/activation', zValidator('json', ZActivateEmployee), activationRateLimit, async (context) => {
    try {
      const fields = context.req.valid('json');
      const data = await activateEmployee(fields.token, fields.password);
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.activation');
    }
  })
  .use('*', authMiddleware)
  .get('/access', async (context) => {
    const orgId = context.req.header('cio-org-id') ?? '';
    const data = orgId ? await getEmployeeAccess(orgId, context.get('user')!.id) : null;
    return context.json({ success: true as const, data });
  })
  .get('/options', async (context) => {
    try {
      const data = await getEmployeeOptions(context.req.header('cio-org-id') ?? '', context.get('user')!.id);
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  })
  .get('/departments', async (context) => {
    try {
      const data = await getDepartments(context.req.header('cio-org-id') ?? '', context.get('user')!.id);
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  })
  .patch(
    '/departments/:departmentId',
    zValidator('param', ZDepartmentParam),
    zValidator('json', ZRenameDepartment),
    async (context) => {
      try {
        const data = await renameOrMergeDepartment(
          context.req.header('cio-org-id') ?? '',
          context.get('user')!.id,
          context.req.valid('param').departmentId,
          context.req.valid('json')
        );
        return context.json({ success: true as const, data });
      } catch (error) {
        return handleError(context, error, 'employees.errors.generic');
      }
    }
  )
  .delete('/departments/:departmentId', zValidator('param', ZDepartmentParam), async (context) => {
    try {
      const data = await removeDepartment(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        context.req.valid('param').departmentId
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  })
  .post('/assignments/preview', zValidator('json', ZAssignmentPreview), async (context) => {
    try {
      const data = await previewAssignment(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        context.req.valid('json')
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  })
  .post('/assignments', zValidator('json', ZAssignCourses), async (context) => {
    try {
      const data = await assignCourses(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        context.req.valid('json')
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  })
  .get('/', zValidator('query', ZEmployeeList), async (context) => {
    try {
      const data = await getEmployees(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        context.req.valid('query')
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  })
  .post('/', zValidator('json', ZCreateEmployee), async (context) => {
    try {
      const data = await createEmployee(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        context.req.valid('json')
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  })
  .post('/import', zValidator('json', ZImportEmployees), async (context) => {
    try {
      const fields = context.req.valid('json');
      const data = await importEmployees(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        fields.rows,
        fields.preview
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  })
  .get('/:id', async (context) => {
    try {
      const data = await getEmployeeDetails(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        context.req.param('id')
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  })
  .put('/:id', zValidator('json', ZUpdateEmployee), async (context) => {
    try {
      const data = await editEmployee(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        context.req.param('id'),
        context.req.valid('json')
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  })
  .post('/:id/activation', async (context) => {
    try {
      const data = await sendEmployeeActivation(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        context.req.param('id')
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  })
  .post('/:id/status', zValidator('json', ZEmployeeStatus), async (context) => {
    try {
      const fields = context.req.valid('json');
      const data = await setEmployeeStatus(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        context.req.param('id'),
        fields.status,
        fields.reason
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'employees.errors.generic');
    }
  });
