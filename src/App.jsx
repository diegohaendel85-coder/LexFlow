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

// --- CONFIGURAÇÃO DA API ---
// ATENÇÃO: Ao enviar para o Vercel, substitua as aspas vazias por: import.meta.env.VITE_GEMINI_API_KEY
const apiKey = ""; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

// --- REGRAS DE OURO ---
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
        <button onClick={onClose} className="w-full py-3 text-sm font-medium text-white transition-colors bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500/50">
          Reconhecer e Fechar
        </button>
      </div>
    </div>
  );
};

// --- FUNÇÕES UTILITÁRIAS ---

const exportToDoc = (text) => {
  const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>LexFlow Document</title></head><body>";
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
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }
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

  // --- MOTOR DE IA (BLINDAGEM VERCEL) ---
  const callGeminiAPI = async (moduleType, promptText) => {
    setLoading(true);
    setError(null);
    
    let fullPrompt = `${GOLDEN_RULES}\n\nTEXTO BASE PARA ANÁLISE:\n"${promptText}"\n\n`;
    
    if (moduleType === 'analisar') {
      fullPrompt += `DEVOLVA EXATAMENTE UM JSON com esta estrutura (sem formatação markdown):
      {
        "analise_preditiva": "Sua análise detalhada e exaustiva aqui",
        "probabilidade_exito": 85,
        "jurisprudencia": [
          {"tribunal": "STJ", "ementa": "Resumo da ementa...", "abnt": "Referência ABNT da ementa ou doutrina relacionada..."}
        ]
      }`;
    } else if (moduleType === 'jurimetria') {
      fullPrompt += `DEVOLVA EXATAMENTE UM JSON com esta estrutura (sem formatação markdown):
      {
        "tempo_medio": "18 meses",
        "taxas_tribunal": [
          {"tribunal": "TJSP", "taxa_procedencia": 60, "taxa_improcedencia": 40}
        ]
      }`;
    } else if (moduleType === 'auditoria') {
      fullPrompt += `DEVOLVA EXATAMENTE UM JSON com esta estrutura (sem formatação markdown):
      {
        "score_tecnico": 8,
        "vulnerabilidades": [
          {"tipo": "Prazo Decadencial", "descricao": "Risco de prescrição detectado na página 2...", "severidade": "Alta"}
        ]
      }`;
    } else if (moduleType === 'cotejo') {
      fullPrompt += `DEVOLVA EXATAMENTE UM JSON com esta estrutura (sem formatação markdown):
      {
        "comparativos": [
          {"elemento": "Dano Moral", "recorrido": "Trecho da decisão recorrida...", "paradigma": "Trecho do acórdão paradigma..."}
        ]
      }`;
    } else if (moduleType === 'redacao') {
      fullPrompt += `Atue como um advogado de elite. Redija uma minuta processual estruturada, culta e persuasiva baseada nos fatos. Retorne APENAS o texto da minuta, sem markdown de código. Formate com quebras de linha claras. Inclua fontes em ABNT NBR 6023 no final. NÃO RETORNE JSON NESTE CASO.`;
    }

    const payload = {
      contents: [{ parts: [{ text: fullPrompt }] }]
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // EXTRAÇÃO DO ERRO NATIVO DA GOOGLE
        const errorData = await response.json().catch(() => ({}));
        const googleError = errorData?.error?.message || "O oráculo falhou em processar a requisição e não retornou detalhes.";
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
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
          const jsonString = textResponse.substring(firstBrace, lastBrace + 1);
          try {
            finalData = JSON.parse(jsonString);
          } catch (e) {
            console.error("Falha ao parsear JSON isolado:", jsonString);
            throw new Error("O motor falhou em estruturar os dados perfeitamente. A anomalia foi registada.");
          }
        } else {
          throw new Error("O motor não devolveu a estrutura de dados esperada.");
        }
      }

      setResults(prev => ({ ...prev, [moduleType]: finalData }));

    } catch (err) {
      setError(err.message || "Ocorreu um erro inesperado ao contactar os servidores.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (!inputText.trim()) {
      setError("Por favor, insira o relato fático ou a peça processual no Workspace antes de solicitar a análise.");
      return;
    }
    callGeminiAPI(activeTab, inputText);
  };

  // --- RENDERIZADORES DE RESULTADOS ---

  const renderSkeleton = () => (
    <div className="p-8 space-y-8 animate-pulse w-full">
      <div className="h-8 bg-white/5 rounded-lg w-1/3"></div>
      <div className="space-y-4">
        <div className="h-4 bg-white/5 rounded w-full"></div>
        <div className="h-4 bg-white/5 rounded w-5/6"></div>
        <div className="h-4 bg-white/5 rounded w-4/6"></div>
      </div>
      <div className="grid grid-cols-2 gap-6 pt-4">
        <div className="h-32 bg-white/5 rounded-xl border border-white/5"></div>
        <div className="h-32 bg-white/5 rounded-xl border border-white/5"></div>
      </div>
    </div>
  );

  const renderEmptyState = () => {
    const activeModule = modules.find(m => m.id === activeTab);
    const Icon = activeModule.icon;
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center opacity-40 select-none p-8">
        <div className="relative">
          <div className="absolute inset-0 bg-[#C5A059] blur-3xl opacity-10 rounded-full animate-pulse"></div>
          <Icon className="w-24 h-24 mb-6 text-gray-500 relative z-10" strokeWidth={1} />
        </div>
        <h3 className="text-xl font-light text-white mb-2">Aguardando Parâmetros</h3>
        <p className="text-sm text-gray-400 max-w-sm">
          Insira os fatos no workspace e inicie o módulo de {activeModule.label.toLowerCase()} para processar dados de alto valor.
        </p>
      </div>
    );
  };

  const renderResult = () => {
    const data = results[activeTab];
    if (!data) return renderEmptyState();

    switch (activeTab) {
      case 'analisar':
        return (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <h2 className="text-2xl font-light text-white">Análise Preditiva</h2>
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-[#1A2235]">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="36" cy="36" r="34" className="text-transparent fill-none stroke-current" strokeWidth="4" />
                  <circle cx="36" cy="36" r="34" className="text-[#C5A059] fill-none stroke-current transition-all duration-1000" strokeWidth="4" strokeDasharray={`${(data.probabilidade_exito || 0) * 2.14} 214`} />
                </svg>
                <span className="text-xl font-bold text-[#C5A059]">{data.probabilidade_exito || 0}%</span>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed text-lg font-light break-words">{data.analise_preditiva}</p>
            <div className="space-y-4 mt-8">
              <h3 className="text-sm font-semibold tracking-widest text-gray-500 uppercase">Jurisprudência Aplicável</h3>
              {data.jurisprudencia?.map((item, idx) => (
                <div key={idx} className="p-6 transition-colors bg-[#0C121E] border rounded-xl border-white/5 hover:border-[#C5A059]/30 group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 text-xs font-bold text-[#C5A059] bg-[#C5A059]/10 rounded-full">{item.tribunal}</span>
                    <button onClick={() => copyToClipboard(item.ementa)} className="text-gray-500 opacity-0 group-hover:opacity-100 hover:text-white transition-all"><Copy className="w-4 h-4" /></button>
                  </div>
                  <p className="text-sm text-gray-300 italic mb-4 break-words">"{item.ementa}"</p>
                  <p className="text-xs text-gray-500 font-mono break-words">{item.abnt}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'jurimetria':
        return (
          <div className="p-8 space-y-8 animate-in fade-in duration-500 w-full">
            <h2 className="text-2xl font-light text-white border-b border-white/10 pb-6">Métricas do Processo</h2>
            <div className="p-10 text-center border bg-gradient-to-br from-[#0C121E] to-[#080B14] rounded-2xl border-white/5 shadow-2xl">
              <p className="text-sm font-semibold tracking-widest text-[#3B82F6] uppercase mb-4">Lead Time Estimado</p>
              <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">{data.tempo_medio}</h1>
            </div>
            <div className="space-y-6 mt-8">
              <h3 className="text-sm font-semibold tracking-widest text-gray-500 uppercase">Taxas por Tribunal</h3>
              {data.taxas_tribunal?.map((taxa, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-white">{taxa.tribunal}</span>
                    <span className="text-gray-400">Procedência: {taxa.taxa_procedencia}%</span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-[#1A2235]">
                    <div className="bg-[#3B82F6]" style={{ width: `${taxa.taxa_procedencia || 0}%` }}></div>
                    <div className="bg-red-500/50" style={{ width: `${taxa.taxa_improcedencia || 0}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'auditoria':
        return (
          <div className="p-8 space-y-8 animate-in fade-in duration-500 w-full">
             <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <h2 className="text-2xl font-light text-white">Auditoria & Compliance</h2>
              <div className={`text-3xl font-bold ${data.score_tecnico >= 7 ? 'text-emerald-400' : data.score_tecnico >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                Score: {data.score_tecnico}/10
              </div>
            </div>
            <div className="space-y-4">
              {data.vulnerabilidades?.map((vuln, idx) => (
                <div key={idx} className={`p-5 border-l-4 rounded-r-xl bg-[#0C121E] ${vuln.severidade === 'Alta' ? 'border-red-500' : vuln.severidade === 'Média' ? 'border-yellow-500' : 'border-blue-500'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className={`w-5 h-5 ${vuln.severidade === 'Alta' ? 'text-red-500' : 'text-yellow-500'}`} />
                    <h4 className="font-medium text-white">{vuln.tipo}</h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white/5 rounded text-gray-400">{vuln.severidade}</span>
                  </div>
                  <p className="text-sm text-gray-400 pl-8 break-words">{vuln.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'redacao':
        return (
          <div className="flex flex-col h-full bg-[#E5E7EB] rounded-tl-xl overflow-hidden animate-in fade-in duration-500 w-full">
             <div className="flex items-center justify-between p-4 bg-[#D1D5DB] border-b border-gray-300 shrink-0">
              <span className="text-sm font-medium text-gray-700">Minuta_Estruturada.doc</span>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard(data)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"><Copy className="w-3 h-3" /> Copiar</button>
                <button onClick={() => exportToDoc(data)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white transition-colors bg-blue-600 rounded shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><Download className="w-3 h-3" /> Exportar .DOC</button>
              </div>
            </div>
            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar-light bg-[#E5E7EB]">
              <div className="max-w-3xl mx-auto bg-white shadow-xl min-h-[842px] p-12 md:p-16 text-black font-serif text-justify whitespace-pre-wrap leading-relaxed border border-gray-200">
                {data}
              </div>
            </div>
          </div>
        );
      case 'cotejo':
        return (
          <div className="p-8 space-y-8 animate-in fade-in duration-500 w-full">
            <h2 className="text-2xl font-light text-white border-b border-white/10 pb-6">Cotejo Analítico</h2>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1A2235]">
              <table className="w-full text-left border-collapse table-fixed min-w-[600px]">
                <thead>
                  <tr className="bg-[#1A2235]">
                    <th className="p-4 text-xs font-bold tracking-widest text-[#C5A059] uppercase border-b border-white/10 w-1/4">Elemento</th>
                    <th className="p-4 text-xs font-bold tracking-widest text-gray-400 uppercase border-b border-white/10 w-3/8">Decisão Recorrida</th>
                    <th className="p-4 text-xs font-bold tracking-widest text-gray-400 uppercase border-b border-white/10 w-3/8">Acórdão Paradigma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.comparativos?.map((comp, idx) => (
                    <tr key={idx} className="bg-[#0C121E] hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-medium text-white align-top break-words">{comp.elemento}</td>
                      <td className="p-4 text-sm text-gray-400 align-top italic break-words">"{comp.recorrido}"</td>
                      <td className="p-4 text-sm text-gray-400 align-top italic border-l border-white/5 break-words">"{comp.paradigma}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#080B14] text-gray-100 font-sans overflow-hidden">
      <ModalErro erro={error} onClose={() => setError(null)} />

      {/* --- SIDEBAR LATERAL --- */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} transition-all duration-300 ease-in-out bg-[#0C121E] border-r border-white/5 flex flex-col relative z-20 shrink-0`}>
        <div className="p-6 h-20 flex items-center justify-between border-b border-white/5 shrink-0">
          <Logo collapsed={isSidebarCollapsed} />
        </div>
        
        <button 
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute z-30 flex items-center justify-center w-6 h-6 border rounded-full bg-[#1A2235] border-white/10 -right-3 top-7 hover:bg-[#C5A059] hover:text-black transition-colors focus:outline-none"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeTab === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group focus:outline-none ${
                  isActive 
                    ? 'bg-gradient-to-r from-white/10 to-transparent border-l-2 border-[#C5A059] text-white shadow-lg' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-2 border-transparent'
                } ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
                title={isSidebarCollapsed ? mod.label : ''}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#C5A059]' : mod.color} transition-colors`} />
                {!isSidebarCollapsed && <span className="font-medium text-sm tracking-wide">{mod.label}</span>}
              </button>
            );
          })}
        </nav>

        {!isSidebarCollapsed && (
          <div className="p-6 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1A2235] border border-white/5">
              <div className="w-8 h-8 rounded bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">DR</span>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">Sócio Diretor</p>
                <p className="text-[10px] text-gray-400 truncate">Plano Elite B2B</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* HEADER */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#080B14]/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-light text-white capitalize">
               {modules.find(m => m.id === activeTab)?.label}
             </h1>
          </div>
        </header>

        {/* WORKSPACE DIVIDIDO */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* INPUT AREA (Esquerda) */}
          <div className="w-1/2 flex flex-col border-r border-white/5 bg-[#0A0E17] min-w-0">
            <div className="flex-1 p-6 flex flex-col relative group min-h-0">
              <textarea
                ref={textAreaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Insira os fatos do caso, a ementa ou a peça processual aqui para análise de IA..."
                className="w-full flex-1 resize-none bg-black/20 border border-white/5 rounded-xl p-5 text-gray-200 font-light text-lg leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#C5A059]/30 placeholder:text-gray-700 custom-scrollbar transition-shadow"
              />
              <div className="absolute bottom-10 right-10 flex items-center gap-3">
                 <button className="p-2 rounded-lg bg-[#1A2235] text-gray-400 hover:text-white transition-colors shadow-lg border border-white/5" title="Limpar Workspace">
                   <X className="w-5 h-5" onClick={() => setInputText('')} />
                 </button>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/5 bg-[#0C121E] shrink-0">
              <button
                onClick={handleAction}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold text-[#080B14] bg-gradient-to-r from-[#C5A059] to-[#9A7B4F] hover:shadow-[0_0_20px_rgba(197,160,89,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:ring-offset-2 focus:ring-offset-[#0C121E]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#080B14]/30 border-t-[#080B14] rounded-full animate-spin" />
                    <span>Processando via IA...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 transition-transform group-hover:scale-110" fill="currentColor" />
                    <span>Executar {modules.find(m => m.id === activeTab)?.label}</span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RESULT AREA (Direita) */}
          <div className="w-1/2 flex flex-col bg-[#080B14] overflow-y-auto overflow-x-hidden custom-scrollbar relative min-w-0">
            {loading ? renderSkeleton() : renderResult()}
          </div>
          
        </div>
      </main>

      {/* ESTILOS GLOBAIS PARA SCROLLBAR */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(197, 160, 89, 0.3);
        }
        
        .custom-scrollbar-light::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar-light::-webkit-scrollbar-track {
          background: #E5E7EB;
        }
        .custom-scrollbar-light::-webkit-scrollbar-thumb {
          background-color: #9CA3AF;
          border-radius: 10px;
        }
        .custom-scrollbar-light:hover::-webkit-scrollbar-thumb {
          background-color: #6B7280;
        }
      `}} />
    </div>
  );
}