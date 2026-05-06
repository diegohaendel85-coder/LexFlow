import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Zap,
  Maximize2,
  Trash2
} from 'lucide-react';

// --- PROTOCOLO DE SEGURANÇA: INJEÇÃO DE CHAVE ---
const getApiKey = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_GEMINI_API_KEY || "";
    }
  } catch (e) {
    return "";
  }
  return "";
};

const MODEL_ID = "gemini-2.5-flash"; 

const GOLDEN_RULES = `
REGRAS ABSOLUTAS E INQUEBRÁVEIS (ORDENAMENTO JURÍDICO BRASILEIRO):
1. ESTRUTURA FORMAL: Toda peça deve seguir a ordem lógica do CPC/2015 ou CPP: Endereçamento, Qualificação, Fatos, Direito (Doutrina/Jurisprudência) e Pedidos/Requerimentos.
2. EXAUSTIVIDADE TÉCNICA: Não omitir teses subsidiárias, precedentes obrigatórios (Art. 927 CPC) ou prazos decadenciais/prescricionais.
3. LINGUAGEM: Utilizar português culto, técnico-jurídico, evitando juridiquês arcaico mas mantendo a polidez processual.
4. CITAÇÕES (ABNT): Citar fontes conforme NBR 6023:2018. Ex: SOBRENOME, Nome. Título do livro. Edição. Cidade: Editora, Ano.
5. OBJETIVIDADE: Retornar estritamente o texto processual ou o JSON solicitado, sem notas explicativas externas.
`;

// --- COMPONENTES AUXILIARES ---

