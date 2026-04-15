import { z } from 'zod';

/**
 * MCP message: the envelope every agent/stance reads from and writes to.
 * Lightweight interpretation of the Model Context Protocol shape —
 * structured, predictable, typed.
 */
export const MCPMessageSchema = z.object({
  protocol_version: z.literal('1.0').default('1.0'),
  sender: z.string(),
  content: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type MCPMessage = z.infer<typeof MCPMessageSchema>;
