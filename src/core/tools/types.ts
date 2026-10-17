/**
 * JARVIS NEXUS - Tools System Types
 */

export type ToolCategory = 
  | 'web'
  | 'code'
  | 'files'
  | 'memory'
  | 'deploy'
  | 'voice'
  | 'security'
  | 'system';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  category: ToolCategory;
  title: string;
  description: string;
  parameters: ToolParameter[];
  requiresApproval: boolean;
  isLocal: boolean;
  sideEffects?: string;
  rateLimitPerMin?: number;
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  output: unknown;
  durationMs: number;
  error?: string;
  approvalRequired?: boolean;
}
