import type { ExecutionTrace, TraceStatus, TraceStep } from '../types/trace.js';
import type { Plan } from '../types/plan.js';

function randomId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Flight recorder. Mutable during a run; serialized to ExecutionTrace at the end.
 * Traces are their own material in Temenos — persisted, queryable, part of the
 * inventor's accumulating corpus.
 */
export class TraceRecorder {
  readonly trace_id: string;
  readonly goal: string;
  readonly instance: string;
  plan: Plan | null = null;
  steps: TraceStep[] = [];
  status: TraceStatus = 'initialized';
  final_output: unknown = null;
  error: string | null = null;
  private readonly started_at: number;

  constructor(goal: string, instance: string) {
    this.trace_id = randomId();
    this.goal = goal;
    this.instance = instance;
    this.started_at = Date.now();
  }

  logPlan(plan: Plan): void {
    this.plan = plan;
    this.status = 'executing';
  }

  logStep(step: Omit<TraceStep, 'started_at' | 'duration_ms'> & { started_at: number; duration_ms: number }): void {
    this.steps.push(step);
  }

  finalize(status: TraceStatus, final_output: unknown = null, error: string | null = null): void {
    this.status = status;
    this.final_output = final_output;
    this.error = error;
  }

  snapshot(): ExecutionTrace {
    return {
      trace_id: this.trace_id,
      goal: this.goal,
      instance: this.instance,
      plan: this.plan,
      steps: this.steps,
      status: this.status,
      final_output: this.final_output ?? null,
      started_at: this.started_at,
      duration_ms:
        this.status === 'success' || this.status === 'failed'
          ? Date.now() - this.started_at
          : null,
      error: this.error,
    };
  }
}
