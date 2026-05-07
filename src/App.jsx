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
  Trash2
} from 'lucide-react';

/**
 * =========================================================================
 * ESTADO DE PRODUÇÃO BLINDADO (VERCEL / VS CODE)
 * =========================================================================
 * 1. Chave de API: Fixada conforme solicitação para o ambiente de produção.
 * 2. Modelo: Fixado em 'gemini-2.5-flash' conforme o relatório técnico de
 * transições arquiteturais (Maio de 2026), erradicando os erros 404 da série 1.5.
 */
const apiKey = "AIzaSyAiikeC8gPrzBRjiB1yVkYwRSuD6bfCayE"; 
const MODEL_ID = "gemini-2.5-flash"; 

const GOLDEN_RULES = `
REGRAS ABSOLUTAS E INQUEBRÁVEIS (ORDENAMENTO JURÍDICO BRASILEIRO):
1. ESTRUTURA FORMAL: Toda peça deve seguir a ordem lógica do CPC/2015 ou CPP.
2. EXAUSTIVIDADE TÉCNICA: Não omitir teses subsidiárias. Em resumos e análises, seja exaustivo, não deixe nenhum assunto de fora. Analise meticulosamente cada nuance.
3. LINGUAGEM: Utilizar português culto e técnico-jurídico.
4. CITAÇÕES E FONTES: Busque sempre fontes confiáveis. Dê preferência absoluta a livros de doutrina e trabalhos científicos consolidados. Citar fontes estritamente conforme NBR 6023:2018 da ABNT.
5. OBJETIVIDADE DE RETORNO: Retornar estritamente o conteúdo solicitado (JSON ou Texto puro).
`;

/**
 * ALGORITMO DE RESILIÊNCIA DE REDE (Exponential Backoff)
 * Garante que o LexFlow não falha por latências momentâneas do API Gateway.
 */
