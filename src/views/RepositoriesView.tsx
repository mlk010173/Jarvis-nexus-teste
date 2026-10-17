import React, { useState, useMemo } from 'react';
import {
  FolderGit2,
  Search,
  Star,
  ExternalLink,
  Code2,
  Sparkles,
  Check,
  Tag,
  Layers,
} from 'lucide-react';
import { CURATED_REPOSITORIES } from '../core/tools/tools-registry.ts';
import { useDebounce } from '../hooks/useDebounce.ts';

interface RepositoriesViewProps {
  onAdoptRepo: (repoName: string, category: string) => void;
}

export const RepositoriesView: React.FC<RepositoriesViewProps> = ({ onAdoptRepo }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [adoptedRepoId, setAdoptedRepoId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 250);
  const categories = ['Todos', 'UI / Frontend', 'Backend', 'Mobile', 'Local AI', 'Multi-Agent'];

  const filteredRepos = useMemo(() => {
    return CURATED_REPOSITORIES.filter((repo) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        repo.name.toLowerCase().includes(q) ||
        repo.description.toLowerCase().includes(q) ||
        repo.tags.some((t) => t.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'Todos' ||
        repo.category.toLowerCase().includes(selectedCategory.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [debouncedSearch, selectedCategory]);

  const handleAdopt = (repo: typeof CURATED_REPOSITORIES[0]) => {
    onAdoptRepo(repo.name, repo.category);
    setAdoptedRepoId(repo.id);
    setTimeout(() => setAdoptedRepoId(null), 2500);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Repositórios Open-Source</h1>
        <p className="text-xs text-slate-400 mt-1">
          Busca, análise e integração com projetos open-source e bibliotecas de UI recomendadas.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative flex items-center bg-slate-900 rounded-2xl border border-slate-800 focus-within:border-cyan-400 p-1.5 transition-all">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar repositórios (ex: magicui, flutter, supabase)..."
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-white mr-2"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Filter Categories */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Repositories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredRepos.map((repo) => (
          <div
            key={repo.id}
            className="holo-card p-4 rounded-2xl flex flex-col justify-between hover:holo-card-active transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{repo.name}</span>
                  </h3>
                  <span className="text-[10px] text-cyan-400/90 font-mono">{repo.category}</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>{repo.stars}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                {repo.description}
              </p>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1 mt-3">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">
                  Licença: {repo.license}
                </span>
                {repo.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={() => handleAdopt(repo)}
                className="flex-1 py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                {adoptedRepoId === repo.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Adotado no Projeto!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Adotar no Projeto</span>
                  </>
                )}
              </button>

              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Abrir no GitHub"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
