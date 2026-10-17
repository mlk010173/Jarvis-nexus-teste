/**
 * Entity Store — equivalente open-source das ENTITIES do Base44.
 *
 * Banco de dados JSON por arquivo, sem dependências:
 *   - cada entidade vira data/entities/<nome>.json
 *   - todo registro ganha id, created_date, updated_date (igual Base44)
 *   - list com filtros de igualdade + operadores gt/gte/lt/lce/in/like
 *   - create / update / delete com validação de nome (PascalCase-like)
 */

import { randomUUID } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.env.ENTITIES_DIR ?? 'data/entities');

export type EntityRecord = Record<string, unknown> & {
  id: string;
  created_date: string;
  updated_date: string;
};

export function isValidEntityName(name: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name);
}

function fileFor(name: string): string {
  return path.join(DATA_DIR, `${name}.json`);
}

function loadAll(name: string): EntityRecord[] {
  const f = fileFor(name);
  if (!existsSync(f)) return [];
  try {
    return JSON.parse(readFileSync(f, 'utf-8')) as EntityRecord[];
  } catch {
    return [];
  }
}

function persist(name: string, rows: EntityRecord[]): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(fileFor(name), JSON.stringify(rows, null, 2));
}

export function listEntities(name: string, query: Record<string, unknown> = {}, opts: { limit?: number; skip?: number; sort?: string } = {}): {
  rows: EntityRecord[];
  total: number;
} {
  if (!isValidEntityName(name)) throw new Error('Nome de entidade inválido (letras, números, _; até 64 chars).');
  let rows = loadAll(name);

  // filtros: igualdade por padrão + <field>__gte/__lte/__gt/__lt/__in/__like
  for (const [rawKey, expected] of Object.entries(query)) {
    const [field, op] = rawKey.split('__');
    rows = rows.filter((r) => {
      const v = r[field];
      switch (op) {
        case 'gte': return typeof v === 'number' && v >= Number(expected);
        case 'lte': return typeof v === 'number' && v <= Number(expected);
        case 'gt': return typeof v === 'number' && v > Number(expected);
        case 'lt': return typeof v === 'number' && v < Number(expected);
        case 'in': return Array.isArray(expected) && expected.includes(v as never);
        case 'like': return String(v ?? '').toLowerCase().includes(String(expected).toLowerCase());
        default: return v === expected;
      }
    });
  }

  const sortKey = opts.sort?.replace(/^-/, '');
  if (sortKey) {
    rows.sort((a, b) => {
      const av = (a[sortKey] ?? undefined) as string | number;
      const bv = (b[sortKey] ?? undefined) as string | number;
      const cmp = av === bv ? 0 : av === undefined ? 1 : bv === undefined ? -1 : av > bv ? 1 : -1;
      return opts.sort?.startsWith('-') ? -cmp : cmp;
    });
  }
  const total = rows.length;
  const skip = opts.skip ?? 0;
  return { rows: rows.slice(skip, skip + (opts.limit ?? 50)), total };
}

export function createRecord(name: string, data: Record<string, unknown>): EntityRecord {
  if (!isValidEntityName(name)) throw new Error('Nome de entidade inválido.');
  const rows = loadAll(name);
  const now = new Date().toISOString();
  const rec: EntityRecord = { ...data, id: randomUUID(), created_date: now, updated_date: now } as EntityRecord;
  rows.push(rec);
  persist(name, rows);
  return rec;
}

export function updateRecord(name: string, id: string, data: Record<string, unknown>): EntityRecord | null {
  const rows = loadAll(name);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const { id: _drop, created_date: _drop2, ...clean } = data as Record<string, unknown>;
  rows[idx] = { ...rows[idx], ...clean, updated_date: new Date().toISOString() };
  persist(name, rows);
  return rows[idx];
}

export function deleteRecord(name: string, id: string): boolean {
  const rows = loadAll(name);
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) return false;
  persist(name, next);
  return true;
}

export function listEntityNames(): string[] {
  if (!existsSync(DATA_DIR)) return [];
  // apenas nomes de arquivos válidos terminados em .json
  const fs = require('fs') as typeof import('fs');
  return fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
}
