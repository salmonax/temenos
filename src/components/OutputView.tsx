import type { ExecutionTrace } from '../core/types/trace.js';

interface Props {
  trace: ExecutionTrace | null;
}

export function OutputView({ trace }: Props) {
  if (!trace) {
    return (
      <div className="output-empty">
        <p>Run a query to see output here.</p>
      </div>
    );
  }

  if (trace.status === 'failed') {
    return (
      <div className="output failed">
        <h4>Failed</h4>
        <pre>{trace.error ?? 'Unknown error.'}</pre>
      </div>
    );
  }

  if (!trace.final_output) {
    return (
      <div className="output-empty">
        <p>No output.</p>
      </div>
    );
  }

  return (
    <div className="output">
      <pre>{JSON.stringify(trace.final_output, null, 2)}</pre>
    </div>
  );
}
