import type { ExecutionTrace, TraceStep } from '../core/types/trace.js';

interface Props {
  trace: ExecutionTrace | null;
}

export function TraceView({ trace }: Props) {
  if (!trace) {
    return (
      <div className="trace-empty">
        <p>No run yet.</p>
      </div>
    );
  }

  return (
    <div className="trace">
      <header className="trace-header">
        <div className="trace-id">trace · {trace.trace_id.slice(0, 8)}</div>
        <div className={`trace-status status-${trace.status}`}>{trace.status}</div>
      </header>
      <div className="trace-goal">{trace.goal}</div>

      {trace.plan && (
        <div className="trace-plan">
          <h4>Plan</h4>
          <ol>
            {trace.plan.map((s) => (
              <li key={s.step}>
                <span className="chip">{s.agent}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="trace-steps">
        <h4>Steps</h4>
        {trace.steps.length === 0 && <p className="muted">No steps recorded.</p>}
        {trace.steps.map((step) => (
          <StepView key={step.step} step={step} />
        ))}
      </div>

      {trace.error && (
        <div className="trace-error">
          <h4>Error</h4>
          <pre>{trace.error}</pre>
        </div>
      )}
    </div>
  );
}

function StepView({ step }: { step: TraceStep }) {
  return (
    <details className="trace-step">
      <summary>
        <span className="step-num">#{step.step}</span>
        <span className="chip">{step.agent}</span>
        <span className="muted">{step.duration_ms}ms</span>
      </summary>
      <div className="step-body">
        <section>
          <h5>Resolved input</h5>
          <pre>{JSON.stringify(step.resolved_input, null, 2)}</pre>
        </section>
        <section>
          <h5>Output</h5>
          <pre>{JSON.stringify(step.output, null, 2)}</pre>
        </section>
      </div>
    </details>
  );
}
