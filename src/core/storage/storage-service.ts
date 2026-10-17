/**
 * JARVIS NEXUS - Unified Persistence & Backup Service
 */

import type { ChatMessage, ExecutionPlan, AutonomyLevel, AgentProfile } from '../orchestrator/types.ts';
import { MemoryService } from '../memory/memory-service.ts';
import type { MemoryItem } from '../memory/memory-service.ts';

export interface JarvisBackupBundle {
  schemaVersion: '1.0';
  app: 'JARVIS NEXUS';
  exportedAt: string;
  autonomyLevel: AutonomyLevel;
  theme: 'dark' | 'light' | 'system';
  soundEnabled: boolean;
  messages: ChatMessage[];
  currentPlan: ExecutionPlan | null;
  memories: MemoryItem[];
  customAgents?: AgentProfile[];
}

export class StorageService {
  private static KEYS = {
    MESSAGES: 'jarvis_chat_history',
    CURRENT_PLAN: 'jarvis_current_plan',
    AUTONOMY: 'jarvis_autonomy_level',
    THEME: 'jarvis_theme',
    SOUND: 'jarvis_sound_enabled',
    AGENTS: 'jarvis_custom_agents',    PROVIDER: 'jarvis.nexus.provider',
    MODEL: 'jarvis.nexus.model',
  };

