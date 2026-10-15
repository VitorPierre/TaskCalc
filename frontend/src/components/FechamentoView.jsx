/**
 * =============================================================================
 * COMPONENTE: FechamentoView.jsx (Design System Stripe / Linear / Shadcn)
 * =============================================================================
 * Regras Estritas de Design:
 * - Fundo da aplicação bg-zinc-50/80, cards bg-white border border-zinc-200/80 rounded-lg shadow-xs
 * - Cartões de resumo financeiro (Stat Cards) minimalistas no topo:
 *   * Total Bruto, Descontos (-), Acréscimos (+) e Valor Líquido Final em alto contraste (bg-zinc-900 text-white)
 * - Botão primário "Efetivar Fechamento & Gerar PDF" em grafite escuro (bg-zinc-900 text-white hover:bg-zinc-800 rounded-md)
 * - Tipografia financeira: fonte Inter e font-mono tabular-nums em todos os preços (R$), quantidades e datas
 * - Alinhamento à direita em colunas monetárias (text-right)
 * - Badges de status: Esmeralda para Faturado, Âmbar para Pendente
 * - Proibido: gradientes, cores roxas/indigo, shadow-lg/xl, rounded-2xl
 * =============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { fechamentosAPI } from '../api/api';
import {
  FileCheck,
  FileText,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Receipt,
  TrendingDown,
  TrendingUp,
  History,
  X,
  ExternalLink,
  Clock,
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

  // Formatação de data e hora
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
        `Fechamento #${String(res.id).padStart(4, '0')} concluído com sucesso! ${res.total_lancamentos} serviço(s) marcados como FATURADO.`
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
    <div className="space-y-6 pb-12">
      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 1: CABEÇALHO DA TELA                                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-zinc-700" />
            Fechamento de Período & Faturamento
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Consolidação contábil de atendimentos pendentes e emissão de demonstrativo oficial em PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={carregarHistorico}
            disabled={carregandoHistorico}
            className="btn-secondary inline-flex items-center gap-1.5 py-1.5 px-3 text-xs"
            title="Atualizar lista do histórico"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregandoHistorico ? 'animate-spin' : ''}`} />
            <span>Atualizar Histórico</span>
          </button>
        </div>
      </div>

      {/* Feedbacks de Alerta / Sucesso */}
      {sucesso && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{sucesso}</span>
          </div>
          {fechamentoAtual && (
            <button
              type="button"
              onClick={() => handleAbrirPdf(fechamentoAtual.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ver PDF Gerado</span>
            </button>
          )}
        </div>
      )}

      {erro && (
        <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{erro}</span>
          </div>
          <button
            type="button"
            onClick={() => setErro(null)}
            className="p-1 rounded text-rose-400 hover:text-rose-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 2: STAT CARDS MINIMALISTAS NO TOPO                          */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: TOTAL BRUTO */}
        <div className="bg-white rounded-lg p-4 border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Total Bruto
            </span>
            <Receipt className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-semibold font-mono tabular-nums text-zinc-900 tracking-tight">
              {formatarMoeda(valorBrutoCalculado)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 font-mono tabular-nums">
              {lancamentosPendentes.length} {lancamentosPendentes.length === 1 ? 'item pendente' : 'itens pendentes'}
            </p>
          </div>
        </div>

        {/* Card 2: DESCONTOS (-) */}
        <div className="bg-white rounded-lg p-4 border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-600 uppercase tracking-wide">
              Descontos (-)
            </span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-semibold font-mono tabular-nums text-rose-600 tracking-tight">
              - {formatarMoeda(descontoNum)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Abatimento no total final
            </p>
          </div>
        </div>

        {/* Card 3: ACRÉSCIMOS (+) */}
        <div className="bg-white rounded-lg p-4 border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-700 uppercase tracking-wide">
              Acréscimos (+)
            </span>
            <TrendingUp className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-semibold font-mono tabular-nums text-zinc-800 tracking-tight">
              + {formatarMoeda(acrescimoNum)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Adicionais ou taxas
            </p>
          </div>
        </div>

        {/* Card 4: VALOR LÍQUIDO FINAL (ALTO CONTRASTE EM GRAFITE ESCURO) */}
        <div className="bg-zinc-900 text-white rounded-lg p-4 border border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-300">
              Valor Líquido Final
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-zinc-700 bg-zinc-800 text-zinc-200">
              A Faturar
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-white tracking-tight">
              {formatarMoeda(valorLiquidoCalculado)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Valor consolidado impresso no PDF
            </p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 3: DEFINIÇÃO DE PERÍODO & AJUSTES                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-zinc-200/80 shadow-xs overflow-hidden">
        {/* Topo do painel com filtros */}
        <div className="p-4 sm:p-5 border-b border-zinc-200/80 bg-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-zinc-600" />
              Intervalo de Apuração & Ajustes
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Selecione o período dos atendimentos executados para conferência e fechamento.
            </p>
          </div>

          {/* Atalhos Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-400 text-xs mr-1">Atalhos:</span>
            <button
              type="button"
              onClick={() => aplicarAtalhoDatas('ultimos_15_dias')}
              className="btn-secondary py-1 px-2.5 text-xs"
            >
              Últimos 15 Dias
            </button>
            <button
              type="button"
              onClick={() => aplicarAtalhoDatas('mes_atual')}
              className="btn-secondary py-1 px-2.5 text-xs"
            >
              Mês Atual
            </button>
            <button
              type="button"
              onClick={() => aplicarAtalhoDatas('mes_anterior')}
              className="btn-secondary py-1 px-2.5 text-xs"
            >
              Mês Anterior
            </button>
          </div>
        </div>

        {/* Inputs do Formulário de Fechamento */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Data Inicial */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Data Inicial *
              </label>
              <input
                type="datetime-local"
                required
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full text-sm py-2 px-3 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-mono tabular-nums text-zinc-900"
              />
            </div>

            {/* Data Final */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Data Final *
              </label>
              <input
                type="datetime-local"
                required
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full text-sm py-2 px-3 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-mono tabular-nums text-zinc-900"
              />
            </div>

            {/* Desconto */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5 flex items-center justify-between">
                <span>Desconto</span>
                <span className="text-[10px] text-rose-600 font-mono">- abatimento</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 text-xs font-mono">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-mono tabular-nums text-right text-rose-600"
                />
              </div>
            </div>

            {/* Acréscimo */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5 flex items-center justify-between">
                <span>Acréscimo</span>
                <span className="text-[10px] text-zinc-500 font-mono">+ adicional</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 text-xs font-mono">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={acrescimo}
                  onChange={(e) => setAcrescimo(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-mono tabular-nums text-right text-zinc-900"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Observações do Fechamento (Impresso no relatório oficial em PDF)
              </label>
              <input
                type="text"
                placeholder="Ex: Pagamento acordado para o dia 10 via PIX/transferência; desconto comercial..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full text-sm py-2 px-3 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={buscarPendentesNoPeriodo}
              disabled={carregandoPendentes}
              className="btn-secondary inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregandoPendentes ? 'animate-spin' : ''}`} />
              <span>{carregandoPendentes ? 'Consultando...' : 'Consultar Lançamentos no Período'}</span>
            </button>

            <span className="text-xs text-zinc-500 font-mono tabular-nums">
              Intervalo: {formatarDataSimples(dataInicio)} até {formatarDataSimples(dataFim)}
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SEÇÃO 4: TABELA DE LANÇAMENTOS DO PERÍODO                        */}
        {/* ----------------------------------------------------------------- */}
        <div className="border-t border-zinc-200/80">
          <div className="px-4 py-3 bg-zinc-50/80 flex items-center justify-between border-b border-zinc-200/80">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-xs text-zinc-900">
                Lançamentos Pendentes no Período ({lancamentosPendentes.length})
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              Os serviços listados passarão ao status <b>FATURADO</b> após efetivação.
            </span>
          </div>

          {carregandoPendentes ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-zinc-400 mb-2" />
              Buscando serviços pendentes no período...
            </div>
          ) : lancamentosPendentes.length === 0 ? (
            <div className="py-10 text-center p-6 text-zinc-500">
              <CheckCircle2 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-zinc-700">Nenhum serviço pendente no intervalo selecionado</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ajuste os filtros de data acima para consultar outro período.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-medium uppercase tracking-wider sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Data Execução</th>
                    <th className="py-2.5 px-4 font-medium">Serviço Prestado</th>
                    <th className="py-2.5 px-4 text-center font-medium">Status</th>
                    <th className="py-2.5 px-4 text-right font-medium">Qtd</th>
                    <th className="py-2.5 px-4 text-right font-medium">Unitário</th>
                    <th className="py-2.5 px-4 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {lancamentosPendentes.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-2.5 px-4 text-zinc-600 font-mono tabular-nums whitespace-nowrap">
                        {formatarDataHora(item.data_execucao)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-medium text-zinc-900 block">{item.nome_servico}</span>
                        {item.descricao && (
                          <span className="text-[11px] text-zinc-400 truncate block max-w-xs">{item.descricao}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-amber-200 bg-amber-50 text-amber-700">
                          Pendente
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-zinc-700 whitespace-nowrap">
                        {item.quantidade} <span className="text-[10px] text-zinc-400">{item.unidade_medida}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-zinc-600 whitespace-nowrap">
                        {formatarMoeda(item.valor_unitario)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-zinc-900 whitespace-nowrap">
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
        {/* SEÇÃO 5: BARRA INFERIOR COM BOTÃO PRIMÁRIO DE FECHAMENTO          */}
        {/* ----------------------------------------------------------------- */}
        <div className="p-4 sm:p-5 bg-zinc-50/80 border-t border-zinc-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-zinc-600 flex items-center gap-2">
            <span>Apuração:</span>
            <span className="font-medium text-zinc-900 font-mono tabular-nums">{lancamentosPendentes.length} serviço(s)</span>
            <span>&bull;</span>
            <span>Total Líquido:</span>
            <span className="font-semibold text-zinc-900 font-mono tabular-nums">{formatarMoeda(valorLiquidoCalculado)}</span>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleEfetivarFechamento}
              disabled={efetivando || lancamentosPendentes.length === 0}
              className="btn-primary inline-flex items-center gap-2"
            >
              {efetivando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Consolidando Fechamento...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Efetivar Fechamento & Gerar PDF</span>
                  <Download className="w-3.5 h-3.5 opacity-80" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 6: HISTÓRICO DE FECHAMENTOS ANTERIORES                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-700" />
              Histórico de Fechamentos Realizados
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-zinc-200 bg-zinc-100 text-zinc-700">
                {historicoFechamentos.length} emissões
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Demonstrativos contábeis consolidados emitidos anteriormente com visualização e download do PDF oficial.
            </p>
          </div>
        </div>

        {carregandoHistorico ? (
          <div className="py-12 text-center text-zinc-500 text-xs bg-white rounded-lg border border-zinc-200/80">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-zinc-400 mb-2" />
            Carregando fechamentos anteriores...
          </div>
        ) : historicoFechamentos.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-lg border border-dashed border-zinc-200 p-6">
            <FileText className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
            <p className="text-xs font-medium text-zinc-700">Nenhum fechamento registrado</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Demonstrativos consolidados em PDF aparecerão listados aqui após a conclusão.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-medium uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Fechamento</th>
                    <th className="py-2.5 px-4 font-medium">Período de Apuração</th>
                    <th className="py-2.5 px-4 text-center font-medium">Itens</th>
                    <th className="py-2.5 px-4 text-right font-medium">Valor Bruto</th>
                    <th className="py-2.5 px-4 text-right font-medium">Ajustes (+ / -)</th>
                    <th className="py-2.5 px-4 text-right font-medium">Valor Líquido</th>
                    <th className="py-2.5 px-4 text-center font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {historicoFechamentos.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-semibold text-zinc-900 whitespace-nowrap">
                        #{String(item.id).padStart(4, '0')}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-700 font-mono tabular-nums whitespace-nowrap">
                        {formatarDataSimples(item.data_inicio)} &rarr; {formatarDataSimples(item.data_fim)}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap font-mono tabular-nums text-zinc-600">
                        {item.total_lancamentos}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-zinc-600 whitespace-nowrap">
                        {formatarMoeda(item.valor_bruto)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-zinc-500 whitespace-nowrap text-[11px]">
                        -{formatarMoeda(item.desconto)} / +{formatarMoeda(item.acrescimo)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-zinc-900 whitespace-nowrap">
                        {formatarMoeda(item.valor_liquido)}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAbrirPdf(item.id)}
                            className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1"
                            title="Visualizar demonstrativo PDF"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Ver PDF</span>
                          </button>
                          <a
                            href={fechamentosAPI.getUrlPdf(item.id)}
                            download={`fechamento_${String(item.id).padStart(4, '0')}.pdf`}
                            className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1 hover:text-zinc-900"
                            title="Baixar arquivo PDF"
                          >
                            <Download className="w-3 h-3" />
                            <span className="hidden sm:inline">Baixar</span>
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
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-lg shadow-xs w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden border border-zinc-200">
            {/* Topo do Modal */}
            <div className="px-4 py-3 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span className="font-medium text-xs sm:text-sm">Demonstrativo de Fechamento (TaskCalc)</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={urlPdfModal}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
                  title="Abrir em nova aba do navegador"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>
                <a
                  href={urlPdfModal}
                  download="fechamento.pdf"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
                  title="Baixar PDF no computador"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setExibirModalPdf(false)}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
                  title="Fechar visualizador"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Iframe renderizando o PDF nativo do navegador */}
            <div className="flex-1 w-full bg-zinc-100">
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

