ALTER TABLE employee ADD COLUMN roles text[] NOT NULL DEFAULT '{}'::text[];
--> statement-breakpoint
UPDATE employee SET roles = CASE role
  WHEN 'ADMIN' THEN ARRAY['ADMIN']::text[]
  WHEN 'HR' THEN ARRAY['HR']::text[]
  WHEN 'TUTOR' THEN ARRAY['LND']::text[]
  ELSE '{}'::text[]
END;
--> statement-breakpoint
ALTER TABLE employee DROP CONSTRAINT employee_role_check;
--> statement-breakpoint
ALTER TABLE employee DROP COLUMN role;
--> statement-breakpoint
ALTER TABLE employee ADD CONSTRAINT employee_roles_check CHECK (roles <@ ARRAY['ADMIN', 'LND', 'HR']::text[]);
