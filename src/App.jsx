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
 * LÓGICA DE RECUPERAÇÃO DA CHAVE DE API
 * No Vite (VS Code) e Vercel, utilizamos obrigatoriamente import.meta.env.
 */
const getApiKey = () => {
  try {
    // Tenta capturar do ambiente de produção (Vite/Vercel)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_GEMINI_API_KEY || "";
    }
  } catch (e) {
    // Fallback para ambiente de desenvolvimento local
  }
  return ""; 
};

// --- REGRAS DE OURO (Meticulosidade e ABNT) ---
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
      <div className="w-full max-w-md p-6 border rounded-2xl bg-[#0C121E] border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)] animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-semibold text-white">Anomalia Detectada</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed mb-6 font-mono">{erro}</p>
        <button onClick={onClose} className="w-full py-3 text-sm font-medium text-white transition-colors bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20">
          Reconhecer e Fechar
        </button>
      </div>
    </div>
  );
};

// --- FUNÇÕES UTILITÁRIAS ---

const exportToDoc = (text) => {
  const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>";
  const footer = "</body></html>";
  const html = header + (text ? text.replace(/\n/g, '<br>') : '') + footer;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'LexFlow_Analise.doc';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const copyToClipboard = (text) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try { document.execCommand('copy'); } catch (err) {}
  document.body.removeChild(textArea);
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
    { id: 'analisar', icon: Search, label: 'Pesquisa Jurisprudencial', color: 'group-hover:text-[#C5A059]' },
    { id: 'jurimetria', icon: BarChart3, label: 'Jurimetria', color: 'group-hover:text-[#3B82F6]' },
    { id: 'auditoria', icon: ShieldAlert, label: 'Auditoria & Compliance', color: 'group-hover:text-red-400' },
    { id: 'redacao', icon: PenTool, label: 'Redação Estruturada', color: 'group-hover:text-emerald-400' },
    { id: 'cotejo', icon: GitMerge, label: 'Cotejo Analítico', color: 'group-hover:text-purple-400' },
  ];

  const callGeminiAPI = async (moduleType, promptText) => {
    const key = getApiKey();
    
    if (!key) {
      setError("ERRO DE AMBIENTE: Chave de API não encontrada. Verifique se VITE_GEMINI_API_KEY foi definida no painel do Vercel.");
      return;
    }

    setLoading(true);
    setError(null);
    
    /**
     * ATUALIZAÇÃO ARQUITETURAL MAIO/2026:
     * Transição para Gemini 2.5 Flash devido à depreciação da família 1.5.
     */
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    let fullPrompt = `${GOLDEN_RULES}\n\nTEXTO BASE PARA ANÁLISE:\n"${promptText}"\n\n`;
    
    if (moduleType === 'analisar') {
      fullPrompt += `DEVOLVA EXATAMENTE UM JSON:
      {
        "analise_preditiva": "Sua análise exaustiva e meticulosa aqui",
        "probabilidade_exito": 85,
        "jurisprudencia": [
          {"tribunal": "STJ", "ementa": "...", "abnt": "..."}
        ]
      }`;
    } else if (moduleType === 'jurimetria') {
      fullPrompt += `DEVOLVA EXATAMENTE UM JSON:
      {
        "tempo_medio": "18 meses",
        "taxas_tribunal": [
          {"tribunal": "TJSP", "taxa_procedencia": 60, "taxa_improcedencia": 40}
        ]
      }`;
    } else if (moduleType === 'auditoria') {
      fullPrompt += `DEVOLVA EXATAMENTE UM JSON:
      {
        "score_tecnico": 8,
        "vulnerabilidades": [{"tipo": "...", "descricao": "...", "severidade": "Alta"}]
      }`;
    } else if (moduleType === 'cotejo') {
      fullPrompt += `DEVOLVA EXATAMENTE UM JSON:
      {
        "comparativos": [{"elemento": "...", "recorrido": "...", "paradigma": "..."}]
      }`;
    } else if (moduleType === 'redacao') {
      fullPrompt += `Atue como um doutrinador e advogado de elite. Redija uma minuta exaustiva. Retorne APENAS o texto, sem markdown.`;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || "O oráculo falhou em processar a requisição.";
        throw new Error(`Google API (${response.status}): ${msg}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!textResponse) throw new Error("A API retornou uma resposta vazia.");

      let finalData;
      if (moduleType === 'redacao') {
        finalData = textResponse.replace(/```(markdown|html)?\n/gi, '').replace(/```/g, '');
      } else {
        const firstBrace = textResponse.indexOf('{');
        const lastBrace = textResponse.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          finalData = JSON.parse(textResponse.substring(firstBrace, lastBrace + 1));
        } else {
          throw new Error("O motor falhou em estruturar o JSON. Verifique a quota.");
        }
      }

      setResults(prev => ({ ...prev, [moduleType]: finalData }));
    } catch (err) {
      setError(err.message || "Erro inesperado no ecossistema.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (!inputText.trim()) {
      setError("Insira o relato fático no workspace para iniciar a análise exaustiva.");
      return;
    }
    callGeminiAPI(activeTab, inputText);
  };

  const renderSkeleton = () => (
    <div className="p-8 space-y-8 animate-pulse w-full">
      <div className="h-8 bg-white/5 rounded-lg w-1/3"></div>
      <div className="h-4 bg-white/5 rounded w-full"></div>
      <div className="h-4 bg-white/5 rounded w-5/6"></div>
      <div className="grid grid-cols-2 gap-6 pt-4">
        <div className="h-32 bg-white/5 rounded-xl"></div>
        <div className="h-32 bg-white/5 rounded-xl"></div>
      </div>
    </div>
  );

  const renderResult = () => {
    const data = results[activeTab];
    if (!data) return (
      <div className="flex flex-col items-center justify-center h-full w-full opacity-40 p-8 text-center select-none">
        <Zap className="w-24 h-24 mb-6 text-gray-500" strokeWidth={1} />
        <h3 className="text-xl font-light text-white mb-2">Aguardando Parâmetros</h3>
        <p className="text-sm text-gray-400 max-w-sm">Insira o texto jurídico e execute o módulo de {modules.find(m => m.id === activeTab).label}.</p>
      </div>
    );

    switch (activeTab) {
      case 'analisar':
        return (
          <div className="p-8 space-y-8 animate-in fade-in duration-500 w-full">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <h2 className="text-2xl font-light text-white">Análise Preditiva</h2>
              <div className="text-xl font-bold text-[#C5A059]">{data.probabilidade_exito}% Sucesso</div>
            </div>
            <p className="text-gray-300 leading-relaxed break-words whitespace-pre-wrap">{data.analise_preditiva}</p>
            <div className="space-y-4 mt-8">
              {data.jurisprudencia?.map((item, idx) => (
                <div key={idx} className="p-6 bg-[#0C121E] border rounded-xl border-white/5">
                  <span className="text-xs font-bold text-[#C5A059] uppercase block mb-2">{item.tribunal}</span>
                  <p className="text-sm text-gray-300 italic mb-2">"{item.ementa}"</p>
                  <p className="text-xs text-gray-500 font-mono">{item.abnt}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'redacao':
        return (
          <div className="flex flex-col h-full bg-[#E5E7EB] rounded-tl-xl overflow-hidden w-full">
            <div className="p-4 bg-[#D1D5DB] border-b border-gray-300 flex justify-between">
              <span className="text-sm font-medium text-gray-700">Minuta_Meticulosa.doc</span>
              <button onClick={() => exportToDoc(data)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">Exportar .DOC</button>
            </div>
            <div className="flex-1 p-16 overflow-y-auto">
              <div className="max-w-3xl mx-auto bg-white p-16 text-black font-serif shadow-2xl whitespace-pre-wrap leading-relaxed border border-gray-200 text-justify">{data}</div>
            </div>
          </div>
        );
      default: return <div className="p-8 text-gray-400">Módulo em processamento de dados...</div>;
    }
  };

  return (
    <div className="flex h-screen bg-[#080B14] text-gray-100 overflow-hidden font-sans">
      <ModalErro erro={error} onClose={() => setError(null)} />

      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} transition-all duration-300 bg-[#0C121E] border-r border-white/5 flex flex-col shrink-0`}>
        <div className="p-6 h-20 flex items-center border-b border-white/5 shrink-0 overflow-hidden"><Logo collapsed={isSidebarCollapsed} /></div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {modules.map((mod) => (
            <button key={mod.id} onClick={() => setActiveTab(mod.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${activeTab === mod.id ? 'bg-white/10 text-white border-l-2 border-[#C5A059]' : 'text-gray-400 hover:bg-white/5'}`}>
              <mod.icon className="w-5 h-5 shrink-0" /> {!isSidebarCollapsed && <span className="text-sm font-medium">{mod.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-20 px-8 flex items-center border-b border-white/5 bg-[#080B14] shrink-0 uppercase tracking-widest text-white/80">
          {modules.find(m => m.id === activeTab).label}
        </header>
        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="w-1/2 flex flex-col border-r border-white/5 bg-[#0A0E17]">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Workspace: Insira os fatos do caso aqui..."
              className="flex-1 m-6 p-6 bg-black/20 border border-white/5 rounded-2xl text-lg focus:outline-none resize-none placeholder:opacity-20"
            />
            <div className="p-6 border-t border-white/5 bg-[#0C121E]">
              <button onClick={handleAction} disabled={loading} className="w-full py-4 bg-gradient-to-r from-[#C5A059] to-[#9A7B4F] text-[#080B14] font-bold rounded-xl shadow-xl active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? "PROCESSANDO..." : `EXECUTAR ${activeTab.toUpperCase()}`}
              </button>
            </div>
          </div>
          <div className="w-1/2 flex flex-col bg-[#080B14] overflow-y-auto custom-scrollbar">{loading ? renderSkeleton() : renderResult()}</div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}} />
    </div>
  );
}