import React, { useState, useRef } from 'react';
import {
  Shield,
  Sliders,
  Volume2,
  Smartphone,
  Download,
  Upload,
  Trash2,
  Check,
  Info,
  Lock,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { AutonomyLevel } from '../core/orchestrator/types.ts';
import { StorageService, JarvisBackupBundle } from '../core/storage/storage-service.ts';
import { useToast } from '../components/Toast.tsx';
import { getApiBase, setApiBase, checkServerHealth, type HealthResult } from '../lib/api.ts';
import { Cloud, Wifi, WifiOff } from 'lucide-react';

interface SettingsViewProps {
  autonomyLevel: AutonomyLevel;
  onUpdateAutonomyLevel: (lvl: AutonomyLevel) => void;
  theme?: 'dark' | 'light' | 'system';
  onUpdateTheme?: (th: 'dark' | 'light' | 'system') => void;
  onRestoreBackup?: (bundle: JarvisBackupBundle) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  autonomyLevel,
  onUpdateAutonomyLevel,
  theme = 'dark',
  onUpdateTheme,
  onRestoreBackup,
}) => {
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [apiUrl, setApiUrlInput] = useState(getApiBase());
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [checking, setChecking] = useState(false);

  const testServer = async () => {
    setChecking(true);
    try {
      setHealth(await checkServerHealth(getApiBase()));
    } finally {
      setChecking(false);
    }
  };


  const autonomyLevelsInfo: { level: AutonomyLevel; title: string; desc: string }[] = [
    {
      level: 1,
      title: 'Nível 1 — Somente Responder',
      desc: 'O assistente apenas responde dúvidas textuais. Nenhuma ferramenta é executada.',
    },
    {
      level: 2,
      title: 'Nível 2 — Planejar e Sugerir',
      desc: 'Cria planos estruturados, mas toda e qualquer execução exige aprovação manual prévia.',
    },
    {
      level: 3,
      title: 'Nível 3 — Executar Ferramentas Locais',
      desc: 'Executa leituras, avaliações locais e memórias. Ações destrutivas continuam barradas.',
    },
    {
      level: 4,
      title: 'Nível 4 — Executar Fluxos Aprovados (Padrão)',
      desc: 'Executa subagentes em paralelo e fluxos de tarefas acordados. Pede autorização apenas para deleções.',
    },
    {
      level: 5,
      title: 'Nível 5 — Autonomia Total sob Guardrails',
      desc: 'Resolução contínua de objetivos dentro do orçamento de tokens, mantendo bloqueios de injeção e segurança.',
    },
  ];

  const handleReset = () => {
    if (confirm('Tem certeza que deseja resetar todas as configurações, planos e memórias locais?')) {
      StorageService.clearAll();
      showToast('Dados restaurados para os padrões de fábrica.', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const handleExportFullBackup = () => {
    try {
      const json = StorageService.exportFullBackup({
        autonomyLevel,
        theme,
        soundEnabled: true,
        messages: StorageService.loadMessages(),
        currentPlan: StorageService.loadPlan(),
      });

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jarvis-nexus-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('Backup completo exportado com sucesso!', 'success');
    } catch {
      showToast('Falha ao exportar backup.', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importFullBackup(content);
      if (res.success && res.data) {
        showToast('Backup importado com sucesso! Restaurando ambiente...', 'success');
        if (onRestoreBackup) {
          onRestoreBackup(res.data);
        } else {
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        showToast(res.error || 'Erro ao importar arquivo de backup.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Configurações & Segurança</h1>
        <p className="text-xs text-slate-400 mt-1">
          Ajuste as permissões de autonomia do Superagente, temas, backup e síntese vocal.
        </p>
      </div>

      {/* Theme Selection */}
      <div className="holo-card p-4 rounded-2xl space-y-3">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-cyan-400" />
          Aparência do Sistema
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onUpdateTheme && onUpdateTheme('dark')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all focus:ring-2 focus:ring-cyan-400 focus:outline-none ${
              theme === 'dark'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Modo Escuro Cyberpunk"
          >
            <Moon className="w-4 h-4" />
            <span className="text-xs">Escuro</span>
          </button>
          <button
            onClick={() => onUpdateTheme && onUpdateTheme('light')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all focus:ring-2 focus:ring-cyan-400 focus:outline-none ${
              theme === 'light'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Modo Claro Futurista"
          >
            <Sun className="w-4 h-4" />
            <span className="text-xs">Claro</span>
          </button>
          <button
            onClick={() => onUpdateTheme && onUpdateTheme('system')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all focus:ring-2 focus:ring-cyan-400 focus:outline-none ${
              theme === 'system'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Modo Automático do Sistema"
          >
            <Monitor className="w-4 h-4" />
            <span className="text-xs">Sistema</span>
          </button>
        </div>
      </div>

      {/* Autonomy Level Settings */}
      <div className="holo-card p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">Nível de Autonomia do Orquestrador</h2>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30">
            Nível {autonomyLevel}
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Determina o limite de ação autônoma e os pontos de parada para confirmação humana.
        </p>

        <div className="space-y-2 pt-2">
          {autonomyLevelsInfo.map((info) => (
            <div
              key={info.level}
              onClick={() => {
                onUpdateAutonomyLevel(info.level);
                showToast(`Autonomia configurada para Nível ${info.level}`, 'info');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onUpdateAutonomyLevel(info.level);
                  showToast(`Autonomia configurada para Nível ${info.level}`, 'info');
                }
              }}
              tabIndex={0}
              role="radio"
              aria-checked={autonomyLevel === info.level}
              aria-label={info.title}
              className={`p-3 rounded-xl border cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                autonomyLevel === info.level
                  ? 'bg-cyan-950/30 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    autonomyLevel === info.level ? 'text-cyan-300' : 'text-slate-300'
                  }`}
                >
                  {info.title}
                </span>
                {autonomyLevel === info.level && (
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{info.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Backup & Persistence */}
      <div className="holo-card p-4 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">Backup & Restauração Completa</h2>
        </div>
        <p className="text-xs text-slate-400">
          Exporte e importe todo o ecossistema (conversas, planos de execução, notas e preferências) em um arquivo JSON padronizado.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleExportFullBackup}
            className="w-full py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all focus:ring-2 focus:ring-cyan-400 focus:outline-none"
            aria-label="Exportar Backup Completo em formato JSON"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Backup (JSON)</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Arquivo de backup JSON"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all focus:ring-2 focus:ring-cyan-400 focus:outline-none"
            aria-label="Importar Backup a partir de arquivo JSON"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Importar Backup (JSON)</span>
          </button>
        </div>
      </div>

      {/* Mobile PWA & Android Guidance */}
      <div className="holo-card p-4 rounded-2xl space-y-3 border border-slate-800">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">Instalação no Android (PWA & Termux)</h2>
        </div>
        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            O JARVIS NEXUS foi projetado como uma PWA (Progressive Web App) otimizada para toque:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
            <li>No Chrome do Android, toque no menu de 3 pontinhos e escolha <strong className="text-cyan-300">"Instalar aplicativo"</strong> ou <strong className="text-cyan-300">"Adicionar à tela inicial"</strong>.</li>
            <li>O aplicativo funcionará em tela cheia com ícone próprio e suporte offline via Service Worker.</li>
            <li>Para executar modelos locais com <code className="text-cyan-400 font-mono">llama.cpp</code>, utilize o aplicativo gratuito Termux da F-Droid.</li>
          </ul>
        </div>
      </div>

      {/* Voice Tuning */}
      <div className="holo-card p-4 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">Síntese de Fala (Web Speech API)</h2>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Velocidade da Voz: {speechRate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.4"
              step="0.05"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
              aria-label="Ajustar velocidade da voz"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Tom da Voz: {speechPitch.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.05"
              value={speechPitch}
              onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
              aria-label="Ajustar tom da voz"
            />
          </div>
        </div>

        <button
          onClick={() => showToast('Preferências de voz atualizadas.', 'success')}
          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold focus:ring-2 focus:ring-cyan-400 focus:outline-none"
        >
          Salvar Preferências de Voz
        </button>
      </div>

      {/* Servidor Online ao Vivo */}
      <div className="holo-card p-4 rounded-2xl space-y-3 border border-cyan-800/40">
        <div className="flex items-center gap-2 text-cyan-400">
          <Cloud className="w-4 h-4" />
          <h2 className="text-sm font-bold">Servidor Online ao Vivo</h2>
          {health?.online ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <Wifi className="w-3 h-3" /> Online {health.latencyMs ? `· ${health.latencyMs}ms` : ''}
            </span>
          ) : health ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-slate-400">
          Endereço do servidor JARVIS rodando na nuvem (Render, Koyeb, Fly…). Vazio = modo local
          (mesma origem). O chat, provedores, conectores e navegador usam este servidor ao vivo.
        </p>
        <input
          type="url"
          value={apiUrl}
          onChange={(e) => setApiUrlInput(e.target.value)}
          placeholder="https://jarvis-nexus.onrender.com"
          className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              setApiBase(apiUrl);
              showToast(apiUrl ? 'Servidor ao vivo configurado!' : 'Voltou ao modo local.', 'success');
            }}
            className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold focus:ring-2 focus:ring-cyan-400 focus:outline-none"
          >
            Salvar Servidor
          </button>
          <button
            onClick={testServer}
            disabled={checking}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold disabled:opacity-50 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
          >
            {checking ? 'Testando…' : 'Testar Conexão'}
          </button>
        </div>
        {health && !health.online && health.error && (
          <p className="text-[10px] text-rose-400">{health.error}</p>
        )}
      </div>

      {/* Danger Zone */}
      <div className="holo-card p-4 rounded-2xl space-y-3 border border-rose-900/40">
        <div className="flex items-center gap-2 text-rose-400">
          <Lock className="w-4 h-4" />
          <h2 className="text-sm font-bold">Privacidade & Limpeza</h2>
        </div>
        <p className="text-[11px] text-slate-400">
          Nenhuma credencial ou memória é enviada para treinamento de terceiros sem permissão.
        </p>

        <button
          onClick={handleReset}
          className="w-full py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold flex items-center justify-center gap-2 transition-all focus:ring-2 focus:ring-rose-400 focus:outline-none"
          aria-label="Restaurar padrões de fábrica e apagar memórias"
        >
          <Trash2 className="w-4 h-4" />
          <span>Restaurar Padrões de Fábrica (Limpar Tudo)</span>
        </button>
      </div>
    </div>
  );
};
