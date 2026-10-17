/**
 * JARVIS NEXUS - Multi-Agent Orchestrator Types
 */

export type AutonomyLevel = 1 | 2 | 3 | 4 | 5;

export type AgentRole = 
  | 'orchestrator'
  | 'research'
  | 'coding'
  | 'ui_ux'
  | 'deploy'
  | 'autonomous'
  | 'memory'
  | 'data'
  | 'automation'
  | 'file'
  | 'voice'
  | 'vision'
  | 'security'
  | 'quality'
  | 'custom';

export type TaskStatus = 'pending' | 'planning' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';

export interface AgentProfile {
  id: string;
  name: string;
  role: AgentRole;
  title: string;
  description: string;
  instructions: string;
  avatarIcon: string;
  model: string;
  allowedTools: string[];
  autonomyLevel: AutonomyLevel;
  status: 'idle' | 'busy' | 'offline' | 'error';
  isCustom?: boolean;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  assignedAgentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  dependsOn: string[];
  toolCalls?: {
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
    status: 'pending' | 'approved' | 'executed' | 'rejected' | 'failed';
  }[];
  output?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface ExecutionPlan {
  id: string;
  goal: string;
  status: TaskStatus;
  subtasks: Subtask[];
  progressPercent: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  estimatedTokens?: number;
  estimatedCost?: string;
  finalResult?: string;
  requiresApproval?: boolean;
  pendingApprovalAction?: {
    type: string;
    description: string;
    subtaskId: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp: number;
  planId?: string;
  planPreview?: ExecutionPlan;
  toolInvocations?: {
    name: string;
    argsSummary: string;
    resultSummary?: string;
  }[];
  references?: {
    title: string;
    url: string;
    source: string;
  }[];
  /** Linha de raciocínio do modelo (quando o provedor expõe reasoning_content). */
  reasoning?: string;
  /** Fontes reais da web citadas na resposta, com link. */
  sources?: {
    title: string;
    url: string;
    snippet?: string;
  }[];
}
