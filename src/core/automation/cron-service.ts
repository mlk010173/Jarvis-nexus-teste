/**
 * Cron interno do JARVIS — agendamentos que acordam o agente (free, open-source).
 *
 * node-cron roda dentro do próprio servidor: qualquer rotina ("todo dia 8h,
 * resuma meus e-mails") vira um job que chama o pipeline de wake.
 * Registry em memória; o agendamento é recriado a partir da lista em
 * POST /api/cron (o n8n externo pode re-registrar após restart).
 */

export interface CronJob {
  id: string;
  schedule: string;
  message: string;
  source: string;
  createdAt: number;
  lastRunAt?: number;
  lastResult?: string;
  runs: number;
}

const jobs = new Map<string, CronJob>();
const timers = new Map<string, () => void>(); // cancel callbacks

export function isValidCron(schedule: string): boolean {
  if (typeof schedule !== 'string' || schedule.trim().length === 0) return false;
  // validação real delegada ao node-cron quando disponível; fallback: 5-6 campos
  const fields = schedule.trim().split(/\s+/).length;
  return fields === 5 || fields === 6;
}

export interface Runner {
  (message: string, source: string): Promise<string>;
}

export async function scheduleJob(
  id: string,
  schedule: string,
  message: string,
  runner: Runner,
  source = 'cron',
): Promise<CronJob> {
  if (!isValidCron(schedule)) {
    throw new Error('Expressão cron inválida (use 5 campos: min hora dia mês semana).');
  }
  if (!message?.trim()) {
    throw new Error('Mensagem do agendamento é obrigatória.');
  }
  cancelJob(id);

  const job: CronJob = { id, schedule, message, source, createdAt: Date.now(), runs: 0 };
  jobs.set(id, job);

  try {
    const cron = (await import('node-cron')) as unknown as {
      schedule: (expr: string, fn: () => void) => { stop: () => void };
    };
    const t = cron.schedule(schedule, () => {
      job.runs += 1;
      job.lastRunAt = Date.now();
      runner(message, source)
        .then((result) => {
          job.lastResult = result?.slice(0, 500) ?? '';
        })
        .catch((err) => {
          job.lastResult = `erro: ${err instanceof Error ? err.message : String(err)}`;
        });
    });
    timers.set(id, () => t.stop());
  } catch {
    // node-cron ausente: job fica registrado mas não dispara (honesto na listagem)
    job.lastResult = 'agendador node-cron indisponível neste runtime';
  }
  return job;
}

export function cancelJob(id: string): boolean {
  const stop = timers.get(id);
  if (stop) {
    try {
      stop();
    } catch {
      /* já parado */
    }
    timers.delete(id);
  }
  return jobs.delete(id);
}

export function listJobs(): CronJob[] {
  return [...jobs.values()].map((j) => ({ ...j }));
}
