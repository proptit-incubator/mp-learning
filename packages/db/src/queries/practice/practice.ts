import type { TNewPracticeCall, TNewPracticeScenario, TPracticeCall, TPracticeScenario } from '@db/types';
import { and, asc, avg, count, desc, eq, isNotNull, isNull, lt } from 'drizzle-orm';

import * as schema from '@db/schema';
import { db } from '@db/drizzle';

const learnerScenarioColumns = {
  id: schema.practiceScenario.id,
  title: schema.practiceScenario.title,
  summary: schema.practiceScenario.summary,
  topic: schema.practiceScenario.topic,
  difficulty: schema.practiceScenario.difficulty,
  customerName: schema.practiceScenario.customerName,
  persona: schema.practiceScenario.persona,
  objective: schema.practiceScenario.objective,
  tip: schema.practiceScenario.tip
};

const callSummaryColumns = {
  id: schema.practiceCall.id,
  scenarioId: schema.practiceCall.scenarioId,
  scenarioTitle: schema.practiceScenario.title,
  customerName: schema.practiceScenario.customerName,
  difficulty: schema.practiceScenario.difficulty,
  status: schema.practiceCall.status,
  score: schema.practiceCall.score,
  reviewScore: schema.practiceCall.reviewScore,
  reviewedAt: schema.practiceCall.reviewedAt,
  startedAt: schema.practiceCall.startedAt,
  durationSeconds: schema.practiceCall.durationSeconds
};

function activeScenario(orgId: string) {
  return and(eq(schema.practiceScenario.organizationId, orgId), isNull(schema.practiceScenario.deletedAt));
}

export async function listPublishedPracticeScenarios(orgId: string) {
  try {
    return await db
      .select(learnerScenarioColumns)
      .from(schema.practiceScenario)
      .where(and(activeScenario(orgId), eq(schema.practiceScenario.isPublished, true)))
      .orderBy(asc(schema.practiceScenario.createdAt));
  } catch (error) {
    console.error('listPublishedPracticeScenarios error:', error);
    throw new Error('Failed to list practice scenarios');
  }
}

/** Every scenario an organization has not deleted, with how often learners practised it and their average score. */
export async function listPracticeScenariosWithStats(orgId: string) {
  try {
    return await db
      .select({
        scenario: schema.practiceScenario,
        callCount: count(schema.practiceCall.id),
        averageScore: avg(schema.practiceCall.score)
      })
      .from(schema.practiceScenario)
      .leftJoin(schema.practiceCall, eq(schema.practiceCall.scenarioId, schema.practiceScenario.id))
      .where(activeScenario(orgId))
      .groupBy(schema.practiceScenario.id)
      .orderBy(asc(schema.practiceScenario.createdAt));
  } catch (error) {
    console.error('listPracticeScenariosWithStats error:', error);
    throw new Error('Failed to list practice scenarios');
  }
}

export async function getPracticeScenario(orgId: string, scenarioId: string): Promise<TPracticeScenario | null> {
  try {
    const [scenario] = await db
      .select()
      .from(schema.practiceScenario)
      .where(and(activeScenario(orgId), eq(schema.practiceScenario.id, scenarioId)))
      .limit(1);

    return scenario ?? null;
  } catch (error) {
    console.error('getPracticeScenario error:', error);
    throw new Error('Failed to get practice scenario');
  }
}

/** The scenario behind a call, even when it was deleted after the call took place. */
export async function getPracticeScenarioById(scenarioId: string): Promise<TPracticeScenario | null> {
  try {
    const [scenario] = await db
      .select()
      .from(schema.practiceScenario)
      .where(eq(schema.practiceScenario.id, scenarioId))
      .limit(1);

    return scenario ?? null;
  } catch (error) {
    console.error('getPracticeScenarioById error:', error);
    throw new Error('Failed to get practice scenario');
  }
}

export async function createPracticeScenario(data: TNewPracticeScenario): Promise<TPracticeScenario> {
  try {
    const [scenario] = await db.insert(schema.practiceScenario).values(data).returning();

    return scenario;
  } catch (error) {
    console.error('createPracticeScenario error:', error);
    throw new Error('Failed to create practice scenario');
  }
}

export async function createPracticeScenarios(rows: TNewPracticeScenario[]): Promise<TPracticeScenario[]> {
  if (rows.length === 0) return [];

  try {
    return await db.insert(schema.practiceScenario).values(rows).returning();
  } catch (error) {
    console.error('createPracticeScenarios error:', error);
    throw new Error('Failed to create practice scenarios');
  }
}

export async function listPracticeScenarioTitles(orgId: string): Promise<string[]> {
  try {
    const rows = await db
      .select({ title: schema.practiceScenario.title })
      .from(schema.practiceScenario)
      .where(activeScenario(orgId));

    return rows.map((row) => row.title);
  } catch (error) {
    console.error('listPracticeScenarioTitles error:', error);
    throw new Error('Failed to list practice scenario titles');
  }
}

export async function updatePracticeScenario(
  orgId: string,
  scenarioId: string,
  data: Partial<TNewPracticeScenario>
): Promise<TPracticeScenario | null> {
  try {
    const [scenario] = await db
      .update(schema.practiceScenario)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(activeScenario(orgId), eq(schema.practiceScenario.id, scenarioId)))
      .returning();

    return scenario ?? null;
  } catch (error) {
    console.error('updatePracticeScenario error:', error);
    throw new Error('Failed to update practice scenario');
  }
}

