import { Hono } from '@api/utils/hono';
import { internalAccountRouter } from './account';
import { internalAnalyticsRouter } from './analytics';
import { internalRemindersRouter } from './reminders';
import { internalEncoderRouter } from './encoder';
import { internalModerationRouter } from './moderation';

export const internalRouter = new Hono()
  .route('/reminders', internalRemindersRouter)
  .route('/analytics', internalAnalyticsRouter)
  .route('/account', internalAccountRouter)
  .route('/moderation', internalModerationRouter)
  .route('/encoder', internalEncoderRouter);
