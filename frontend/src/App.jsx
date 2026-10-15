import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TabsNavigation, {
  TAB_CATALOGO,
  TAB_LANCAMENTOS,
  TAB_FECHAMENTO,
} from './components/TabsNavigation';
import CatalogoTab from './pages/CatalogoTab';
import LancamentosTab from './pages/LancamentosTab';
import FechamentoTab from './pages/FechamentoTab';
import LoginView from './components/LoginView';
import { authAPI } from './api/api';

export default function App() {
  // Inicializa o estado do usuário logado a partir do localStorage
  const [usuario, setUsuario] = useState(() => {
    try {
      const savedUser = localStorage.getItem('taskcalc_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedUser = localStorage.getItem('taskcalc_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        return u.perfil === 'PRESTADOR' ? TAB_LANCAMENTOS : TAB_CATALOGO;
      }
    } catch {
      // fallback
    }
    return TAB_CATALOGO;
  });

  const [counts, setCounts] = useState({
    catalogo: 0,
    lancamentosPendentes: 0,
    fechamentos: 0,
  });

  // Garante que PRESTADOR nunca fique na aba Catálogo
  useEffect(() => {
    if (usuario && usuario.perfil === 'PRESTADOR' && activeTab === TAB_CATALOGO) {
      setActiveTab(TAB_LANCAMENTOS);
    }
  }, [usuario, activeTab]);

  // Handler de Login com Sucesso
  const handleLoginSuccess = (user) => {
    setUsuario(user);
    if (user.perfil === 'PRESTADOR') {
      setActiveTab(TAB_LANCAMENTOS);
    } else {
      setActiveTab(TAB_CATALOGO);
    }
  };

  // Handler de Logout
  const handleLogout = () => {
    authAPI.logout();
    setUsuario(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 1. Barra de Navegação Superior */}
      <Navbar usuario={usuario} onLogout={usuario ? handleLogout : null} />

      {/* 2. Conteúdo Condicional: Login vs Aplicação com Abas */}
      {!usuario ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LoginView onLoginSuccess={handleLoginSuccess} />
        </main>
      ) : (
        <>
          {/* Barra de Abas (filtrada conforme o perfil: GESTOR ou PRESTADOR) */}
          <TabsNavigation
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            counts={counts}
            perfil={usuario.perfil}
          />

          {/* Conteúdo Principal da Aba Ativa */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {activeTab === TAB_CATALOGO && usuario.perfil === 'GESTOR' && (
              <CatalogoTab onUpdateCounts={setCounts} />
            )}

            {activeTab === TAB_LANCAMENTOS && (
              <LancamentosTab onUpdateCounts={setCounts} />
            )}

            {activeTab === TAB_FECHAMENTO && (
              <FechamentoTab onUpdateCounts={setCounts} />
            )}
          </main>
        </>
      )}

      {/* 3. Rodapé Informativo */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700">TaskCalc</span> &bull; Sistema de Controle de Serviços com Regra de Snapshot (RD01).
          </div>
          <div className="text-slate-400">
            {usuario ? (
              <span>Conectado como <strong className="text-slate-600">{usuario.nome}</strong> ({usuario.perfil})</span>
            ) : (
              <span>Autenticação necessária para acessar o sistema</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
