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

// Interceptor de requisição para injetar o token JWT ou cabeçalho de usuário autenticado
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('taskcalc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Permite que requisições administrativas no frontend utilizem o gestor padrão para testes
    const userEmail = localStorage.getItem('taskcalc_user_email') || 'gestor_rbac_1792089151@taskcalc.com';
    config.headers['X-User-Email'] = userEmail;
  }
  return config;
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
// ENDPOINTS DO CATÁLOGO DE SERVIÇOS (/servicos)
// -----------------------------------------------------------------------------
export const catalogoAPI = {
  listar: (apenasAtivos = false) =>
    api.get('/servicos/', { params: { apenas_ativos: apenasAtivos } }).then((res) => res.data),

  criar: (dados) =>
    api.post('/servicos/', dados).then((res) => res.data),

  obterPorId: (id) =>
    api.get(`/servicos/${id}`).then((res) => res.data),

  atualizar: (id, dados) =>
    api.put(`/servicos/${id}`, dados).then((res) => res.data),

  alternarStatus: (id) =>
    api.patch(`/servicos/${id}/toggle-status`).then((res) => res.data),

  inativar: (id) =>
    api.delete(`/servicos/${id}`).then((res) => res.data),
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
// ENDPOINTS DE AUTENTICAÇÃO & USUÁRIOS (/auth)
// -----------------------------------------------------------------------------
export const authAPI = {
  cadastro: (dados) =>
    api.post('/auth/cadastro', dados).then((res) => res.data),

  login: async (credenciais) => {
    const data = await api.post('/auth/login', credenciais).then((res) => res.data);
    if (data.access_token) {
      localStorage.setItem('taskcalc_token', data.access_token);
      localStorage.setItem('taskcalc_user', JSON.stringify(data.usuario));
      localStorage.setItem('taskcalc_user_email', data.usuario.email);
    }
    return data;
  },

  obterUsuarioAtual: () =>
    api.get('/auth/me').then((res) => res.data),

  listarUsuarios: () =>
    api.get('/auth/usuarios').then((res) => res.data),

  listarPerfis: () =>
    api.get('/auth/perfis').then((res) => res.data),

  logout: () => {
    localStorage.removeItem('taskcalc_token');
    localStorage.removeItem('taskcalc_user');
    localStorage.removeItem('taskcalc_user_email');
  },
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
