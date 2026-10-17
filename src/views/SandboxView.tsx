import React, { useState } from 'react';
import {
  Smartphone,
  Maximize2,
  RefreshCw,
  Code2,
  Play,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

const SAMPLE_APPS = [
  {
    id: 'todo-app',
    name: 'App To-Do List (Mobile)',
    code: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #030712; color: #f8fafc; font-family: sans-serif; }
  </style>
</head>
<body class="p-4 flex flex-col min-h-screen">
  <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
    <h1 class="text-lg font-bold text-cyan-400">Tarefas do Dia</h1>
    <span id="counter" class="text-xs font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40">0 concluídas</span>
  </div>

  <div class="flex gap-2 mb-4">
    <input id="input" type="text" placeholder="Nova tarefa..." class="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400">
    <button onclick="addTask()" class="px-3 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-cyan-400">Adicionar</button>
  </div>

  <div id="list" class="space-y-2 flex-1"></div>

  <script>
    let tasks = [
      { id: 1, text: 'Revisar arquitetura do JARVIS', done: true },
      { id: 2, text: 'Configurar servidores MCP', done: true },
      { id: 3, text: 'Testar no celular Android com Termux', done: false }
    ];

    function render() {
      const list = document.getElementById('list');
      list.innerHTML = '';
      let doneCount = 0;

      tasks.forEach(t => {
        if (t.done) doneCount++;
        const div = document.createElement('div');
        div.className = 'p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer';
        div.onclick = () => { t.done = !t.done; render(); };
        div.innerHTML = \`
          <div class="flex items-center gap-2">
            <span class="\${t.done ? 'text-cyan-400 font-bold' : 'text-slate-600'}">✓</span>
            <span class="\${t.done ? 'line-through text-slate-500' : 'text-slate-200'} text-xs font-medium">\${t.text}</span>
          </div>
          <button onclick="event.stopPropagation(); removeTask(\${t.id})" class="text-rose-400 text-xs hover:underline">✕</button>
        \`;
        list.appendChild(div);
      });

      document.getElementById('counter').innerText = doneCount + ' concluídas';
    }

    function addTask() {
      const inp = document.getElementById('input');
      if (!inp.value.trim()) return;
      tasks.push({ id: Date.now(), text: inp.value.trim(), done: false });
      inp.value = '';
      render();
    }

    function removeTask(id) {
      tasks = tasks.filter(t => t.id !== id);
      render();
    }

    render();
  </script>
</body>
</html>`,
  },
  {
    id: 'calculator-app',
    name: 'Calculadora Quântica Cyber',
    code: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white p-4 flex flex-col items-center justify-center min-h-screen">
  <div class="w-full max-w-xs p-4 rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-xl">
    <div id="display" class="w-full bg-slate-950 p-3 rounded-2xl text-right font-mono text-xl text-cyan-300 mb-4 border border-slate-800 h-12 flex items-center justify-end">0</div>
    <div class="grid grid-cols-4 gap-2 text-xs font-bold font-mono">
      <button onclick="clearDisplay()" class="p-3 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-800/40">C</button>
      <button onclick="press('/')" class="p-3 rounded-xl bg-slate-800 text-cyan-400">/</button>
      <button onclick="press('*')" class="p-3 rounded-xl bg-slate-800 text-cyan-400">*</button>
      <button onclick="press('-')" class="p-3 rounded-xl bg-slate-800 text-cyan-400">-</button>
      <button onclick="press('7')" class="p-3 rounded-xl bg-slate-950 text-slate-200">7</button>
      <button onclick="press('8')" class="p-3 rounded-xl bg-slate-950 text-slate-200">8</button>
      <button onclick="press('9')" class="p-3 rounded-xl bg-slate-950 text-slate-200">9</button>
      <button onclick="press('+')" class="p-3 rounded-xl bg-slate-800 text-cyan-400">+</button>
      <button onclick="press('4')" class="p-3 rounded-xl bg-slate-950 text-slate-200">4</button>
      <button onclick="press('5')" class="p-3 rounded-xl bg-slate-950 text-slate-200">5</button>
      <button onclick="press('6')" class="p-3 rounded-xl bg-slate-950 text-slate-200">6</button>
      <button onclick="calc()" class="row-span-2 p-3 rounded-xl bg-cyan-500 text-slate-950 font-extrabold flex items-center justify-center">=</button>
      <button onclick="press('1')" class="p-3 rounded-xl bg-slate-950 text-slate-200">1</button>
      <button onclick="press('2')" class="p-3 rounded-xl bg-slate-950 text-slate-200">2</button>
      <button onclick="press('3')" class="p-3 rounded-xl bg-slate-950 text-slate-200">3</button>
      <button onclick="press('0')" class="col-span-2 p-3 rounded-xl bg-slate-950 text-slate-200">0</button>
      <button onclick="press('.')" class="p-3 rounded-xl bg-slate-950 text-slate-200">.</button>
    </div>
  </div>
  <script>
    let cur = '';
    function press(v) { cur += v; document.getElementById('display').innerText = cur; }
    function clearDisplay() { cur = ''; document.getElementById('display').innerText = '0'; }
    function calc() {
      try {
        cur = String(eval(cur));
        document.getElementById('display').innerText = cur;
      } catch {
        document.getElementById('display').innerText = 'Erro';
        cur = '';
      }
    }
  </script>
</body>
</html>`,
  },
];

export const SandboxView: React.FC = () => {
  const [activeApp, setActiveApp] = useState(SAMPLE_APPS[0]);
  const [customCode, setCustomCode] = useState(SAMPLE_APPS[0].code);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [key, setKey] = useState(0);

  const handleSelectApp = (app: typeof SAMPLE_APPS[0]) => {
    setActiveApp(app);
    setCustomCode(app.code);
    setKey((prev) => prev + 1);
  };

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4 pb-24">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-slate-100">Sandbox Mobile / Visual Runner</h1>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'preview' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Visualização
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'code' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Código
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Execute e teste interativamente no celular aplicativos e interfaces gerados pelos agentes.
        </p>
      </div>

      {/* App Selector Pills */}
      <div className="flex gap-2">
        {SAMPLE_APPS.map((app) => (
          <button
            key={app.id}
            onClick={() => handleSelectApp(app)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeApp.id === app.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            {app.name}
          </button>
        ))}
      </div>

      {/* Interactive Mobile Device Frame */}
      {activeTab === 'preview' ? (
        <div className="flex flex-col items-center">
          <div className="w-full max-w-sm rounded-[32px] border-4 border-slate-800 bg-slate-950 p-2 shadow-2xl relative overflow-hidden">
            {/* Mobile Notch Bar */}
            <div className="w-full h-5 flex items-center justify-between px-4 mb-1 text-[10px] text-slate-400 font-mono select-none">
              <span>09:41</span>
              <div className="w-16 h-3 bg-slate-900 rounded-full mx-auto" />
              <span>5G 100%</span>
            </div>

            {/* Sandboxed iframe */}
            <div className="w-full h-[460px] rounded-[24px] overflow-hidden bg-slate-950 relative border border-slate-800">
              <iframe
                key={key}
                title="Sandbox Mobile Runner"
                srcDoc={customCode}
                sandbox="allow-scripts"
                className="w-full h-full border-0"
              />
            </div>

            {/* Mobile Home Pill Indicator */}
            <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-2 mb-1" />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recarregar App</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="holo-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-cyan-400">HTML / JavaScript Sandboxed</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(customCode);
              }}
              className="hover:text-cyan-300"
            >
              Copiar Código
            </button>
          </div>
          <textarea
            rows={14}
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 focus:border-cyan-400 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
};
