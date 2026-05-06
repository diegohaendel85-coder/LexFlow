import React, { useState, useRef, useEffect } from 'react';
import { 
  Scale, 
  Search, 
  BarChart3, 
  ShieldAlert, 
  PenTool, 
  GitMerge, 
  Copy, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  X, 
  Zap 
} from 'lucide-react';

/**
 * LÓGICA DE RECUPERAÇÃO DA CHAVE DE API (Vite + Vercel)
 * O uso de import.meta.env é obrigatório para projetos Vite.
 */
const getApiKey = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_GEMINI_API_KEY || "";
    }
  } catch (e) {
    console.warn("Ambiente meta não detectado.");
  }
  return ""; 
};

// --- REGRAS DE OURO (Prompt Engineering de Elite) ---
const GOLDEN_RULES = `
REGRAS ABSOLUTAS E INQUEBRÁVEIS PARA ESTA RESPOSTA:
1. Em resumos e análises, não deixe nenhum assunto de fora. Seja exaustivo e meticuloso.
2. Busque sempre fontes confiáveis. Dê preferência absoluta a livros de doutrina e trabalhos científicos consolidados.
3. SEMPRE coloque a fonte no formato ABNT NBR 6023.
4. IMPORTANTE: Não use marcações markdown como \`\`\`json. Retorne estritamente o objeto ou texto pedido.
`;

// --- COMPONENTES DA UI ---

