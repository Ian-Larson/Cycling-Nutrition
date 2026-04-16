import type { RiderProfile, SessionPlan, Environment, SessionPurpose } from '../types';
import type { EffectiveHeat } from '../types';
import type { ResolvedSession } from './resolve-session';
import type { ResolvedEnvironment } from './resolve-environment';
import type { ResolvedRider } from './resolve-rider';
import { resolveSession } from './resolve-session';
import { resolveEnvironment } from './resolve-environment';
import { classifyPurpose } from './resolve-purpose';
import { resolveRider } from './resolve-rider';

export type { EffectiveHeat, SessionPurpose };

export interface FuelingContext {
  rider: ResolvedRider;
  session: ResolvedSession & {
    startAtIso?: string;
    terrain?: SessionPlan['terrain'];
    refuelStopOffsets: number[];
    nextSessionAtIso?: string;
    priorSessionEndedAtIso?: string;
  };
  environment: ResolvedEnvironment;
  purpose: SessionPurpose;
  confidence: { score: number; missing: string[] };
}

export interface BuildContextInput {
  rider: RiderProfile;
  session: SessionPlan;
  environment?: Environment;
}

const CONFIDENCE_PENALTY_PER_MISSING = 0.1;
const CONFIDENCE_MIN = 0.2;
const CONFIDENCE_MAX = 1.0;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Orchestrate all context resolvers into a single FuelingContext.
 *
 * This is the sole entry point for downstream layers (targets, inventory, timeline).
 * They receive a FuelingContext and never re-derive values.
 */
export function buildContext(input: BuildContextInput): FuelingContext {
  const { rider, session, environment } = input;
  const missing: string[] = [];

  // 1. Resolve environment first (rider defaults depend on heat)
  const resolvedEnv = resolveEnvironment(environment);
  if (!environment || environment.dryBulbCelsius === undefined) {
    missing.push('temperature');
  }
  if (!environment?.relativeHumidityPercent) {
    missing.push('humidity');
  }

  // 2. Resolve session metrics
  const resolvedSession = resolveSession(session.inputMode, rider.ftpWatts);
  if (rider.ftpWatts === undefined) {
    missing.push('ftpWatts');
  }
  if (!session.startAtIso) {
    missing.push('startTime');
  }

  // 3. Resolve purpose
  const purpose = classifyPurpose(
    resolvedSession.intensityFactor,
    resolvedSession.durationMinutes,
    session.purposeOverride,
  );

  // 4. Resolve rider (needs effectiveHeat)
  const { resolved: resolvedRider, missing: riderMissing } = resolveRider(
    rider,
    resolvedEnv.effectiveHeat,
  );
  missing.push(...riderMissing);

  // 5. Compute confidence
  const score = clamp(
    CONFIDENCE_MAX - missing.length * CONFIDENCE_PENALTY_PER_MISSING,
    CONFIDENCE_MIN,
    CONFIDENCE_MAX,
  );

  return {
    rider: resolvedRider,
    session: {
      ...resolvedSession,
      startAtIso: session.startAtIso,
      terrain: session.terrain,
      refuelStopOffsets: session.refuelStopOffsets ?? [],
      nextSessionAtIso: session.nextSessionAtIso,
      priorSessionEndedAtIso: session.priorSessionEndedAtIso,
    },
    environment: resolvedEnv,
    purpose,
    confidence: { score, missing },
  };
}
