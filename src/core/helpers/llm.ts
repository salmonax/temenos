import Anthropic from '@anthropic-ai/sdk';
import { childLogger } from './logger.js';

export interface LlmCallOptions {
  system: string;
  user: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  json_mode?: boolean;
  trace_id?: string;
}

export interface LlmCallResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
}

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  const apiKey = env?.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY missing from environment. Copy .env.example to .env and set it.',
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * Robust LLM call. Simple retry-on-transient pattern, measured latency,
 * structured logging with trace_id. json_mode hints the model to return a JSON
 * object (downstream code should still validate with Zod).
 */
export async function callLlmRobust(opts: LlmCallOptions): Promise<LlmCallResult> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  const model = opts.model ?? env?.ANTHROPIC_MODEL ?? 'claude-opus-4-6';
  const log = childLogger({ trace_id: opts.trace_id ?? 'no-trace', model, kind: 'llm' });

  const systemPrompt = opts.json_mode
    ? `${opts.system}\n\nRespond with a single JSON object. No prose before or after.`
    : opts.system;

  const client = getClient();
  const start = Date.now();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      log.info({ attempt }, 'calling LLM');
      const response = await client.messages.create({
        model,
        max_tokens: opts.max_tokens ?? 4096,
        temperature: opts.temperature ?? 0.4,
        system: systemPrompt,
        messages: [{ role: 'user', content: opts.user }],
      });

      const latency = Date.now() - start;
      const block = response.content[0];
      if (!block || block.type !== 'text') {
        throw new Error('LLM returned no text block');
      }

      log.info(
        {
          latency_ms: latency,
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
        'LLM call succeeded',
      );

      return {
        text: block.text,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        latency_ms: latency,
      };
    } catch (err) {
      const isLast = attempt === maxAttempts;
      log.warn({ err, attempt, isLast }, 'LLM call failed');
      if (isLast) throw err;
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
    }
  }

  throw new Error('unreachable');
}
