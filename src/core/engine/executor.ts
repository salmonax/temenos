import type { AgentRegistry } from './registry.js';
import { resolveDependencies, type ExecutionState } from './resolve.js';
import { TraceRecorder } from './trace.js';
import { planner } from './planner.js';
import { createMcpMessage } from '../helpers/mcp.js';
import { childLogger } from '../helpers/logger.js';
import type { ExecutionTrace } from '../types/trace.js';
import type { Plan } from '../types/plan.js';

export interface ExecutionOptions {
  goal: string;
  instance: string;
  registry: AgentRegistry<any>;
  /** Optional pre-built plan — if omitted, the Planner is invoked. */
  plan_override?: Plan;
}

/**
 * Run a goal through the engine: plan, execute step by step with dependency
 * resolution, record everything in the trace, return the final output and the
 * full trace.
 */
export async function contextEngine(opts: ExecutionOptions): Promise<ExecutionTrace> {
  const trace = new TraceRecorder(opts.goal, opts.instance);
  const log = childLogger({ trace_id: trace.trace_id, kind: 'engine' });

  log.info({ goal: opts.goal, instance: opts.instance }, 'starting run');

  // Phase 1: plan
  try {
    const plan = opts.plan_override ?? (await planner({
      goal: opts.goal,
      capabilities: opts.registry.getCapabilitiesDescription(),
      trace_id: trace.trace_id,
    }));
    trace.logPlan(plan);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err }, 'planning failed');
    trace.finalize('failed', null, `planning failed: ${msg}`);
    return trace.snapshot();
  }

  // Phase 2: execute
  const state: ExecutionState = {};
  const plan = trace.plan;
  if (!plan) {
    trace.finalize('failed', null, 'plan was null after planning');
    return trace.snapshot();
  }

  for (const planStep of plan) {
    const stepStart = Date.now();
    log.info({ step: planStep.step, agent: planStep.agent }, 'executing step');

    try {
      const handler = opts.registry.getHandler(planStep.agent);
      const resolvedInput = resolveDependencies(planStep.input, state) as Record<string, unknown>;
      const mcpIn = createMcpMessage('engine', resolvedInput);
      const mcpOut = await handler(mcpIn);

      state[`STEP_${planStep.step}_OUTPUT`] = mcpOut.content;

      trace.logStep({
        step: planStep.step,
        agent: planStep.agent,
        planned_input: planStep.input,
        resolved_input: resolvedInput,
        output: mcpOut.content,
        started_at: stepStart,
        duration_ms: Date.now() - stepStart,
      });

      log.info({ step: planStep.step, duration_ms: Date.now() - stepStart }, 'step completed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ step: planStep.step, err }, 'step failed');
      trace.finalize('failed', null, `step ${planStep.step} failed: ${msg}`);
      return trace.snapshot();
    }
  }

  // Phase 3: finalize
  const lastKey = `STEP_${plan[plan.length - 1]!.step}_OUTPUT`;
  trace.finalize('success', state[lastKey]);
  log.info({ status: 'success' }, 'run complete');
  return trace.snapshot();
}
