import { describe, it, expect } from 'vitest';
import { AgentRegistry } from '../engine/registry.js';
import { contextEngine } from '../engine/executor.js';
import { resolveDependencies } from '../engine/resolve.js';
import { createMcpMessage } from '../helpers/mcp.js';
import type { StanceBlueprint } from '../types/stance.js';
import type { Plan } from '../types/plan.js';

// Mock stance: echoes its input under a fixed key.
const echoBlueprint: StanceBlueprint = {
  id: 'stance_echo',
  name: 'Echo',
  description: 'Echoes input back for testing.',
  scene_goal: 'test',
  style_guide: 'test',
  structure: 'test',
  instruction: 'test',
  inputs: [{ key: 'text', type: 'string', description: 'text to echo' }],
  output_shape: { echoed: 'string' },
};

// Mock stance: takes two inputs, concatenates them.
const concatBlueprint: StanceBlueprint = {
  id: 'stance_concat',
  name: 'Concat',
  description: 'Joins two inputs for testing.',
  scene_goal: 'test',
  style_guide: 'test',
  structure: 'test',
  instruction: 'test',
  inputs: [
    { key: 'first', type: 'string', description: 'first piece' },
    { key: 'second', type: 'string', description: 'second piece' },
  ],
  output_shape: { joined: 'string' },
};

function buildTestRegistry(): AgentRegistry<Record<string, never>> {
  const reg = new AgentRegistry<Record<string, never>>({});
  reg.register({
    blueprint: echoBlueprint,
    factory: () => async (input) => {
      const text = String(input.content.text ?? '');
      return createMcpMessage('Echo', { echoed: text });
    },
  });
  reg.register({
    blueprint: concatBlueprint,
    factory: () => async (input) => {
      const first = input.content.first;
      const second = input.content.second;
      // Unwrap MCPMessage content if a reference resolved to one.
      const extract = (v: unknown): string => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object' && 'echoed' in v) return String((v as { echoed: unknown }).echoed);
        return JSON.stringify(v);
      };
      return createMcpMessage('Concat', { joined: `${extract(first)} | ${extract(second)}` });
    },
  });
  return reg;
}

describe('resolveDependencies', () => {
  it('returns primitives unchanged', () => {
    expect(resolveDependencies('hello', {})).toBe('hello');
    expect(resolveDependencies(42, {})).toBe(42);
    expect(resolveDependencies(null, {})).toBe(null);
  });

  it('resolves a top-level reference', () => {
    expect(resolveDependencies('$$STEP_1_OUTPUT$$', { STEP_1_OUTPUT: 'value' })).toBe('value');
  });

  it('resolves references inside nested objects', () => {
    const input = { a: '$$STEP_1_OUTPUT$$', b: { c: '$$STEP_2_OUTPUT$$' } };
    const state = { STEP_1_OUTPUT: 'one', STEP_2_OUTPUT: 'two' };
    expect(resolveDependencies(input, state)).toEqual({ a: 'one', b: { c: 'two' } });
  });

  it('resolves references inside arrays', () => {
    const input = ['$$STEP_1_OUTPUT$$', 'literal'];
    expect(resolveDependencies(input, { STEP_1_OUTPUT: 'one' })).toEqual(['one', 'literal']);
  });

  it('throws on missing reference', () => {
    expect(() => resolveDependencies('$$STEP_MISSING$$', {})).toThrow(/not found/);
  });
});

describe('AgentRegistry', () => {
  it('looks up registered handlers', async () => {
    const reg = buildTestRegistry();
    const handler = reg.getHandler('Echo');
    const result = await handler(createMcpMessage('test', { text: 'hi' }));
    expect(result.content.echoed).toBe('hi');
  });

  it('throws for unknown agents', () => {
    const reg = buildTestRegistry();
    expect(() => reg.getHandler('Missing')).toThrow(/not found/);
  });

  it('produces capability description naming all stances and inputs', () => {
    const reg = buildTestRegistry();
    const desc = reg.getCapabilitiesDescription();
    expect(desc).toContain('STANCE: Echo');
    expect(desc).toContain('STANCE: Concat');
    expect(desc).toContain('"first"');
    expect(desc).toContain('"second"');
  });
});

describe('contextEngine with plan_override', () => {
  it('runs a two-step plan with reference resolution', async () => {
    const registry = buildTestRegistry();
    const plan: Plan = [
      { step: 1, agent: 'Echo', input: { text: 'hello' } },
      { step: 2, agent: 'Echo', input: { text: 'world' } },
    ];
    const trace = await contextEngine({
      goal: 'test',
      instance: 'test',
      registry,
      plan_override: plan,
    });
    expect(trace.status).toBe('success');
    expect(trace.steps).toHaveLength(2);
    expect(trace.steps[0]!.output).toEqual({ echoed: 'hello' });
    expect(trace.final_output).toEqual({ echoed: 'world' });
  });

  it('resolves a reference from step 1 into step 2 input', async () => {
    const registry = buildTestRegistry();
    const plan: Plan = [
      { step: 1, agent: 'Echo', input: { text: 'alpha' } },
      { step: 2, agent: 'Concat', input: { first: '$$STEP_1_OUTPUT$$', second: 'beta' } },
    ];
    const trace = await contextEngine({
      goal: 'test',
      instance: 'test',
      registry,
      plan_override: plan,
    });
    expect(trace.status).toBe('success');
    expect(trace.final_output).toEqual({ joined: 'alpha | beta' });
  });

  it('fails with trace when a step throws', async () => {
    const reg = new AgentRegistry<Record<string, never>>({});
    reg.register({
      blueprint: echoBlueprint,
      factory: () => async () => {
        throw new Error('synthetic failure');
      },
    });
    const plan: Plan = [{ step: 1, agent: 'Echo', input: { text: 'x' } }];
    const trace = await contextEngine({
      goal: 'test',
      instance: 'test',
      registry: reg,
      plan_override: plan,
    });
    expect(trace.status).toBe('failed');
    expect(trace.error).toMatch(/synthetic failure/);
  });
});
