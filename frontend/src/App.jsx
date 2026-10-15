import React, { useState } from 'react';
import Navbar from './components/Navbar';
import TabsNavigation, {
  TAB_CATALOGO,
  TAB_LANCAMENTOS,
  TAB_FECHAMENTO,
} from './components/TabsNavigation';
import CatalogoTab from './pages/CatalogoTab';
import LancamentosTab from './pages/LancamentosTab';
import FechamentoTab from './pages/FechamentoTab';

export default function App() {
  const [activeTab, setActiveTab] = useState(TAB_CATALOGO);
  const [counts, setCounts] = useState({
    catalogo: 0,
    lancamentosPendentes: 0,
    fechamentos: 0,
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 1. Barra de Navegação Superior */}
      <Navbar />

      {/* 2. Barra de Abas de Navegação */}
      <TabsNavigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={counts}
      />

      {/* 3. Conteúdo Principal da Aba Ativa */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === TAB_CATALOGO && (
          <CatalogoTab onUpdateCounts={setCounts} />
        )}

        {activeTab === TAB_LANCAMENTOS && (
          <LancamentosTab onUpdateCounts={setCounts} />
        )}

        {activeTab === TAB_FECHAMENTO && (
          <FechamentoTab onUpdateCounts={setCounts} />
        )}
      </main>

      {/* 4. Rodapé Informativo */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700">TaskCalc</span> &bull; Sistema de Controle de Serviços com Regra de Snapshot (RD01).
          </div>
          <div className="text-slate-400">
            Frontend em React + Vite + Tailwind CSS &bull; Backend em FastAPI + SQLite
          </div>
        </div>
      </footer>
    </div>
  );
}
