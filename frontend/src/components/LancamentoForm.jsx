/**
 * =============================================================================
 * COMPONENTE: LancamentoForm.jsx (Design System Stripe / Linear / Shadcn)
 * =============================================================================
 * Regras Estritas de Design:
 * - Segmented Control elegante (bg-zinc-100 p-1 rounded-lg, item ativo bg-white shadow-xs)
 * - Fundo bg-zinc-50/80, cards bg-white border border-zinc-200/80 rounded-lg shadow-xs
 * - Botão primário bg-zinc-900 text-white hover:bg-zinc-800 rounded-md
 * - Botão secundário bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-md
 * - Tipografia financeira: font-mono tabular-nums em todos os preços (R$), quantidades e datas
 * - Alinhamento à direita em colunas monetárias (text-right)
 * - Pílulas discretas com borda (inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border)
 * - Nenhuma cor indigo/purple, nenhum gradiente de fundo, sem shadow-lg/xl ou rounded-2xl
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { lancamentosAPI, catalogoAPI } from '../api/api';
import {
  Layers,
  Sparkles,
  Clock,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  ShieldCheck,
  RotateCcw,
  X,
  Zap,
} from 'lucide-react';

export default function LancamentoForm({ onLancamentoCriado }) {
  // Modo de lançamento: 'padronizado' ou 'variavel'
  const [modo, setModo] = useState('padronizado');

  // Estados dos dados
  const [catalogo, setCatalogo] = useState([]);
  const [lancamentosPendentes, setLancamentosPendentes] = useState([]);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
  const [carregandoPendentes, setCarregandoPendentes] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Feedbacks visuais
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [ultimoLancado, setUltimoLancado] = useState(null);
  const [exibirToast, setExibirToast] = useState(false);

  // Campos do formulário
  const obterDataHoraAtual = () => new Date().toISOString().slice(0, 16);
  const [form, setForm] = useState({
    catalogo_servico_id: '',
    nome_servico: '',
    descricao: '',
    unidade_medida: 'UN',
    quantidade: '1',
    valor_unitario: '',
    data_execucao: obterDataHoraAtual(),
  });

  // 1. Carrega os serviços ativos do catálogo
  const carregarCatalogo = async () => {
    setCarregandoCatalogo(true);
    try {
      const data = await catalogoAPI.listar(true);
      setCatalogo(data);
    } catch (err) {
      console.error('Erro ao buscar catálogo:', err);
    } finally {
      setCarregandoCatalogo(false);
    }
  };

  // 2. Carrega a lista dos últimos lançamentos pendentes
  const carregarPendentes = async () => {
    setCarregandoPendentes(true);
    try {
      const data = await lancamentosAPI.listar({ status_filtro: 'PENDENTE' });
      setLancamentosPendentes(data);
    } catch (err) {
      console.error('Erro ao buscar lançamentos pendentes:', err);
    } finally {
      setCarregandoPendentes(false);
    }
  };

  useEffect(() => {
    carregarCatalogo();
    carregarPendentes();
  }, []);

  // Alternar entre modo padronizado e variável
  const alternarModo = (novoModo) => {
    setModo(novoModo);
    setErro(null);
    setForm((prev) => ({
      ...prev,
      catalogo_servico_id: '',
      nome_servico: '',
      valor_unitario: '',
      unidade_medida: 'UN',
    }));
  };

  // Ao selecionar um serviço do catálogo no modo padronizado
  const handleSelecionarServicoCatalogo = (catId) => {
    if (!catId) {
      setForm((prev) => ({
        ...prev,
        catalogo_servico_id: '',
        nome_servico: '',
        valor_unitario: '',
        unidade_medida: 'UN',
      }));
      return;
    }

    const item = catalogo.find((c) => c.id === parseInt(catId, 10));
    if (item) {
      setForm((prev) => ({
        ...prev,
        catalogo_servico_id: item.id,
        nome_servico: item.nome,
        valor_unitario: item.valor_base !== undefined ? item.valor_base.toString() : '',
        unidade_medida: item.unidade_medida || 'UN',
        descricao: prev.descricao || item.descricao_padrao || '',
      }));
    }
  };

  // Preencher rapidamente com a data/hora atual
  const handleDefinirAgora = () => {
    setForm((prev) => ({ ...prev, data_execucao: obterDataHoraAtual() }));
  };

  // Envio do formulário via POST
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    try {
      const qtd = parseFloat(form.quantidade);
      if (isNaN(qtd) || qtd <= 0) {
        throw new Error('A quantidade informada deve ser maior que zero.');
      }

      const payload = {
        quantidade: qtd,
        descricao: form.descricao.trim() || null,
        data_execucao: form.data_execucao ? new Date(form.data_execucao).toISOString() : null,
      };

      if (modo === 'padronizado') {
        if (!form.catalogo_servico_id) {
          throw new Error('Por favor, selecione um serviço do catálogo.');
        }
        payload.catalogo_servico_id = parseInt(form.catalogo_servico_id, 10);
        if (form.nome_servico.trim()) payload.nome_servico = form.nome_servico.trim();
        if (form.unidade_medida.trim()) payload.unidade_medida = form.unidade_medida.trim().toUpperCase();
        if (form.valor_unitario) payload.valor_unitario = parseFloat(form.valor_unitario);
      } else {
        if (!form.nome_servico.trim()) {
          throw new Error('O título do serviço variável é obrigatório.');
        }
        const valUnit = parseFloat(form.valor_unitario);
        if (isNaN(valUnit) || valUnit < 0) {
          throw new Error('Informe um valor unitário válido para o serviço variável.');
        }
        payload.nome_servico = form.nome_servico.trim();
        payload.valor_unitario = valUnit;
        payload.unidade_medida = form.unidade_medida.trim().toUpperCase() || 'UN';
      }

      // Envia requisição POST para a API
      const lancamentoCriado = await lancamentosAPI.criar(payload);

      // Feedback visual em toast e alerta inline
      setUltimoLancado(lancamentoCriado);
      setSucesso(`Serviço "${lancamentoCriado.nome_servico}" registrado com sucesso.`);
      setExibirToast(true);

      // Reseta o formulário
      setForm({
        catalogo_servico_id: '',
        nome_servico: '',
        descricao: '',
        unidade_medida: 'UN',
        quantidade: '1',
        valor_unitario: '',
        data_execucao: obterDataHoraAtual(),
      });

      // Recarrega a lista de pendentes em tempo real
      await carregarPendentes();

      if (onLancamentoCriado) {
        onLancamentoCriado(lancamentoCriado);
      }

      setTimeout(() => setExibirToast(false), 4000);
      setTimeout(() => setSucesso(null), 4000);
    } catch (err) {
      setErro(err.message || 'Falha ao registrar o lançamento do serviço.');
    } finally {
      setSalvando(false);
    }
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

  // Cálculo do total em tempo real
  const qtdNum = parseFloat(form.quantidade) || 0;
  const unitNum = parseFloat(form.valor_unitario) || 0;
  const totalCalculado = qtdNum * unitNum;

  // Totalizador acumulado dos lançamentos pendentes
  const totalValorBrutoPendente = lancamentosPendentes.reduce(
    (acc, item) => acc + (item.valor_total || 0),
    0
  );

  return (
    <div className="space-y-6 pb-12">
      
      {/* ----------------------------------------------------------------- */}
      {/* TOAST FLUTUANTE DE SUCESSO (DISCRETO & MINIMALISTA)                */}
      {/* ----------------------------------------------------------------- */}
      {exibirToast && ultimoLancado && (
        <div className="fixed bottom-16 md:bottom-6 right-4 left-4 sm:left-auto sm:max-w-sm z-50 bg-white rounded-lg border border-zinc-200/90 shadow-xs p-3.5 transition-all">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900">
                  Lançamento Registrado
                </span>
                <button
                  type="button"
                  onClick={() => setExibirToast(false)}
                  className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-zinc-600 truncate mt-0.5">
                {ultimoLancado.nome_servico}
              </p>
              <div className="flex items-center justify-between text-xs text-zinc-500 mt-1">
                <span className="font-mono tabular-nums">
                  {ultimoLancado.quantidade} {ultimoLancado.unidade_medida}
                </span>
                <span className="font-mono tabular-nums font-semibold text-zinc-900">
                  {formatarMoeda(ultimoLancado.valor_total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 1: FORMULÁRIO DE NOVO LANÇAMENTO                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-zinc-200/80 shadow-xs overflow-hidden">
        
        {/* Cabeçalho do Card */}
        <div className="p-4 sm:p-5 border-b border-zinc-200/80 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Novo Lançamento de Atendimento
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Registro de atendimentos prestados com congelamento de valores na data (Snapshot RD01).
            </p>
          </div>

          {/* SEGMENTED CONTROL ELEGANTE (SHADCN / IOS) */}
          <div className="bg-zinc-100 p-1 rounded-lg flex items-center gap-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => alternarModo('padronizado')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                modo === 'padronizado'
                  ? 'bg-white shadow-xs text-zinc-900 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Serviço Padronizado</span>
            </button>
            <button
              type="button"
              onClick={() => alternarModo('variavel')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                modo === 'variavel'
                  ? 'bg-white shadow-xs text-zinc-900 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Serviço Variável</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          
          {/* Alertas Inline */}
          {sucesso && (
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sucesso}</span>
            </div>
          )}

          {erro && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* SELEÇÃO DO CATÁLOGO (Se modo padronizado) */}
          {modo === 'padronizado' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Item do Catálogo de Serviços *
              </label>
              <select
                value={form.catalogo_servico_id}
                onChange={(e) => handleSelecionarServicoCatalogo(e.target.value)}
                disabled={carregandoCatalogo || salvando}
                required
                className="w-full text-sm py-2 px-3 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 disabled:opacity-50"
              >
                <option value="">
                  {carregandoCatalogo ? 'Carregando catálogo...' : 'Selecione um serviço cadastrado...'}
                </option>
                {catalogo.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome} — {formatarMoeda(cat.valor_base)} / {cat.unidade_medida || 'UN'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* TÍTULO DO SERVIÇO */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5 flex items-center justify-between">
              <span>Título do Serviço Executado *</span>
              {modo === 'padronizado' && form.catalogo_servico_id && (
                <span className="text-[11px] text-zinc-400">Herdado do catálogo (editável)</span>
              )}
            </label>
            <input
              type="text"
              required
              disabled={salvando}
              placeholder={
                modo === 'padronizado'
                  ? 'Ex: Manutenção Preventiva Mensal'
                  : 'Ex: Troca de válvula termostática, Consultoria de emergência...'
              }
              value={form.nome_servico}
              onChange={(e) => setForm({ ...form, nome_servico: e.target.value })}
              className="w-full text-sm py-2 px-3 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 disabled:opacity-50"
            />
          </div>

          {/* QUANTIDADE, UNIDADE & PREÇO UNITÁRIO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* QUANTIDADE */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Quantidade *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                disabled={salvando}
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                className="w-full text-sm py-2 px-3 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-mono tabular-nums text-zinc-900 disabled:opacity-50"
              />
            </div>

            {/* UNIDADE DE MEDIDA */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Unidade de Medida
              </label>
              <input
                type="text"
                placeholder="UN, HORA, KM"
                disabled={salvando}
                value={form.unidade_medida}
                onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })}
                className="w-full text-sm py-2 px-3 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 uppercase font-mono text-zinc-700 disabled:opacity-50"
              />
            </div>

            {/* PREÇO UNITÁRIO */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5 flex items-center justify-between">
                <span>Valor Unitário (R$) *</span>
                {modo === 'padronizado' && form.catalogo_servico_id && (
                  <span className="text-[11px] text-zinc-400">Preço base</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 text-xs font-mono">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  disabled={salvando}
                  placeholder="0.00"
                  value={form.valor_unitario}
                  onChange={(e) => setForm({ ...form, valor_unitario: e.target.value })}
                  className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-mono tabular-nums text-right text-zinc-900 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* DATA/HORA E OBSERVAÇÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* DATA E HORA COM BOTÃO "AGORA" */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-700">
                  Data e Hora da Execução *
                </label>
                <button
                  type="button"
                  onClick={handleDefinirAgora}
                  disabled={salvando}
                  className="text-[11px] font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                >
                  <Zap className="w-3 h-3 text-amber-500" /> Agora
                </button>
              </div>
              <input
                type="datetime-local"
                disabled={salvando}
                value={form.data_execucao}
                onChange={(e) => setForm({ ...form, data_execucao: e.target.value })}
                className="w-full text-sm py-2 px-3 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-mono tabular-nums text-zinc-800 disabled:opacity-50"
              />
            </div>

            {/* OBSERVAÇÕES */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Observações / Detalhes (Opcional)
              </label>
              <input
                type="text"
                disabled={salvando}
                placeholder="Identificação do cliente, chamado ou placa..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="w-full text-sm py-2 px-3 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 disabled:opacity-50"
              />
            </div>
          </div>

          {/* CARD DE TOTAL EM TEMPO REAL & BOTÕES */}
          <div className="pt-2 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            
            {/* Totalizador Sóbrio */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-zinc-50 border border-zinc-200/80">
                <span className="text-[10px] uppercase font-medium text-zinc-500 block">
                  Total Previsto
                </span>
                <span className="text-lg font-semibold font-mono tabular-nums text-zinc-900">
                  {formatarMoeda(totalCalculado)}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-zinc-200 bg-white text-zinc-600">
                <ShieldCheck className="w-3 h-3 text-zinc-500" /> RD01 Snapshot
              </span>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() =>
                  setForm({
                    catalogo_servico_id: '',
                    nome_servico: '',
                    descricao: '',
                    unidade_medida: 'UN',
                    quantidade: '1',
                    valor_unitario: '',
                    data_execucao: obterDataHoraAtual(),
                  })
                }
                disabled={salvando}
                className="btn-secondary inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="btn-primary inline-flex items-center gap-2"
              >
                {salvando ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lançar Atendimento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 2: LISTA DE LANÇAMENTOS PENDENTES                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Lançamentos Pendentes
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-amber-200 bg-amber-50 text-amber-700">
                {lancamentosPendentes.length} pendentes
              </span>
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Atendimentos registrados aguardando consolidação no fechamento de período.
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            {lancamentosPendentes.length > 0 && (
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-zinc-400 uppercase font-medium block">Total Pendente</span>
                <span className="text-sm font-semibold font-mono tabular-nums text-zinc-900">
                  {formatarMoeda(totalValorBrutoPendente)}
                </span>
              </div>
            )}
            <button
              onClick={carregarPendentes}
              disabled={carregandoPendentes}
              className="btn-secondary inline-flex items-center gap-1.5 py-1.5 px-2.5 text-xs"
              title="Recarregar pendentes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregandoPendentes ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Exibição: Carregando, Vazio ou Lista */}
        {carregandoPendentes ? (
          <div className="py-12 text-center text-zinc-500 text-xs bg-white rounded-lg border border-zinc-200/80">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-zinc-400 mb-2" />
            Carregando atendimentos pendentes...
          </div>
        ) : lancamentosPendentes.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-lg border border-dashed border-zinc-200 p-6">
            <Clock className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
            <p className="text-xs font-medium text-zinc-700">Nenhum atendimento pendente</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Todos os atendimentos lançados foram consolidados em fechamentos anteriores.
            </p>
          </div>
        ) : (
          <>
            {/* Visualização Mobile: Cards discretos */}
            <div className="grid grid-cols-1 gap-2.5 md:hidden">
              {lancamentosPendentes.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3.5 rounded-lg border border-zinc-200/80 shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-mono tabular-nums block">
                        {formatarData(item.data_execucao)}
                      </span>
                      <h5 className="font-medium text-xs text-zinc-900 mt-0.5">
                        {item.nome_servico}
                      </h5>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-amber-200 bg-amber-50 text-amber-700 shrink-0">
                      Pendente
                    </span>
                  </div>

                  {item.descricao && (
                    <p className="text-xs text-zinc-500 line-clamp-1 bg-zinc-50 p-1.5 rounded border border-zinc-100">
                      {item.descricao}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1.5 border-t border-zinc-100 text-xs">
                    <span className="text-zinc-500 font-mono tabular-nums text-[11px]">
                      {item.quantidade} {item.unidade_medida} &times; {formatarMoeda(item.valor_unitario)}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-zinc-900 text-right">
                      {formatarMoeda(item.valor_total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Visualização Desktop: Tabela Minimalista */}
            <div className="hidden md:block bg-white rounded-lg border border-zinc-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-medium uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Data Execução</th>
                    <th className="py-2.5 px-4 font-medium">Serviço Prestado</th>
                    <th className="py-2.5 px-4 text-center font-medium">Origem</th>
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
                        {formatarData(item.data_execucao)}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-zinc-900">{item.nome_servico}</div>
                        {item.descricao && (
                          <div className="text-zinc-400 text-[11px] truncate max-w-xs">{item.descricao}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        {item.catalogo_servico_id ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-zinc-200 bg-zinc-50 text-zinc-600">
                            Catálogo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-zinc-200 bg-zinc-50 text-zinc-600">
                            Avulso
                          </span>
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
                <tfoot className="bg-zinc-50/60 border-t border-zinc-200/80 text-xs font-medium text-zinc-900">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-4 text-zinc-500">
                      Subtotal Pendente ({lancamentosPendentes.length} atendimentos)
                    </td>
                    <td colSpan={3} className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-zinc-900">
                      {formatarMoeda(totalValorBrutoPendente)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

