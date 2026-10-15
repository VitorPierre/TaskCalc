import React from 'react';
import { BookOpen, ClipboardList, FileCheck } from 'lucide-react';

export const TAB_CATALOGO = 'catalogo';
export const TAB_LANCAMENTOS = 'lancamentos';
export const TAB_FECHAMENTO = 'fechamento';

export default function TabsNavigation({ activeTab, onSelectTab, counts = {}, perfil = 'GESTOR' }) {
  const todasTabs = [
    {
      id: TAB_CATALOGO,
      label: 'Catálogo de Serviços',
      shortLabel: 'Catálogo',
      icon: BookOpen,
      count: counts.catalogo,
      description: 'Definição de serviços padrão e preços base',
      perfisPermitidos: ['GESTOR'], // Restrito a Gestor
    },
    {
      id: TAB_LANCAMENTOS,
      label: 'Lançamento de Serviços',
      shortLabel: 'Lançamentos',
      icon: ClipboardList,
      count: counts.lancamentosPendentes !== undefined ? `${counts.lancamentosPendentes} pend.` : null,
      description: 'Registro de execuções com congelamento (RD01)',
      perfisPermitidos: ['GESTOR', 'PRESTADOR'],
    },
    {
      id: TAB_FECHAMENTO,
      label: 'Fechamento de Período',
      shortLabel: 'Fechamento',
      icon: FileCheck,
      count: counts.fechamentos,
      description: 'Faturamento de intervalo e emissão do PDF',
      perfisPermitidos: ['GESTOR', 'PRESTADOR'],
    },
  ];

  // Exibe apenas as abas compatíveis com o perfil do usuário logado
  const tabs = todasTabs.filter(
    (tab) => !tab.perfisPermitidos || tab.perfisPermitidos.includes(perfil)
  );

  return (
    <nav className="border-b border-slate-200 bg-white" aria-label="Abas de Navegação">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-2 sm:space-x-8 -mb-px overflow-x-auto scrollbar-none py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group inline-flex items-center gap-2.5 py-4 px-3 sm:px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 rounded-t-lg ${
                  isActive
                    ? 'border-brand-600 text-brand-700 bg-brand-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:text-slate-700 group-hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <span className="font-semibold text-xs sm:text-sm">
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </span>

                {tab.count !== null && tab.count !== undefined && (
                  <span
                    className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-100 text-brand-800'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
