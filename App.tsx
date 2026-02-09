
import React, { useState, useRef } from 'react';
import { Mail, Download, Plus, Trash2, CheckCircle2, AlertCircle, Eraser, Loader2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { toPng } from 'html-to-image';
import { DeclarationForm, Item, Entity } from './types';

// Gerador de ID compatível
const generateId = () => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

// Formatador para Moeda/Números PT-BR (Milhar com ponto, decimal com vírgula)
const formatBR = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Unidades Cirion
const CIRION_UNITS = [
  { cnpj: '72.843.212/0006-56', uf: 'SP', cidade: 'Cotia', bairro: 'Pq. Sao George', endereco: 'Rua Eid Mansur 666 Andar 1' },
  { cnpj: '72.843.212/0022-76', uf: 'PE', cidade: 'Recife', bairro: 'Pina', endereco: 'Av. Republica 251 Sala 819 T' },
  { cnpj: '72.843.212/0002-22', uf: 'RJ', cidade: 'Rio de Janeiro', bairro: 'São Cristóvão', endereco: 'Av. Pedro II, 329' },
  { cnpj: '72.843.212/0013-85', uf: 'SP', cidade: 'Campinas', bairro: 'Nova Campinas', endereco: 'Rua Odila Maia Rocha Brito 527 Conj. 73' },
  { cnpj: '72.843.212/0021-95', uf: 'SP', cidade: 'São Paulo', bairro: 'Vila Olimpia', endereco: 'Alameda Vicente Pinzon 51 Andar 4' },
  { cnpj: '72.843.212/0008-18', uf: 'DF', cidade: 'Brasília', bairro: 'Asa Norte', endereco: 'ST SBN Quadra 1 Bloco B Salas 303 e 304 Edif. Confe' },
  { cnpj: '72.843.212/0005-75', uf: 'PR', cidade: 'Curitiba', bairro: 'Cidade Industrial', endereco: 'R. do Semeador 354' },
  { cnpj: '72.843.212/0011-13', uf: 'RS', cidade: 'Porto Alegre', bairro: 'Auxiliadora', endereco: 'Av. Carlos Gomes 141 Conj. 902' },
  { cnpj: '72.843.212/00197-0', uf: 'SP', cidade: 'Praia Grande', bairro: 'Mirim', endereco: 'Rua Moises Cardoso de Oliveira 100' },
  { cnpj: '72.843.212/0020-04', uf: 'CE', cidade: 'Fortaleza', bairro: 'Praia do Futuro', endereco: 'Av. Dioguinho 2950' },
  { cnpj: '72.843.212/0017-09', uf: 'BA', cidade: 'Salvador', bairro: 'Caminho das Arvores', endereco: 'Al Salvador 1057 Edif. Salva' },
  { cnpj: '72.843.212/0023-57', uf: 'SC', cidade: 'Joinville', bairro: 'Santo Antonio', endereco: 'Av. Santo Dumont 935' },
  { cnpj: '72.843.212/0012-02', uf: 'MG', cidade: 'Belo Horizonte', bairro: 'Funcionários', endereco: 'Av. Brasil 1438 Salas 601' },
  { cnpj: '72.843.212/0033-29', uf: 'GO', cidade: 'Goiania', bairro: 'Setor Marista', endereco: 'Av. 136 QD. F47 LT. 19/23 Ed. Executive tower 960 Sala 805' },
  { cnpj: '72.843.212/0009-07', uf: 'PR', cidade: 'Londrina', bairro: 'Centro', endereco: 'Av. Higienopolis 210 - 7° Andar S.A' },
];

const INITIAL_SENDER: Entity = {
  nome: 'Cirion Technologies',
  cnpj_cpf: '72.843.212/0006-56',
  endereco: 'Rua Eid Mansur 666 Andar 1 - Pq. Sao George',
  cidade: 'Cotia',
  uf: 'SP',
  cep: '06708-070'
};

const INITIAL_RECEIVER: Entity = {
  nome: 'Cirion Technologies',
  contato: '',
  cnpj_cpf: '72.843.212/0002-22',
  endereco: 'Av. Pedro II, 329 - São Cristóvão',
  cidade: 'Rio de Janeiro',
  uf: 'RJ',
  cep: '20941-070'
};

const App: React.FC = () => {
  const [form, setForm] = useState<DeclarationForm>({
    remetente: { ...INITIAL_SENDER },
    destinatario: { ...INITIAL_RECEIVER },
    itens: [{ id: generateId(), conteudo: 'Equipamento de TI', quantidade: 1, valor: 0 }],
    pesoTotal: '',
    cidadeDeclaracao: 'São Paulo', 
    dataDeclaracao: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    assinatura: null,
  });

  const sigPad = useRef<SignatureCanvas>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const updateEntity = (type: 'remetente' | 'destinatario', field: keyof Entity, value: string) => {
    setForm(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const selectUnit = (type: 'remetente' | 'destinatario', cnpj: string) => {
    const unit = CIRION_UNITS.find(u => u.cnpj === cnpj);
    if (unit) {
      setForm(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          cnpj_cpf: unit.cnpj,
          endereco: `${unit.endereco} - ${unit.bairro}`,
          cidade: unit.cidade,
          uf: unit.uf
        }
      }));
    }
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      itens: [...prev.itens, { id: generateId(), conteudo: '', quantidade: 1, valor: 0 }]
    }));
  };

  const removeItem = (id: string) => {
    setForm(prev => {
      if (prev.itens.length === 1) {
        return {
          ...prev,
          itens: prev.itens.map(i => ({ ...i, conteudo: '', quantidade: 1, valor: 0 }))
        };
      }
      return {
        ...prev,
        itens: prev.itens.filter(i => i.id !== id)
      };
    });
  };

  const updateItem = (id: string, field: keyof Item, value: string | number) => {
    setForm(prev => ({
      ...prev,
      itens: prev.itens.map(i => i.id === id ? { ...i, [field]: value } : i)
    }));
  };

  const clearSignature = () => {
    sigPad.current?.clear();
    setForm(prev => ({ ...prev, assinatura: null }));
    setIsSigned(false);
  };

  const saveSignature = () => {
    if (sigPad.current?.isEmpty()) return;
    const dataUrl = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
    if (dataUrl) {
      setForm(prev => ({ ...prev, assinatura: dataUrl }));
      setIsSigned(true);
    }
  };

  const calculateTotals = () => {
    const totalItems = form.itens.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
    const totalValue = form.itens.reduce((sum, item) => {
      const q = Number(item.quantidade) || 0;
      const v = Number(item.valor) || 0;
      return sum + (q * v);
    }, 0);
    return { totalItems, totalValue };
  };

  const sendEmail = async () => {
    if (!formRef.current) return;
    setIsCapturing(true);
    setTimeout(async () => {
      try {
        const dataUrl = await toPng(formRef.current!, { 
          cacheBust: true,
          backgroundColor: '#ffffff',
          pixelRatio: 2.0 
        });
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const data = [new ClipboardItem({ 'image/png': blob })];
        await navigator.clipboard.write(data);
        alert("SOLICITAÇÃO PRONTA E COPIADA!\n\nA imagem foi salva na sua área de transferência. Use Ctrl+V no Outlook.");
        const to = "larissa.pereira.ext@ciriontechnologies.com; antonio.castro@ciriontechnologies.com";
        const cc = "IT.EUS.Brasil.Tier2@ciriontechnologies.com";
        const subject = `Solicitação de Correio - ${form.destinatario.nome}`;
        let plainBody = `Olá,\n\nSolicito o envio da correspondência em anexo.\nCentro de Custo : J639I013\n\n[COLE A IMAGEM DA DECLARAÇÃO ABAIXO]:\n\n`;
        const mailtoUrl = `mailto:${to}?cc=${cc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
        window.location.href = mailtoUrl;
      } catch (err) {
        console.error(err);
        alert("Erro ao gerar imagem.");
      } finally {
        setIsCapturing(false);
      }
    }, 200);
  };

  const handlePrint = () => {
    if (isSigned) window.print();
  };

  const { totalItems, totalValue } = calculateTotals();

  const displayClass = (isInput: boolean) => {
    if (isCapturing) return isInput ? 'hidden' : 'inline-block';
    return isInput ? 'block' : 'hidden print:inline-block';
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      {/* Painel de Controle */}
      <div className="max-w-2xl mx-auto mb-4 no-print bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Solicitação de Correio</h1>
            <p className="text-xs text-gray-500 font-medium italic">TI EUS Brasil - Cirion Technologies</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handlePrint}
              disabled={!isSigned || isCapturing}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition shadow-sm ${
                isSigned && !isCapturing ? 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Download size={16} />
              IMPRIMIR
            </button>
            <button
              onClick={sendEmail}
              disabled={!isSigned || isCapturing}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition shadow-sm active:scale-95 ${
                isSigned && !isCapturing ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isCapturing ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {isCapturing ? 'PROCESSANDO...' : 'COPIAR P/ OUTLOOK'}
            </button>
          </div>
        </div>
      </div>

      {/* Formulário de Declaração */}
      <div ref={formRef} className={`max-w-2xl mx-auto bg-white shadow-xl overflow-hidden border border-gray-200 print:border-none print:shadow-none ${isCapturing ? 'capturing' : ''}`}>
        <div className="p-6 print:p-4 bg-white">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
             <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-yellow-400 flex items-center justify-center font-bold text-[8px] italic border border-black shadow-sm shrink-0 uppercase leading-none text-center p-1">Correios</div>
                <span className="font-bold text-lg uppercase tracking-wider text-gray-800 hidden sm:inline">Correios</span>
             </div>
             <h2 className="text-xl font-black text-center uppercase flex-1 tracking-tighter">Declaração de Conteúdo</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-l border-black">
            {/* Bloco Remetente */}
            <div className="border-r border-b border-black p-3 bg-gray-50/50">
              <h3 className="text-[10px] font-bold uppercase text-center border-b border-black mb-2 bg-gray-200 py-0.5">Remetente</h3>
              <div className="space-y-2 text-xs">
                <div className="flex flex-col no-print mb-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Selecione a Unidade Origem</span>
                  <select 
                    className="w-full bg-white border border-gray-200 rounded text-[10px] p-1 mt-0.5 outline-none focus:border-blue-500"
                    onChange={(e) => selectUnit('remetente', e.target.value)}
                    value={form.remetente.cnpj_cpf}
                  >
                    {CIRION_UNITS.map(u => (
                      <option key={`rem-${u.cnpj}`} value={u.cnpj}>{u.cidade} - {u.uf}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-1.5 border-b border-gray-200 pb-0.5">
                  <span className="font-bold shrink-0">NOME:</span>
                  <input className={`flex-1 bg-transparent border-none outline-none p-0 text-[11px] no-print ${displayClass(true)}`} value={form.remetente.nome} onChange={(e) => updateEntity('remetente', 'nome', e.target.value)} />
                  <span className={displayClass(false)}>{form.remetente.nome}</span>
                </div>
                <div className="flex gap-1.5 border-b border-gray-200 pb-0.5">
                  <span className="font-bold shrink-0">CNPJ:</span>
                  <input className={`flex-1 bg-transparent border-none outline-none p-0 text-[11px] no-print ${displayClass(true)}`} value={form.remetente.cnpj_cpf} onChange={(e) => updateEntity('remetente', 'cnpj_cpf', e.target.value)} />
                  <span className={displayClass(false)}>{form.remetente.cnpj_cpf}</span>
                </div>
                <div className="flex flex-col border-b border-gray-200 pb-0.5">
                  <span className="font-bold text-[9px] uppercase text-gray-400">Endereço Completo:</span>
                  <input className={`flex-1 bg-transparent border-none outline-none p-0 text-[10px] no-print ${displayClass(true)}`} value={form.remetente.endereco} onChange={(e) => updateEntity('remetente', 'endereco', e.target.value)} />
                  <span className={`${displayClass(false)} text-[10px]`}>{form.remetente.endereco}</span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <span className="font-bold shrink-0">CID/UF:</span>
                  <div className="flex gap-1 flex-1">
                    <input className={`flex-1 bg-transparent border-none outline-none p-0 text-[11px] no-print ${displayClass(true)}`} value={form.remetente.cidade} onChange={(e) => updateEntity('remetente', 'cidade', e.target.value)} />
                    <span className={displayClass(false)}>{form.remetente.cidade}</span>
                    <span className="text-gray-300">-</span>
                    <input className={`w-6 bg-transparent border-none outline-none p-0 text-[11px] no-print ${displayClass(true)} uppercase`} value={form.remetente.uf} maxLength={2} onChange={(e) => updateEntity('remetente', 'uf', e.target.value.toUpperCase())} />
                    <span className={displayClass(false)}>{form.remetente.uf}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco Destinatário */}
            <div className="border-r border-b border-black p-3 bg-white">
              <h3 className="text-[10px] font-bold uppercase text-center border-b border-black mb-2 bg-gray-200 py-0.5">Destinatário</h3>
              <div className="space-y-2 text-xs">
                <div className="flex flex-col no-print mb-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Selecione a Unidade Destino</span>
                  <select 
                    className="w-full bg-white border border-gray-200 rounded text-[10px] p-1 mt-0.5 outline-none focus:border-blue-500"
                    onChange={(e) => selectUnit('destinatario', e.target.value)}
                    value={CIRION_UNITS.some(u => u.cnpj === form.destinatario.cnpj_cpf) ? form.destinatario.cnpj_cpf : ""}
                  >
                    <option value="">(Endereço Personalizado)</option>
                    {CIRION_UNITS.map(u => (
                      <option key={`dest-${u.cnpj}`} value={u.cnpj}>{u.cidade} - {u.uf}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-1.5 border-b border-gray-200 pb-0.5">
                  <span className="font-bold shrink-0 uppercase">Nome:</span>
                  <input className={`flex-1 bg-transparent border-none outline-none p-0 text-[11px] no-print font-bold ${displayClass(true)}`} value={form.destinatario.nome} onChange={(e) => updateEntity('destinatario', 'nome', e.target.value)} />
                  <span className={`${displayClass(false)} font-bold`}>{form.destinatario.nome}</span>
                </div>
                <div className="flex gap-1.5 border-b border-gray-200 pb-0.5 text-blue-800 font-bold">
                  <span className="shrink-0">A/C:</span>
                  <input className={`flex-1 bg-transparent border-none outline-none p-0 text-[11px] no-print ${displayClass(true)}`} placeholder="Nome do Responsável" value={form.destinatario.contato || ''} onChange={(e) => updateEntity('destinatario', 'contato', e.target.value)} />
                  <span className={displayClass(false)}>{form.destinatario.contato || '---'}</span>
                </div>
                <div className="flex flex-col border-b border-gray-200 pb-0.5">
                  <span className="font-bold text-[9px] uppercase text-gray-400">Endereço Completo:</span>
                  <input className={`flex-1 bg-transparent border-none outline-none p-0 text-[10px] no-print ${displayClass(true)}`} value={form.destinatario.endereco} onChange={(e) => updateEntity('destinatario', 'endereco', e.target.value)} />
                  <span className={`${displayClass(false)} text-[10px]`}>{form.destinatario.endereco}</span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <span className="font-bold shrink-0">CID/UF:</span>
                  <div className="flex gap-1 flex-1">
                    <input className={`flex-1 bg-transparent border-none outline-none p-0 text-[11px] no-print ${displayClass(true)}`} value={form.destinatario.cidade} onChange={(e) => updateEntity('destinatario', 'cidade', e.target.value)} />
                    <span className={displayClass(false)}>{form.destinatario.cidade}</span>
                    <span className="text-gray-300">-</span>
                    <input className={`w-6 bg-transparent border-none outline-none p-0 text-[11px] no-print ${displayClass(true)} uppercase`} value={form.destinatario.uf} maxLength={2} onChange={(e) => updateEntity('destinatario', 'uf', e.target.value.toUpperCase())} />
                    <span className={displayClass(false)}>{form.destinatario.uf}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Itens */}
          <div className="mt-0 border-l border-r border-black overflow-hidden">
            <h3 className="text-[10px] font-bold uppercase text-center border-b border-black bg-gray-200 py-0.5">Identificação dos Bens</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-white">
                  <th className="border-b border-r border-black p-1.5 w-10 text-[9px]">ITEM</th>
                  <th className="border-b border-r border-black p-1.5 text-left text-[9px] uppercase">CONTEÚDO (DESCRIÇÃO DO MATERIAL)</th>
                  <th className="border-b border-r border-black p-1.5 w-16 text-[9px]">QTD</th>
                  <th className="border-b border-black p-1.5 w-32 text-[9px]">VALOR UNIT. (R$)</th>
                  <th className="no-print border-b border-black w-8"></th>
                </tr>
              </thead>
              <tbody>
                {form.itens.map((item, index) => (
                  <tr key={item.id} className="bg-white group">
                    <td className="border-b border-r border-black p-1.5 text-center font-bold text-[10px]">{index + 1}</td>
                    <td className="border-b border-r border-black p-1.5">
                      <input className={`w-full bg-transparent border-none outline-none p-0 text-[11px] no-print ${displayClass(true)}`} placeholder="Ex: Monitor Dell 24 pol..." value={item.conteudo} onChange={(e) => updateItem(item.id, 'conteudo', e.target.value)} />
                      <span className={displayClass(false)}>{item.conteudo}</span>
                    </td>
                    <td className="border-b border-r border-black p-1.5 text-center">
                      <input 
                        type="number" 
                        className={`w-full text-center bg-transparent border-none p-0 text-[11px] no-print ${displayClass(true)} font-bold`} 
                        value={item.quantidade} 
                        onChange={(e) => updateItem(item.id, 'quantidade', parseInt(e.target.value) || 0)} 
                      />
                      <span className={displayClass(false)}>{item.quantidade}</span>
                    </td>
                    <td className="border-b border-black p-1.5 text-right relative px-2">
                      <div className="flex items-center justify-end w-full">
                        <span className={`no-print mr-1 text-[9px] text-gray-400 ${displayClass(true)}`}>R$</span>
                        <input 
                          type="text" 
                          className={`w-full text-right bg-transparent border-none p-0 text-[11px] no-print ${displayClass(true)} focus:ring-0 font-mono`} 
                          value={formatBR.format(item.valor)} 
                          onChange={(e) => {
                            // Extrai apenas os dígitos do que foi digitado
                            const digits = e.target.value.replace(/\D/g, "");
                            // Converte para valor numérico (centavos / 100)
                            const numericValue = Number(digits) / 100;
                            updateItem(item.id, 'valor', numericValue);
                          }}
                        />
                        <span className={`${displayClass(false)} font-mono text-[11px]`}>
                          {formatBR.format(item.valor)}
                        </span>
                      </div>
                    </td>
                    <td className="no-print p-1 border-b border-black text-center bg-gray-50/30">
                       <button onClick={() => removeItem(item.id)} title="Excluir item" className="p-1 text-red-400 hover:text-red-700 hover:bg-red-50 rounded transition-all active:scale-75">
                          <Trash2 size={14} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold text-[10px]">
                  <td colSpan={2} className="border-b border-r border-black p-1.5 text-right uppercase tracking-tighter">SOMA DOS VALORES (Quantidade x Valor Unitário)</td>
                  <td className="border-b border-r border-black p-1.5 text-center bg-gray-200">{totalItems}</td>
                  <td className="border-b border-black p-1.5 text-right font-mono bg-yellow-50 text-[11px] px-2">
                    R$ {formatBR.format(totalValue)}
                  </td>
                  <td className="no-print border-b border-black bg-gray-100"></td>
                </tr>
                <tr className="bg-white font-bold text-[10px]">
                   <td colSpan={3} className="border-b border-r border-black p-1.5 text-right uppercase">PESO TOTAL ESTIMADO (kg)</td>
                   <td className="border-b border-black p-1.5 text-right px-2">
                      <input 
                        type="text" 
                        className={`w-full text-right bg-transparent border-none p-0 text-[11px] no-print font-bold ${displayClass(true)} font-mono`} 
                        value={form.pesoTotal} 
                        onChange={(e) => setForm(prev => ({ ...prev, pesoTotal: e.target.value }))} 
                        placeholder="Ex: 0,500"
                      />
                      <span className={`${displayClass(false)} font-bold font-mono text-[11px]`}>
                        {form.pesoTotal || '---'}
                      </span>
                   </td>
                   <td className="no-print border-b border-black bg-white"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button onClick={addItem} className="mt-2 no-print flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 transition py-1 px-2 hover:bg-blue-50 rounded-md">
            <Plus size={14} /> ADICIONAR NOVO ITEM
          </button>

          {/* Seção de Declaração e Assinatura */}
          <div className="mt-4 border border-black p-4 bg-white relative">
            <h3 className="text-[10px] font-bold uppercase text-center mb-2">OBSERVAÇÃO:</h3>
            <div className="text-[8px] text-justify leading-snug mb-3 text-gray-800 space-y-2">
              <p>
                <b>I.</b> É Contribuinte de ICMS qualquer pessoa física ou jurídica, que realize, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria ou prestações de serviços de transportes interestadual e intermunicipal e de comunicação, ainda que as operações e prestações se iniciem no exterior (Lei Complementar nº 87/96 Art. 4º).
              </p>
              <p>
                <b>II.</b> Constitui crime contra a ordem tributária suprimir ou reduzir tributo, ou contribuição social e qualquer acessório: quando negar ou deixar de fornecer, quando obrigatório, nota fiscal ou documento equivalente, relativa a venda de mercadoria ou prestação de serviço, efetivamente realizada, ou fornecê-la em desacordo com a legislação. Sob pena de reclusão de 2 (dois) a 5 (anos), e multa (Lei 8.137/90 Art. 1º, V).
              </p>
            </div>
            
            <div className="flex items-end justify-between gap-4 mt-6">
              <div className="text-[10px] font-bold border-b border-black/10 pb-1 flex flex-col">
                <span className="text-[8px] uppercase text-gray-400 font-medium">Local e Data:</span>
                <span>{form.cidadeDeclaracao}, {form.dataDeclaracao}</span>
              </div>
              
              <div className="flex flex-col items-center w-52">
                <div className="w-full flex flex-col items-center relative group">
                   <div className="h-14 w-full flex items-end justify-center mb-[-2px] overflow-hidden">
                      {isSigned && form.assinatura && (
                        <img src={form.assinatura} alt="Assinatura" className="max-h-14 object-contain" />
                      )}
                   </div>
                   <div className="w-full border-t border-black"></div>
                   <span className="text-[8px] uppercase font-bold text-center mt-1">Assinatura do Declarante</span>

                   {!isSigned && (
                     <div className="no-print absolute bottom-12 right-0 w-72 border-2 border-dashed border-blue-300 rounded-xl p-3 bg-white/95 backdrop-blur-md shadow-2xl z-20 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-blue-600 mb-2 uppercase tracking-tight">Assine abaixo</span>
                        <SignatureCanvas 
                          ref={sigPad} 
                          penColor="navy" 
                          canvasProps={{ 
                            width: 260, 
                            height: 100, 
                            className: 'sigCanvas border-2 border-gray-100 bg-gray-50 rounded-lg cursor-crosshair w-full' 
                          }} 
                        />
                        <div className="flex gap-2 mt-3 w-full">
                           <button onClick={clearSignature} className="flex-1 flex items-center justify-center gap-1 text-[9px] text-red-600 font-bold hover:bg-red-50 py-2 rounded-lg border border-red-100 transition shadow-sm active:scale-95">
                              <Eraser size={12} /> Limpar
                           </button>
                           <button onClick={saveSignature} className="flex-1 flex items-center justify-center gap-1 text-[9px] text-white bg-green-600 font-bold hover:bg-green-700 py-2 rounded-lg transition shadow-md active:scale-95">
                              <CheckCircle2 size={12} /> Confirmar
                           </button>
                        </div>
                     </div>
                   )}

                   {isSigned && (
                      <button onClick={clearSignature} title="Alterar assinatura" className="no-print absolute -top-6 -right-2 bg-red-100 text-red-600 rounded-full p-1.5 shadow-sm hover:bg-red-200 transition-all border border-red-200">
                         <Trash2 size={14} />
                      </button>
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="no-print bg-blue-50/80 border-t border-gray-100 p-4">
           <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <div className="text-[10px] text-blue-900 leading-normal">
                <p className="font-bold uppercase tracking-tight mb-1">Dicas para o envio:</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                  <li>Valores com <b>ponto para milhar</b> e <b>vírgula para decimal</b>.</li>
                  <li>O campo <b>TOTAIS</b> soma automaticamente (Quantidade x Valor Unitário).</li>
                  <li>Após assinar, clique em <b>COPIAR P/ OUTLOOK</b> e cole com <b>Ctrl+V</b> no e-mail.</li>
                  <li>O peso total deve ser inserido em <b>Kg</b> (Ex: 0,500 para 500g).</li>
                </ul>
              </div>
           </div>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto mt-6 no-print text-center text-gray-400 text-[9px] font-bold uppercase tracking-[0.2em] opacity-50">
         <p>Cirion Technologies - TI EUS Brasil | Workflow Automatizado v2.1</p>
      </div>
    </div>
  );
};

export default App;
