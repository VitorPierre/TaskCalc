/**
 * =============================================================================
 * ABA: Fechamento de Período (FechamentoTab.jsx)
 * =============================================================================
 * Papel na Arquitetura:
 * - Envolve e renderiza a tela completa 'FechamentoView.jsx'.
 * - Coordena a atualização de contadores globais com o componente App raiz.
 * =============================================================================
 */

import React from 'react';
import FechamentoView from '../components/FechamentoView';
import { fechamentosAPI, lancamentosAPI } from '../api/api';

export default function FechamentoTab({ onUpdateCounts }) {
  const handleFechamentoConcluido = () => {
    if (onUpdateCounts) {
      Promise.all([fechamentosAPI.listar(), lancamentosAPI.listar()]).then(
        ([fechs, lancs]) => {
          const pendentes = lancs.filter((l) => l.status === 'PENDENTE').length;
          onUpdateCounts((prev) => ({
            ...prev,
            fechamentos: fechs.length,
            lancamentosPendentes: pendentes,
            lancamentosTotal: lancs.length,
          }));
        }
      );
    }
  };

  return <FechamentoView onFechamentoConcluido={handleFechamentoConcluido} />;
}
