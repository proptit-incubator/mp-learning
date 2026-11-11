ALTER TABLE organization ALTER COLUMN ai_tutor_settings SET DEFAULT '{"enabled":true,"persona":"encouraging","customPersona":"","responseLength":"medium","welcomeMessage":"","disclaimerFooter":"Mình là trợ giảng AI, không thay thế bộ phận đào tạo.","thingsToSay":"","thingsNotToSay":"","forbiddenTopics":[],"groundingScope":"course","requireCitations":true,"assessmentMode":"hint_only","revealSolutionsAfterAttempts":3,"codePolicy":"hints_only","blockOffTopic":true,"profanityFilter":true,"escalation":{"enabled":false,"email":""}}'::jsonb;
--> statement-breakpoint
UPDATE organization
SET ai_tutor_settings = jsonb_set(ai_tutor_settings, '{disclaimerFooter}', to_jsonb('Mình là trợ giảng AI, không thay thế bộ phận đào tạo.'::text))
WHERE ai_tutor_settings->>'disclaimerFooter' = 'I am an AI tutor, not your instructor.';