const Logo = ({ collapsed }) => (
  <div className={`flex items-center gap-3 transition-all duration-300 ${collapsed ? 'justify-center' : 'justify-start'}`}>
    <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#080B14] shadow-[0_0_15px_rgba(197,160,89,0.3)] shrink-0 border border-[#C5A059]/20">
      <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C5A059"/>
            <stop offset="1" stopColor="#9A7B4F"/>
          </linearGradient>
        </defs>
        <path d="M20 8 V32 M15 32 H25" stroke="url(#goldGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 14 Q 20 10 30 14" stroke="url(#goldGrad)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M10 14 L5 25 H15 L10 14 Z" stroke="url(#goldGrad)" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M30 14 L25 25 H35 L30 14 Z" stroke="url(#goldGrad)" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M4 28 C 12 36, 22 24, 34 10" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M29 9 L35 9 L35 15" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
    {!collapsed && (
      <span className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
        LEX<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A059] to-[#9A7B4F]">FLOW</span>
      </span>
    )}
  </div>
);

const ModalErro = ({ erro, onClose }) => {
  if (!erro) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg p-6 border rounded-2xl bg-[#0C121E] border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)] animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-semibold text-white">Anomalia Detectada</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed mb-6 font-mono break-words bg-black/30 p-4 rounded-lg">
          {typeof erro === 'string' ? erro : JSON.stringify(erro)}
        </p>
        <button onClick={onClose} className="w-full py-3 text-sm font-medium text-white transition-colors bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20">
          Reconhecer e Fechar
        </button>
      </div>
    </div>
  );
};

// --- APLICAÇÃO PRINCIPAL ---

export default function App() {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('analisar');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);

  const modules = [
    { id: 'analisar', icon: Search, label: 'Pesquisa Jurisprudencial' },
    { id: 'jurimetria', icon: BarChart3, label: 'Jurimetria' },
    { id: 'auditoria', icon: ShieldAlert, label: 'Auditoria & Compliance' },
    { id: 'redacao', icon: PenTool, label: 'Redação Estruturada' },
    { id: 'cotejo', icon: GitMerge, label: 'Cotejo Analítico' },
  ];

  const callGeminiAPI = async (moduleType, promptText) => {
    const key = getApiKey();
    if (!key) {
      setError("ERRO DE CONFIGURAÇÃO: VITE_GEMINI_API_KEY não encontrada. Verifique seu arquivo .env ou as variáveis no painel da Vercel.");
      return;
    }

    setLoading(true);
    setError(null);
    
    /**
     * ATUALIZAÇÃO PARA GEMINI 2.5 FLASH
     * A família 1.5 foi desativada em maio de 2026.
     */
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    let fullPrompt = `${GOLDEN_RULES}\n\nTEXTO BASE PARA PROCESSAMENTO:\n"${promptText}"\n\n`;
    
    if (moduleType === 'redacao') {
      fullPrompt += "Atue como um jurista de elite. Redija uma minuta técnica exaustiva e meticulosa. Retorne apenas o texto final.";
    } else {
      fullPrompt += "Retorne estritamente um JSON válido contendo análise técnica exaustiva, probabilidade de êxito e jurisprudência fundamentada.";
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(`Google API (${response.status}): ${errJson.error?.message || "Recurso não encontrado ou desativado."}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (moduleType === 'redacao') {
        setResults(prev => ({ ...prev, [moduleType]: text.replace(/```(markdown|text)?/g, '').trim() }));
      } else {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("A IA falhou ao estruturar os dados. Tente novamente.");
        const jsonContent = text.substring(start, end + 1);
        setResults(prev => ({ ...prev, [moduleType]: JSON.parse(jsonContent) }));
      }
    } catch (err) {
      setError(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (!inputText.trim()) {
      setError("Por favor, insira os dados no workspace para processar.");
      return;
    }
    callGeminiAPI(activeTab, inputText);
  };

  const renderResult = () => {
    const data = results[activeTab];
    if (!data) return (
      <div className="flex flex-col items-center justify-center h-full opacity-20 text-center p-8 select-none">
        <Zap className="w-20 h-20 mb-4" strokeWidth={1} />
        <p className="text-lg">Aguardando entrada de dados no Workspace...</p>
      </div>
    );

    if (activeTab === 'redacao') {
      return (
        <div className="p-16 bg-white text-black font-serif min-h-full whitespace-pre-wrap text-justify shadow-2xl animate-in fade-in duration-700">
          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        </div>
      );
    }

    // Prevenção de erro: Garantir que analise_preditiva seja renderizável
    const analise = typeof data.analise_preditiva === 'object' 
      ? JSON.stringify(data.analise_preditiva, null, 2) 
      : (data.analise_preditiva || JSON.stringify(data, null, 2));

    return (
      <div className="p-10 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <h2 className="text-2xl font-light text-white">Análise de IA Especializada</h2>
          <div className="px-4 py-2 bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-full text-[#C5A059] font-bold">
            {data.probabilidade_exito || 0}% de Êxito
          </div>
        </div>
        <div className="p-6 bg-[#0C121E] rounded-2xl border border-white/5 shadow-inner">
          <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-wrap italic font-light">
            {analise}
          </p>
        </div>
        {data.jurisprudencia && Array.isArray(data.jurisprudencia) && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Fundamentação Jurisprudencial</h3>
            {data.jurisprudencia.map((j, i) => (
              <div key={i} className="p-5 bg-black/20 rounded-xl border border-white/5">
                <p className="text-sm text-[#C5A059] mb-2 font-bold">{j.tribunal}</p>
                <p className="text-gray-400 text-sm mb-3">"{j.ementa}"</p>
                <p className="text-[10px] text-gray-600 font-mono">{j.abnt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#080B14] text-gray-100 font-sans overflow-hidden">
      <ModalErro erro={error} onClose={() => setError(null)} />
      
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-[#0C121E] border-r border-white/5 flex flex-col transition-all duration-300 shrink-0 z-20`}>
        <div className="p-6 h-20 flex items-center border-b border-white/5"><Logo collapsed={isSidebarCollapsed} /></div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {modules.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setActiveTab(m.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${activeTab === m.id ? 'bg-white/10 text-white border-l-2 border-[#C5A059] shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
                <Icon className={`w-5 h-5 shrink-0 ${activeTab === m.id ? 'text-[#C5A059]' : ''}`} /> 
                {!isSidebarCollapsed && <span className="text-sm font-medium tracking-wide">{m.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-20 px-8 flex items-center border-b border-white/5 bg-[#080B14]/80 backdrop-blur-md shrink-0 uppercase tracking-[0.2em] text-white/60 text-xs font-bold">
          {modules.find(m => m.id === activeTab)?.label || "Módulo"}
        </header>

        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="w-1/2 flex flex-col border-r border-white/5 bg-[#0A0E17]">
            <div className="flex-1 p-6 flex flex-col relative min-h-0">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Workspace: Insira os fatos, ementas ou decisões para processamento exaustivo..."
                className="flex-1 m-6 p-8 bg-black/30 border border-white/5 rounded-2xl text-lg font-light leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#C5A059]/30 transition-all custom-scrollbar placeholder:opacity-20"
              />
            </div>
            <div className="p-6 border-t border-white/5 bg-[#0C121E]">
              <button 
                onClick={handleAction} 
                disabled={loading} 
                className="w-full py-4 bg-gradient-to-r from-[#C5A059] to-[#9A7B4F] text-[#080B14] font-bold rounded-xl shadow-xl hover:shadow-[#C5A059]/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-[#080B14]/30 border-t-[#080B14] rounded-full animate-spin" />
                    <span>PROCESSANDO REQUISIÇÃO...</span>
                  </div>
                ) : `EXECUTAR ${(activeTab || "").toUpperCase()}`}
              </button>
            </div>
          </div>

          <div className="w-1/2 flex flex-col bg-[#080B14] overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.05),transparent)]">
            {loading ? (
              <div className="p-12 space-y-6 animate-pulse">
                <div className="h-8 bg-white/5 rounded w-1/3"></div>
                <div className="h-32 bg-white/5 rounded w-full"></div>
                <div className="h-24 bg-white/5 rounded w-full"></div>
              </div>
            ) : renderResult()}
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(197,160,89,0.2); }
      `}} />
    </div>
  );
}