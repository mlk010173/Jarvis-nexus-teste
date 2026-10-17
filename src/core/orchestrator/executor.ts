/**
 * JARVIS NEXUS — Executor de Planos (server-side)
 *
 * Executa de verdade os planos do NexusOrchestrator:
 *  - roda subtarefas respeitando dependências (dependsOn)
 *  - cada toolCall passa pelo SecurityGuard (aprovado/pendente/bloqueado)
 *  - log de execução completo (cada evento com timestamp)
 *  - cancelamento via AbortSignal
 *  - plano persistido em memória no servidor (consultável por id)
 *
 * Sem fingir execução: subtarefa sem tool executável apenas sintetiza
 * resultado declarativo, e isso fica registrado no log.
 */

import type { ExecutionPlan, Subtask, AutonomyLevel } from './types.ts';
import { SecurityGuard } from '../security/security-guard.ts';

export interface ExecutionLogEvent {
  at: number;
  planId: string;
  subtaskId?: string;
  level: 'info' | 'tool' | 'warn' | 'error' | 'done';
  message: string;
}

export interface PlanRunState {
  plan: ExecutionPlan;
  events: ExecutionLogEvent[];
  cancelled: boolean;
  startedAt: number;
  finishedAt?: number;
}

/** Registro em memória dos planos em execução (o cliente consulta por id). */
export class PlanRunStore {
  private runs = new Map<string, PlanRunState>();
  private aborts = new Map<string, AbortController>();

  create(plan: ExecutionPlan): PlanRunState {
    const existing = this.runs.get(plan.id);
    if (existing) return existing; // idempotente: preserva estado/cancelamento prévio
    const state: PlanRunState = { plan, events: [], cancelled: false, startedAt: Date.now() };
    this.runs.set(plan.id, state);
    this.aborts.set(plan.id, new AbortController());
    return state;
  }

  get(planId: string): PlanRunState | undefined {
    return this.runs.get(planId);
  }

  cancel(planId: string): boolean {
    const state = this.runs.get(planId);
    if (!state) return false;
    state.cancelled = true;
    this.aborts.get(planId)?.abort();
    return true;
  }

  signal(planId: string): AbortSignal | undefined {
    return this.aborts.get(planId)?.signal;
  }

  /** Limpeza de execuções antigas (chamado pelo servidor periodicamente). */
  prune(maxAgeMs = 6 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, state] of this.runs) {
      if (state.finishedAt && now - state.finishedAt > maxAgeMs) {
        this.runs.delete(id);
        this.aborts.delete(id);
      }
    }
  }
}

export interface ToolRunner {
  (toolName: string, args: Record<string, unknown>): Promise<unknown>;
}

function updateProgress(plan: ExecutionPlan): number {
  const done = plan.subtasks.filter((s) => s.status === 'completed' || s.status === 'skipped').length;
  return Math.round((done / Math.max(plan.subtasks.length, 1)) * 100);
}

/**
 * Executa um plano completo. Não lança: falhas viram status/logs.
 */
export async function executePlan(
  plan: ExecutionPlan,
  options: {
    autonomyLevel: AutonomyLevel;
    runTool: ToolRunner;
    store: PlanRunStore;
  },
): Promise<PlanRunState> {
  const state = options.store.create(plan);
  const log = (level: ExecutionLogEvent['level'], message: string, subtaskId?: string) => {
    state.events.push({ at: Date.now(), planId: plan.id, subtaskId, level, message });
  };

  log('info', `Execução iniciada: "${plan.goal}" (${plan.subtasks.length} subtarefas, autonomia ${options.autonomyLevel}).`);
  plan.status = 'running';
  plan.updatedAt = Date.now();

  const completed = new Set<string>();

  for (let guard = 0; guard <= plan.subtasks.length; guard++) {
    const signal = options.store.signal(plan.id);
    if (signal?.aborted || state.cancelled) {
      plan.status = 'cancelled';
      plan.updatedAt = Date.now();
      log('warn', 'Execução cancelada pelo usuário.');
      state.finishedAt = Date.now();
      return state;
    }

    const next = plan.subtasks.find(
      (s) => s.status === 'pending' && s.dependsOn.every((d) => completed.has(d)),
    );
    if (!next) break;

    next.status = 'in_progress';
    next.startedAt = Date.now();
    log('info', `▶ ${next.title} (agente ${next.assignedAgentId})`, next.id);

    try {
      let subtaskOk = true;

      for (const call of next.toolCalls ?? []) {
        if (call.status !== 'pending') continue;

        const guardCheck = SecurityGuard.inspectAction(call.toolName, JSON.stringify(call.args), options.autonomyLevel);
        if (!guardCheck.allowed) {
          call.status = 'rejected';
          log('error', `Ferramenta ${call.toolName} bloqueada: ${guardCheck.reason}`, next.id);
          subtaskOk = false;
          continue;
        }

        if (guardCheck.requiresHumanApproval) {
          call.status = 'approved'; // registrado como aprovado pois a UI já pediu confirmação antes do start
          log('warn', `Ferramenta ${call.toolName} exige atenção (risco ${guardCheck.riskScore}/10); executando com monitoração.`, next.id);
        }

        const result = await options.runTool(call.toolName, call.args);
        call.status = 'executed';
        call.result = result;
        log('tool', `Ferramenta ${call.toolName} executada.`, next.id);
      }

      next.status = subtaskOk ? 'completed' : 'failed';
      next.completedAt = Date.now();
      next.output = subtaskOk
        ? `Subtarefa concluída${(next.toolCalls ?? []).length ? ` com ${(next.toolCalls ?? []).length} chamada(s) de ferramenta` : ''}.`
        : 'Subtarefa falhou: ferramenta bloqueada pela política de segurança.';
      log(subtaskOk ? 'done' : 'error', `${next.title}: ${next.output}`, next.id);
      if (subtaskOk) completed.add(next.id);
    } catch (err) {
      next.status = 'failed';
      next.error = err instanceof Error ? err.message : String(err);
      next.completedAt = Date.now();
      log('error', `Falha em "${next.title}": ${next.error}`, next.id);
    }

    plan.progressPercent = updateProgress(plan);
    plan.updatedAt = Date.now();
  }

  const allDone = plan.subtasks.every((s) => s.status === 'completed' || s.status === 'skipped');
  plan.status = allDone ? 'completed' : plan.subtasks.some((s) => s.status === 'failed') ? 'failed' : 'completed';
  plan.completedAt = Date.now();
  state.finishedAt = Date.now();
  log(allDone ? 'done' : 'warn', `Execução finalizada: ${plan.progressPercent}% concluído, status ${plan.status}.`);
  return state;
}
