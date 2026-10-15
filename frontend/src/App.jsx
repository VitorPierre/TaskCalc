import React, { useState, useEffect } from 'react';
import CatalogoView from './components/CatalogoView';
import LancamentoForm from './components/LancamentoForm';
import FechamentoView from './components/FechamentoView';
import LoginView from './components/LoginView';
import { authAPI, checkHealthAPI, catalogoAPI, lancamentosAPI, fechamentosAPI } from './api/api';
import {
  Calculator,
  BookOpen,
  ClipboardList,
  FileCheck,
  LogOut,
  UserCheck,
  Wifi,
  WifiOff,
  ExternalLink,
} from 'lucide-react';

export const TAB_CATALOGO = 'catalogo';
export const TAB_LANCAMENTOS = 'lancamentos';
export const TAB_FECHAMENTO = 'fechamento';

export default function App() {
  // Usuário autenticado
  const [usuario, setUsuario] = useState(() => {
    try {
      const saved = localStorage.getItem('taskcalc_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Aba ativa
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('taskcalc_user');
      if (saved) {
        const u = JSON.parse(saved);
        return u.perfil === 'PRESTADOR' ? TAB_LANCAMENTOS : TAB_CATALOGO;
      }
    } catch {
      // fallback
    }
    return TAB_CATALOGO;
  });

  // Status da API e Contadores
  const [apiOnline, setApiOnline] = useState(null);
  const [counts, setCounts] = useState({
    catalogo: 0,
    lancamentosPendentes: 0,
    fechamentos: 0,
  });

  // Health check periódico
  useEffect(() => {
    let isMounted = true;
    const testHealth = async () => {
      const res = await checkHealthAPI();
      if (isMounted) setApiOnline(!!res);
    };
    testHealth();
    const interval = setInterval(testHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Atualiza contadores
  const atualizarContadores = async () => {
    try {
      const [cats, lancs, fechs] = await Promise.all([
        catalogoAPI.listar(false).catch(() => []),
        lancamentosAPI.listar({ status_filtro: 'PENDENTE' }).catch(() => []),
        fechamentosAPI.listar().catch(() => []),
      ]);
      setCounts({
        catalogo: cats.length,
        lancamentosPendentes: lancs.length,
        fechamentos: fechs.length,
      });
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    if (usuario) {
      atualizarContadores();
    }
  }, [usuario]);

  // Garante que PRESTADOR nunca visualize Catálogo
  useEffect(() => {
    if (usuario && usuario.perfil === 'PRESTADOR' && activeTab === TAB_CATALOGO) {
      setActiveTab(TAB_LANCAMENTOS);
    }
  }, [usuario, activeTab]);

  const handleLoginSuccess = (user) => {
    setUsuario(user);
    if (user.perfil === 'PRESTADOR') {
      setActiveTab(TAB_LANCAMENTOS);
    } else {
      setActiveTab(TAB_CATALOGO);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    setUsuario(null);
  };

  // Se não autenticado, renderiza a tela de login minimalista
  if (!usuario) {
    return (
      <div className="min-h-screen bg-zinc-50/80 flex items-center justify-center p-4">
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Lista de abas disponíveis de acordo com o perfil
  const navItems = [
    ...(usuario.perfil === 'GESTOR'
      ? [
          {
            id: TAB_CATALOGO,
            label: 'Catálogo de Serviços',
            shortLabel: 'Catálogo',
            icon: BookOpen,
            count: counts.catalogo,
          },
        ]
      : []),
    {
      id: TAB_LANCAMENTOS,
      label: 'Lançamentos',
      shortLabel: 'Lançamentos',
      icon: ClipboardList,
      count: counts.lancamentosPendentes,
      countHighlight: counts.lancamentosPendentes > 0,
    },
    {
      id: TAB_FECHAMENTO,
      label: 'Fechamento de Período',
      shortLabel: 'Fechamento',
      icon: FileCheck,
      count: counts.fechamentos,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50/80 flex flex-col md:flex-row text-zinc-900 font-sans">
      
      {/* ----------------------------------------------------------------- */}
      {/* SIDEBAR FIXA NO DESKTOP (w-60 border-r border-zinc-200 bg-white)   */}
      {/* ----------------------------------------------------------------- */}
      <aside className="hidden md:flex w-60 border-r border-zinc-200 bg-white flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
        <div>
          {/* Header do Sistema */}
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-zinc-900 text-white flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-sm tracking-tight text-zinc-900 block leading-tight">
                  TaskCalc
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">Controle & Faturamento</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5" title={apiOnline ? 'API Online' : 'API Offline'}>
              <span
                className={`w-2 h-2 rounded-full ${
                  apiOnline ? 'bg-emerald-500' : apiOnline === false ? 'bg-red-500' : 'bg-amber-400'
                }`}
              />
            </div>
          </div>

          {/* Itens de Navegação */}
          <nav className="p-3 space-y-1">
            <span className="px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400 block mb-2">
              Menu Principal
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count !== null && (
                    <span
                      className={`text-xs px-1.5 py-0.2 rounded-md font-mono tabular-nums ${
                        item.countHighlight
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'text-zinc-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar: Perfil do Usuário & Logout */}
        <div className="p-3 border-t border-zinc-200 space-y-2">
          {/* Link para Documentação Swagger */}
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
            title="Documentação OpenAPI / Swagger"
          >
            <span>Swagger API</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>

          {/* Cartão do Usuário */}
          <div className="flex items-center justify-between p-2 rounded-md bg-zinc-50 border border-zinc-200/80">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-900 truncate max-w-[105px]">
                  {usuario.nome}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono block">
                  {usuario.perfil}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Encerrar sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ----------------------------------------------------------------- */}
      {/* HEADER SUPERIOR NO MOBILE (md:hidden)                             */}
      {/* ----------------------------------------------------------------- */}
      <header className="md:hidden bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-900 text-white flex items-center justify-center">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900">TaskCalc</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-zinc-200 text-zinc-600 bg-zinc-50">
            {usuario.perfil}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* CONTEÚDO PRINCIPAL (flex-1 bg-zinc-50/80)                         */}
      {/* ----------------------------------------------------------------- */}
      <main className="flex-1 min-w-0 max-w-6xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
        {activeTab === TAB_CATALOGO && usuario.perfil === 'GESTOR' && (
          <CatalogoView onCatalogoAtualizado={atualizarContadores} />
        )}

        {activeTab === TAB_LANCAMENTOS && (
          <LancamentoForm onLancamentoCriado={atualizarContadores} />
        )}

        {activeTab === TAB_FECHAMENTO && (
          <FechamentoView onFechamentoConcluido={atualizarContadores} />
        )}
      </main>

      {/* ----------------------------------------------------------------- */}
      {/* BOTTOM BAR FIXA NO MOBILE (md:hidden fixed bottom-0)              */}
      {/* ----------------------------------------------------------------- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-zinc-200 flex items-center justify-around py-2 px-3 shadow-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-md transition-colors relative ${
                isActive ? 'text-zinc-900 font-semibold' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.countHighlight && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5" />
                )}
              </div>
              <span className="text-[10px] leading-tight">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
