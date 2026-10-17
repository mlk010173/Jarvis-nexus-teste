/**
 * JARVIS NEXUS - Memory Service (Persistent & Local)
 */

export interface MemoryItem {
  id: string;
  category: 'preference' | 'project' | 'knowledge' | 'document';
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  source?: string;
}

const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    category: 'preference',
    title: 'Dispositivo Preferencial',
    content: 'O usuário opera prioritariamente a partir de smartphone Android, exigindo botões ergonômicos e suporte a PWA.',
    tags: ['mobile', 'android', 'pwa'],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    source: 'Preferências Iniciais do Sistema'
  },
  {
    id: 'mem-2',
    category: 'knowledge',
    title: 'Diretriz de Bibliotecas Open-Source',
    content: 'Priorizar Magic UI, Astra UI, Shadcn/ui e Tailwind CSS para interfaces futuristas e responsivas.',
    tags: ['ui', 'magicui', 'shadcn', 'design'],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    source: 'Constituição do Projeto JARVIS'
  },
  {
    id: 'mem-3',
    category: 'project',
    title: 'Projeto Modelo: App To-Do List',
    content: 'Objetivo de criar um app de lista de tarefas moderno, responsivo para celular, com repositório base aberto e deploy no Termux.',
    tags: ['todo-list', 'projeto', 'android-termux'],
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5,
    source: 'Sessão do Superagente'
  }
];

export class MemoryService {
  private static storageKey = 'jarvis_nexus_memories';

  static getMemories(): MemoryItem[] {
    if (typeof window === 'undefined') return DEFAULT_MEMORIES;
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        localStorage.setItem(this.storageKey, JSON.stringify(DEFAULT_MEMORIES));
        return DEFAULT_MEMORIES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_MEMORIES;
    }
  }

  static saveMemory(item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'>): MemoryItem {
    const list = this.getMemories();
    const newItem: MemoryItem = {
      ...item,
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    list.unshift(newItem);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(list));
      } catch {
        // storage overflow or private mode
      }
    }
    return newItem;
  }

  static deleteMemory(id: string): boolean {
    const list = this.getMemories().filter(m => m.id !== id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(list));
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * Search memory items with keyword scoring
   */
  static searchMemories(query: string): { item: MemoryItem; score: number }[] {
    const memories = this.getMemories();
    if (!query.trim()) {
      return memories.map(item => ({ item, score: 1 }));
    }

    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

    return memories
      .map(item => {
        let score = 0;
        const textToSearch = `${item.title} ${item.content} ${item.tags.join(' ')}`.toLowerCase();

        for (const token of tokens) {
          if (item.title.toLowerCase().includes(token)) score += 3;
          if (item.tags.some(t => t.toLowerCase().includes(token))) score += 2;
          if (textToSearch.includes(token)) score += 1;
        }

        return { item, score };
      })
      .filter(res => res.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  static exportToJson(): string {
    const memories = this.getMemories();
    return JSON.stringify({
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      count: memories.length,
      memories
    }, null, 2);
  }

  static importFromJson(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      const incoming: MemoryItem[] = Array.isArray(parsed) ? parsed : parsed.memories;
      if (!Array.isArray(incoming)) {
        throw new Error('Formato de memórias inválido.');
      }
      const existing = this.getMemories();
      const existingIds = new Set(existing.map(m => m.id));
      const newItems = incoming.filter(m => m.title && m.content && !existingIds.has(m.id));
      const combined = [...newItems, ...existing];
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(combined));
      }
      return { success: true, count: newItems.length };
    } catch (e) {
      return { success: false, count: 0, error: e instanceof Error ? e.message : 'Erro na importação' };
    }
  }

  static clearAll(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}
