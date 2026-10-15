import React, { useState, useEffect } from 'react';
import { checkHealthAPI } from '../api/api';
import {
  Calculator,
  ExternalLink,
  Wifi,
  WifiOff,
  ShieldCheck,
  Briefcase,
  LogOut,
  User,
} from 'lucide-react';

export default function Navbar({ usuario, onLogout }) {
  const [apiOnline, setApiOnline] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const testConnection = async () => {
      const data = await checkHealthAPI();
      if (isMounted) {
        setApiOnline(!!data);
      }
    };

    testConnection();
    const interval = setInterval(testConnection, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo e Nome do Sistema */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-600/25">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-slate-900">Task<span className="text-indigo-600">Calc</span></span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 -mt-0.5 hidden sm:block">Controle de Serviços, Lançamentos & Faturamento</p>
            </div>
          </div>

          {/* Status da Conexão, Usuário Logado & Ações */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Status do Backend */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs">
              {apiOnline === true ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-medium text-emerald-700 flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5" /> Online
                  </span>
                </>
              ) : apiOnline === false ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  <span className="font-medium text-rose-700 flex items-center gap-1">
                    <WifiOff className="w-3.5 h-3.5" /> Offline
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span className="font-medium text-amber-700">Verificando...</span>
                </>
              )}
            </div>

            {/* Dados do Usuário Logado */}
            {usuario && (
              <div className="flex items-center gap-2 pl-2 sm:border-l border-slate-200">
                {/* Badge do Perfil */}
                {usuario.perfil === 'GESTOR' ? (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>GESTOR</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/80">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    <span>PRESTADOR</span>
                  </div>
                )}

                {/* Nome do Usuário */}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[120px] lg:max-w-[160px]">
                    {usuario.nome}
                  </div>
                </div>

                {/* Botão Sair */}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                    title="Encerrar sessão (Logout)"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Link Documentação Swagger */}
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-brand-600 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              title="Acessar documentação Swagger da API"
            >
              <span className="hidden sm:inline">Swagger API</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      </div>
    </header>
  );
}
