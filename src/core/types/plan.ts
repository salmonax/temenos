import { z } from 'zod';

/**
 * Reference syntax: `$$STEP_N_OUTPUT$$` inside a plan step's inputs is resolved
 * by the Executor against the accumulated state before the step runs.
 */
export const REFERENCE_PATTERN = /^\$\$([A-Z0-9_]+)\$\$$/;

/**
 * One step in a Plan: name the agent/stance, name the inputs (which may contain
 * references to prior step outputs).
 */
export const PlanStepSchema = z.object({
  step: z.number().int().positive(),
  agent: z.string(),
  input: z.record(z.string(), z.unknown()),
});

export type PlanStep = z.infer<typeof PlanStepSchema>;

/**
 * A Plan is an ordered list of steps. The Planner emits this as JSON; the
 * Executor walks it.
 */
export const PlanSchema = z.array(PlanStepSchema);

export type Plan = z.infer<typeof PlanSchema>;