  /**
   * Save chat messages to localStorage safely
   */
  static saveMessages(messages: ChatMessage[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.KEYS.MESSAGES, JSON.stringify(messages.slice(-50)));
    } catch (e) {
      console.warn('[Storage] Falha ao persistir mensagens:', e);
    }
  }

  /**
   * Load chat messages from localStorage
   */
  static loadMessages(fallback: ChatMessage[] = []): ChatMessage[] {
    if (typeof window === 'undefined') return fallback;
    try {
      const data = localStorage.getItem(this.KEYS.MESSAGES);
      if (!data) return fallback;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Save execution plan
   */
  static savePlan(plan: ExecutionPlan | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (plan) {
        localStorage.setItem(this.KEYS.CURRENT_PLAN, JSON.stringify(plan));
      } else {
        localStorage.removeItem(this.KEYS.CURRENT_PLAN);
      }
    } catch (e) {
      console.warn('[Storage] Falha ao persistir plano:', e);
    }
  }

  /**
   * Load execution plan
   */
  static loadPlan(): ExecutionPlan | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(this.KEYS.CURRENT_PLAN);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Save Autonomy Level
   */
  static saveAutonomy(level: AutonomyLevel): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.KEYS.AUTONOMY, String(level));
    } catch {
      // ignore
    }
  }

  /**
   * Load Autonomy Level
   */
  static loadAutonomy(fallback: AutonomyLevel = 4): AutonomyLevel {
    if (typeof window === 'undefined') return fallback;
    try {
      const val = Number(localStorage.getItem(this.KEYS.AUTONOMY));
      if ([1, 2, 3, 4, 5].includes(val)) return val as AutonomyLevel;
      return fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Save Theme preference
   */
  static saveTheme(theme: 'dark' | 'light' | 'system'): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.KEYS.THEME, theme);
    } catch {
      // ignore
    }
  }

  /**
   * Load Theme preference
   */
  static loadTheme(fallback: 'dark' | 'light' | 'system' = 'dark'): 'dark' | 'light' | 'system' {
    if (typeof window === 'undefined') return fallback;
    try {
      const val = localStorage.getItem(this.KEYS.THEME);
      if (val === 'dark' || val === 'light' || val === 'system') return val;
      return fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Save Sound FX preference
   */
  static saveSound(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.KEYS.SOUND, String(enabled));
    } catch {
      // ignore
    }
  }

  /**
   * Load Sound FX preference
   */
  static loadSound(fallback = true): boolean {
    if (typeof window === 'undefined') return fallback;
    try {
      const val = localStorage.getItem(this.KEYS.SOUND);
      if (val !== null) return val === 'true';
      return fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Generate complete backup bundle as JSON string
   */
  static saveProvider(providerId: string): void {
    try { localStorage.setItem(this.KEYS.PROVIDER, providerId); } catch { /* SSR/privado */ }
  }

  static loadProvider(fallback = 'local-heuristic'): string {
    if (typeof window === 'undefined') return fallback;
    try { return localStorage.getItem(this.KEYS.PROVIDER) || fallback; } catch { return fallback; }
  }

  static saveModel(model: string): void {
    try { localStorage.setItem(this.KEYS.MODEL, model); } catch { /* SSR/privado */ }
  }

  static loadModel(fallback = ''): string {
    if (typeof window === 'undefined') return fallback;
    try { return localStorage.getItem(this.KEYS.MODEL) || fallback; } catch { return fallback; }
  }

  static exportFullBackup(extraData: {
    autonomyLevel: AutonomyLevel;
    theme: 'dark' | 'light' | 'system';
    soundEnabled: boolean;
    messages: ChatMessage[];
    currentPlan: ExecutionPlan | null;
    customAgents?: AgentProfile[];
  }): string {
    const memories = MemoryService.getMemories();
    const bundle: JarvisBackupBundle = {
      schemaVersion: '1.0',
      app: 'JARVIS NEXUS',
      exportedAt: new Date().toISOString(),
      autonomyLevel: extraData.autonomyLevel,
      theme: extraData.theme,
      soundEnabled: extraData.soundEnabled,
      messages: extraData.messages,
      currentPlan: extraData.currentPlan,
      memories,
      customAgents: extraData.customAgents,
    };
    return JSON.stringify(bundle, null, 2);
  }

  /**
   * Import complete backup bundle and restore state safely
   */
  static importFullBackup(jsonString: string): {
    success: boolean;
    data?: JarvisBackupBundle;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(jsonString) as Partial<JarvisBackupBundle>;
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Arquivo JSON inválido ou corrompido.' };
      }

      // Check format
      if (parsed.app && parsed.app !== 'JARVIS NEXUS') {
        return { success: false, error: 'Este arquivo não pertence ao JARVIS NEXUS.' };
      }

      const bundle: JarvisBackupBundle = {
        schemaVersion: '1.0',
        app: 'JARVIS NEXUS',
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        autonomyLevel: ([1, 2, 3, 4, 5].includes(Number(parsed.autonomyLevel))
          ? Number(parsed.autonomyLevel)
          : 4) as AutonomyLevel,
        theme: parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
          ? parsed.theme
          : 'dark',
        soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        currentPlan: parsed.currentPlan || null,
        memories: Array.isArray(parsed.memories) ? parsed.memories : [],
        customAgents: Array.isArray(parsed.customAgents) ? parsed.customAgents : undefined,
      };

      // Persist loaded values
      if (typeof window !== 'undefined') {
        this.saveMessages(bundle.messages);
        this.savePlan(bundle.currentPlan);
        this.saveAutonomy(bundle.autonomyLevel);
        this.saveTheme(bundle.theme);
        this.saveSound(bundle.soundEnabled);
        if (bundle.memories.length > 0) {
          MemoryService.importFromJson(JSON.stringify(bundle.memories));
        }
      }

      return { success: true, data: bundle };
    } catch (err) {
      return {
        success: false,
        error: `Falha ao interpretar o arquivo JSON: ${(err as Error).message}`,
      };
    }
  }

  /**
   * Reset and clear all stored data
   */
  static clearAll(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.KEYS.MESSAGES);
      localStorage.removeItem(this.KEYS.CURRENT_PLAN);
      localStorage.removeItem(this.KEYS.AUTONOMY);
      localStorage.removeItem(this.KEYS.THEME);
      localStorage.removeItem(this.KEYS.SOUND);
      localStorage.removeItem(this.KEYS.AGENTS);
      MemoryService.clearAll();
    } catch {
      // ignore
    }
  }
}
