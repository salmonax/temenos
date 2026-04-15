import { AgentRegistry } from '../core/engine/registry.js';
import { createMcpMessage } from '../core/helpers/mcp.js';
import type { StanceBlueprint } from '../core/types/stance.js';

/**
 * Phase-1 mock registry. Two stubbed stances that run entirely client-side so
 * we can see the engine's trace/output machinery working before wiring real
 * retrieval + LLM calls. Gets replaced by real stances in Phase 2.
 */

const echoBlueprint: StanceBlueprint = {
  id: 'stance_echo',
  name: 'Echo',
  description: 'Echoes input under a fixed key. Stub for GUI development.',
  scene_goal: 'echo for testing',
  style_guide: 'literal',
  structure: 'single key',
  instruction: 'return the text unchanged',
  inputs: [{ key: 'text', type: 'string', description: 'text to echo' }],
  output_shape: { echoed: 'string' },
};

const uppercaseBlueprint: StanceBlueprint = {
  id: 'stance_uppercase',
  name: 'Uppercase',
  description: 'Uppercases input. Stub for GUI development.',
  scene_goal: 'uppercase for testing',
  style_guide: 'literal',
  structure: 'single key',
  instruction: 'return the text uppercased',
  inputs: [{ key: 'text', type: 'string', description: 'text to uppercase' }],
  output_shape: { upper: 'string' },
};

export function buildMockRegistry(): AgentRegistry<Record<string, never>> {
  const reg = new AgentRegistry<Record<string, never>>({});

  reg.register({
    blueprint: echoBlueprint,
    factory: () => async (input) => {
      // Simulate thinking time so the GUI shows a visible transition.
      await new Promise((r) => setTimeout(r, 250));
      const text = String(input.content.text ?? '');
      return createMcpMessage('Echo', { echoed: text });
    },
  });

  reg.register({
    blueprint: uppercaseBlueprint,
    factory: () => async (input) => {
      await new Promise((r) => setTimeout(r, 250));
      const raw = input.content.text;
      const text = typeof raw === 'string'
        ? raw
        : raw && typeof raw === 'object' && 'echoed' in raw
          ? String((raw as { echoed: unknown }).echoed)
          : JSON.stringify(raw);
      return createMcpMessage('Uppercase', { upper: text.toUpperCase() });
    },
  });

  return reg;
}
