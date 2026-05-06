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
 * No Vite/Vercel, as variáveis de ambiente são acessadas via import.meta.env.
 * O bloco try/catch evita erros de compilação no ambiente de testes.
 */
const getApiKey = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_GEMINI_API_KEY || "";
    }
  } catch (e) {
    console.warn("Ambiente de meta-dados não detectado.");
  }
  return ""; 
};

// --- REGRAS DE OURO (PROMPT ENGINEERING) ---
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
        <p className="text-gray-300 text-sm leading-relaxed mb-6">{erro}</p>
        <button onClick={onClose} className="w-full py-3 text-sm font-medium text-white transition-colors bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 focus:outline-none">
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
  link.download = 'LexFlow_Minuta.doc';
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
  const textAreaRef = useRef(null);

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
      setError("Erro de Configuração: A chave de API não foi detectada no ambiente. Verifique se adicionou VITE_GEMINI_API_KEY no painel do Vercel e se realizou o Redeploy.");
      return;
    }

    setLoading(true);
    setError(null);
    
    // Endpoint estabilizado utilizando identificador canônico para Gemini 1.5 Flash
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    let fullPrompt = `${GOLDEN_RULES}\n\nTEXTO BASE PARA ANÁLISE:\n"${promptText}"\n\n`;
    
    if (moduleType === 'analisar') {
      fullPrompt += `DEVOLVA EXATAMENTE UM JSON:
      {
        "analise_preditiva": "Sua análise detalhada e exaustiva aqui",
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
      fullPrompt += `Redija uma minuta processual estruturada, culta e persuasiva. Retorne APENAS o texto da minuta. Inclua fontes em ABNT NBR 6023.`;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const googleError = errorData?.error?.message || "Erro desconhecido na API.";
        throw new Error(`Detalhe da Google (${response.status}): ${googleError}`);
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
          throw new Error("O oráculo falhou em estruturar o JSON. Tente novamente.");
        }
      }

      setResults(prev => ({ ...prev, [moduleType]: finalData }));
    } catch (err) {
      setError(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (!inputText.trim()) {
      setError("Insira o conteúdo jurídico para análise.");
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

  const renderEmptyState = () => {
    const Icon = modules.find(m => m.id === activeTab).icon;
    return (
      <div className="flex flex-col items-center justify-center h-full w-full opacity-40 p-8 text-center select-none">
        <Icon className="w-24 h-24 mb-6 text-gray-500" strokeWidth={1} />
        <h3 className="text-xl font-light text-white mb-2">Aguardando Parâmetros</h3>
        <p className="text-sm text-gray-400 max-w-sm">Insira o texto jurídico no workspace e execute o módulo de {modules.find(m => m.id === activeTab).label.toLowerCase()}.</p>
      </div>
    );
  };

  const renderResult = () => {
    const data = results[activeTab];
    if (!data) return renderEmptyState();

    switch (activeTab) {
      case 'analisar':
        return (
          <div className="p-8 space-y-8 animate-in fade-in duration-500 w-full">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <h2 className="text-2xl font-light text-white">Análise Preditiva</h2>
              <div className="text-xl font-bold text-[#C5A059]">{data.probabilidade_exito || 0}% Sucesso</div>
            </div>
            <p className="text-gray-300 leading-relaxed break-words whitespace-pre-wrap">{data.analise_preditiva}</p>
            <div className="space-y-4 mt-8">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Precedentes e Doutrina</h3>
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
      case 'jurimetria':
        return (
          <div className="p-8 space-y-8 w-full">
            <h2 className="text-2xl font-light text-white border-b border-white/10 pb-6">Lead Time: {data.tempo_medio}</h2>
            <div className="space-y-6">
              {data.taxas_tribunal?.map((taxa, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{taxa.tribunal}</span>
                    <span>{taxa.taxa_procedencia}% Procedência</span>
                  </div>
                  <div className="h-2 bg-[#1A2235] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3B82F6]" style={{ width: `${taxa.taxa_procedencia || 0}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'auditoria':
        return (
          <div className="p-8 space-y-8 w-full">
            <h2 className="text-2xl font-light text-white border-b border-white/10 pb-6">Score de Compliance: {data.score_tecnico}/10</h2>
            <div className="space-y-4">
              {data.vulnerabilidades?.map((v, i) => (
                <div key={i} className="p-4 border-l-4 border-red-500 bg-[#0C121E] rounded-r-xl">
                  <h4 className="font-medium text-white">{v.tipo} ({v.severidade})</h4>
                  <p className="text-sm text-gray-400">{v.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'redacao':
        return (
          <div className="flex flex-col h-full bg-[#E5E7EB] rounded-tl-xl overflow-hidden w-full">
            <div className="p-4 bg-[#D1D5DB] border-b border-gray-300 flex justify-between">
              <span className="text-sm font-medium text-gray-700">Minuta_Processual.doc</span>
              <button onClick={() => exportToDoc(data)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">Exportar .DOC</button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar-light">
              <div className="max-w-3xl mx-auto bg-white p-16 text-black font-serif shadow-2xl whitespace-pre-wrap leading-relaxed border border-gray-200">{data}</div>
            </div>
          </div>
        );
      case 'cotejo':
        return (
          <div className="p-8 w-full overflow-x-auto">
            <table className="w-full text-left table-fixed min-w-[600px] border-collapse bg-[#0C121E] rounded-xl overflow-hidden border border-white/5">
              <thead>
                <tr className="bg-[#1A2235]">
                  <th className="p-4 text-xs font-bold text-[#C5A059] uppercase w-1/4">Elemento</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase w-3/8">Decisão Recorrida</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase w-3/8">Acórdão Paradigma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.comparativos?.map((c, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-white align-top font-medium">{c.elemento}</td>
                    <td className="p-4 text-sm text-gray-400 align-top italic">"{c.recorrido}"</td>
                    <td className="p-4 text-sm text-gray-400 align-top italic border-l border-white/5">"{c.paradigma}"</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#080B14] text-gray-100 overflow-hidden font-sans selection:bg-[#C5A059]/30">
      <ModalErro erro={error} onClose={() => setError(null)} />

      {/* SIDEBAR */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} transition-all duration-300 bg-[#0C121E] border-r border-white/5 flex flex-col shrink-0`}>
        <div className="p-6 h-20 flex items-center border-b border-white/5 shrink-0 overflow-hidden">
          <Logo collapsed={isSidebarCollapsed} />
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {modules.map((mod) => (
            <button key={mod.id} onClick={() => setActiveTab(mod.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${activeTab === mod.id ? 'bg-white/10 text-white shadow-lg border-l-2 border-[#C5A059]' : 'text-gray-400 hover:bg-white/5'}`}>
              <mod.icon className={`w-5 h-5 shrink-0 ${activeTab === mod.id ? 'text-[#C5A059]' : 'text-gray-500 group-hover:text-gray-300'}`} /> 
              {!isSidebarCollapsed && <span className="text-sm font-medium">{mod.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-20 px-8 flex items-center border-b border-white/5 bg-[#080B14]/50 backdrop-blur-md shrink-0">
          <h1 className="text-xl font-light uppercase tracking-[0.2em] text-white/90">{modules.find(m => m.id === activeTab).label}</h1>
        </header>

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* WORKSPACE */}
          <div className="w-1/2 flex flex-col border-r border-white/5 bg-[#0A0E17]">
            <div className="flex-1 p-6 flex flex-col relative min-h-0">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Insira o relato fático ou a peça processual aqui para processamento..."
                className="flex-1 p-6 bg-black/30 border border-white/5 rounded-2xl text-lg font-light leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#C5A059]/30 transition-all custom-scrollbar placeholder:opacity-20"
              />
            </div>
            <div className="p-6 border-t border-white/5 bg-[#0C121E]">
              <button onClick={handleAction} disabled={loading} className="w-full py-4 bg-gradient-to-r from-[#C5A059] to-[#9A7B4F] text-[#080B14] font-bold rounded-xl shadow-xl hover:shadow-[#C5A059]/20 active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#080B14]/30 border-t-[#080B14] rounded-full animate-spin" />
                    <span>PROCESSANDO...</span>
                  </div>
                ) : (
                  <span>EXECUTAR {activeTab.toUpperCase()}</span>
                )}
              </button>
            </div>
          </div>

          {/* RESULTS */}
          <div className="w-1/2 flex flex-col bg-[#080B14] overflow-y-auto custom-scrollbar scroll-smooth">
            {loading ? renderSkeleton() : renderResult()}
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(197, 160, 89, 0.2); }
        .custom-scrollbar-light::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar-light::-webkit-scrollbar-track { background: #E5E7EB; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background-color: #CBD5E1; border-radius: 10px; }
      `}} />
    </div>
  );
}