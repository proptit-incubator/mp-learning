# End-to-end tests

Playwright specs in `e2e/mp/` walk the paths MP Learning cannot break: an employee is created, activates their
account, signs in with their employee code, finishes an assigned course, and the certificate shows up in the register,
on its public verification page and in the training report.

## Running

The specs need a running API and dashboard on an empty database whose name ends in `_e2e`. CI starts both from the
build output (see the `e2e` job in `.github/workflows/ci.yml`). Locally:

```bash
createdb mp_learning_e2e
DATABASE_URL=postgresql://…/mp_learning_e2e pnpm --filter @cio/db db:setup
# start the API with LMS_ALLOWED_EMAILS=admin@e2e.test and the dashboard pointing at it
E2E_BASE_URL=http://localhost:3092 E2E_DATABASE_URL=postgresql://…/mp_learning_e2e pnpm e2e
```

The first run signs `admin@e2e.test` up, which creates the organization. Steps a person would do by email, verifying
the administrator and issuing an activation link, go straight to the database through `e2e/helpers/mp.ts`.

## Locators

1. `getByRole` / `getByLabel` when the control is accessible
2. Existing `#id` attributes
3. `getByTestId` for stable, locale-independent hooks

Never select by CSS class or translated copy. State that a test checks (for example a certificate being valid) goes in
a `data-*` attribute such as `data-state`.
