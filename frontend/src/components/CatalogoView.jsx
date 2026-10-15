/**
 * =============================================================================
 * COMPONENTE: CatalogoView.jsx
 * =============================================================================
 * Papel na Arquitetura:
 * - Tela de gerenciamento do Catálogo de Serviços do TaskCalc.
 * - Lista todos os serviços cadastrados com suporte a busca e filtros por status (Ativo/Inativo).
 * - Formulário para cadastrar novos itens consumindo a rota POST /api/v1/servicos/.
 * - Modal / Painel para editar informações de itens existentes (PUT).
 * - Permite inativar ou reativar serviços via Soft-Delete (PATCH /toggle-status),
 *   respeitando a imutabilidade dos lançamentos históricos já consolidados (RD01).
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { catalogoAPI } from '../api/api';
import {
  BookOpen,
  Plus,
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
  Filter,
  ShieldCheck,
} from 'lucide-react';

export default function CatalogoView({ onCatalogoAtualizado }) {
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroAtivos, setFiltroAtivos] = useState('todos'); // 'todos', 'ativos', 'inativos'

  // Estados de feedback
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  // Estado do formulário de Novo Serviço
  const [exibirFormNovo, setExibirFormNovo] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [novoForm, setNovoForm] = useState({
    nome: '',
    descricao_padrao: '',
    unidade_medida: 'UN',
    valor_base: '',
  });

  // Estado do Modal de Edição
  const [servicoEditando, setServicoEditando] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: '',
    descricao_padrao: '',
    unidade_medida: 'UN',
    valor_base: '',
    ativo: true,
  });

  // 1. Carrega a lista completa de serviços do catálogo
  const carregarServicos = async () => {
    setCarregando(true);
    setErro(null);
    try {
      // Busca todos os itens (ativos e inativos)
      const data = await catalogoAPI.listar(false);
      setServicos(data);

      if (onCatalogoAtualizado) {
        onCatalogoAtualizado(data);
      }
    } catch (err) {
      setErro(err.message || 'Falha ao carregar catálogo de serviços.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarServicos();
  }, []);

  // 2. Cadastro de Novo Serviço (POST)
  const handleCadastrar = async (e) => {
    e.preventDefault();
    if (!novoForm.nome.trim()) {
      setErro('O nome do serviço é obrigatório.');
      return;
    }
    const valorBaseNum = parseFloat(novoForm.valor_base);
    if (isNaN(valorBaseNum) || valorBaseNum < 0) {
      setErro('Informe um valor base válido (maior ou igual a zero).');
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
      setSucesso(`Serviço "${criado.nome}" cadastrado com sucesso no catálogo!`);
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

  // 4. Salvar Edição (PUT)
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
      setSucesso(`Serviço "${atualizado.nome}" atualizado com sucesso!`);
      setServicoEditando(null);
      await carregarServicos();
      setTimeout(() => setSucesso(null), 4000);
    } catch (err) {
      setErro(err.message || 'Falha ao atualizar serviço.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // 5. Inativar / Alternar Status (Soft Delete)
  const handleAlternarStatus = async (item) => {
    try {
      setErro(null);
      const atualizado = await catalogoAPI.alternarStatus(item.id);
      const statusTexto = atualizado.ativo ? 'reativado' : 'inativado';
      setSucesso(`Serviço "${atualizado.nome}" foi ${statusTexto} com sucesso!`);
      await carregarServicos();
      setTimeout(() => setSucesso(null), 4000);
    } catch (err) {
      setErro(err.message || 'Falha ao alterar status do serviço.');
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
      {/* SEÇÃO 1: CABEÇALHO & CARDS RÁPIDOS                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-600" />
            Catálogo de Serviços
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre, edite e gerencie o portfólio de serviços com preços base sugeridos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={carregarServicos}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin text-brand-600' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={() => setExibirFormNovo(!exibirFormNovo)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm shadow-brand-600/20 transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            {exibirFormNovo ? 'Fechar Formulário' : 'Novo Serviço'}
          </button>
        </div>
      </div>

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

      {/* Totalizadores Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">
              Total no Catálogo
            </span>
            <span className="text-xl font-bold text-slate-900">{servicos.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide block">
              Serviços Ativos
            </span>
            <span className="text-xl font-bold text-slate-900">{totalAtivos}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">
              Serviços Inativos
            </span>
            <span className="text-xl font-bold text-slate-600">{totalInativos}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500">
            <Power className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 2: FORMULÁRIO DE CADASTRO DE NOVO SERVIÇO                   */}
      {/* ----------------------------------------------------------------- */}
      {exibirFormNovo && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-brand-200 shadow-xs bg-gradient-to-b from-brand-50/20 to-white animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-600" />
              Cadastrar Novo Item no Catálogo
            </h3>
            <button
              onClick={() => setExibirFormNovo(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCadastrar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* NOME DO SERVIÇO */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Formatação de Computador, Troca de Óleo, Consultoria..."
                  value={novoForm.nome}
                  onChange={(e) => setNovoForm({ ...novoForm, nome: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-2xs"
                />
              </div>

              {/* VALOR BASE */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preço Base Sugerido (R$) *
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
                    value={novoForm.valor_base}
                    onChange={(e) => setNovoForm({ ...novoForm, valor_base: e.target.value })}
                    className="w-full text-sm pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-2xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* UNIDADE DE MEDIDA */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unidade de Medida *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: UN, HORA, KM, DIARIA, M2"
                  value={novoForm.unidade_medida}
                  onChange={(e) => setNovoForm({ ...novoForm, unidade_medida: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-2xs uppercase font-medium"
                />
              </div>

              {/* DESCRIÇÃO PADRÃO */}
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição Padrão do Escopo (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva o escopo habitual deste serviço para preenchimento automático nos lançamentos..."
                  value={novoForm.descricao_padrao}
                  onChange={(e) => setNovoForm({ ...novoForm, descricao_padrao: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-2xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                Novos lançamentos herdarão este preço no modo Snapshot.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExibirFormNovo(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoNovo}
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {salvandoNovo ? 'Salvando...' : 'Cadastrar no Catálogo'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SEÇÃO 3: FILTROS & LISTAGEM DE SERVIÇOS                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Barra de Pesquisa */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou unidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-2xs"
          />
        </div>

        {/* Filtro de Status Ativo / Inativo */}
        <div className="flex items-center gap-1 text-xs bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFiltroAtivos('todos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filtroAtivos === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({servicos.length})
          </button>
          <button
            onClick={() => setFiltroAtivos('ativos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filtroAtivos === 'ativos' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ativos ({totalAtivos})
          </button>
          <button
            onClick={() => setFiltroAtivos('inativos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filtroAtivos === 'inativos' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inativos ({totalInativos})
          </button>
        </div>
      </div>

      {/* Grid de Serviços */}
      {carregando ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
          Carregando catálogo de serviços...
        </div>
      ) : servicosFiltrados.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">Nenhum serviço encontrado</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {busca
              ? `Nenhum resultado corresponde à busca "${busca}". Tente outro termo.`
              : 'Cadastre seus primeiros serviços padrão para compor o catálogo.'}
          </p>
          {!exibirFormNovo && (
            <button
              onClick={() => setExibirFormNovo(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Serviço
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servicosFiltrados.map((item) => {
            const isAtivo = item.ativo !== false;

            return (
              <div
                key={item.id}
                className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between group shadow-2xs hover:shadow-md ${
                  isAtivo
                    ? 'border-slate-200/90 hover:border-brand-300'
                    : 'border-slate-200 bg-slate-50/50 opacity-75'
                }`}
              >
                <div>
                  {/* Topo do Card com Status e Badge de Unidade */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAtivo
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isAtivo ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      {isAtivo ? 'ATIVO' : 'INATIVO'}
                    </span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                      {item.unidade_medida || 'UN'}
                    </span>
                  </div>

                  {/* Nome do Serviço */}
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-brand-600 transition-colors mb-1.5">
                    {item.nome}
                  </h4>

                  {/* Descrição Padrão */}
                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[2.5rem]">
                    {item.descricao_padrao || 'Sem descrição padrão configurada.'}
                  </p>
                </div>

                {/* Rodapé do Card com Preço e Ações */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Preço Base Sugerido</span>
                    <span className="font-extrabold text-slate-900 text-base">
                      {formatarMoeda(item.valor_base)}
                    </span>
                  </div>

                  {/* Botões de Ação: Editar e Inativar/Reativar */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => abrirModalEditar(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-colors"
                      title="Editar serviço"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAlternarStatus(item)}
                      className={`p-1.5 rounded-lg transition-colors border ${
                        isAtivo
                          ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-200'
                          : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200 bg-emerald-50/50'
                      }`}
                      title={isAtivo ? 'Inativar serviço (Soft Delete)' : 'Reativar serviço para novos lançamentos'}
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
      {/* MODAL DE EDIÇÃO DE SERVIÇO                                        */}
      {/* ----------------------------------------------------------------- */}
      {servicoEditando && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Topo do Modal */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand-400" />
                <h3 className="font-bold text-sm">Editar Serviço do Catálogo</h3>
              </div>
              <button
                type="button"
                onClick={() => setServicoEditando(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário de Edição */}
            <form onSubmit={handleSalvarEdicao} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-2xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preço Base (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editForm.valor_base}
                    onChange={(e) => setEditForm({ ...editForm, valor_base: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-2xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unidade de Medida *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.unidade_medida}
                    onChange={(e) => setEditForm({ ...editForm, unidade_medida: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-2xs uppercase font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição Padrão
                </label>
                <textarea
                  rows={3}
                  value={editForm.descricao_padrao}
                  onChange={(e) => setEditForm({ ...editForm, descricao_padrao: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-2xs resize-none"
                />
              </div>

              {/* Status Ativo/Inativo */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Disponível para Novos Lançamentos</span>
                  <span className="text-[11px] text-slate-500">Se inativo, fica oculto para novos cadastros.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.ativo}
                    onChange={(e) => setEditForm({ ...editForm, ativo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setServicoEditando(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {salvandoEdicao ? 'Salvando Alterações...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
