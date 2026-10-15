import React, { useState, useEffect } from 'react';
import { catalogoAPI } from '../api/api';
import { Plus, RefreshCw, BookOpen, AlertCircle, CheckCircle2, Tag } from 'lucide-react';

export default function CatalogoTab({ onUpdateCounts }) {
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  // Estado do formulário de novo serviço
  const [exibirForm, setExibirForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    descricao_padrao: '',
    valor_base: '',
    unidade_medida: 'UN',
  });

  const carregarServicos = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await catalogoAPI.listar();
      setServicos(data);
      if (onUpdateCounts) {
        onUpdateCounts((prev) => ({ ...prev, catalogo: data.length }));
      }
    } catch (err) {
      setErro(err.message || 'Erro ao carregar catálogo.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarServicos();
  }, []);

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setErro('Informe o nome do serviço.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await catalogoAPI.criar({
        nome: form.nome.trim(),
        descricao_padrao: form.descricao_padrao.trim() || null,
        valor_base: parseFloat(form.valor_base) || 0.0,
        unidade_medida: form.unidade_medida.trim().toUpperCase() || 'UN',
      });
      setSucesso('Serviço cadastrado no catálogo com sucesso!');
      setForm({ nome: '', descricao_padrao: '', valor_base: '', unidade_medida: 'UN' });
      setExibirForm(false);
      await carregarServicos();
      setTimeout(() => setSucesso(null), 4000);
    } catch (err) {
      setErro(err.message || 'Falha ao cadastrar serviço.');
    } finally {
      setSalvando(false);
    }
  };

  const formatarMoeda = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-600" /> Catálogo de Serviços
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre os serviços padronizados que servirão de base para lançamentos e snapshot histórico.
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
            onClick={() => setExibirForm(!exibirForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm shadow-brand-600/20 transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            {exibirForm ? 'Cancelar' : 'Novo Serviço'}
          </button>
        </div>
      </div>

      {/* Alertas de Sucesso e Erro */}
      {sucesso && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}

      {erro && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Formulário de Cadastro Rápido */}
      {exibirForm && (
        <div className="bg-white p-5 rounded-xl border border-brand-200 shadow-sm bg-gradient-to-b from-brand-50/30 to-white">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-600" /> Cadastrar Novo Item no Catálogo
          </h3>
          <form onSubmit={handleSalvar} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Nome do Serviço *</label>
              <input
                type="text"
                required
                placeholder="Ex: Consultoria Técnica, Troca de Filtro..."
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Preço Base Sugerido (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={form.valor_base}
                onChange={(e) => setForm({ ...form, valor_base: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Unidade de Medida</label>
              <input
                type="text"
                placeholder="Ex: UN, HORA, KM, DIARIA"
                value={form.unidade_medida}
                onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none uppercase"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Descrição Padrão (Opcional)</label>
              <input
                type="text"
                placeholder="Detalhes ou escopo sugerido deste serviço..."
                value={form.descricao_padrao}
                onChange={(e) => setForm({ ...form, descricao_padrao: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="sm:col-span-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExibirForm(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar no Catálogo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Itens do Catálogo */}
      {carregando ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
          Carregando catálogo de serviços...
        </div>
      ) : servicos.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h4 className="text-sm font-semibold text-slate-700">Nenhum serviço cadastrado ainda</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Cadastre os serviços que você costuma prestar para agilizar os lançamentos e relatórios.
          </p>
          <button
            onClick={() => setExibirForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Primeiro Serviço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servicos.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-brand-300 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-sm text-slate-900 group-hover:text-brand-600 transition-colors">
                    {item.nome}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                    {item.unidade_medida || 'UN'}
                  </span>
                </div>
                {item.descricao_padrao && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {item.descricao_padrao}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Preço Base:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatarMoeda(item.valor_base)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
