CREATE TABLE practice_scenario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  topic text NOT NULL DEFAULT '',
  difficulty varchar(10) NOT NULL DEFAULT 'MEDIUM',
  customer_name text NOT NULL,
  persona text NOT NULL,
  hidden_context text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT '',
  tip text NOT NULL DEFAULT '',
  opening_line text NOT NULL DEFAULT '',
  evaluation_criteria text NOT NULL DEFAULT '',
  voice_id varchar(64),
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profile(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT practice_scenario_difficulty_check CHECK (difficulty IN ('EASY','MEDIUM','HARD')),
  CONSTRAINT practice_scenario_title_check CHECK (btrim(title) <> '')
);
--> statement-breakpoint
CREATE INDEX practice_scenario_org_idx ON practice_scenario (organization_id, deleted_at);
--> statement-breakpoint
CREATE TABLE practice_call (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id),
  scenario_id uuid NOT NULL REFERENCES practice_scenario(id),
  profile_id uuid NOT NULL REFERENCES profile(id),
  status varchar(10) NOT NULL DEFAULT 'ACTIVE',
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer,
  feedback jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  recording_key text,
  recording_content_type varchar(100),
  recording_deleted_at timestamptz,
  review_score integer,
  review_comment text NOT NULL DEFAULT '',
  reviewed_by uuid REFERENCES profile(id),
  reviewed_at timestamptz,
  CONSTRAINT practice_call_status_check CHECK (status IN ('ACTIVE','ENDED')),
  CONSTRAINT practice_call_score_check CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  CONSTRAINT practice_call_review_score_check CHECK (review_score IS NULL OR review_score BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE INDEX practice_call_profile_idx ON practice_call (organization_id, profile_id, started_at);
--> statement-breakpoint
CREATE INDEX practice_call_scenario_idx ON practice_call (scenario_id);
