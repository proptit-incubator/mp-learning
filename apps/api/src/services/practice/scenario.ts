import {
  createPracticeScenario,
  createPracticeScenarios,
  listPracticeScenarioTitles,
  listPracticeScenariosWithStats,
  listPublishedPracticeScenarios,
  softDeletePracticeScenario,
  updatePracticeScenario
} from '@cio/db/queries/practice';
import type { TPracticeScenarioCreate, TPracticeScenarioUpdate } from '@cio/utils/validation/practice';

import { AppError, ErrorCodes } from '@api/utils/errors';
import { PRACTICE_SAMPLE_SCENARIOS } from './sample-scenarios';
import { TTS_VOICES } from './voice/tts-stream';

function assertKnownVoice(voiceId: string | null | undefined) {
  if (!voiceId) return;

  if (!(TTS_VOICES as readonly string[]).includes(voiceId)) {
    throw new AppError('Unknown voice', ErrorCodes.VALIDATION_ERROR, 400, 'voiceId');
  }
}

export async function listLearnerPracticeScenarios(orgId: string) {
  return listPublishedPracticeScenarios(orgId);
}

export async function listManagedPracticeScenarios(orgId: string) {
  const rows = await listPracticeScenariosWithStats(orgId);

  return rows.map(({ scenario, callCount, averageScore }) => {
    const roundedAverage = averageScore === null ? null : Math.round(Number(averageScore));

    return { ...scenario, callCount, averageScore: roundedAverage };
  });
}

export async function createManagedPracticeScenario(orgId: string, profileId: string, data: TPracticeScenarioCreate) {
  assertKnownVoice(data.voiceId);

  return createPracticeScenario({ ...data, organizationId: orgId, createdBy: profileId });
}

/** Adds the starter scenarios the organization does not have yet and returns how many were added. */
export async function addSamplePracticeScenarios(orgId: string, profileId: string) {
  const existingTitles = await listPracticeScenarioTitles(orgId);
  const missingSamples = PRACTICE_SAMPLE_SCENARIOS.filter((sample) => !existingTitles.includes(sample.title));
  const rows = missingSamples.map((sample) => ({ ...sample, organizationId: orgId, createdBy: profileId }));
  const created = await createPracticeScenarios(rows);

  return { added: created.length };
}

export async function updateManagedPracticeScenario(orgId: string, scenarioId: string, data: TPracticeScenarioUpdate) {
  assertKnownVoice(data.voiceId);

  const scenario = await updatePracticeScenario(orgId, scenarioId, data);
  if (!scenario) {
    throw new AppError('Practice scenario not found', ErrorCodes.PRACTICE_SCENARIO_NOT_FOUND, 404);
  }

  return scenario;
}

export async function deleteManagedPracticeScenario(orgId: string, scenarioId: string) {
  const deleted = await softDeletePracticeScenario(orgId, scenarioId);
  if (!deleted) {
    throw new AppError('Practice scenario not found', ErrorCodes.PRACTICE_SCENARIO_NOT_FOUND, 404);
  }

  return { id: scenarioId };
}
