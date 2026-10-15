/**
 * =============================================================================
 * COMPONENTE: LancamentoForm.jsx
 * =============================================================================
 * Papel na Arquitetura:
 * - Formulário de registro de execuções de serviços prestados.
 * - Suporta alternância intuitiva entre:
 *   1. Serviço Padronizado: Seleciona do catálogo com preenchimento automático
 *      de nome, preço base e unidade de medida (Snapshot RD01).
 *   2. Serviço Variável / Avulso: Digitação livre de nome, preço e detalhes.
 * - Envia os dados para a rota POST /api/v1/lancamentos/ da API FastAPI.
 * - Exibe e monitora a lista atualizada dos últimos lançamentos pendentes de faturamento.
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
  Tag,
  ShieldCheck,
  FileQuestion,
  TrendingUp,
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

  // Ao alternar entre modo padronizado e variável
  const alternarModo = (novoModo) => {
    setModo(novoModo);
    setErro(null);
    if (novoModo === 'variavel') {
      setForm((prev) => ({
        ...prev,
        catalogo_servico_id: '',
        nome_servico: '',
        valor_unitario: '',
        unidade_medida: 'UN',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        catalogo_servico_id: '',
        nome_servico: '',
        valor_unitario: '',
        unidade_medida: 'UN',
      }));
    }
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

      setSucesso(
        `Serviço "${lancamentoCriado.nome_servico}" lançado com sucesso sob a regra de Snapshot (RD01)!`
      );

      // Reseta o formulário preservando a data atual
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

      setTimeout(() => setSucesso(null), 5000);
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
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 1: FORMULÁRIO DE NOVO LANÇAMENTO                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Cabeçalho do Card */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30">
                <Plus className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Registrar Atendimento / Lançamento de Serviço
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Valores e descrições gravados em modo <b>Snapshot RD01</b> (imutabilidade garantida).
            </p>
          </div>

          {/* Seletor de Modo: Padronizado vs Variável */}
          <div className="inline-flex p-1 bg-slate-800/80 rounded-xl border border-slate-700/80 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => alternarModo('padronizado')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modo === 'padronizado'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Serviço Padronizado</span>
            </button>
            <button
              type="button"
              onClick={() => alternarModo('variavel')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modo === 'variavel'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Serviço Variável / Avulso</span>
            </button>
          </div>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Alertas */}
          {sucesso && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sucesso}</span>
            </div>
          )}

          {erro && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Dica contextual do modo ativo */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
              <span>
                {modo === 'padronizado' ? (
                  <>
                    <b>Modo Catálogo Ativo:</b> Escolha um serviço pré-cadastrado para carregar automaticamente o título e preço base sugerido.
                  </>
                ) : (
                  <>
                    <b>Modo Variável / Avulso:</b> Digite livremente o título do atendimento sob demanda e informe o valor acordado.
                  </>
                )}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 hidden sm:inline">
              RD01 Snapshot
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* SELEÇÃO DO CATÁLOGO (Se modo padronizado) */}
            {modo === 'padronizado' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-brand-600" />
                  Serviço do Catálogo *
                </label>
                <select
                  value={form.catalogo_servico_id}
                  onChange={(e) => handleSelecionarServicoCatalogo(e.target.value)}
                  disabled={carregandoCatalogo}
                  required
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs font-medium text-slate-900"
                >
                  <option value="">
                    {carregandoCatalogo ? 'Carregando opções...' : '-- Selecione um serviço do catálogo --'}
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
            <div className={modo === 'padronizado' ? 'sm:col-span-2' : 'sm:col-span-2 lg:col-span-3'}>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Título do Serviço Executado *
              </label>
              <input
                type="text"
                required
                placeholder={
                  modo === 'padronizado'
                    ? 'Título herdado do catálogo (editável para este lançamento)'
                    : 'Ex: Troca de válvula termostática, Consultoria de emergência...'
                }
                value={form.nome_servico}
                onChange={(e) => setForm({ ...form, nome_servico: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs"
              />
            </div>

            {/* QUANTIDADE */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quantidade *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs font-semibold text-slate-900"
              />
            </div>

            {/* UNIDADE DE MEDIDA */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Unidade de Medida
              </label>
              <input
                type="text"
                placeholder="UN, HORA, KM, M2"
                value={form.unidade_medida}
                onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs uppercase font-medium"
              />
            </div>

            {/* PREÇO UNITÁRIO */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Preço Unitário (R$) *</span>
                {modo === 'padronizado' && form.catalogo_servico_id && (
                  <span className="text-[10px] text-brand-600 font-normal">Base do catálogo</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={form.valor_unitario}
                  onChange={(e) => setForm({ ...form, valor_unitario: e.target.value })}
                  className="w-full text-sm pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* DATA E HORA DA EXECUÇÃO */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Data/Hora da Execução
              </label>
              <input
                type="datetime-local"
                value={form.data_execucao}
                onChange={(e) => setForm({ ...form, data_execucao: e.target.value })}
                className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs text-slate-700"
              />
            </div>

            {/* DESCRIÇÃO OU DETALHES ADICIONAIS */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Descrição ou Observações do Atendimento (Opcional)
              </label>
              <input
                type="text"
                placeholder="Observações complementares, número de chamado, veículo atendido ou condições especiais..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Barra Inferior com Total Calculado e Botão de Ação */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block">
                  Valor Total do Lançamento
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {formatarMoeda(totalCalculado)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Limpar Campos
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl shadow-md shadow-brand-600/20 transition-all hover:shadow-lg disabled:opacity-50"
              >
                {salvando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gravando Snapshot...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Lançar Serviço</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 2: LISTA COM OS ÚLTIMOS LANÇAMENTOS PENDENTES              */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Últimos Lançamentos Pendentes
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {lancamentosPendentes.length} aguardando faturamento
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Serviços executados que ainda não foram consolidados em nenhum fechamento de período.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lancamentosPendentes.length > 0 && (
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-400 uppercase font-medium block">Total Pendente Acumulado</span>
                <span className="text-sm font-bold text-slate-900">{formatarMoeda(totalValorBrutoPendente)}</span>
              </div>
            )}
            <button
              onClick={carregarPendentes}
              disabled={carregandoPendentes}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 self-start sm:self-auto"
              title="Atualizar lista de pendentes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregandoPendentes ? 'animate-spin text-brand-600' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Tabela ou Estado Vazio */}
        {carregandoPendentes ? (
          <div className="py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
            Carregando lançamentos pendentes...
          </div>
        ) : lancamentosPendentes.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <Clock className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <h5 className="text-sm font-semibold text-slate-700">Nenhum serviço pendente no momento</h5>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Todos os serviços lançados já foram consolidados em fechamentos anteriores ou nenhum atendimento foi registrado ainda.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Data Execução</th>
                    <th className="py-3 px-4">Serviço Prestado</th>
                    <th className="py-3 px-4 text-center">Origem</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Qtd</th>
                    <th className="py-3 px-4 text-right">Unitário</th>
                    <th className="py-3 px-4 text-right">Total Calculado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lancamentosPendentes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                        {formatarData(item.data_execucao)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-sm">{item.nome_servico}</div>
                        {item.descricao && (
                          <div className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">{item.descricao}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.catalogo_servico_id ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
                            <Layers className="w-2.5 h-2.5" /> Catálogo #{item.catalogo_servico_id}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Sparkles className="w-2.5 h-2.5" /> Avulso / Variável
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[10px] bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> PENDENTE
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {item.quantidade} <span className="text-[10px] text-slate-400">{item.unidade_medida}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatarMoeda(item.valor_unitario)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm whitespace-nowrap">
                        {formatarMoeda(item.valor_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/80 border-t border-slate-200 text-xs font-bold text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-slate-600">
                      Subtotal Acumulado Pendente ({lancamentosPendentes.length} itens)
                    </td>
                    <td colSpan={3} className="py-3 px-4 text-right text-base text-brand-700">
                      {formatarMoeda(totalValorBrutoPendente)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
