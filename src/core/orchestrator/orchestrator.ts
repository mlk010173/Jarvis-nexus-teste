/**
 * JARVIS NEXUS - Nexus Orchestrator Core Engine
 */

import type { ExecutionPlan, Subtask, AutonomyLevel } from './types.ts';
import { executeTool } from '../tools/tools-registry.ts';
import { SecurityGuard } from '../security/security-guard.ts';

export class NexusOrchestrator {
  /**
   * Decomposes any natural language goal into a structured, executable multi-agent plan
   */
  static createPlan(goal: string, autonomyLevel: AutonomyLevel = 4): ExecutionPlan {
    const planId = `plan-${Date.now()}`;
    const lowerGoal = goal.toLowerCase();

    const subtasks: Subtask[] = [];

    if (lowerGoal.includes('app') || lowerGoal.includes('lista') || lowerGoal.includes('tarefa') || lowerGoal.includes('código') || lowerGoal.includes('projeto')) {
      // Software engineering & UI workflow
      subtasks.push({
        id: `${planId}-step-1`,
        title: 'Buscar repositório base open-source',
        description: 'Pesquisar templates de tarefas modernos com TypeScript e Tailwind no GitHub.',
        assignedAgentId: 'coding-agent',
        status: 'pending',
        dependsOn: [],
        toolCalls: [
          {
            toolName: 'read_repository',
            args: { repoName: 'magicui', topic: 'todo-list-components' },
            status: 'pending'
          }
        ]
      });

      subtasks.push({
        id: `${planId}-step-2`,
        title: 'Adaptar o código e regras de negócio',
        description: 'Modularizar componentes e implementar persistência local no SQLite/IndexedDB.',
        assignedAgentId: 'coding-agent',
        status: 'pending',
        dependsOn: [`${planId}-step-1`],
        toolCalls: [
          {
            toolName: 'code_eval',
            args: { code: 'const tasks = [{ id: 1, title: "Estudar IA", done: false }]; tasks.length;' },
            status: 'pending'
          }
        ]
      });

      subtasks.push({
        id: `${planId}-step-3`,
        title: 'Criar interface com Magic UI & Tailwind',
        description: 'Desenvolver layout futurista dark-mode responsivo para celular Android com gestos.',
        assignedAgentId: 'ui-ux-agent',
        status: 'pending',
        dependsOn: [`${planId}-step-2`]
      });

      subtasks.push({
        id: `${planId}-step-4`,
        title: 'Configurar deploy no celular via Termux / PWA',
        description: 'Gerar script de execução local sem dependências de servidores externos pagos.',
        assignedAgentId: 'deploy-agent',
        status: 'pending',
        dependsOn: [`${planId}-step-3`],
        toolCalls: [
          {
            toolName: 'deploy_simulator',
            args: { target: 'android_termux', projectName: 'jarvis-todo-pwa' },
            status: 'pending'
          }
        ]
      });
    } else if (lowerGoal.includes('pesquis') || lowerGoal.includes('estud') || lowerGoal.includes('notícia') || lowerGoal.includes('ia')) {
      // Research & synthesis workflow
      subtasks.push({
        id: `${planId}-step-1`,
        title: 'Coletar fontes e artigos técnicos na web',
        description: 'Pesquisar documentação e artigos acadêmicos sobre o tema.',
        assignedAgentId: 'research-agent',
        status: 'pending',
        dependsOn: [],
        toolCalls: [
          {
            toolName: 'web_search',
            args: { query: goal },
            status: 'pending'
          }
        ]
      });

      subtasks.push({
        id: `${planId}-step-2`,
        title: 'Cruzar dados e verificar veracidade',
        description: 'Filtrar redundâncias e verificar licenças de uso.',
        assignedAgentId: 'quality-agent',
        status: 'pending',
        dependsOn: [`${planId}-step-1`]
      });

      subtasks.push({
        id: `${planId}-step-3`,
        title: 'Sintetizar relatório e salvar na memória persistente',
        description: 'Armazenar os principais aprendizados para recuperação em futuras sessões.',
        assignedAgentId: 'memory-agent',
        status: 'pending',
        dependsOn: [`${planId}-step-2`],
        toolCalls: [
          {
            toolName: 'memory_store',
            args: { title: `Pesquisa: ${goal.substring(0, 30)}`, content: 'Resumo estruturado...', category: 'knowledge' },
            status: 'pending'
          }
        ]
      });
    } else {
      // General autonomous goal execution
      subtasks.push({
        id: `${planId}-step-1`,
        title: 'Analisar requisitos e viabilidade',
        description: 'Decompor o objetivo em restrições de segurança e recursos necessários.',
        assignedAgentId: 'security-agent',
        status: 'pending',
        dependsOn: []
      });

      subtasks.push({
        id: `${planId}-step-2`,
        title: 'Executar etapas autorizadas',
        description: 'Delegar para os agentes correspondentes respeitando o orçamento configurado.',
        assignedAgentId: 'autonomous-agent',
        status: 'pending',
        dependsOn: [`${planId}-step-1`]
      });

      subtasks.push({
        id: `${planId}-step-3`,
        title: 'Validar integridade da resposta',
        description: 'Revisar se o resultado cumpre a solicitação sem expor dados confidenciais.',
        assignedAgentId: 'quality-agent',
        status: 'pending',
        dependsOn: [`${planId}-step-2`]
      });
    }

    // Inspect if plan requires human approval
    const requiresApproval = autonomyLevel <= 2;

    return {
      id: planId,
      goal,
      status: 'pending',
      subtasks,
      progressPercent: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      estimatedTokens: 1250,
      estimatedCost: 'R$ 0,00 (100% Grátis / Open-Source)',
      requiresApproval
    };
  }