export async function softDeletePracticeScenario(orgId: string, scenarioId: string): Promise<boolean> {
  try {
    const deleted = await db
      .update(schema.practiceScenario)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(activeScenario(orgId), eq(schema.practiceScenario.id, scenarioId)))
      .returning({ id: schema.practiceScenario.id });

    return deleted.length > 0;
  } catch (error) {
    console.error('softDeletePracticeScenario error:', error);
    throw new Error('Failed to delete practice scenario');
  }
}

export async function createPracticeCall(data: TNewPracticeCall): Promise<TPracticeCall> {
  try {
    const [call] = await db.insert(schema.practiceCall).values(data).returning();

    return call;
  } catch (error) {
    console.error('createPracticeCall error:', error);
    throw new Error('Failed to create practice call');
  }
}

export async function getPracticeCall(callId: string): Promise<TPracticeCall | null> {
  try {
    const [call] = await db.select().from(schema.practiceCall).where(eq(schema.practiceCall.id, callId)).limit(1);

    return call ?? null;
  } catch (error) {
    console.error('getPracticeCall error:', error);
    throw new Error('Failed to get practice call');
  }
}

export async function updatePracticeCall(
  callId: string,
  data: Partial<TNewPracticeCall>
): Promise<TPracticeCall | null> {
  try {
    const [call] = await db.update(schema.practiceCall).set(data).where(eq(schema.practiceCall.id, callId)).returning();

    return call ?? null;
  } catch (error) {
    console.error('updatePracticeCall error:', error);
    throw new Error('Failed to update practice call');
  }
}

/** Calls that still hold a recording and ended before `endedBefore`, oldest first. */
export async function listPracticeRecordingsEndedBefore(endedBefore: string, limit: number) {
  try {
    return await db
      .select({
        id: schema.practiceCall.id,
        organizationId: schema.practiceCall.organizationId,
        recordingKey: schema.practiceCall.recordingKey,
        endedAt: schema.practiceCall.endedAt
      })
      .from(schema.practiceCall)
      .where(and(isNotNull(schema.practiceCall.recordingKey), lt(schema.practiceCall.endedAt, endedBefore)))
      .orderBy(asc(schema.practiceCall.endedAt))
      .limit(limit);
  } catch (error) {
    console.error('listPracticeRecordingsEndedBefore error:', error);
    throw new Error('Failed to list practice recordings');
  }
}

/** Swaps the stored recording only if the call still points at `currentKey`. Returns whether it changed. */
export async function replacePracticeRecording(
  callId: string,
  currentKey: string,
  next: { recordingKey: string | null; recordingContentType: string | null; recordingDeletedAt?: string }
): Promise<boolean> {
  try {
    const updated = await db
      .update(schema.practiceCall)
      .set(next)
      .where(and(eq(schema.practiceCall.id, callId), eq(schema.practiceCall.recordingKey, currentKey)))
      .returning({ id: schema.practiceCall.id });

    return updated.length > 0;
  } catch (error) {
    console.error('replacePracticeRecording error:', error);
    throw new Error('Failed to replace practice recording');
  }
}

export async function listPracticeCallsForProfile(orgId: string, profileId: string, limit: number) {
  try {
    return await db
      .select(callSummaryColumns)
      .from(schema.practiceCall)
      .innerJoin(schema.practiceScenario, eq(schema.practiceScenario.id, schema.practiceCall.scenarioId))
      .where(and(eq(schema.practiceCall.organizationId, orgId), eq(schema.practiceCall.profileId, profileId)))
      .orderBy(desc(schema.practiceCall.startedAt))
      .limit(limit);
  } catch (error) {
    console.error('listPracticeCallsForProfile error:', error);
    throw new Error('Failed to list practice calls');
  }
}

export async function listPracticeCallsForOrganization(orgId: string, limit: number) {
  try {
    return await db
      .select({
        ...callSummaryColumns,
        profileId: schema.practiceCall.profileId,
        learnerName: schema.profile.fullname,
        learnerEmail: schema.profile.email
      })
      .from(schema.practiceCall)
      .innerJoin(schema.practiceScenario, eq(schema.practiceScenario.id, schema.practiceCall.scenarioId))
      .innerJoin(schema.profile, eq(schema.profile.id, schema.practiceCall.profileId))
      .where(eq(schema.practiceCall.organizationId, orgId))
      .orderBy(desc(schema.practiceCall.startedAt))
      .limit(limit);
  } catch (error) {
    console.error('listPracticeCallsForOrganization error:', error);
    throw new Error('Failed to list practice calls');
  }
}

export async function getPracticeLearner(
  profileId: string
): Promise<{ name: string | null; email: string | null; avatarUrl: string | null } | null> {
  try {
    const [learner] = await db
      .select({ name: schema.profile.fullname, email: schema.profile.email, avatarUrl: schema.profile.avatarUrl })
      .from(schema.profile)
      .where(eq(schema.profile.id, profileId))
      .limit(1);

    return learner ?? null;
  } catch (error) {
    console.error('getPracticeLearner error:', error);
    throw new Error('Failed to get practice learner');
  }
}

export async function getPracticeReviewerName(profileId: string): Promise<string | null> {
  try {
    const [reviewer] = await db
      .select({ fullname: schema.profile.fullname })
      .from(schema.profile)
      .where(eq(schema.profile.id, profileId))
      .limit(1);

    return reviewer?.fullname ?? null;
  } catch (error) {
    console.error('getPracticeReviewerName error:', error);
    throw new Error('Failed to get practice reviewer');
  }
}