const fetchWithBackoff = async (url, options) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < delays.length; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (i === delays.length - 1) return response; 
    } catch (error) {
      if (i === delays.length - 1) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delays[i]));
  }
};

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md p-6 border rounded-2xl bg-[#0C121E] border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
        <div className="flex items-center gap-3 text-red-400 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-lg font-semibold text-white tracking-tight">Falha de Operação</h3>
        </div>
        <div className="p-4 bg-black/40 rounded-lg border border-white/5 mb-6 max-h-48 overflow-y-auto custom-scrollbar">
          <p className="text-gray-300 text-sm font-mono break-words leading-relaxed">{erro}</p>
        </div>
        <button onClick={onClose} className="w-full py-3 text-sm font-bold text-white bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all active:scale-[0.98]">
          Reconhecer e Corrigir
        </button>
      </div>
    </div>
  );
};

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

  const callGeminiAPI = async (moduleType, promptText) => {
    setLoading(true);
    setError(null);
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`;
    
    let moduleInstruction = "";
    if (moduleType === 'redacao') {
      moduleInstruction = "Aja como Advogado Sênior. Redija minuta processual exaustiva e meticulosa conforme CPC/2015. Baseie-se em doutrina (livros/trabalhos científicos). Retorne apenas o texto puro da peça sem marcadores de código.";
    } else {
      moduleInstruction = "Analise o caso com rigor técnico e não deixe nenhum assunto de fora. Retorne EXCLUSIVAMENTE um objeto JSON válido com: analise_preditiva, probabilidade_exito, e jurisprudencia (array contendo tribunal, ementa, abnt com fontes científicas/livros).";
    }

    const fullPrompt = `${GOLDEN_RULES}\n\nMODO: ${moduleInstruction}\n\nCONTEÚDO BASE: "${promptText}"`;

    try {
      const response = await fetchWithBackoff(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMsg = errorData.error?.message || "O servidor não pôde processar a requisição no momento.";
        if (response.status === 403) errorMsg = "Acesso Negado (403): A chave de API é inválida ou foi revogada por vazamento.";
        if (response.status === 404) errorMsg = `Erro 404: O modelo '${MODEL_ID}' não existe ou foi descontinuado neste cluster.`;
        throw new Error(`Oráculo Indisponível: ${errorMsg}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (moduleType === 'redacao') {
        // Remove delimitadores de markdown com regex segura para evitar quebra no esbuild
        setResults(prev => ({ ...prev, [moduleType]: textResponse.replace(/`{3}(markdown|text|plain|html)?/gi, '').trim() }));
      } else {
        // Blindagem contra MissingFieldException e falhas de parser apontadas no relatório
        let cleanedText = textResponse.replace(/`{3}(?:json)?/gi, '').replace(/`{3}/g, '').trim();
        const start = cleanedText.indexOf('{');
        const end = cleanedText.lastIndexOf('}');
        
        if (start === -1 || end === -1) {
          throw new Error("Falha de Parsing: A arquitetura 2.5 não retornou um objeto JSON estruturado válido. Tente reformular os dados fáticos.");
        }
        
        try {
          const jsonString = cleanedText.substring(start, end + 1);
          setResults(prev => ({ ...prev, [moduleType]: JSON.parse(jsonString) }));
        } catch (parseError) {
          throw new Error("Erro Crítico de Estrutura: A IA gerou caracteres inválidos no JSON. Execute novamente o pipeline.");
        }
      }
    } catch (err) {
      setError(err.message || "Ocorreu um erro de conexão com a inteligência artificial.");
    } finally {
      setLoading(false);
    }
  };

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
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'></head><body>";
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

  const renderResult = () => {
    const data = results[activeTab];
    if (!data) return (
      <div className="flex flex-col items-center justify-center h-full opacity-20 text-center p-12 select-none">
        <Zap className="w-16 h-16 mb-6 animate-pulse" strokeWidth={1} />
        <p className="text-xl font-light tracking-widest italic uppercase">Aguardando Parâmetros Jurídicos...</p>
      </div>
    );

    if (activeTab === 'redacao') {
      return (
        <div className="p-8 sm:p-20 bg-[#F3F4F6] min-h-full flex justify-center overflow-y-auto">
          <div className="w-full max-w-[800px] bg-white text-black font-serif p-12 sm:p-20 shadow-2xl leading-relaxed text-justify relative border border-gray-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#C5A059]"></div>
            <div className="whitespace-pre-wrap">{data}</div>
          </div>
        </div>
      );
    }

    const analise = typeof data.analise_preditiva === 'string' ? data.analise_preditiva : JSON.stringify(data.analise_preditiva || data, null, 2);

    return (
      <div className="p-10 space-y-10 animate-in slide-in-from-right-10 duration-700">
        <div className="flex items-center justify-between border-b border-white/10 pb-8">
          <h2 className="text-3xl font-light text-white tracking-tight">Parecer da Inteligência</h2>
          {data.probabilidade_exito !== undefined && (
            <div className="px-6 py-2 bg-[#C5A059]/10 border border-[#C5A059]/40 rounded-full text-[#C5A059] font-black text-lg">
              {data.probabilidade_exito}% de Êxito
            </div>
          )}
        </div>
        <div className="p-8 bg-[#0C121E] rounded-2xl border border-white/5 shadow-inner">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-[0.3em]">Análise Jurídica Exaustiva</span>
            <button onClick={() => copyToClipboard(analise)} className="text-gray-600 hover:text-white transition-colors">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-wrap font-light text-justify italic">
            {analise}
          </p>
        </div>
        {data.jurisprudencia && Array.isArray(data.jurisprudencia) && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.4em]">Fontes Doutrinárias & Precedentes (ABNT)</h3>
            {data.jurisprudencia.map((j, i) => (
              <div key={i} className="p-6 bg-black/40 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-[#C5A059] uppercase tracking-widest block">{j.tribunal}</span>
                  <button onClick={() => copyToClipboard(j.ementa)} className="text-gray-500 hover:text-white transition-colors">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm mb-4 italic leading-relaxed">"{j.ementa}"</p>
                <div className="pt-4 border-t border-white/5 text-[10px] text-gray-500 font-mono">
                  FONTE ABNT: {j.abnt}
                </div>
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

      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-[#0C121E] border-r border-white/5 flex flex-col transition-all duration-500 shrink-0 z-30 shadow-2xl`}>
        <div className="p-6 h-20 flex items-center border-b border-white/5 shrink-0">
          <Logo collapsed={isSidebarCollapsed} />
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => { setActiveTab(m.id); setResults({}); }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                activeTab === m.id ? 'bg-white/10 text-white border-l-2 border-[#C5A059] shadow-lg' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <m.icon className={`w-5 h-5 shrink-0 ${activeTab === m.id ? 'text-[#C5A059]' : 'text-gray-600'}`} />
              {!isSidebarCollapsed && <span className="text-sm font-medium tracking-wide">{m.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-white/5">
          <button onClick={() => setSidebarCollapsed(!isSidebarCollapsed)} className="w-full flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-20 px-10 flex items-center justify-between border-b border-white/5 bg-[#080B14] shrink-0">
          <h1 className="text-lg font-light tracking-[0.3em] text-white/80">{modules.find(m => m.id === activeTab)?.label.toUpperCase()}</h1>
          <button onClick={() => exportToDoc(results[activeTab])} disabled={!results[activeTab]} className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-[#C5A059] transition-all disabled:opacity-20" title="Exportar Documento">
            <Download className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 flex flex-col border-r border-white/5 bg-[#0A0E17]">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Workspace Jurídico: Descreva o caso meticulosamente..."
              className="flex-1 m-8 p-8 bg-black/40 border border-white/5 rounded-3xl text-lg font-light leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#C5A059]/30 custom-scrollbar selection:bg-[#C5A059]/30 placeholder:opacity-40"
            />
            <div className="p-8 border-t border-white/5 bg-[#0C121E]">
              <button
                onClick={() => {
                  if(!inputText.trim()) { setError("O Workspace está vazio."); return; }
                  callGeminiAPI(activeTab, inputText);
                }}
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-[#C5A059] to-[#9A7B4F] text-[#080B14] font-black tracking-widest rounded-2xl shadow-xl hover:shadow-[#C5A059]/40 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "PROCESSANDO DADOS..." : `EXECUTAR ${activeTab.toUpperCase()}`}
              </button>
            </div>
          </div>
          <div className="w-1/2 flex flex-col bg-[#080B14] overflow-y-auto custom-scrollbar relative bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.05),transparent_50%)]">
            {renderResult()}
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(197,160,89,0.1); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(197,160,89,0.3); }
        * { min-width: 0; min-height: 0; }
      `}} />
    </div>
  );
}