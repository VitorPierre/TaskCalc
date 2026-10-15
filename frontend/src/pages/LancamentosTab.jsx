import React, { useState, useEffect } from 'react';
import { lancamentosAPI, catalogoAPI } from '../api/api';
import {
  ClipboardList,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  CheckCheck,
  ShieldAlert,
} from 'lucide-react';

export default function LancamentosTab({ onUpdateCounts }) {
  const [lancamentos, setLancamentos] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState(''); // '' (todos), 'PENDENTE', 'FATURADO'
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  // Estado do formulário
  const [exibirForm, setExibirForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    catalogo_servico_id: '',
    nome_servico: '',
    descricao: '',
    unidade_medida: 'UN',
    quantidade: '1',
    valor_unitario: '',
    data_execucao: new Date().toISOString().slice(0, 16),
  });

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [listaLanc, listaCat] = await Promise.all([
        lancamentosAPI.listar(filtroStatus ? { status_filtro: filtroStatus } : {}),
        catalogoAPI.listar(true),
      ]);
      setLancamentos(listaLanc);
      setCatalogo(listaCat);

      // Atualiza contador de pendentes
      const pendentesCount = listaLanc.filter((l) => l.status === 'PENDENTE').length;
      if (onUpdateCounts) {
        onUpdateCounts((prev) => ({
          ...prev,
          lancamentosPendentes: pendentesCount,
          lancamentosTotal: listaLanc.length,
        }));
      }
    } catch (err) {
      setErro(err.message || 'Falha ao carregar lançamentos.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [filtroStatus]);

  // Ao selecionar um item do catálogo, preenche automaticamente os campos de snapshot
  const handleSelecionarCatalogo = (catId) => {
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
        valor_unitario: item.valor_base.toString(),
        unidade_medida: item.unidade_medida || 'UN',
        descricao: prev.descricao || item.descricao_padrao || '',
      }));
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const payload = {
        quantidade: parseFloat(form.quantidade) || 1.0,
        descricao: form.descricao.trim() || null,
        data_execucao: form.data_execucao ? new Date(form.data_execucao).toISOString() : null,
      };

      if (form.catalogo_servico_id) {
        payload.catalogo_servico_id = parseInt(form.catalogo_servico_id, 10);
        if (form.valor_unitario) payload.valor_unitario = parseFloat(form.valor_unitario);
        if (form.nome_servico) payload.nome_servico = form.nome_servico;
        if (form.unidade_medida) payload.unidade_medida = form.unidade_medida;
      } else {
        if (!form.nome_servico.trim()) throw new Error('Nome do serviço avulso é obrigatório.');
        if (!form.valor_unitario) throw new Error('Valor unitário do serviço avulso é obrigatório.');
        payload.nome_servico = form.nome_servico.trim();
        payload.valor_unitario = parseFloat(form.valor_unitario);
        payload.unidade_medida = form.unidade_medida.trim().toUpperCase() || 'UN';
      }

      await lancamentosAPI.criar(payload);
      setSucesso('Lançamento registrado com sucesso sob a regra de Snapshot (RD01)!');
      setForm({
        catalogo_servico_id: '',
        nome_servico: '',
        descricao: '',
        unidade_medida: 'UN',
        quantidade: '1',
        valor_unitario: '',
        data_execucao: new Date().toISOString().slice(0, 16),
      });
      setExibirForm(false);
      await carregarDados();
      setTimeout(() => setSucesso(null), 4000);
    } catch (err) {
      setErro(err.message || 'Falha ao registrar lançamento.');
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-600" /> Lançamento de Serviços Prestados
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Registre os atendimentos e ordens de serviços com preços e dados congelados no momento da execução (RD01).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={carregarDados}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin text-brand-600' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={() => setExibirForm(!exibirForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm shadow-brand-600/20 transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            {exibirForm ? 'Cancelar' : 'Novo Lançamento'}
          </button>
        </div>
      </div>

      {/* Alertas */}
      {sucesso && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}

      {erro && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Box Didático da Regra de Snapshot RD01 */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Regra de Snapshot (RD01) Ativa:</span> Ao lançar um serviço, o nome,
          preço unitário e unidade são gravados de forma imutável. Alterações futuras no catálogo não afetam este histórico.
        </div>
      </div>

      {/* Formulário de Novo Lançamento */}
      {exibirForm && (
        <div className="bg-white p-5 rounded-xl border border-brand-200 shadow-sm bg-gradient-to-b from-brand-50/30 to-white">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-600" /> Registrar Execução de Serviço
          </h3>
          <form onSubmit={handleSalvar} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Serviço do Catálogo (Opcional se avulso)
              </label>
              <select
                value={form.catalogo_servico_id}
                onChange={(e) => handleSelecionarCatalogo(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
              >
                <option value="">-- Serviço Avulso / Sob Medida --</option>
                {catalogo.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome} ({formatarMoeda(cat.valor_base)} / {cat.unidade_medida})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Título do Serviço *</label>
              <input
                type="text"
                required
                placeholder="Ex: Formatação de Notebook, Manutenção..."
                value={form.nome_servico}
                onChange={(e) => setForm({ ...form, nome_servico: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Quantidade *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Unidade</label>
              <input
                type="text"
                value={form.unidade_medida}
                onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Valor Unitário (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={form.valor_unitario}
                onChange={(e) => setForm({ ...form, valor_unitario: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data/Hora da Execução</label>
              <input
                type="datetime-local"
                value={form.data_execucao}
                onChange={(e) => setForm({ ...form, data_execucao: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Descrição / Detalhes do Atendimento</label>
              <input
                type="text"
                placeholder="Observações pertinentes a esta execução específica..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="sm:col-span-4 flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500">
                Total estimado:{' '}
                <span className="font-bold text-slate-900 text-sm">
                  {formatarMoeda((parseFloat(form.quantidade) || 0) * (parseFloat(form.valor_unitario) || 0))}
                </span>
              </div>
              <div className="flex gap-2">
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
                  {salvando ? 'Salvando...' : 'Confirmar Lançamento'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Barra de Filtro de Status */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium">Filtrar por Status:</span>
        <button
          onClick={() => setFiltroStatus('')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filtroStatus === '' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFiltroStatus('PENDENTE')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1 ${
            filtroStatus === 'PENDENTE'
              ? 'bg-amber-600 text-white'
              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Clock className="w-3 h-3" /> Pendentes
        </button>
        <button
          onClick={() => setFiltroStatus('FATURADO')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1 ${
            filtroStatus === 'FATURADO'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <CheckCheck className="w-3 h-3" /> Faturados
        </button>
      </div>

      {/* Tabela de Lançamentos */}
      {carregando ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
          Carregando lançamentos...
        </div>
      ) : lancamentos.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <ClipboardList className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h4 className="text-sm font-semibold text-slate-700">Nenhum lançamento encontrado</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filtroStatus
              ? `Nenhum lançamento com status '${filtroStatus}'. Altere o filtro acima ou crie um novo atendimento.`
              : 'Registre atendimentos para começar a controlar seus serviços e faturamento.'}
          </p>
          <button
            onClick={() => setExibirForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Fazer Primeiro Lançamento
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Data Execução</th>
                  <th className="py-3 px-4">Serviço / Descrição</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Qtd</th>
                  <th className="py-3 px-4 text-right">Unitário</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lancamentos.map((item) => {
                  const isFaturado = item.status === 'FATURADO';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatarData(item.data_execucao)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-sm">{item.nome_servico}</div>
                        {item.descricao && (
                          <div className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">{item.descricao}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium text-[10px] ${
                            isFaturado
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isFaturado ? (
                            <>
                              <CheckCheck className="w-3 h-3" /> FATURADO
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" /> PENDENTE
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {item.quantidade} <span className="text-[10px] text-slate-400">{item.unidade_medida}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatarMoeda(item.valor_unitario)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatarMoeda(item.valor_total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
