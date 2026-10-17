/**
 * JARVIS NEXUS — Terminal seguro (server-side)
 *
 * Executa comandos shell reais em sandbox com:
 *  - lista de permissão por binário (allowlist)
 *  - bloqueio de padrões destrutivos via SecurityGuard
 *  - timeout de execução e limite de saída
 *  - working directory fixo (workspace isolável)
 *
 * Nada de fingir execução: ou o comando roda de verdade com as
 * proteções acima, ou é bloqueado com motivo claro.
 */

import { spawn } from 'child_process';
import { SecurityGuard } from '../security/security-guard.ts';

export const SHELL_ALLOWED_BINARIES = [
  'node', 'npm', 'npx', 'pnpm', 'bun',
  'git',
  'ls', 'cat', 'head', 'tail', 'wc', 'grep', 'find', 'du', 'df',
  'pwd', 'echo', 'which', 'uname', 'date', 'env', 'whoami',
  'python3', 'pip',
  'curl', 'wget',
] as const;

export const SHELL_FORBIDDEN_PATTERNS = [
  /rm\s+-rf?\s+[\/~]/i,
  /mkfs/i,
  /dd\s+if=/i,
  /:\(\)\s*\{.*\};\s*:/, // fork bomb
  />\s*\/dev\/sd[a-z]/i,
  /shutdown|reboot|halt\b/i,
  /\/etc\/shadow/i,
  /curl[^|]*\|\s*(ba)?sh/i, // pipe direto para shell
  /wget[^|]*\|\s*(ba)?sh/i,
];

export interface ShellRequest {
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface ShellResult {
  command: string;
  allowed: boolean;
  blockedReason?: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
}

const MAX_OUTPUT = 30_000;
const DEFAULT_TIMEOUT = 10_000;

/** Valida o comando: allowlist de binário + padrões destrutivos + guard de segurança. */
export function validateShellCommand(command: string): { ok: boolean; reason?: string } {
  const trimmed = command.trim();
  if (!trimmed) return { ok: false, reason: 'Comando vazio.' };

  for (const pattern of SHELL_FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, reason: `Padrão destrutivo bloqueado (${pattern.source}).` };
    }
  }

  const guardCheck = SecurityGuard.inspectAction('shell_exec', trimmed, 5);
  if (!guardCheck.allowed) {
    return { ok: false, reason: guardCheck.reason ?? 'Bloqueado pela política de segurança.' };
  }

  // Primeiro token = binário (sem pipes/cadeias; proíbimos `;`, `&&`, `|` para manter 1 binário por execução)
  const hasChain = /[;|&]|\$\(|`/.test(trimmed);
  if (hasChain) {
    return { ok: false, reason: 'Comandos encadeados não são permitidos no terminal sandbox. Execute um comando por vez.' };
  }

  const binary = trimmed.split(/\s+/)[0];
  if (!(SHELL_ALLOWED_BINARIES as readonly string[]).includes(binary)) {
    return { ok: false, reason: `Binário "${binary}" fora da lista de permissões (${SHELL_ALLOWED_BINARIES.slice(0, 8).join(', ')}…).` };
  }

  return { ok: true };
}

/** Executa comando validado com timeout e captura de saída limitada. */
export async function executeShell(request: ShellRequest, defaultCwd: string): Promise<ShellResult> {
  const started = Date.now();
  const command = request.command.trim();
  const timeoutMs = Math.min(request.timeoutMs ?? DEFAULT_TIMEOUT, 20_000);
  const cwd = request.cwd && request.cwd.startsWith('/') ? request.cwd : defaultCwd;

  const validation = validateShellCommand(command);
  if (!validation.ok) {
    return {
      command,
      allowed: false,
      blockedReason: validation.reason,
      stdout: '',
      stderr: '',
      exitCode: null,
      timedOut: false,
      durationMs: Date.now() - started,
    };
  }

  return new Promise<ShellResult>((resolve) => {
    const child = spawn(command.split(/\s+/)[0], command.split(/\s+/).slice(1), {
      cwd,
      env: { ...process.env, TERM: 'dumb', NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (d: Buffer) => {
      if (stdout.length < MAX_OUTPUT) stdout += d.toString('utf8').slice(0, MAX_OUTPUT - stdout.length);
    });
    child.stderr.on('data', (d: Buffer) => {
      if (stderr.length < MAX_OUTPUT) stderr += d.toString('utf8').slice(0, MAX_OUTPUT - stderr.length);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        command, allowed: true, stdout, stderr: `${stderr}${err.message}`,
        exitCode: null, timedOut, durationMs: Date.now() - started,
      });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        command, allowed: true,
        stdout: stdout.slice(0, MAX_OUTPUT),
        stderr: timedOut ? `${stderr}\n[Limite de ${timeoutMs / 1000}s excedido — processo finalizado.]` : stderr.slice(0, MAX_OUTPUT),
        exitCode: code,
        timedOut,
        durationMs: Date.now() - started,
      });
    });
  });
}