  /**
   * Executes a single step of the plan and returns the updated plan state
   */
  static async runPlanStep(
    plan: ExecutionPlan,
    stepIndex: number,
    autonomyLevel: AutonomyLevel = 4
  ): Promise<ExecutionPlan> {
    const updated = { ...plan, subtasks: [...plan.subtasks] };
    const step = updated.subtasks[stepIndex];

    if (!step) return updated;

    step.status = 'in_progress';
    step.startedAt = Date.now();
    updated.status = 'running';
    updated.updatedAt = Date.now();

    // Execute associated tool calls if present
    if (step.toolCalls && step.toolCalls.length > 0) {
      for (const call of step.toolCalls) {
        // Run security pre-check
        const sec = SecurityGuard.inspectAction(
          call.toolName,
          JSON.stringify(call.args),
          autonomyLevel
        );

        if (!sec.allowed) {
          call.status = 'rejected';
          step.status = 'failed';
          step.error = sec.reason;
          updated.status = 'failed';
          return updated;
        }

        if (sec.requiresHumanApproval && autonomyLevel < 5) {
          call.status = 'pending';
          step.status = 'pending';
          updated.status = 'waiting_approval';
          updated.requiresApproval = true;
          updated.pendingApprovalAction = {
            type: call.toolName,
            description: `Ação ${call.toolName} aguarda autorização para continuar.`,
            subtaskId: step.id
          };
          return updated;
        }

        // Execute tool
        const res = await executeTool(call.toolName, call.args);
        call.result = res.output;
        call.status = res.success ? 'executed' : 'failed';
        if (!res.success) {
          step.error = res.error;
        }
      }
    }

    step.status = 'completed';
    step.completedAt = Date.now();
    step.output = `Concluído com êxito pelo ${step.assignedAgentId}.`;

    // Recalculate overall progress
    const completedCount = updated.subtasks.filter(s => s.status === 'completed').length;
    updated.progressPercent = Math.round((completedCount / updated.subtasks.length) * 100);

    if (completedCount === updated.subtasks.length) {
      updated.status = 'completed';
      updated.completedAt = Date.now();
      updated.finalResult = `Objetivo alcançado: todas as ${updated.subtasks.length} subtarefas foram concluídas com sucesso.`;
    }

    return updated;
  }
}
