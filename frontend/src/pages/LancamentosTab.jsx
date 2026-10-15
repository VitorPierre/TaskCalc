/**
 * =============================================================================
 * ABA: Lançamento de Serviços (LancamentosTab.jsx)
 * =============================================================================
 * Papel na Arquitetura:
 * - Apresenta a tela de Lançamento de Serviços do sistema.
 * - Integra o componente 'LancamentoForm.jsx' para permitir o cadastro ágil
 *   de serviços padronizados (do catálogo) ou avulsos (variáveis),
 *   além de acompanhar a lista dos últimos serviços pendentes de faturamento.
 * =============================================================================
 */

import React, { useState } from 'react';
import LancamentoForm from '../components/LancamentoForm';
import { lancamentosAPI } from '../api/api';
import { ClipboardList, History, CheckCheck, Clock, Layers } from 'lucide-react';

export default function LancamentosTab({ onUpdateCounts }) {
  const [visao, setVisao] = useState('novo'); // 'novo' (LancamentoForm + Pendentes) ou 'historico_geral'
  const [historicoCompleto, setHistoricoCompleto] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const carregarHistoricoCompleto = async () => {
    setCarregandoHistorico(true);
    try {
      const data = await lancamentosAPI.listar();
      setHistoricoCompleto(data);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const alternarParaHistorico = async () => {
    setVisao('historico_geral');
    await carregarHistoricoCompleto();
  };

  const handleLancamentoCriado = () => {
    if (onUpdateCounts) {
      lancamentosAPI.listar().then((lista) => {
        const pendentes = lista.filter((l) => l.status === 'PENDENTE').length;
        onUpdateCounts((prev) => ({
          ...prev,
          lancamentosPendentes: pendentes,
          lancamentosTotal: lista.length,
        }));
      });
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
      {/* Barra de Subnavegação da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-600" />
            Lançamento de Serviços Prestados
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Grave atendimentos com congelamento no momento da execução (Snapshot RD01).
          </p>
        </div>

        {/* Alternância de Visão */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisao('novo')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              visao === 'novo'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Novo Lançamento & Pendentes</span>
          </button>

          <button
            type="button"
            onClick={alternarParaHistorico}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              visao === 'historico_geral'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico Completo</span>
          </button>
        </div>
      </div>

      {/* Visão 1: Componente LancamentoForm (Formulário Padronizado/Variável + Lista de Pendentes) */}
      {visao === 'novo' && (
        <LancamentoForm onLancamentoCriado={handleLancamentoCriado} />
      )}

      {/* Visão 2: Histórico Geral (Pendentes e Já Faturados) */}
      {visao === 'historico_geral' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Histórico Geral de Todos os Atendimentos ({historicoCompleto.length} registros)
            </h4>
            <button
              onClick={carregarHistoricoCompleto}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium"
            >
              Recarregar histórico
            </button>
          </div>

          {carregandoHistorico ? (
            <div className="py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-200">
              Carregando histórico geral...
            </div>
          ) : historicoCompleto.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-dashed border-slate-300">
              Nenhum lançamento no histórico.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
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
                    {historicoCompleto.map((item) => {
                      const isFaturado = item.status === 'FATURADO';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
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
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[10px] ${
                                isFaturado
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {isFaturado ? (
                                <>
                                  <CheckCheck className="w-3 h-3 text-emerald-600" /> FATURADO
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600" /> PENDENTE
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
      )}
    </div>
  );
}
