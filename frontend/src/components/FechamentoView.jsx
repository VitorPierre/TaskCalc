/**
 * =============================================================================
 * COMPONENTE: FechamentoView.jsx (Refatorado)
 * =============================================================================
 * Papel na Arquitetura:
 * - Tela de Fechamento de Período, Apuração Financeira e Emissão de Relatório em PDF.
 * - Cartões de resumo financeiro (Stat Cards) em destaque no topo:
 *   * Valor Bruto apurado
 *   * Descontos concedidos
 *   * Acréscimos/taxas
 *   * Valor Líquido final em DESTAQUE MAIOR com estilo visual proeminente
 * - Tabela de lançamentos pendentes com linhas alternadas suaves (zebra striping),
 *   formatação estrita de moeda nacional brasileira (R$ 0,00).
 * - Botão de 'Gerar PDF' sofisticado com ícone de download e animação de processamento.
 * - Histórico de fechamentos consolidados com pré-visualização e download em modal.
 * =============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { fechamentosAPI } from '../api/api';
import {
  FileCheck,
  FileText,
  FileDown,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  Calculator,
  ExternalLink,
  Clock,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  Receipt,
  X,
  History,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Filter,
} from 'lucide-react';

export default function FechamentoView({ onFechamentoConcluido }) {
  // Helpers para cálculo do intervalo padrão de datas
  const obterPeriodoMesAtual = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const primeiroDia = new Date(ano, mes, 1, 0, 0, 0);
    const ultimoDia = new Date(ano, mes + 1, 0, 23, 59, 59);

    const pad = (n) => String(n).padStart(2, '0');
    const formatarISO = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

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

  // Modal de visualização do PDF
  const [fechamentoAtual, setFechamentoAtual] = useState(null);
  const [exibirModalPdf, setExibirModalPdf] = useState(false);
  const [urlPdfModal, setUrlPdfModal] = useState('');

  // Formatação estrita de moeda brasileira (R$ 0,00)
  const formatarMoeda = (valor) => {
    const num = Number(valor) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Formatação amigável de data e hora
  const formatarDataHora = (dt) => {
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
    return new Date(dt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // 1. Busca os lançamentos pendentes no período selecionado
  const buscarPendentesNoPeriodo = async () => {
    setCarregandoPendentes(true);
    setErro(null);
    try {
      const dataIniISO = new Date(dataInicio).toISOString();
      const dataFimISO = new Date(dataFim).toISOString();

      const res = await fechamentosAPI.simular({
        data_inicio: dataIniISO,
        data_fim: dataFimISO,
        desconto: parseFloat(desconto) || 0.0,
        acrescimo: parseFloat(acrescimo) || 0.0,
      });

      setLancamentosPendentes(res.lancamentos || []);
      if (!res.lancamentos || res.lancamentos.length === 0) {
        setErro('Nenhum serviço com status PENDENTE foi localizado neste intervalo de datas.');
      }
    } catch (err) {
      setErro(err.message || 'Falha ao buscar lançamentos pendentes no período.');
    } finally {
      setCarregandoPendentes(false);
    }
  };

  // 2. Carrega o histórico de fechamentos anteriores
  const carregarHistorico = async () => {
    setCarregandoHistorico(true);
    try {
      const data = await fechamentosAPI.listar();
      setHistoricoFechamentos(data || []);
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

  // Atalhos rápidos de datas
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

  // Cálculos financeiros computados dinamicamente
  const valorBrutoCalculado = useMemo(() => {
    return lancamentosPendentes.reduce((acc, item) => acc + (Number(item.valor_total) || 0), 0);
  }, [lancamentosPendentes]);

  const descontoNum = useMemo(() => {
    const d = parseFloat(desconto);
    return isNaN(d) || d < 0 ? 0.0 : d;
  }, [desconto]);

  const acrescimoNum = useMemo(() => {
    const a = parseFloat(acrescimo);
    return isNaN(a) || a < 0 ? 0.0 : a;
  }, [acrescimo]);

  const valorLiquidoCalculado = useMemo(() => {
    return Math.max(0, valorBrutoCalculado - descontoNum + acrescimoNum);
  }, [valorBrutoCalculado, descontoNum, acrescimoNum]);

  // Efetivar Fechamento de Período e Gerar PDF
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
        `Fechamento #${String(res.id).padStart(4, '0')} concluído com sucesso! ${res.total_lancamentos} serviço(s) foram marcados como FATURADO.`
      );

      // Abre visualização do PDF gerado
      const urlPdf = fechamentosAPI.getUrlPdf(res.id);
      setUrlPdfModal(urlPdf);
      setExibirModalPdf(true);

      // Limpa os pendentes do período atual (foram faturados)
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

  // Abrir modal com PDF
  const handleAbrirPdf = (fechamentoId) => {
    const url = fechamentosAPI.getUrlPdf(fechamentoId);
    setUrlPdfModal(url);
    setExibirModalPdf(true);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 1: CABEÇALHO DA TELA                                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Fechamento de Período & Faturamento
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Apure os serviços pendentes no período, configure ajustes financeiros e emita o PDF contábil consolidado.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={carregarHistorico}
            disabled={carregandoHistorico}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs disabled:opacity-50"
            title="Atualizar lista do histórico"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregandoHistorico ? 'animate-spin text-brand-600' : ''}`} />
            <span>Atualizar Histórico</span>
          </button>
        </div>
      </div>

      {/* Feedbacks de Alerta / Sucesso */}
      {sucesso && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 text-emerald-950 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-900">{sucesso}</p>
              {fechamentoAtual && (
                <p className="text-xs text-emerald-700 mt-0.5">
                  Valor Consolidado: <strong className="font-extrabold">{formatarMoeda(fechamentoAtual.valor_liquido)}</strong> &bull; Status dos serviços: <span className="font-semibold uppercase text-emerald-800">Faturado</span>
                </p>
              )}
            </div>
          </div>
          {fechamentoAtual && (
            <button
              type="button"
              onClick={() => handleAbrirPdf(fechamentoAtual.id)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 transition-all shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visualizar PDF Gerado</span>
            </button>
          )}
        </div>
      )}

      {erro && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{erro}</span>
          </div>
          <button
            type="button"
            onClick={() => setErro(null)}
            className="p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 2: CARTÕES DE RESUMO FINANCEIRO (STAT CARDS NO TOPO)         */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-brand-600" />
            Resumo Financeiro da Apuração (Tempo Real)
          </span>
          <span className="text-[11px] text-slate-400">
            {lancamentosPendentes.length} {lancamentosPendentes.length === 1 ? 'item pendente' : 'itens pendentes'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: VALOR BRUTO */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Bruto
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Receipt className="w-4 h-4 text-slate-600" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatarMoeda(valorBrutoCalculado)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Soma de todos os serviços pendentes
              </p>
            </div>
          </div>

          {/* Card 2: DESCONTOS (-) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wide flex items-center gap-1">
                Descontos Aplicados
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-rose-600 tracking-tight">
                - {formatarMoeda(descontoNum)}
              </div>
              <p className="text-[11px] text-rose-600/80 mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                Abatimento no total final
              </p>
            </div>
          </div>

          {/* Card 3: ACRÉSCIMOS (+) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                Acréscimos / Adicionais
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-blue-600 tracking-tight">
                + {formatarMoeda(acrescimoNum)}
              </div>
              <p className="text-[11px] text-blue-600/80 mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Horas extras, deslocamento ou taxas
              </p>
            </div>
          </div>

          {/* Card 4: VALOR LÍQUIDO FINAL (DESTAQUE MAIOR COM COR DE DESTAQUE) */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/25 relative overflow-hidden group border border-emerald-500/40">
            {/* Efeito luminoso de fundo */}
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                  Valor Líquido Final
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/20 text-white backdrop-blur-xs border border-white/25">
                A Pagar / Receber
              </span>
            </div>

            <div className="mt-3 relative z-10">
              <div className="text-3xl font-black text-white tracking-tight drop-shadow-xs">
                {formatarMoeda(valorLiquidoCalculado)}
              </div>
              <p className="text-xs text-emerald-100/90 mt-1 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                Valor oficial que será impresso no PDF
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 3: DEFINIÇÃO DE PERÍODO & AJUSTES FINANCEIROS               */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Topo do painel com filtros e atalhos rápidos */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  <Calendar className="w-4 h-4" />
                </span>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Filtro do Período de Apuração
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Selecione o intervalo de datas da prestação dos serviços para consolidação e faturamento.
              </p>
            </div>

            {/* Botões de Atalho Rápido */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] mr-1">Atalhos rápidos:</span>
              <button
                type="button"
                onClick={() => aplicarAtalhoDatas('ultimos_15_dias')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                Últimos 15 Dias
              </button>
              <button
                type="button"
                onClick={() => aplicarAtalhoDatas('mes_atual')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={() => aplicarAtalhoDatas('mes_anterior')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                Mês Anterior
              </button>
            </div>
          </div>
        </div>

        {/* Inputs de data, descontos e acréscimos */}
        <div className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Data Inicial */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Data Inicial do Período *
              </label>
              <input
                type="datetime-local"
                required
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs font-medium text-slate-900 bg-white"
              />
            </div>

            {/* Data Final */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Data Final do Período *
              </label>
              <input
                type="datetime-local"
                required
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs font-medium text-slate-900 bg-white"
              />
            </div>

            {/* Desconto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Desconto Opcional</span>
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
                  placeholder="0,00"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  className="w-full text-sm pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all shadow-2xs font-semibold text-rose-700 bg-white"
                />
              </div>
            </div>

            {/* Acréscimo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Acréscimo Opcional</span>
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
                  placeholder="0,00"
                  value={acrescimo}
                  onChange={(e) => setAcrescimo(e.target.value)}
                  className="w-full text-sm pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-2xs font-semibold text-blue-700 bg-white"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Observações do Fechamento (Impresso no relatório oficial em PDF)
              </label>
              <input
                type="text"
                placeholder="Ex: Pagamento acordado para o dia 10 via PIX/transferência; desconto comercial de pontualidade..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs bg-white"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={buscarPendentesNoPeriodo}
              disabled={carregandoPendentes}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregandoPendentes ? 'animate-spin text-brand-600' : 'text-slate-600'}`} />
              <span>{carregandoPendentes ? 'Buscando Serviços...' : 'Consultar Lançamentos no Período'}</span>
            </button>

            <span className="text-xs text-slate-400">
              Intervalo ativo: <strong className="text-slate-700">{formatarDataSimples(dataInicio)}</strong> até <strong className="text-slate-700">{formatarDataSimples(dataFim)}</strong>
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SEÇÃO 4: TABELA DE LANÇAMENTOS PENDENTES (LINHAS ALTERNADAS)      */}
        {/* ----------------------------------------------------------------- */}
        <div className="border-t border-slate-200">
          <div className="px-5 py-3.5 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-xs text-slate-800">
                Lançamentos Pendentes Encontrados no Período ({lancamentosPendentes.length})
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Estes serviços terão seu status alterado para <b>FATURADO</b> após a efetivação.
            </span>
          </div>

          {carregandoPendentes ? (
            <div className="py-14 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
              <p className="font-medium text-slate-600">Localizando serviços pendentes...</p>
            </div>
          ) : lancamentosPendentes.length === 0 ? (
            <div className="py-12 text-center p-6 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-slate-400" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Nenhum serviço pendente localizado</h5>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Não existem lançamentos com status PENDENTE no intervalo selecionado. Ajuste o filtro de datas acima ou cadastre novos lançamentos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-10 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Data Execução</th>
                    <th className="py-3 px-4">Serviço Prestado</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Qtd</th>
                    <th className="py-3 px-4 text-right">Valor Unitário</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lancamentosPendentes.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`transition-colors duration-150 hover:bg-brand-50/40 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-medium">
                        {formatarDataHora(item.data_execucao)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{item.nome_servico}</span>
                        {item.descricao && (
                          <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{item.descricao}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          PENDENTE
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {item.quantidade}{' '}
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          {item.unidade_medida}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap font-medium">
                        {formatarMoeda(item.valor_unitario)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-extrabold text-slate-900 text-sm">
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
        {/* SEÇÃO 5: BARRA INFERIOR COM BOTÃO ELEGANTE DE GERAR PDF           */}
        {/* ----------------------------------------------------------------- */}
        <div className="p-5 sm:p-6 bg-slate-50/80 border-t border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="font-semibold text-slate-700">Resumo da Efetivação:</span>
            <span>{lancamentosPendentes.length} serviço(s) &bull; Total Líquido: <strong className="text-emerald-700 font-extrabold">{formatarMoeda(valorLiquidoCalculado)}</strong></span>
          </div>

          {/* BOTÃO ELEGANTE DE GERAR PDF COM ANIMAÇÃO */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleEfetivarFechamento}
              disabled={efetivando || lancamentosPendentes.length === 0}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 text-sm font-extrabold text-white rounded-xl shadow-lg transition-all duration-200 ${
                efetivando
                  ? 'bg-emerald-700 cursor-wait shadow-emerald-700/30 animate-pulse'
                  : lancamentosPendentes.length === 0
                  ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 shadow-emerald-600/30 hover:shadow-emerald-600/40 hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {efetivando ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Consolidando Serviços & Gerando PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span>Efetivar Fechamento & Gerar PDF</span>
                  <ArrowRight className="w-4 h-4 ml-0.5 opacity-80" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 6: HISTÓRICO DE FECHAMENTOS ANTERIORES                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-4 pt-2">
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
              Demonstrativos contábeis consolidados emitidos anteriormente com download e visualização do PDF oficial.
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
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
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
                  {historicoFechamentos.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`transition-colors duration-150 hover:bg-brand-50/40 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-extrabold text-brand-700 whitespace-nowrap">
                        #{String(item.id).padStart(4, '0')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-medium">
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
                      <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                        {formatarMoeda(item.valor_liquido)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAbrirPdf(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                            title="Visualizar PDF na tela"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver PDF
                          </button>
                          <a
                            href={fechamentosAPI.getUrlPdf(item.id)}
                            download={`fechamento_${String(item.id).padStart(4, '0')}.pdf`}
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
      {/* SEÇÃO 7: MODAL DE VISUALIZAÇÃO DIRETA DO PDF                      */}
      {/* ----------------------------------------------------------------- */}
      {exibirModalPdf && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition-colors"
                  title="Abrir em nova aba do navegador"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Externa</span>
                </a>
                <a
                  href={urlPdfModal}
                  download="fechamento.pdf"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
                  title="Baixar PDF no computador"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setExibirModalPdf(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
                  title="Fechar visualizador"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Iframe renderizando o PDF nativo do navegador */}
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
