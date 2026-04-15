import type { MCPMessage } from '../types/mcp.js';
import type { StanceBlueprint, StanceHandler } from '../types/stance.js';
import { callLlmRobust } from '../helpers/llm.js';
import { createMcpMessage } from '../helpers/mcp.js';

/**
 * Build the system prompt that carries a stance's authored blueprint into
 * runtime. The Writer-equivalent for each stance: structure + style + instruction
 * in the header; the LLM works against whatever input arrives.
 */
export function buildStanceSystemPrompt(blueprint: StanceBlueprint): string {
  return `You are the ${blueprint.name} stance in Temenos.

Scene goal: ${blueprint.scene_goal}

Style:
${blueprint.style_guide}

Structure of your output:
${blueprint.structure}

Instruction:
${blueprint.instruction}

Your output MUST be a single JSON object. Use the key names declared in the stance's output shape: ${Object.keys(blueprint.output_shape).join(', ')}. No prose before or after the JSON.`;
}

/**
 * Factory for an LLM-backed stance handler that takes an incoming MCP message,
 * formats its content into a user prompt, calls the LLM with the stance's
 * system prompt, parses the JSON response, and returns an outgoing MCP message.
 *
 * Instances can use this for standard stances or write bespoke handlers for
 * stances that need non-LLM work (retrieval, chart rendering, etc.).
 */
export function buildLlmStanceHandler(
  blueprint: StanceBlueprint,
  opts: { trace_id?: string; model?: string } = {},
): StanceHandler {
  const systemPrompt = buildStanceSystemPrompt(blueprint);

  return async (input: MCPMessage): Promise<MCPMessage> => {
    const userPrompt = buildStanceUserPrompt(blueprint, input);
    const result = await callLlmRobust({
      system: systemPrompt,
      user: userPrompt,
      json_mode: true,
      trace_id: opts.trace_id,
      model: opts.model,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      throw new Error(`${blueprint.name} returned non-JSON: ${result.text.slice(0, 200)}`);
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${blueprint.name} returned non-object JSON.`);
    }

    return createMcpMessage(blueprint.name, parsed as Record<string, unknown>, {
      llm_latency_ms: result.latency_ms,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
    });
  };
}

function buildStanceUserPrompt(blueprint: StanceBlueprint, input: MCPMessage): string {
  const lines: string[] = ['--- INCOMING INPUTS ---', ''];
  for (const inp of blueprint.inputs) {
    const val = input.content[inp.key];
    lines.push(`### ${inp.key}`);
    if (val === undefined || val === null) {
      lines.push('(not provided)');
    } else if (typeof val === 'string') {
      lines.push(val);
    } else {
      lines.push(JSON.stringify(val, null, 2));
    }
    lines.push('');
  }
  lines.push('--- END INPUTS ---');
  lines.push('');
  lines.push('Produce your output now.');
  return lines.join('\n');
}
