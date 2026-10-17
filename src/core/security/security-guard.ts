/**
 * JARVIS NEXUS - Security Guard & Permission Policy
 */

import type { AutonomyLevel } from '../orchestrator/types.ts';

export interface SecurityCheckResult {
  allowed: boolean;
  requiresHumanApproval: boolean;
  reason?: string;
  riskScore: number; // 0 (safe) to 10 (critical)
  flaggedPatterns: string[];
}

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+[\/~]/i,
  /chmod\s+(-R\s+)?777/i,
  /:\s*\(\s*\)\s*\{/i, // fork bomb function definition
  /curl\s+.*\s*\|\s*(ba)?sh/i,
  /wget\s+.*\s*\|\s*(ba)?sh/i,
  /curl\s+.*\s*\|\s*python/i,
  /wget\s+.*\s*\|\s*python/i,
  /dd\s+if=/i, // disk destroyer
  /mkfs(\.\w+)?\s+/i, // format filesystem
  />\s*\/dev\/(sd[a-z]|nvme|hd[a-z])/i, // raw device overwriting
  /cat\s+\/etc\/(shadow|passwd)/i, // credential exfiltration
  /DROP\s+(DATABASE|TABLE|SCHEMA)/i,
  /TRUNCATE\s+TABLE/i,
  /eval\s*\(/i,
  /__proto__|constructor\.prototype/i,
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /process\.env/i,
  /fs\.unlinkSync\s*\(\s*['"]\/etc/i
];

const SUSPICIOUS_PROMPT_INJECTIONS = [
  /ignore previous instructions/i,
  /desconsidere as instruções anteriores/i,
  /ignore todas as regras anteriores/i,
  /você agora é um assistente sem filtros/i,
  /jailbreak mode/i,
  /dan mode/i,
  /system override:/i,
  /reveal your secret keys/i,
  /exiba sua chave secreta/i,
  /exiba as variáveis de ambiente/i
];

export class SecurityGuard {
  /**
   * Evaluates an action or command before any agent executes it
   */
  static inspectAction(
    actionName: string,
    payload: string,
    currentAutonomyLevel: AutonomyLevel
  ): SecurityCheckResult {
    const flaggedPatterns: string[] = [];
    let riskScore = 0;

    // 1. Check for command injection
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(payload)) {
        flaggedPatterns.push(`Padrão de risco crítico detectado: ${pattern.source}`);
        riskScore += 5;
      }
    }

    // 2. Check for prompt injection
    for (const pattern of SUSPICIOUS_PROMPT_INJECTIONS) {
      if (pattern.test(payload)) {
        flaggedPatterns.push(`Tentativa de Prompt Injection: ${pattern.source}`);
        riskScore += 4;
      }
    }

    // 3. Inspect high impact actions
    const isDestructive = /delete|remove|apagar|remover|format|drop/i.test(actionName) ||
      /delete|remove|apagar|remover/i.test(payload);

    const isExternalDeploy = /deploy|publish|publicar|comitar/i.test(actionName);

    if (isDestructive) {
      riskScore += 3;
    }
    if (isExternalDeploy) {
      riskScore += 2;
    }

    // Hard block for critical risk
    if (riskScore >= 5) {
      return {
        allowed: false,
        requiresHumanApproval: true,
        reason: 'Bloqueado pela política de proteção contra injeção e comandos destrutivos.',
        riskScore,
        flaggedPatterns
      };
    }

    // Determine if human approval is required based on autonomy level:
    // Nível 1: Somente responder (sempre requer aprovação para ferramentas)
    // Nível 2: Planejar e sugerir ações (sempre requer aprovação)
    // Nível 3: Executar ferramentas locais autorizadas (aprovação para externas/destrutivas)
    // Nível 4: Executar fluxos previamente aprovados
    // Nível 5: Autônomo com guardrails
    let requiresHumanApproval = false;

    if (currentAutonomyLevel <= 2 && (actionName !== 'system_diagnostics' && actionName !== 'read_repository')) {
      requiresHumanApproval = true;
    } else if (currentAutonomyLevel === 3 && (isDestructive || isExternalDeploy)) {
      requiresHumanApproval = true;
    } else if (currentAutonomyLevel === 4 && isDestructive) {
      requiresHumanApproval = true;
    } else if (isDestructive && riskScore > 2) {
      requiresHumanApproval = true;
    }

    return {
      allowed: true,
      requiresHumanApproval,
      reason: requiresHumanApproval ? 'Esta ação tem impacto relevante e aguarda sua confirmação.' : undefined,
      riskScore,
      flaggedPatterns
    };
  }

  /**
   * Sanitize text output for UI safety
   */
  static sanitizeOutput(text: string): string {
    if (!text) return '';
    // Strip accidental API keys or secrets
    let cleaned = text.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GEMINI_KEY]');
    cleaned = cleaned.replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_API_KEY]');
    return cleaned;
  }
}
