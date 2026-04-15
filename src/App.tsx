import { useState } from 'react';
import { contextEngine } from './core/engine/executor.js';
import type { ExecutionTrace } from './core/types/trace.js';
import type { Plan } from './core/types/plan.js';
import { buildMockRegistry } from './components/mockRegistry.js';
import { TraceView } from './components/TraceView.js';
import { OutputView } from './components/OutputView.js';
import './App.css';

const INSTANCES = [
  { id: 'mock', label: 'Phase 1 · Mock' },
  { id: 'poseida-vault', label: 'Poseida Vault (Phase 2)' },
  { id: 'forex-gann', label: 'Forex · Gann (Phase 3)' },
] as const;

function App() {
  const [goal, setGoal] = useState('trace the idea through the stances');
  const [instance, setInstance] = useState<string>('mock');
  const [running, setRunning] = useState(false);
  const [trace, setTrace] = useState<ExecutionTrace | null>(null);

  const disabled = instance !== 'mock';

  async function runMock() {
    setRunning(true);
    setTrace(null);
    const registry = buildMockRegistry();
    // Canned plan so Phase 1 runs without the Planner LLM.
    const plan: Plan = [
      { step: 1, agent: 'Echo', input: { text: goal } },
      { step: 2, agent: 'Uppercase', input: { text: '$$STEP_1_OUTPUT$$' } },
    ];
    const result = await contextEngine({
      goal,
      instance: 'mock',
      registry,
      plan_override: plan,
    });
    setTrace(result);
    setRunning(false);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Temenos</h1>
        <span className="tagline">a prepared environment for reading your own corpus</span>
      </header>

      <main className="panes">
        <aside className="pane pane-left">
          <section>
            <label className="label">Instance</label>
            <select
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              className="select"
            >
              {INSTANCES.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </section>

          <section>
            <label className="label">Goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={6}
              className="goal-input"
            />
          </section>

          <button
            onClick={runMock}
            disabled={running || disabled || !goal.trim()}
            className="run-btn"
          >
            {running ? 'Running…' : disabled ? 'Instance not wired yet' : 'Run'}
          </button>

          {disabled && (
            <p className="note">
              Phase-1 wiring runs the Mock instance only. Real instances light up
              as Phases 2 and 3 land.
            </p>
          )}
        </aside>

        <section className="pane pane-center">
          <h3 className="pane-title">Trace</h3>
          <TraceView trace={trace} />
        </section>

        <section className="pane pane-right">
          <h3 className="pane-title">Output</h3>
          <OutputView trace={trace} />
        </section>
      </main>
    </div>
  );
}

export default App;
