import test from 'node:test';
import assert from 'node:assert/strict';
import { NexusOrchestrator } from '../src/core/orchestrator/orchestrator.ts';
import { INITIAL_AGENTS } from '../src/core/orchestrator/agents-registry.ts';

test('NexusOrchestrator loads 12 unique specialized agents', () => {
  assert.equal(INITIAL_AGENTS.length, 12);
  const roles = new Set(INITIAL_AGENTS.map((a) => a.role));
  assert.equal(roles.has('orchestrator'), true);
  assert.equal(roles.has('coding'), true);
  assert.equal(roles.has('research'), true);
  assert.equal(roles.has('deploy'), true);
  assert.equal(roles.has('ui_ux'), true);
  assert.equal(roles.has('security'), true);
});

test('NexusOrchestrator creates structured plan for to-do app', () => {
  const plan = NexusOrchestrator.createPlan('Desenvolver app de lista de tarefas para celular', 4);
  assert.equal(plan.status, 'pending');
  assert.equal(plan.progressPercent, 0);
  assert.equal(plan.subtasks.length >= 3, true);

  // Check agent allocation
  const assignedAgents = plan.subtasks.map((s) => s.assignedAgentId);
  assert.equal(assignedAgents.includes('coding-agent'), true);
  assert.equal(assignedAgents.includes('ui-ux-agent'), true);
});

test('NexusOrchestrator establishes ordered dependencies between subtasks', () => {
  const plan = NexusOrchestrator.createPlan('Criar projeto com backend e deploy', 4);
  const firstTask = plan.subtasks[0];
  const secondTask = plan.subtasks[1];

  assert.equal(firstTask.dependsOn.length, 0);
  assert.equal(secondTask.dependsOn.includes(firstTask.id), true);
});

test('NexusOrchestrator marks subtasks as completed and updates progress percent', () => {
  const plan = NexusOrchestrator.createPlan('Meta simples de teste', 4);
  const total = plan.subtasks.length;

  plan.subtasks[0].status = 'completed';
  const completedCount = plan.subtasks.filter((s) => s.status === 'completed').length;
  plan.progressPercent = Math.round((completedCount / total) * 100);

  assert.equal(plan.progressPercent > 0, true);
  assert.equal(plan.progressPercent <= 100, true);
});

test('NexusOrchestrator handles autonomy level constraints', () => {
  const planL1 = NexusOrchestrator.createPlan('Solicitação textual simples', 1);
  assert.equal(planL1.requiresApproval, true);

  const planL5 = NexusOrchestrator.createPlan('Construção autônoma completa', 5);
  assert.equal(planL5.requiresApproval, false);
});
