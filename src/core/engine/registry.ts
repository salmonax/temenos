import type { StanceBlueprint, StanceHandler } from '../types/stance.js';

/**
 * A registry entry: the authored blueprint plus the handler factory that knows
 * how to wire the stance to its dependencies (LLM client, retrieval handle, etc.).
 *
 * The factory pattern keeps DI explicit. Each instance (poseida-vault, forex-gann)
 * registers its stances with their own dependency bundles.
 */
export interface RegistryEntry<TDeps = unknown> {
  blueprint: StanceBlueprint;
  factory: (deps: TDeps) => StanceHandler;
}

export class AgentRegistry<TDeps = unknown> {
  private readonly entries = new Map<string, RegistryEntry<TDeps>>();
  private readonly deps: TDeps;

  constructor(deps: TDeps) {
    this.deps = deps;
  }

  register(entry: RegistryEntry<TDeps>): void {
    this.entries.set(entry.blueprint.name, entry);
  }

  /** Returns a zero-argument handler with dependencies already injected. */
  getHandler(agentName: string): StanceHandler {
    const entry = this.entries.get(agentName);
    if (!entry) {
      throw new Error(`Agent '${agentName}' not found in registry.`);
    }
    return entry.factory(this.deps);
  }

  /** Used by the Planner to understand what stances are available. */
  getCapabilitiesDescription(): string {
    const lines: string[] = [
      'Available stances and their required inputs:',
      '',
      'CRITICAL: You MUST use the exact input key names provided for each stance.',
      '',
    ];

    let idx = 1;
    for (const { blueprint } of this.entries.values()) {
      lines.push(`${idx}. STANCE: ${blueprint.name}`);
      lines.push(`   ROLE: ${blueprint.description}`);
      lines.push(`   INPUTS:`);
      for (const inp of blueprint.inputs) {
        lines.push(`     - "${inp.key}": (${inp.type}) ${inp.description}`);
      }
      const outputKeys = Object.keys(blueprint.output_shape);
      lines.push(`   OUTPUT: dict with keys ${outputKeys.map((k) => `"${k}"`).join(', ')}`);
      lines.push('');
      idx += 1;
    }

    return lines.join('\n');
  }

  listAgentNames(): string[] {
    return Array.from(this.entries.keys());
  }
}
