import { z } from 'zod';
import type { MCPMessage } from './mcp.js';

/**
 * A Stance Blueprint: retrievable, composable description of one way of reading
 * the corpus. Authored as data, not code. Loaded into the ContextLibrary and
 * surfaced by the Planner through the capability description.
 */
export const StanceBlueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  scene_goal: z.string(),
  style_guide: z.string(),
  structure: z.string(),
  instruction: z.string(),
  /** What input keys this stance expects inside an incoming MCP message. */
  inputs: z.array(z.object({
    key: z.string(),
    type: z.string(),
    description: z.string(),
  })),
  /** What output keys this stance produces in its returned MCP message. */
  output_shape: z.record(z.string(), z.string()),
});

export type StanceBlueprint = z.infer<typeof StanceBlueprintSchema>;

/**
 * A stance handler is an async function that takes an MCP message and returns
 * one. Every handler in the Registry has this shape after dependency injection.
 */
export type StanceHandler = (input: MCPMessage) => Promise<MCPMessage>;
