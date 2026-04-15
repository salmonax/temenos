import type { MCPMessage } from '../types/mcp.js';

/**
 * Typed constructor for MCP messages. Every handoff between engine components
 * goes through this so shape stays predictable.
 */
export function createMcpMessage(
  sender: string,
  content: Record<string, unknown>,
  metadata: Record<string, unknown> = {},
): MCPMessage {
  return {
    protocol_version: '1.0',
    sender,
    content,
    metadata,
  };
}
