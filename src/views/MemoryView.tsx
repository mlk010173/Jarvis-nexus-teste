import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Plus,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Tag,
  Check,
  X,
} from 'lucide-react';
import { MemoryService, MemoryItem } from '../core/memory/memory-service.ts';
import { useDebounce } from '../hooks/useDebounce.ts';
import { useToast } from '../components/Toast.tsx';

export const MemoryView: React.FC = () => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'preference' | 'project' | 'knowledge' | 'document'>('knowledge');
  const [tagsStr, setTagsStr] = useState('');

  const { showToast } = useToast();
  const debouncedSearch = useDebounce(searchQuery, 250);

  const loadMemories = () => {
    if (!debouncedSearch.trim()) {
      setMemories(MemoryService.getMemories());
    } else {
      const results = MemoryService.searchMemories(debouncedSearch);
      setMemories(results.map((r) => r.item));
    }
  };

  useEffect(() => {
    loadMemories();
  }, [debouncedSearch]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    MemoryService.saveMemory({
      title,
      content,
      category,
      tags,
      source: 'Entrada Manual do Usuário',
    });

    setTitle('');
    setContent('');
    setTagsStr('');
    setIsAddModalOpen(false);
    loadMemories();
    showToast('Memória gravada com sucesso!', 'success');
  };

  const handleDelete = (id: string) => {
    MemoryService.deleteMemory(id);
    loadMemories();
    showToast('Memória removida.', 'info');
  };

  const handleExport = () => {
    const json = MemoryService.exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-memory-backup-${Date.now()}.json`;
    a.click();
    showToast('Backup de memórias exportado com sucesso.', 'success');
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Memória & Conhecimento</h1>
          <p className="text-xs text-slate-400 mt-1">
            Base de conhecimento persistente, documentos e preferências do JARVIS.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/30 transition-all focus:ring-2 focus:ring-cyan-400 focus:outline-none"
          aria-label="Adicionar nova nota de memória"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Nota</span>
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative flex items-center bg-slate-900 rounded-2xl border border-slate-800 focus-within:border-cyan-400 p-1.5 transition-all">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar memórias por palavra-chave ou tag..."
            className="flex-1 bg-transparent px-3 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleExport}
          title="Exportar JSON"
          className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Memories List */}
      <div className="space-y-2.5">
        {memories.length === 0 ? (
          <div className="holo-card p-6 rounded-2xl text-center text-slate-400 text-xs">
            Nenhuma memória encontrada para esta busca.
          </div>
        ) : (
          memories.map((mem) => (
            <div
              key={mem.id}
              className="holo-card p-3.5 rounded-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">{mem.title}</h3>
                    <span className="text-[10px] text-cyan-400 font-mono uppercase">
                      {mem.category} • {new Date(mem.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(mem.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remover da memória"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">
                  {mem.content}
                </p>
              </div>

              {mem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-slate-800/80">
                  {mem.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <form
            onSubmit={handleAdd}
            className="w-full max-w-lg holo-card rounded-3xl p-5 border border-cyan-500/40 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Adicionar Conhecimento ou Preferência
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Preferência de framework, API key local..."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                >
                  <option value="knowledge">Conhecimento Geral</option>
                  <option value="preference">Preferência do Usuário</option>
                  <option value="project">Projeto Específico</option>
                  <option value="document">Documento</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Conteúdo</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Descreva a informação ou instrução a ser lembrada..."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  placeholder="ex: android, termux, magicui, react"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Memória</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