const Logo = ({ collapsed }) => (
  <div className={`flex items-center gap-3 transition-all duration-300 ${collapsed ? 'justify-center' : 'justify-start'}`}>
    <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#080B14] shadow-[0_0_15px_rgba(197,160,89,0.3)] shrink-0 border border-[#C5A059]/20">
      <Scale className="text-[#C5A059] w-6 h-6" strokeWidth={1.5} />
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md p-6 border rounded-2xl bg-[#0C121E] border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.15)]">
        <div className="flex items-center gap-3 text-red-400 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-lg font-semibold text-white tracking-tight">Anomalia no Sistema</h3>
        </div>
        <div className="p-4 bg-black/40 rounded-lg border border-white/5 mb-6 max-h-48 overflow-y-auto custom-scrollbar">
          <p className="text-gray-300 text-sm font-mono break-words leading-relaxed">{erro}</p>
        </div>
        <button onClick={onClose} className="w-full py-3 text-sm font-bold text-white bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all active:scale-[0.98]">
          Reconhecer e Continuar
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
    { id: 'analisar', icon: Search, label: 'Pesquisa Jurisprudencial', color: 'text-[#C5A059]' },
    { id: 'jurimetria', icon: BarChart3, label: 'Jurimetria', color: 'text-blue-400' },
    { id: 'auditoria', icon: ShieldAlert, label: 'Auditoria & Compliance', color: 'text-red-400' },
    { id: 'redacao', icon: PenTool, label: 'Redação Estruturada', color: 'text-emerald-400' },
    { id: 'cotejo', icon: GitMerge, label: 'Cotejo Analítico', color: 'text-purple-400' },
  ];

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
    document.body.removeChild(textArea);
  };

  const exportToDoc = (text) => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>";
    const footer = "</body></html>";
    const html = header + (text ? text.replace(/\n/g, '<br>') : '') + footer;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LexFlow_${activeTab}_${new Date().toLocaleDateString()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const callGeminiAPI = async (moduleType, promptText) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError("Variável VITE_GEMINI_API_KEY não localizada no ambiente.");
      return;
    }

    setLoading(true);
    setError(null);
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`;
    
    let moduleInstruction = "";
    if (moduleType === 'redacao') {
      moduleInstruction = `
        Aja como um Advogado de Elite com especialidade em Direito Processual Civil e Penal. 
        Redija uma MINUTA PROCESSUAL COMPLETA. 
        ESTRUTURA OBRIGATÓRIA:
        1. ENDEREÇAMENTO (com espaço para número do processo);
        2. QUALIFICAÇÃO (conforme Art. 319, II, CPC);
        3. DOS FATOS (descrição lógica);
        4. DO DIREITO (Aplicação da lei, doutrina clássica e súmulas do STF/STJ);
        5. DOS PEDIDOS E REQUERIMENTOS (Art. 319, IV, CPC);
        6. VALOR DA CAUSA;
        7. FECHAMENTO.
        CITE fontes bibliográficas no formato ABNT NBR 6023 ao longo do texto.
        RETORNE APENAS A MINUTA EM TEXTO PURO.
      `;
    } else {
      moduleInstruction = "Analise o caso com rigor científico. Retorne EXCLUSIVAMENTE um objeto JSON com as chaves: analise_preditiva (string longa), probabilidade_exito (número), e jurisprudencia (array com tribunal, ementa, abnt).";
    }

    const fullPrompt = `${GOLDEN_RULES}\n\nPROTOCOLO: ${moduleInstruction}\n\nCONTEÚDO BASE: "${promptText}"`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Google API (${response.status}): ${errorData.error?.message || "Falha na comunicação."}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (moduleType === 'redacao') {
        setResults(prev => ({ ...prev, [moduleType]: textResponse.replace(/```(markdown|text|plain)?/gi, '').trim() }));
      } else {
        const start = textResponse.indexOf('{');
        const end = textResponse.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("A IA falhou ao gerar a estrutura JSON técnica.");
        setResults(prev => ({ ...prev, [moduleType]: JSON.parse(textResponse.substring(start, end + 1)) }));
      }
    } catch (err) {
      setError(err.message || "Falha crítica no processamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (!inputText.trim()) {
      setError("Insira o relato ou a peça base para análise jurídica.");
      return;
    }
    callGeminiAPI(activeTab, inputText);
  };

  const renderResult = () => {
    const data = results[activeTab];
    if (!data) return (
      <div className="flex flex-col items-center justify-center h-full opacity-20 text-center p-12 select-none">
        <Zap className="w-16 h-16 mb-6 animate-pulse" strokeWidth={1} />
        <p className="text-xl font-light tracking-widest italic uppercase">Aguardando Telemetria Jurídica...</p>
      </div>
    );

    if (activeTab === 'redacao') {
      return (
        <div className="p-4 sm:p-10 lg:p-20 bg-[#F3F4F6] min-h-full flex justify-center overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-[800px] bg-white text-black font-serif p-10 sm:p-20 shadow-2xl leading-relaxed text-justify relative min-h-[1100px] border border-gray-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#C5A059]"></div>
            <div className="whitespace-pre-wrap selection:bg-[#C5A059]/20">{data}</div>
            <div className="mt-24 pt-10 border-t border-gray-100 text-[10px] text-gray-400 text-center uppercase tracking-[0.2em]">
              Draft Processual LexFlow Intelligence - Padronizado CPC/2015
            </div>
          </div>
        </div>
      );
    }

    const analise = typeof data.analise_preditiva === 'string' ? data.analise_preditiva : JSON.stringify(data.analise_preditiva || data, null, 2);

    return (
      <div className="p-6 sm:p-10 space-y-10 animate-in slide-in-from-right-10 duration-700 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-light text-white tracking-tight">Parecer de Especialista</h2>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest">SISTEMA: {MODEL_ID.toUpperCase()}</p>
          </div>
          {data.probabilidade_exito !== undefined && (
            <div className="px-6 py-2 bg-[#C5A059]/10 border border-[#C5A059]/40 rounded-full text-[#C5A059] font-black text-lg shadow-lg">
              {data.probabilidade_exito}% <span className="text-xs font-light uppercase ml-1">Previsão</span>
            </div>
          )}
        </div>

        <div className="relative p-8 bg-[#0C121E] rounded-2xl border border-white/5 shadow-2xl">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-[0.3em]">Análise Jurídica Exaustiva</span>
            <button onClick={() => copyToClipboard(analise)} className="text-gray-600 hover:text-white transition-colors">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-wrap font-light text-justify break-words">
            {analise}
          </p>
        </div>

        {data.jurisprudencia && Array.isArray(data.jurisprudencia) && data.jurisprudencia.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.5em] shrink-0">Precedentes e Doutrina</h3>
               <div className="h-px w-full bg-white/5"></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {data.jurisprudencia.map((j, i) => (
                <div key={i} className="p-8 bg-black/40 rounded-2xl border border-white/5 group hover:border-[#C5A059]/40 transition-all hover:bg-black/60">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-[#C5A059] uppercase tracking-widest">{j.tribunal}</span>
                    <button onClick={() => copyToClipboard(j.ementa)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-all">
                       <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed italic break-words">"{j.ementa}"</p>
                  <div className="pt-4 border-t border-white/5 text-[9px] text-gray-600 font-mono">
                    <span className="text-[#C5A059]/60 mr-2">ABNT:</span> {j.abnt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#080B14] text-gray-100 font-sans overflow-hidden selection:bg-[#C5A059]/30">
      <ModalErro erro={error} onClose={() => setError(null)} />

      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} hidden md:flex bg-[#0C121E] border-r border-white/5 flex-col transition-all duration-500 shrink-0 z-30 shadow-2xl`}>
        <div className="p-6 h-20 flex items-center border-b border-white/5 shrink-0">
          <Logo collapsed={isSidebarCollapsed} />
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {modules.map((m) => {
            const Icon = m.icon;
            const isActive = activeTab === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setActiveTab(m.id);
                  setResults({});
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                  isActive 
                    ? 'bg-gradient-to-r from-white/10 to-transparent border-l-2 border-[#C5A059] text-white shadow-xl' 
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#C5A059]' : 'text-gray-600 group-hover:text-gray-400'}`} />
                {!isSidebarCollapsed && <span className="text-sm font-medium tracking-wide truncate">{m.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button onClick={() => setSidebarCollapsed(!isSidebarCollapsed)} className="w-full flex items-center justify-center p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-500">
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="h-20 px-6 sm:px-10 flex items-center justify-between border-b border-white/5 bg-[#080B14]/80 backdrop-blur-2xl shrink-0 z-20">
          <div className="flex flex-col">
            <h1 className="text-lg font-light tracking-[0.3em] text-white/90">
              {modules.find(m => m.id === activeTab)?.label.toUpperCase()}
            </h1>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-[9px] text-gray-500 tracking-widest font-mono uppercase">Breakpoint Alpha - CRC Brazilian Code 2026</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => exportToDoc(results[activeTab])} disabled={!results[activeTab]} className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-[#C5A059] transition-all disabled:opacity-20" title="Exportar Documento">
                <Download className="w-5 h-5" />
             </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          <div className="lg:w-1/2 w-full flex flex-col border-r border-white/5 bg-[#0A0E17] transition-all duration-500">
            <div className="flex-1 p-6 sm:p-8 flex flex-col relative group min-h-0">
              <div className="flex items-center justify-between mb-4 text-[9px] text-gray-600 font-bold uppercase tracking-widest px-2">
                <span>Workspace Jurídico (Vite)</span>
                <button onClick={() => setInputText('')} className="hover:text-red-400 transition-colors flex items-center gap-1"><Trash2 className="w-3 h-3" /> Limpar</button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Insira o relato fático ou a tese para redação estruturada..."
                className="flex-1 p-8 bg-black/40 border border-white/5 rounded-3xl text-lg font-light leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#C5A059]/20 transition-all custom-scrollbar placeholder:opacity-20 selection:bg-[#C5A059]/20 shadow-inner"
              />
            </div>
            <div className="p-8 border-t border-white/5 bg-[#0C121E] shrink-0">
              <button onClick={handleAction} disabled={loading} className="w-full py-5 bg-gradient-to-r from-[#C5A059] to-[#9A7B4F] text-[#080B14] font-black tracking-[0.2em] rounded-2xl shadow-xl hover:shadow-[#C5A059]/40 active:scale-[0.98] transition-all disabled:opacity-50 group overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-5 h-5 border-2 border-[#080B14]/30 border-t-[#080B14] rounded-full animate-spin" />
                    <span className="animate-pulse">PROCESSANDO...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3"><Zap className="w-5 h-5" fill="currentColor" /><span>EXECUTAR {activeTab.toUpperCase()}</span></div>
                )}
              </button>
            </div>
          </div>

          <div className="lg:w-1/2 w-full flex flex-col bg-[#080B14] overflow-y-auto custom-scrollbar relative transition-all duration-500">
            {loading ? (
              <div className="p-10 space-y-10 animate-pulse w-full">
                <div className="h-10 bg-white/5 rounded-lg w-1/3"></div>
                <div className="h-40 bg-white/5 rounded-3xl"></div>
                <div className="h-40 bg-white/5 rounded-3xl"></div>
              </div>
            ) : renderResult()}
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(197, 160, 89, 0.1); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(197, 160, 89, 0.3); }
        * { min-width: 0; min-height: 0; }
        @media (max-width: 1024px) {
          .lg\\:w-1/2 { width: 100% !important; height: 50% !important; }
          .flex-col { flex-direction: column !important; }
        }
      `}} />
    </div>
  );
}