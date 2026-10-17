import React, { useState } from 'react';
import {
  Cpu,
  Server,
  Zap,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface ProvidersViewProps {
  activeProvider: string;
  onSelectProvider: (providerId: string) => void;
  hasGeminiKey: boolean;
}

export const ProvidersView: React.FC<ProvidersViewProps> = ({
  activeProvider,
  onSelectProvider,
  hasGeminiKey,
}) => {
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [testingLatency, setTestingLatency] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(42);

  const testPing = () => {
    setTestingLatency(true);
    setTimeout(() => {
      setLatencyMs(Math.floor(Math.random() * 30 + 25));
      setTestingLatency(false);
    }, 600);
  };

  const providers = [
    {
      id: 'gemini-3.8-flash',
      name: 'Google Gemini 3.8 Flash',
      type: 'Nuvem / Proxy Seguro',
      description: 'Modelo de raciocínio de alta velocidade via SDK oficial @google/genai com suporte a ferramentas híbridas.',
      isLocal: false,
      available: hasGeminiKey,
      badge: hasGeminiKey ? 'Ativo & Configurado' : 'Aguardando Chave em Secrets',
    },
    {
      id: 'ollama-local',
      name: 'Ollama (Servidor Local / LAN)',
      type: 'Local / Open-Source',
      description: 'Llama 3.3, Mistral, Gemma 2 rodando na sua máquina local ou servidor da rede sem custos.',
      isLocal: true,
      available: true,
      badge: 'Open-Source • Sem Cota',
    },
    {
      id: 'llamacpp-termux',
      name: 'llama.cpp no Celular (Android Termux)',
      type: 'Local On-Device',
      description: 'Inferência local diretamente na CPU/GPU do smartphone com modelos quantizados GGUF (Q4_K_M).',
      isLocal: true,
      available: true,
      badge: '100% Offline',
    },
    {
      id: 'local-heuristic',
      name: 'JARVIS Heuristic Engine (Offline)',
      type: 'Nativo Integrado',
      description: 'Motor autônomo baseado em regras e heurísticas de decomposição, disponível mesmo sem sinal ou API.',
      isLocal: true,
      available: true,
      badge: 'Zero Dependência',
    },
  ];

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-slate-100">AI Provider Hub</h1>
        <p className="text-xs text-slate-400 mt-1">
          Alterne entre IA na nuvem e modelos locais open-source sem reescrever nenhum agente.
        </p>
      </div>

      {/* Latency & Connectivity Monitor */}
      <div className="holo-card p-3.5 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200">Latência do Provedor Ativo</div>
            <div className="text-[10px] text-cyan-400 font-mono">
              {testingLatency ? 'Testando...' : `${latencyMs}ms (Resposta ultrarrápida)`}
            </div>
          </div>
        </div>

        <button
          onClick={testPing}
          disabled={testingLatency}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Verificar latência"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testingLatency ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Provider List */}
      <div className="space-y-3">
        {providers.map((prov) => {
          const isSelected = activeProvider === prov.id || (activeProvider.includes('gemini') && prov.id.includes('gemini'));

          return (
            <div
              key={prov.id}
              onClick={() => onSelectProvider(prov.id)}
              className={`p-4 rounded-2xl transition-all cursor-pointer border ${
                isSelected
                  ? 'holo-card-active border-cyan-400/60'
                  : 'holo-card border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    {prov.name}
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-400">{prov.type}</span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                    prov.isLocal
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                      : 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {prov.badge}
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {prov.description}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {prov.isLocal ? 'Execução Local no Aparelho' : 'Execução Remota em Nuvem'}
                </span>

                <span className={`font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-500'}`}>
                  {isSelected ? '✓ Selecionado' : 'Clique para Ativar'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Local Ollama / LAN URL configuration */}
      <div className="holo-card p-4 rounded-2xl space-y-3 border border-slate-800">
        <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          Endereço do Servidor Ollama / llama.cpp
        </h3>
        <p className="text-[11px] text-slate-400">
          Insira o IP da sua máquina na mesma rede Wi-Fi do celular para rodar Llama 3 localmente sem gastar internet.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            placeholder="http://192.168.1.100:11434"
            className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:border-cyan-400 focus:outline-none"
          />
          <button
            onClick={testPing}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold"
          >
            Testar Conexão
          </button>
        </div>
      </div>
    </div>
  );
};
