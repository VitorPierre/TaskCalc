/**
 * =============================================================================
 * COMPONENTE: CatalogoView.jsx (Minimalist Design System - Zinc / Shadcn)
 * =============================================================================
 * Papel na Arquitetura:
 * - Tela de gerenciamento do Catálogo de Serviços do TaskCalc.
 * - Lista todos os serviços cadastrados com busca e filtro por status.
 * - Formulário para cadastrar novos itens consumindo a rota POST /api/v1/servicos/.
 * - Modal para editar itens existentes (PUT).
 * - Permite inativar ou reativar serviços via Soft-Delete (PATCH /toggle-status).
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { catalogoAPI } from '../api/api';
import {
  BookOpen,
  PlusCircle,
  RefreshCw,
  Search,
  Edit3,
  Power,
  CheckCircle2,
  AlertCircle,
  Tag,
  DollarSign,
  Layers,
  X,
  FileText,
} from 'lucide-react';

export default function CatalogoView({ onCatalogoAtualizado }) {
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroAtivos, setFiltroAtivos] = useState('todos'); // 'todos', 'ativos', 'inativos'

  // Estados de feedback
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  // Formulário de Novo Serviço
  const [exibirFormNovo, setExibirFormNovo] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [novoForm, setNovoForm] = useState({
    nome: '',
    descricao_padrao: '',
    unidade_medida: 'UN',
    valor_base: '',
  });

  // Modal de Edição
  const [servicoEditando, setServicoEditando] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: '',
    descricao_padrao: '',
    unidade_medida: 'UN',
    valor_base: '',
    ativo: true,
  });

  // 1. Carrega serviços do catálogo
  const carregarServicos = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await catalogoAPI.listar(false);
      setServicos(data || []);
      if (onCatalogoAtualizado) onCatalogoAtualizado(data || []);
    } catch (err) {
      setErro(err.message || 'Falha ao carregar catálogo.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarServicos();
  }, []);

  // 2. Cadastrar Novo Serviço
  const handleCadastrar = async (e) => {
    e.preventDefault();
    if (!novoForm.nome.trim()) {
      setErro('O nome do serviço é obrigatório.');
      return;
    }
    const valorBaseNum = parseFloat(novoForm.valor_base);
    if (isNaN(valorBaseNum) || valorBaseNum < 0) {
      setErro('Informe um valor base válido.');
      return;
    }

    setSalvandoNovo(true);
    setErro(null);
    try {
      const payload = {
        nome: novoForm.nome.trim(),
        descricao_padrao: novoForm.descricao_padrao.trim() || null,
        unidade_medida: novoForm.unidade_medida.trim().toUpperCase() || 'UN',
        valor_base: valorBaseNum,
        ativo: true,
      };

      const criado = await catalogoAPI.criar(payload);
      setSucesso(`Serviço "${criado.nome}" cadastrado com sucesso.`);
      setNovoForm({
        nome: '',
        descricao_padrao: '',
        unidade_medida: 'UN',
        valor_base: '',
      });
      setExibirFormNovo(false);
      await carregarServicos();
      setTimeout(() => setSucesso(null), 4000);
    } catch (err) {
      setErro(err.message || 'Erro ao cadastrar serviço.');
    } finally {
      setSalvandoNovo(false);
    }
  };

  // 3. Abrir modal para editar
  const abrirModalEditar = (item) => {
    setServicoEditando(item);
    setEditForm({
      nome: item.nome,
      descricao_padrao: item.descricao_padrao || '',
      unidade_medida: item.unidade_medida || 'UN',
      valor_base: item.valor_base !== undefined ? item.valor_base.toString() : '',
      ativo: item.ativo,
    });
    setErro(null);
  };

  // 4. Salvar Edição
  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    if (!servicoEditando) return;
    if (!editForm.nome.trim()) {
      setErro('O nome do serviço não pode ficar vazio.');
      return;
    }

    setSalvandoEdicao(true);
    setErro(null);
    try {
      const payload = {
        nome: editForm.nome.trim(),
        descricao_padrao: editForm.descricao_padrao.trim() || null,
        unidade_medida: editForm.unidade_medida.trim().toUpperCase() || 'UN',
        valor_base: parseFloat(editForm.valor_base) || 0.0,
        ativo: editForm.ativo,
      };

      const atualizado = await catalogoAPI.atualizar(servicoEditando.id, payload);
      setSucesso(`Serviço "${atualizado.nome}" atualizado.`);
      setServicoEditando(null);
      await carregarServicos();
      setTimeout(() => setSucesso(null), 4000);
    } catch (err) {
      setErro(err.message || 'Falha ao atualizar serviço.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // 5. Inativar / Reativar (Soft-Delete)
  const handleAlternarStatus = async (item) => {
    try {
      setErro(null);
      const atualizado = await catalogoAPI.alternarStatus(item.id);
      const statusTexto = atualizado.ativo ? 'reativado' : 'inativado';
      setSucesso(`Serviço "${atualizado.nome}" foi ${statusTexto}.`);
      await carregarServicos();
      setTimeout(() => setSucesso(null), 4000);
    } catch (err) {
      setErro(err.message || 'Falha ao alterar status.');
    }
  };

  // Filtragem da lista
  const servicosFiltrados = servicos.filter((item) => {
    const matchBusca =
      item.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (item.descricao_padrao && item.descricao_padrao.toLowerCase().includes(busca.toLowerCase())) ||
      item.unidade_medida.toLowerCase().includes(busca.toLowerCase());

    if (!matchBusca) return false;
    if (filtroAtivos === 'ativos') return item.ativo === true;
    if (filtroAtivos === 'inativos') return item.ativo === false;
    return true;
  });

  const formatarMoeda = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const totalAtivos = servicos.filter((s) => s.ativo).length;
  const totalInativos = servicos.filter((s) => !s.ativo).length;

  return (
    <div className="space-y-6">
      
      {/* ----------------------------------------------------------------- */}
      {/* HEADER DA TELA & AÇÕES                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Catálogo de Serviços
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Defina itens padrão, preços base sugeridos e unidades de medida.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={carregarServicos}
            disabled={carregando}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-medium rounded-md transition-colors shadow-xs disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin text-zinc-900' : 'text-zinc-500'}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => setExibirFormNovo(!exibirFormNovo)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium rounded-md transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{exibirFormNovo ? 'Fechar' : 'Novo Serviço'}</span>
          </button>
        </div>
      </div>

      {/* Alertas Discretos */}
      {sucesso && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{sucesso}</span>
          </div>
          <button onClick={() => setSucesso(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {erro && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{erro}</span>
          </div>
          <button onClick={() => setErro(null)} className="text-red-700 hover:text-red-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Totalizadores Rápidos (Stat Cards Minimalistas) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-lg border border-zinc-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
              Total Cadastrado
            </span>
            <span className="text-xl font-bold text-zinc-900 font-mono tabular-nums">
              {servicos.length}
            </span>
          </div>
          <span className="text-xs text-zinc-400 font-mono">itens</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-zinc-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
              Serviços Ativos
            </span>
            <span className="text-xl font-bold text-zinc-900 font-mono tabular-nums">
              {totalAtivos}
            </span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
            Disponíveis
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-zinc-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
              Serviços Inativos
            </span>
            <span className="text-xl font-bold text-zinc-900 font-mono tabular-nums">
              {totalInativos}
            </span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-zinc-100 text-zinc-700 border-zinc-200">
            Ocultos
          </span>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* FORMULÁRIO DE CADASTRO DE NOVO SERVIÇO                            */}
      {/* ----------------------------------------------------------------- */}
      {exibirFormNovo && (
        <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-xs space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-zinc-500" />
              Cadastrar Novo Serviço no Catálogo
            </h3>
            <button
              onClick={() => setExibirFormNovo(false)}
              className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCadastrar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* NOME */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Formatação de Computador, Troca de Óleo..."
                  value={novoForm.nome}
                  onChange={(e) => setNovoForm({ ...novoForm, nome: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 shadow-xs"
                />
              </div>

              {/* PREÇO BASE */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Preço Base (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-mono font-medium pointer-events-none">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={novoForm.valor_base}
                    onChange={(e) => setNovoForm({ ...novoForm, valor_base: e.target.value })}
                    className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 font-mono tabular-nums text-right shadow-xs font-medium"
                  />
                </div>
              </div>

              {/* UNIDADE DE MEDIDA */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Unidade de Medida *
                </label>
                <input
                  type="text"
                  required
                  placeholder="UN, HORA, KM"
                  value={novoForm.unidade_medida}
                  onChange={(e) => setNovoForm({ ...novoForm, unidade_medida: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 uppercase font-mono shadow-xs"
                />
              </div>

              {/* DESCRIÇÃO PADRÃO */}
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Descrição Padrão do Escopo (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Descrição do serviço para preenchimento automático nos lançamentos..."
                  value={novoForm.descricao_padrao}
                  onChange={(e) => setNovoForm({ ...novoForm, descricao_padrao: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 shadow-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setExibirFormNovo(false)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoNovo}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium rounded-md transition-colors disabled:opacity-50 shadow-xs"
              >
                {salvandoNovo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Cadastrar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* FILTROS & LISTAGEM                                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Campo de Pesquisa */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou unidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 shadow-xs"
          />
        </div>

        {/* Segmented Control de Filtro (Todos / Ativos / Inativos) */}
        <div className="bg-zinc-100 p-1 rounded-md flex self-start sm:self-auto">
          <button
            onClick={() => setFiltroAtivos('todos')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              filtroAtivos === 'todos' ? 'bg-white shadow-xs text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Todos ({servicos.length})
          </button>
          <button
            onClick={() => setFiltroAtivos('ativos')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              filtroAtivos === 'ativos' ? 'bg-white shadow-xs text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Ativos ({totalAtivos})
          </button>
          <button
            onClick={() => setFiltroAtivos('inativos')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              filtroAtivos === 'inativos' ? 'bg-white shadow-xs text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Inativos ({totalInativos})
          </button>
        </div>
      </div>

      {/* Grid de Serviços Minimalista */}
      {carregando ? (
        <div className="py-16 text-center text-zinc-500 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-zinc-400 mb-2" />
          Carregando catálogo de serviços...
        </div>
      ) : servicosFiltrados.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-lg border border-dashed border-zinc-200 p-8">
          <BookOpen className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
          <h4 className="text-sm font-medium text-zinc-700">Nenhum serviço encontrado</h4>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            {busca ? `Nenhum resultado para "${busca}".` : 'Cadastre seu primeiro serviço padrão.'}
          </p>
          {!exibirFormNovo && (
            <button
              onClick={() => setExibirFormNovo(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium rounded-md transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Adicionar Serviço
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {servicosFiltrados.map((item) => {
            const isAtivo = item.ativo !== false;

            return (
              <div
                key={item.id}
                className={`bg-white p-4 rounded-lg border flex flex-col justify-between transition-colors shadow-xs ${
                  isAtivo ? 'border-zinc-200/80 hover:border-zinc-300' : 'border-zinc-200/60 bg-zinc-50/40 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {/* Badge de Status Estrita */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        isAtivo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}
                    >
                      {isAtivo ? 'Ativo' : 'Inativo'}
                    </span>

                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-zinc-200 text-zinc-500 bg-zinc-50">
                      {item.unidade_medida || 'UN'}
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm text-zinc-900 mb-1">
                    {item.nome}
                  </h4>

                  <p className="text-xs text-zinc-500 line-clamp-2 min-h-[2rem]">
                    {item.descricao_padrao || 'Sem descrição cadastrada.'}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-medium block">Preço Base</span>
                    <span className="font-semibold text-zinc-900 text-sm font-mono tabular-nums">
                      {formatarMoeda(item.valor_base)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => abrirModalEditar(item)}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                      title="Editar serviço"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAlternarStatus(item)}
                      className={`p-1.5 rounded-md transition-colors ${
                        isAtivo
                          ? 'text-zinc-400 hover:text-red-600 hover:bg-red-50'
                          : 'text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title={isAtivo ? 'Inativar serviço' : 'Reativar serviço'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL DE EDIÇÃO                                                   */}
      {/* ----------------------------------------------------------------- */}
      {servicoEditando && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-lg border border-zinc-200 shadow-xs max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-zinc-900">Editar Serviço</h3>
              <button
                type="button"
                onClick={() => setServicoEditando(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Preço Base (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editForm.valor_base}
                    onChange={(e) => setEditForm({ ...editForm, valor_base: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 font-mono tabular-nums text-right shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Unidade de Medida *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.unidade_medida}
                    onChange={(e) => setEditForm({ ...editForm, unidade_medida: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 uppercase font-mono shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Descrição Padrão
                </label>
                <textarea
                  rows={2}
                  value={editForm.descricao_padrao}
                  onChange={(e) => setEditForm({ ...editForm, descricao_padrao: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 shadow-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-zinc-50 border border-zinc-200">
                <span className="text-xs text-zinc-700 font-medium">Status Ativo no Catálogo</span>
                <input
                  type="checkbox"
                  checked={editForm.ativo}
                  onChange={(e) => setEditForm({ ...editForm, ativo: e.target.checked })}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 border-zinc-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setServicoEditando(null)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium rounded-md transition-colors disabled:opacity-50 shadow-xs"
                >
                  {salvandoEdicao ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
