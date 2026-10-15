/**
 * =============================================================================
 * ABA: Catálogo de Serviços (CatalogoTab.jsx)
 * =============================================================================
 * Papel na Arquitetura:
 * - Envolve e renderiza a tela completa 'CatalogoView.jsx'.
 * - Atualiza os contadores globais da aplicação no componente App raiz.
 * =============================================================================
 */

import React from 'react';
import CatalogoView from '../components/CatalogoView';

export default function CatalogoTab({ onUpdateCounts }) {
  const handleCatalogoAtualizado = (servicos) => {
    if (onUpdateCounts) {
      onUpdateCounts((prev) => ({
        ...prev,
        catalogo: servicos.length,
      }));
    }
  };

  return <CatalogoView onCatalogoAtualizado={handleCatalogoAtualizado} />;
}
