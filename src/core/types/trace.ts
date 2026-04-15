import { z } from 'zod';
import { PlanSchema } from './plan.js';

/**
 * One logged step in an ExecutionTrace — what the agent saw, what it produced,
 * what reference resolutions happened between plan and actual input.
 */
export const TraceStepSchema = z.object({
  step: z.number().int().positive(),
  agent: z.string(),
  planned_input: z.record(z.string(), z.unknown()),
  resolved_input: z.record(z.string(), z.unknown()),
  output: z.unknown(),
  started_at: z.number(),
  duration_ms: z.number(),
});

export type TraceStep = z.infer<typeof TraceStepSchema>;

export const TraceStatusSchema = z.enum([
  'initialized',
  'planning',
  'executing',
  'success',
  'failed',
]);

export type TraceStatus = z.infer<typeof TraceStatusSchema>;

/**
 * Whole-run trace: the flight recorder. Contains the goal, the plan, each
 * step's details, and the final output. Persisted as part of Temenos's
 * accumulating corpus — traces become their own material over time.
 */
export const ExecutionTraceSchema = z.object({
  trace_id: z.string(),
  goal: z.string(),
  instance: z.string(),
  plan: PlanSchema.nullable(),
  steps: z.array(TraceStepSchema),
  status: TraceStatusSchema,
  final_output: z.unknown().nullable(),
  started_at: z.number(),
  duration_ms: z.number().nullable(),
  error: z.string().nullable(),
});

export type ExecutionTrace = z.infer<typeof ExecutionTraceSchema>;
