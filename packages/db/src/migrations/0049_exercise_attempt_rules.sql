ALTER TABLE exercise ADD COLUMN max_attempts integer;
--> statement-breakpoint
ALTER TABLE exercise ADD COLUMN answer_visibility varchar(24) NOT NULL DEFAULT 'after_completion';
--> statement-breakpoint
ALTER TABLE exercise ADD CONSTRAINT exercise_max_attempts_check CHECK (max_attempts IS NULL OR max_attempts >= 1);
--> statement-breakpoint
ALTER TABLE exercise ADD CONSTRAINT exercise_answer_visibility_check
  CHECK (answer_visibility IN ('never', 'after_completion', 'after_submit'));
