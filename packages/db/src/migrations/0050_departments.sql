CREATE TABLE department (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id),
  name text NOT NULL,
  name_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT department_name_check CHECK (btrim(name) <> '')
);
--> statement-breakpoint
CREATE UNIQUE INDEX department_org_key_unique ON department (organization_id, name_key);
--> statement-breakpoint
ALTER TABLE employee ADD COLUMN department_id uuid REFERENCES department(id);
--> statement-breakpoint
INSERT INTO department (organization_id, name, name_key)
SELECT organization_id, mode() WITHIN GROUP (ORDER BY clean_name), lower(clean_name)
FROM (
  SELECT organization_id, regexp_replace(btrim(department), '\s+', ' ', 'g') AS clean_name
  FROM employee
  WHERE btrim(department) <> ''
) named
GROUP BY organization_id, lower(clean_name);
--> statement-breakpoint
UPDATE employee e
SET department_id = d.id
FROM department d
WHERE d.organization_id = e.organization_id
  AND d.name_key = lower(regexp_replace(btrim(e.department), '\s+', ' ', 'g'));
--> statement-breakpoint
ALTER TABLE employee DROP COLUMN department;
--> statement-breakpoint
CREATE INDEX employee_department_idx ON employee (organization_id, department_id);
