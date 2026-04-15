import { getEncoding } from 'js-tiktoken';

const enc = getEncoding('cl100k_base');

/**
 * Fuel gauge. Measures token cost of a string before we spend on it.
 * Uses cl100k_base as a stable default — reasonable approximation for most
 * modern chat models.
 */
export function countTokens(text: string): number {
  return enc.encode(text).length;
}

/**
 * Sum token counts across multiple strings (e.g., system prompt + user content
 * + retrieved chunks). Useful for pre-call budget checks.
 */
export function countTokensTotal(...texts: string[]): number {
  return texts.reduce((acc, t) => acc + countTokens(t), 0);
}
