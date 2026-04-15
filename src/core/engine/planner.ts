import { PlanSchema, type Plan } from '../types/plan.js';
import { callLlmRobust } from '../helpers/llm.js';
import { childLogger } from '../helpers/logger.js';

const PLANNER_SYSTEM_PROMPT = `You are the strategic core of Temenos, a prepared-environment tool for reading a corpus with master's-eye discernment.

Your job: analyze a user's goal and create a structured Execution Plan using the available stances. A plan is a JSON array of steps, each invoking one stance.

Rules:
1. The plan MUST be a JSON array of objects. No wrapping object, no extra text.
2. Each step has: "step" (integer, 1-indexed), "agent" (stance name), "input" (object of named inputs for that stance).
3. To reference the output of an earlier step, use the exact syntax "$$STEP_N_OUTPUT$$" as a string value inside the input. N is the step number.
4. Use the exact input key names declared in the stance's INPUTS section.
5. Prefer plurality: for substantive queries, fire more than one stance so readings remain plural.
6. Do not invent stances that aren't listed. Use only the available stances.`;

export interface PlannerOptions {
  goal: string;
  capabilities: string;
  model?: string;
  trace_id?: string;
}

/**
 * Planner: turns a user goal + available stances into a typed Plan.
 * The LLM emits JSON; Zod validates; we either return a Plan or throw.
 */
export async function planner(opts: PlannerOptions): Promise<Plan> {
  const log = childLogger({ trace_id: opts.trace_id ?? 'no-trace', kind: 'planner' });
  log.info({ goal: opts.goal }, 'analyzing goal');

  const systemPrompt = `${PLANNER_SYSTEM_PROMPT}

--- AVAILABLE CAPABILITIES ---
${opts.capabilities}
--- END CAPABILITIES ---`;

  const result = await callLlmRobust({
    system: systemPrompt,
    user: `User goal: ${opts.goal}\n\nEmit the JSON plan now.`,
    model: opts.model,
    json_mode: true,
    trace_id: opts.trace_id,
    temperature: 0.2,
  });

  let raw: unknown;
  try {
    raw = JSON.parse(result.text);
  } catch (e) {
    log.error({ text: result.text, err: e }, 'Planner returned non-JSON');
    throw new Error('Planner LLM returned non-JSON output.');
  }

  // Tolerate a single-key wrapper like { plan: [...] }.
  if (
    raw &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    'plan' in (raw as Record<string, unknown>) &&
    Array.isArray((raw as Record<string, unknown>).plan)
  ) {
    raw = (raw as Record<string, unknown>).plan;
  }

  const parsed = PlanSchema.safeParse(raw);
  if (!parsed.success) {
    log.error({ raw, issues: parsed.error.issues }, 'Plan schema validation failed');
    throw new Error(`Plan schema validation failed: ${parsed.error.issues[0]?.message ?? 'unknown'}`);
  }

  log.info({ steps: parsed.data.length }, 'plan generated');
  return parsed.data;
}
