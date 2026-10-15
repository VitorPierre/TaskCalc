import React, { useState, useEffect } from 'react';
import { fechamentosAPI } from '../api/api';
import {
  FileCheck,
  FileText,
  FileDown,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  Calculator,
  ArrowRight,
} from 'lucide-react';

export default function FechamentoTab({ onUpdateCounts }) {
  const [fechamentos, setFechamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  // Helper para datas padrões (mês atual)
  const obterDatasPadrao = () => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

    const formatarInput = (d) => d.toISOString().slice(0, 10);
    return {
      inicio: formatarInput(primeiroDia) + 'T00:00:00',
      fim: formatarInput(ultimoDia) + 'T23:59:59',
    };
  };

  const datasPadrao = obterDatasPadrao();
  const [dataInicio, setDataInicio] = useState(datasPadrao.inicio);
  const [dataFim, setDataFim] = useState(datasPadrao.fim);
  const [desconto, setDesconto] = useState('0.00');
  const [acrescimo, setAcrescimo] = useState('0.00');
  const [observacoes, setObservacoes] = useState('');

  // Estado da Simulação
  const [simulando, setSimulando] = useState(false);
  const [simulacaoResultado, setSimulacaoResultado] = useState(null);

  // Estado da Efetivação
  const [efetivando, setEfetivando] = useState(false);
  const [ultimoFechamentoCriado, setUltimoFechamentoCriado] = useState(null);

  const carregarHistorico = async () => {
    setCarregando(true);
    try {
      const data = await fechamentosAPI.listar();
      setFechamentos(data);
      if (onUpdateCounts) {
        onUpdateCounts((prev) => ({ ...prev, fechamentos: data.length }));
      }
    } catch (err) {
      setErro(err.message || 'Falha ao carregar histórico de fechamentos.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  const handleSimular = async () => {
    setSimulando(true);
    setErro(null);
    setSimulacaoResultado(null);
    try {
      const payload = {
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: new Date(dataFim).toISOString(),
        desconto: parseFloat(desconto) || 0.0,
        acrescimo: parseFloat(acrescimo) || 0.0,
      };
      const res = await fechamentosAPI.simular(payload);
      setSimulacaoResultado(res);
      if (res.total_lancamentos === 0) {
        setErro('Nenhum serviço com status PENDENTE foi localizado neste intervalo de datas.');
      }
    } catch (err) {
      setErro(err.message || 'Erro ao simular fechamento.');
    } finally {
      setSimulando(false);
    }
  };

  const handleEfetivarFechamento = async () => {
    setEfetivando(true);
    setErro(null);
    try {
      const payload = {
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: new Date(dataFim).toISOString(),
        desconto: parseFloat(desconto) || 0.0,
        acrescimo: parseFloat(acrescimo) || 0.0,
        observacoes: observacoes.trim() || null,
      };
      const res = await fechamentosAPI.criar(payload);
      setSucesso(`Fechamento #${res.id} concluído com sucesso e arquivo PDF emitido!`);
      setUltimoFechamentoCriado(res);
      setSimulacaoResultado(null);
      await carregarHistorico();
    } catch (err) {
      setErro(err.message || 'Falha ao efetivar fechamento.');
    } finally {
      setEfetivando(false);
    }
  };

  const formatarMoeda = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatarDataSimples = (dt) => {
    if (!dt) return '-';
    return new Date(dt).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-brand-600" /> Fechamento de Período & Emissão de PDF
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Consolide serviços pendentes em um determinado intervalo, aplique acréscimos/descontos e emita o PDF oficial.
          </p>
        </div>

        <button
          onClick={carregarHistorico}
          disabled={carregando}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin text-brand-600' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Alertas */}
      {sucesso && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold">{sucesso}</p>
              {ultimoFechamentoCriado && (
                <p className="text-xs text-emerald-700 mt-0.5">
                  Valor Líquido: <b>{formatarMoeda(ultimoFechamentoCriado.valor_liquido)}</b> ({ultimoFechamentoCriado.total_lancamentos} serviços faturados)
                </p>
              )}
            </div>
          </div>
          {ultimoFechamentoCriado && (
            <a
              href={fechamentosAPI.getUrlPdf(ultimoFechamentoCriado.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors shrink-0"
            >
              <FileDown className="w-3.5 h-3.5" /> Baixar PDF
            </a>
          )}
        </div>
      )}

      {erro && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Painel de Apuração e Fechamento */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-600" /> Parâmetros de Fechamento do Período
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Data Inicial *</label>
            <input
              type="datetime-local"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Data Final *</label>
            <input
              type="datetime-local"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Desconto (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Acréscimos / Taxas (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={acrescimo}
              onChange={(e) => setAcrescimo(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">Observações do Fechamento (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Pagamento acordado via PIX, desconto especial de fidelidade..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSimular}
            disabled={simulando}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            {simulando ? 'Simulando...' : 'Simular Prévia'}
          </button>

          <button
            type="button"
            onClick={handleEfetivarFechamento}
            disabled={efetivando}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-600/20 transition-all hover:shadow disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {efetivando ? 'Processando & Gerando PDF...' : 'Efetivar Fechamento & Gerar PDF'}
          </button>
        </div>
      </div>

      {/* Resultado da Simulação (Se disparado) */}
      {simulacaoResultado && (
        <div className="bg-brand-50/50 p-5 rounded-xl border border-brand-200 shadow-xs animate-fadeIn">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-brand-600" /> Resultado da Simulação Prévia
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
            <div className="bg-white p-3 rounded-lg border border-slate-200/80">
              <span className="text-[11px] text-slate-500 block">Serviços Elegíveis</span>
              <span className="text-base font-bold text-slate-900">
                {simulacaoResultado.total_lancamentos}
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200/80">
              <span className="text-[11px] text-slate-500 block">Total Bruto</span>
              <span className="text-base font-bold text-slate-900">
                {formatarMoeda(simulacaoResultado.valor_bruto)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200/80">
              <span className="text-[11px] text-slate-500 block">Ajustes (+ / -)</span>
              <span className="text-xs font-bold text-slate-700">
                +{formatarMoeda(simulacaoResultado.acrescimo)} / -{formatarMoeda(simulacaoResultado.desconto)}
              </span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              <span className="text-[11px] text-emerald-800 font-medium block">Total Líquido</span>
              <span className="text-base font-bold text-emerald-700">
                {formatarMoeda(simulacaoResultado.valor_liquido)}
              </span>
            </div>
          </div>

          {simulacaoResultado.lancamentos.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
              <div className="p-2.5 bg-slate-50 font-semibold text-slate-700 border-b border-slate-200">
                Serviços que serão faturados:
              </div>
              <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {simulacaoResultado.lancamentos.map((item) => (
                  <li key={item.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50/50">
                    <div>
                      <span className="font-semibold text-slate-800">{item.nome_servico}</span>
                      <span className="text-slate-400 ml-2">({formatarDataSimples(item.data_execucao)})</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatarMoeda(item.valor_total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Histórico de Fechamentos Efetuados */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-600" /> Histórico de Fechamentos Realizados
        </h3>

        {carregando ? (
          <div className="py-10 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
            Carregando histórico...
          </div>
        ) : fechamentos.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 p-6">
            <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs text-slate-500">
              Nenhum fechamento contábil foi realizado ainda. Realize a simulação e o faturamento acima.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Fechamento</th>
                    <th className="py-3 px-4">Período de Apuração</th>
                    <th className="py-3 px-4 text-center">Itens</th>
                    <th className="py-3 px-4 text-right">Valor Bruto</th>
                    <th className="py-3 px-4 text-right">Ajustes</th>
                    <th className="py-3 px-4 text-right">Valor Líquido</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fechamentos.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-brand-700 whitespace-nowrap">
                        #{f.id.toString().padStart(4, '0')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatarDataSimples(f.data_inicio)} a {formatarDataSimples(f.data_fim)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-medium text-slate-700">
                        {f.total_lancamentos}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600 whitespace-nowrap">
                        {formatarMoeda(f.valor_bruto)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 whitespace-nowrap text-[11px]">
                        -{formatarMoeda(f.desconto)} / +{formatarMoeda(f.acrescimo)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700 text-sm whitespace-nowrap">
                        {formatarMoeda(f.valor_liquido)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <a
                          href={fechamentosAPI.getUrlPdf(f.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                          title="Visualizar ou Baixar Relatório em PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" /> PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
