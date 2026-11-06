import { Hono } from '@api/utils/hono';
import { practiceCallsRouter } from './calls';
import { practiceScenariosRouter } from './scenarios';

export const practiceRouter = new Hono()
  .route('/scenarios', practiceScenariosRouter)
  .route('/calls', practiceCallsRouter);
