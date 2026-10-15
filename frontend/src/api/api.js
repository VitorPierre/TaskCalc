/**
 * =============================================================================
 * CLIENTE HTTP BASE (Axios) - TaskCalc API
 * =============================================================================
 * Papel na Arquitetura:
 * - Centraliza toda a comunicação HTTP entre o Frontend React e o Backend FastAPI.
 * - Configura a URL base (`/api/v1`) via variável de ambiente.
 * - Trata erros de rede e padroniza as respostas para os componentes de tela.
 * =============================================================================
 */

import axios from 'axios';

// URL base do backend (padrão: http://localhost:8000/api/v1)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const SERVER_ROOT_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor de resposta para padronização de tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extrai mensagem detalhada retornada pelo FastAPI (HTTPException: detail)
    const errorDetail =
      error.response?.data?.detail ||
      error.message ||
      'Ocorreu um erro inesperado ao se comunicar com o servidor.';

    console.error('[API Error]:', errorDetail, error);

    // Repassa o erro com mensagem tratada
    return Promise.reject(new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail)));
  }
);

// -----------------------------------------------------------------------------
// ENDPOINTS DO CATÁLOGO DE SERVIÇOS (/catalogo)
// -----------------------------------------------------------------------------
export const catalogoAPI = {
  listar: (apenasAtivos = false) =>
    api.get('/catalogo/', { params: { apenas_ativos: apenasAtivos } }).then((res) => res.data),

  criar: (dados) =>
    api.post('/catalogo/', dados).then((res) => res.data),

  obterPorId: (id) =>
    api.get(`/catalogo/${id}`).then((res) => res.data),
};

// -----------------------------------------------------------------------------
// ENDPOINTS DE LANÇAMENTOS DE SERVIÇOS (/lancamentos)
// -----------------------------------------------------------------------------
export const lancamentosAPI = {
  listar: (params = {}) =>
    api.get('/lancamentos/', { params }).then((res) => res.data),

  criar: (dados) =>
    api.post('/lancamentos/', dados).then((res) => res.data),

  obterPorId: (id) =>
    api.get(`/lancamentos/${id}`).then((res) => res.data),
};

// -----------------------------------------------------------------------------
// ENDPOINTS DE FECHAMENTO DE PERÍODO & PDF (/fechamentos)
// -----------------------------------------------------------------------------
export const fechamentosAPI = {
  simular: (dados) =>
    api.post('/fechamentos/simular', dados).then((res) => res.data),

  criar: (dados) =>
    api.post('/fechamentos/', dados).then((res) => res.data),

  listar: () =>
    api.get('/fechamentos/').then((res) => res.data),

  obterPorId: (id) =>
    api.get(`/fechamentos/${id}`).then((res) => res.data),

  // Retorna a URL direta para visualização/download do PDF oficial
  getUrlPdf: (fechamentoId) =>
    `${API_BASE_URL}/fechamentos/${fechamentoId}/pdf`,
};

// -----------------------------------------------------------------------------
// VERIFICAÇÃO DE SAÚDE DA API (Health Check)
// -----------------------------------------------------------------------------
export const checkHealthAPI = async () => {
  try {
    const res = await axios.get(`${SERVER_ROOT_URL}/`, { timeout: 4000 });
    return res.data;
  } catch (error) {
    return null;
  }
};

export default api;
