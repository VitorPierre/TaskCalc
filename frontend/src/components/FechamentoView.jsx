/**
 * =============================================================================
 * COMPONENTE: FechamentoView.jsx
 * =============================================================================
 * Papel na Arquitetura:
 * - Tela de Fechamento de Período e Emissão de Relatório em PDF.
 * - Permite selecionar o intervalo de datas (início e fim) com atalhos rápidos.
 * - Busca e lista os serviços pendentes no período, somando o valor bruto.
 * - Permite aplicar descontos e acréscimos com cálculo de valor líquido em tempo real.
 * - Envia os dados para a rota POST /api/v1/fechamentos/ do FastAPI.
 * - Gera, permite baixar e exibe o PDF consolidado em modal/iframe embutido.
 * - Lista o histórico completo de fechamentos anteriores já faturados.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { fechamentosAPI, lancamentosAPI } from '../api/api';
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
  Download,
  ExternalLink,
  Clock,
  CheckCheck,
  Sliders,
  DollarSign,
  Maximize2,
  X,
  History,
} from 'lucide-react';

export default function FechamentoView({ onFechamentoConcluido }) {
  // Helpers para cálculo de datas padrão
  const obterPeriodoMesAtual = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const primeiroDia = new Date(ano, mes, 1, 0, 0, 0);
    const ultimoDia = new Date(ano, mes + 1, 0, 23, 59, 59);

    const formatarISO = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    return {
      inicio: formatarISO(primeiroDia),
      fim: formatarISO(ultimoDia),
    };
  };

  const periodoPadrao = obterPeriodoMesAtual();
  const [dataInicio, setDataInicio] = useState(periodoPadrao.inicio);
  const [dataFim, setDataFim] = useState(periodoPadrao.fim);
  const [desconto, setDesconto] = useState('0.00');
  const [acrescimo, setAcrescimo] = useState('0.00');
  const [observacoes, setObservacoes] = useState('');

  // Estados de dados
  const [lancamentosPendentes, setLancamentosPendentes] = useState([]);
  const [carregandoPendentes, setCarregandoPendentes] = useState(false);
  const [historicoFechamentos, setHistoricoFechamentos] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // Estados de ações
  const [efetivando, setEfetivando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  // Modal / Preview do PDF gerado
  const [fechamentoAtual, setFechamentoAtual] = useState(null);
  const [exibirModalPdf, setExibirModalPdf] = useState(false);
  const [urlPdfModal, setUrlPdfModal] = useState('');

  // 1. Busca os lançamentos pendentes no período selecionado
  const buscarPendentesNoPeriodo = async () => {
    setCarregandoPendentes(true);
    setErro(null);
    try {
      const dataIniISO = new Date(dataInicio).toISOString();
      const dataFimISO = new Date(dataFim).toISOString();

      // Utiliza simulação ou busca filtrada por status PENDENTE
      const res = await fechamentosAPI.simular({
        data_inicio: dataIniISO,
        data_fim: dataFimISO,
        desconto: parseFloat(desconto) || 0.0,
        acrescimo: parseFloat(acrescimo) || 0.0,
      });

      setLancamentosPendentes(res.lancamentos || []);
      if (res.total_lancamentos === 0) {
        setErro('Nenhum serviço com status PENDENTE foi localizado neste intervalo de datas.');
      }
    } catch (err) {
      setErro(err.message || 'Falha ao buscar lançamentos pendentes no período.');
    } finally {
      setCarregandoPendentes(false);
    }
  };

  // 2. Carrega o histórico de fechamentos
  const carregarHistorico = async () => {
    setCarregandoHistorico(true);
    try {
      const data = await fechamentosAPI.listar();
      setHistoricoFechamentos(data);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  useEffect(() => {
    buscarPendentesNoPeriodo();
    carregarHistorico();
  }, []);

  // Atalhos de datas
  const aplicarAtalhoDatas = (tipo) => {
    const agora = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formatar = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    let ini, fim;

    if (tipo === 'mes_atual') {
      ini = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0);
      fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59);
    } else if (tipo === 'mes_anterior') {
      ini = new Date(agora.getFullYear(), agora.getMonth() - 1, 1, 0, 0);
      fim = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59);
    } else if (tipo === 'ultimos_15_dias') {
      fim = new Date(agora);
      fim.setHours(23, 59, 59);
      ini = new Date(agora);
      ini.setDate(ini.getDate() - 15);
      ini.setHours(0, 0, 0);
    } else if (tipo === 'ultimos_30_dias') {
      fim = new Date(agora);
      fim.setHours(23, 59, 59);
      ini = new Date(agora);
      ini.setDate(ini.getDate() - 30);
      ini.setHours(0, 0, 0);
    }

    if (ini && fim) {
      setDataInicio(formatar(ini));
      setDataFim(formatar(fim));
    }
  };

  // Cálculos financeiros em tempo real
  const valorBrutoCalculado = lancamentosPendentes.reduce(
    (acc, item) => acc + (item.valor_total || 0),
    0
  );
  const descontoNum = parseFloat(desconto) || 0.0;
  const acrescimoNum = parseFloat(acrescimo) || 0.0;
  const valorLiquidoCalculado = Math.max(0, valorBrutoCalculado - descontoNum + acrescimoNum);

  // Efetivar Fechamento e Gerar PDF
  const handleEfetivarFechamento = async () => {
    if (lancamentosPendentes.length === 0) {
      setErro('Não há lançamentos pendentes no período para efetuar o fechamento.');
      return;
    }

    setEfetivando(true);
    setErro(null);

    try {
      const payload = {
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: new Date(dataFim).toISOString(),
        desconto: descontoNum,
        acrescimo: acrescimoNum,
        observacoes: observacoes.trim() || null,
      };

      const res = await fechamentosAPI.criar(payload);
      setFechamentoAtual(res);
      setSucesso(
        `Fechamento #${res.id} concluído com sucesso! ${res.total_lancamentos} serviço(s) foram marcados como FATURADO.`
      );

      // Abre visualização do PDF gerado
      const urlPdf = fechamentosAPI.getUrlPdf(res.id);
      setUrlPdfModal(urlPdf);
      setExibirModalPdf(true);

      // Limpa lista de pendentes pois foram todos faturados
      setLancamentosPendentes([]);
      await carregarHistorico();

      if (onFechamentoConcluido) {
        onFechamentoConcluido(res);
      }
    } catch (err) {
      setErro(err.message || 'Falha ao efetivar o fechamento de período.');
    } finally {
      setEfetivando(false);
    }
  };

  // Visualizar PDF no modal
  const handleAbrirPdf = (fechamentoId) => {
    const url = fechamentosAPI.getUrlPdf(fechamentoId);
    setUrlPdfModal(url);
    setExibirModalPdf(true);
  };

  const formatarMoeda = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatarData = (dt) => {
    if (!dt) return '-';
    return new Date(dt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatarDataSimples = (dt) => {
    if (!dt) return '-';
    return new Date(dt).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 1: CABEÇALHO DA TELA                                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-brand-600" />
            Fechamento de Período & Faturamento
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Consolide serviços pendentes, aplique ajustes de descontos/acréscimos e emita o PDF oficial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={carregarHistorico}
            disabled={carregandoHistorico}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Atualizar histórico"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregandoHistorico ? 'animate-spin text-brand-600' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Alertas */}
      {sucesso && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">{sucesso}</p>
              {fechamentoAtual && (
                <p className="text-xs text-emerald-700 mt-0.5">
                  Valor Líquido: <b>{formatarMoeda(fechamentoAtual.valor_liquido)}</b> &bull; Status: <b>FATURADO</b>
                </p>
              )}
            </div>
          </div>
          {fechamentoAtual && (
            <button
              onClick={() => handleAbrirPdf(fechamentoAtual.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors shrink-0"
            >
              <Eye className="w-3.5 h-3.5" /> Visualizar PDF
            </button>
          )}
        </div>
      )}

      {erro && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 2: CARD DE APURAÇÃO DO PERÍODO & FORMULÁRIO                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Topo do Card com Atalhos */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  <Calendar className="w-4 h-4" />
                </span>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Definição do Período de Apuração
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Escolha o intervalo de datas para buscar todos os serviços que ainda estão com status <b>PENDENTE</b>.
              </p>
            </div>

            {/* Atalhos Rápidos */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] mr-1">Atalhos:</span>
              <button
                type="button"
                onClick={() => aplicarAtalhoDatas('ultimos_15_dias')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                Últimos 15 Dias
              </button>
              <button
                type="button"
                onClick={() => aplicarAtalhoDatas('mes_atual')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={() => aplicarAtalhoDatas('mes_anterior')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                Mês Anterior
              </button>
            </div>
          </div>
        </div>

        {/* Inputs do Período e Ajustes */}
        <div className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* DATA INICIAL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Data Inicial do Período *
              </label>
              <input
                type="datetime-local"
                required
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs font-medium text-slate-900"
              />
            </div>

            {/* DATA FINAL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Data Final do Período *
              </label>
              <input
                type="datetime-local"
                required
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs font-medium text-slate-900"
              />
            </div>

            {/* DESCONTO */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Desconto Opcional (R$)</span>
                <span className="text-[10px] text-rose-600 font-semibold">- abatimento</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  className="w-full text-sm pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all shadow-2xs font-semibold text-rose-700"
                />
              </div>
            </div>

            {/* ACRÉSCIMO */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Acréscimo Opcional (R$)</span>
                <span className="text-[10px] text-blue-600 font-semibold">+ adicionais</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={acrescimo}
                  onChange={(e) => setAcrescimo(e.target.value)}
                  className="w-full text-sm pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-2xs font-semibold text-blue-700"
                />
              </div>
            </div>

            {/* OBSERVAÇÕES */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Observações do Fechamento (Impresso no PDF oficial)
              </label>
              <input
                type="text"
                placeholder="Ex: Pagamento acordado para o dia 10 via transferência; desconto comercial concedido..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={buscarPendentesNoPeriodo}
              disabled={carregandoPendentes}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregandoPendentes ? 'animate-spin text-brand-600' : ''}`} />
              {carregandoPendentes ? 'Buscando Serviços...' : 'Consultar Lançamentos no Período'}
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SEÇÃO 3: TABELA DE LANÇAMENTOS PENDENTES NO PERÍODO              */}
        {/* ----------------------------------------------------------------- */}
        <div className="border-t border-slate-200">
          <div className="p-4 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-xs text-slate-800">
                Lançamentos Pendentes Encontrados ({lancamentosPendentes.length})
              </span>
            </div>
            <span className="text-xs text-slate-500">
              Período: {formatarDataSimples(dataInicio)} até {formatarDataSimples(dataFim)}
            </span>
          </div>

          {carregandoPendentes ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
              Filtrando serviços pendentes...
            </div>
          ) : lancamentosPendentes.length === 0 ? (
            <div className="py-10 text-center p-6 text-slate-500 text-xs">
              Nenhum serviço pendente encontrado no período selecionado. Ajuste o intervalo de datas acima.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white border-b border-slate-200 text-slate-500 font-semibold sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Data Execução</th>
                    <th className="py-2.5 px-4">Serviço Prestado</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Qtd</th>
                    <th className="py-2.5 px-4 text-right">Unitário</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lancamentosPendentes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatarData(item.data_execucao)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {item.nome_servico}
                        {item.descricao && (
                          <span className="block font-normal text-slate-400 text-[11px]">{item.descricao}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          PENDENTE
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                        {item.quantidade} <span className="text-[10px] text-slate-400">{item.unidade_medida}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-600">
                        {formatarMoeda(item.valor_unitario)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {formatarMoeda(item.valor_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SEÇÃO 4: RESUMO FINANCEIRO & BOTÃO DE EFETIVAÇÃO E PDF           */}
        {/* ----------------------------------------------------------------- */}
        <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Card com os valores calculados */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:max-w-2xl text-center">
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                Total Bruto
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">
                {formatarMoeda(valorBrutoCalculado)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] uppercase font-semibold text-rose-500 block tracking-wider">
                Desconto (-)
              </span>
              <span className="text-sm sm:text-base font-extrabold text-rose-600">
                - {formatarMoeda(descontoNum)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] uppercase font-semibold text-blue-500 block tracking-wider">
                Acréscimos (+)
              </span>
              <span className="text-sm sm:text-base font-extrabold text-blue-600">
                + {formatarMoeda(acrescimoNum)}
              </span>
            </div>

            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block tracking-wider">
                Valor Líquido Final
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-700">
                {formatarMoeda(valorLiquidoCalculado)}
              </span>
            </div>
          </div>

          {/* Botão de Fechamento Oficial */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleEfetivarFechamento}
              disabled={efetivando || lancamentosPendentes.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-600/25 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {efetivando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gerando PDF & Faturando...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Efetivar Fechamento & Gerar PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 5: HISTÓRICO DE FECHAMENTOS ANTERIORES                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-brand-600" />
              Histórico de Fechamentos Realizados
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {historicoFechamentos.length} emissões
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Demonstrativos contábeis consolidados disponíveis para visualização e download em PDF.
            </p>
          </div>
        </div>

        {carregandoHistorico ? (
          <div className="py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
            Carregando fechamentos anteriores...
          </div>
        ) : historicoFechamentos.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <h5 className="text-sm font-semibold text-slate-700">Nenhum fechamento registrado</h5>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Ao concluir um faturamento de período pelo painel acima, os demonstrativos oficiais em PDF aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Fechamento</th>
                    <th className="py-3 px-4">Período de Apuração</th>
                    <th className="py-3 px-4 text-center">Itens Faturados</th>
                    <th className="py-3 px-4 text-right">Valor Bruto</th>
                    <th className="py-3 px-4 text-right">Ajustes (+ / -)</th>
                    <th className="py-3 px-4 text-right">Valor Líquido</th>
                    <th className="py-3 px-4 text-center">Demonstrativo PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historicoFechamentos.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-brand-700 whitespace-nowrap">
                        #{item.id.toString().padStart(4, '0')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        {formatarDataSimples(item.data_inicio)} até {formatarDataSimples(item.data_fim)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-medium text-slate-600">
                        {item.total_lancamentos} serviço(s)
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600 whitespace-nowrap font-medium">
                        {formatarMoeda(item.valor_bruto)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 whitespace-nowrap text-[11px]">
                        -{formatarMoeda(item.desconto)} / +{formatarMoeda(item.acrescimo)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700 text-sm whitespace-nowrap">
                        {formatarMoeda(item.valor_liquido)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAbrirPdf(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                            title="Visualizar PDF na tela"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver PDF
                          </button>
                          <a
                            href={fechamentosAPI.getUrlPdf(item.id)}
                            download={`fechamento_${item.id.toString().padStart(4, '0')}.pdf`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                            title="Baixar arquivo PDF diretamente"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* MODAL DE VISUALIZAÇÃO DIRETA DO PDF                               */}
      {/* ----------------------------------------------------------------- */}
      {exibirModalPdf && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden border border-slate-300">
            {/* Topo do Modal */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-400" />
                <span className="font-bold text-sm">Demonstrativo de Fechamento em PDF (TaskCalc)</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={urlPdfModal}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors"
                  title="Abrir em nova aba do navegador"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir Externa
                </a>
                <a
                  href={urlPdfModal}
                  download="fechamento.pdf"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
                  title="Baixar PDF no computador"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar
                </a>
                <button
                  type="button"
                  onClick={() => setExibirModalPdf(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
                  title="Fechar visualizador"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Iframe embutido renderizando o PDF nativo do navegador */}
            <div className="flex-1 w-full bg-slate-200">
              <iframe
                src={urlPdfModal}
                title="Visualizador de Fechamento PDF"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
