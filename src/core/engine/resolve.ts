import { REFERENCE_PATTERN } from '../types/plan.js';

export type ExecutionState = Record<string, unknown>;

/**
 * Recursively resolve `$$KEY$$` references in an input value against the
 * execution state. Handles nested objects and arrays. Non-reference primitives
 * pass through unchanged.
 */
export function resolveDependencies<T>(value: T, state: ExecutionState): unknown {
  if (typeof value === 'string') {
    const match = value.match(REFERENCE_PATTERN);
    if (match) {
      const key = match[1];
      if (!(key in state)) {
        throw new Error(`Dependency error: reference ${key} not found in execution state.`);
      }
      return state[key];
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveDependencies(item, state));
  }

  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveDependencies(v, state);
    }
    return out;
  }

  return value;
}
