/**
 * =============================================================================
 * COMPONENTE: LoginView.jsx
 * =============================================================================
 * Papel na Arquitetura:
 * - Tela de Autenticação e Cadastro Inicial de Usuários no TaskCalc.
 * - Suporta login com e-mail e senha, e alternância para criação de nova conta.
 * - Armazena as credenciais seguras no localStorage:
 *   * taskcalc_token (JWT assinado pelo backend)
 *   * taskcalc_user (Objeto do usuário: id, nome, email, perfil)
 *   * taskcalc_user_email (E-mail para interceptor e requests)
 *   * taskcalc_perfil ('PRESTADOR' ou 'GESTOR')
 * - Disponibiliza atalhos rápidos de acesso com contas de demonstração (Gestor e Prestador).
 * =============================================================================
 */

import React, { useState } from 'react';
import { authAPI } from '../api/api';
import {
  Calculator,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Briefcase,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Shield,
} from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [modo, setModo] = useState('login'); // 'login' | 'cadastro'
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Estados do formulário de Login
  const [loginForm, setLoginForm] = useState({
    email: '',
    senha: '',
  });

  // Estados do formulário de Cadastro
  const [cadastroForm, setCadastroForm] = useState({
    nome: '',
    email: '',
    senha: '',
    perfil: 'PRESTADOR', // 'PRESTADOR' ou 'GESTOR'
  });

  // Efetua o Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!loginForm.email.trim() || !loginForm.senha.trim()) {
      setErro('Por favor, informe seu e-mail e sua senha de acesso.');
      return;
    }

    setCarregando(true);
    try {
      const res = await authAPI.login({
        email: loginForm.email.trim(),
        senha: loginForm.senha,
      });

      // Salva no localStorage os dados de sessão
      localStorage.setItem('taskcalc_token', res.access_token);
      localStorage.setItem('taskcalc_user', JSON.stringify(res.usuario));
      localStorage.setItem('taskcalc_user_email', res.usuario.email);
      localStorage.setItem('taskcalc_perfil', res.usuario.perfil);

      setSucesso(`Bem-vindo(a), ${res.usuario.nome}! Redirecionando...`);

      if (onLoginSuccess) {
        onLoginSuccess(res.usuario);
      }
    } catch (err) {
      setErro(err.message || 'Falha ao autenticar. Verifique seu e-mail e senha.');
    } finally {
      setCarregando(false);
    }
  };

  // Efetua o Cadastro de Novo Usuário
  const handleCadastroSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!cadastroForm.nome.trim()) {
      setErro('Por favor, informe seu nome completo.');
      return;
    }
    if (!cadastroForm.email.trim()) {
      setErro('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!cadastroForm.senha || cadastroForm.senha.length < 6) {
      setErro('A senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    setCarregando(true);
    try {
      // 1. Cadastra o novo usuário no backend
      await authAPI.cadastro({
        nome: cadastroForm.nome.trim(),
        email: cadastroForm.email.trim(),
        senha: cadastroForm.senha,
        perfil: cadastroForm.perfil,
      });

      // 2. Realiza o login automático imediatamente após o cadastro
      const loginRes = await authAPI.login({
        email: cadastroForm.email.trim(),
        senha: cadastroForm.senha,
      });

      localStorage.setItem('taskcalc_token', loginRes.access_token);
      localStorage.setItem('taskcalc_user', JSON.stringify(loginRes.usuario));
      localStorage.setItem('taskcalc_user_email', loginRes.usuario.email);
      localStorage.setItem('taskcalc_perfil', loginRes.usuario.perfil);

      setSucesso('Conta criada com sucesso! Acessando a plataforma...');

      if (onLoginSuccess) {
        onLoginSuccess(loginRes.usuario);
      }
    } catch (err) {
      setErro(err.message || 'Falha ao criar nova conta. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  // Atalho de acesso rápido para testes (Demo Login)
  const executarLoginRapido = async (email, senha) => {
    setLoginForm({ email, senha });
    setErro(null);
    setSucesso(null);
    setCarregando(true);
    try {
      const res = await authAPI.login({ email, senha });

      localStorage.setItem('taskcalc_token', res.access_token);
      localStorage.setItem('taskcalc_user', JSON.stringify(res.usuario));
      localStorage.setItem('taskcalc_user_email', res.usuario.email);
      localStorage.setItem('taskcalc_perfil', res.usuario.perfil);

      setSucesso(`Acesso concedido como ${res.usuario.perfil}: ${res.usuario.nome}!`);

      if (onLoginSuccess) {
        onLoginSuccess(res.usuario);
      }
    } catch (err) {
      setErro(err.message || 'Falha no login de demonstração.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 overflow-hidden animate-fadeIn">
        {/* Topo com Logo e Apresentação */}
        <div className="p-6 bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-brand-500/20 rounded-full blur-xl pointer-events-none"></div>

          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/30 mb-3">
            <Calculator className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white">
            Task<span className="text-brand-400">Calc</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Sistema Integrado de Controle de Serviços, Lançamentos & Fechamento Financeiro
          </p>

          {/* Alternador de Abas: Login x Cadastro */}
          <div className="mt-5 flex rounded-xl bg-slate-800/80 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => {
                setModo('login');
                setErro(null);
                setSucesso(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                modo === 'login'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Acessar Conta
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('cadastro');
                setErro(null);
                setSucesso(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                modo === 'cadastro'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>
        </div>

        {/* Corpo com Formulário */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Alertas de Feedback */}
          {erro && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {sucesso && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sucesso}</span>
            </div>
          )}

          {/* FORMULÁRIO 1: LOGIN */}
          {modo === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Endereço de E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    placeholder="Sua senha secreta"
                    value={loginForm.senha}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, senha: e.target.value })
                    }
                    className="w-full text-sm pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-medium text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {mostrarSenha ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 active:from-brand-700 active:to-indigo-700 shadow-md shadow-brand-500/25 hover:shadow-lg transition-all disabled:opacity-50"
              >
                {carregando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORMULÁRIO 2: CADASTRO */}
          {modo === 'cadastro' && (
            <form onSubmit={handleCadastroSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nome Completo *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Silva"
                    value={cadastroForm.nome}
                    onChange={(e) =>
                      setCadastroForm({ ...cadastroForm, nome: e.target.value })
                    }
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Endereço de E-mail *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={cadastroForm.email}
                    onChange={(e) =>
                      setCadastroForm({ ...cadastroForm, email: e.target.value })
                    }
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Senha (mínimo de 6 caracteres) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Crie uma senha segura"
                    value={cadastroForm.senha}
                    onChange={(e) =>
                      setCadastroForm({ ...cadastroForm, senha: e.target.value })
                    }
                    className="w-full text-sm pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-medium text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {mostrarSenha ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* SELEÇÃO DE PERFIL: PRESTADOR OU GESTOR */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Selecione o Perfil de Acesso *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Opção Prestador */}
                  <button
                    type="button"
                    onClick={() =>
                      setCadastroForm({ ...cadastroForm, perfil: 'PRESTADOR' })
                    }
                    className={`p-3 rounded-2xl border text-left transition-all relative ${
                      cadastroForm.perfil === 'PRESTADOR'
                        ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase
                        className={`w-4 h-4 ${
                          cadastroForm.perfil === 'PRESTADOR'
                            ? 'text-brand-600'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="text-xs font-extrabold text-slate-900">
                        PRESTADOR
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Registra atendimentos e serviços prestados.
                    </p>
                  </button>

                  {/* Opção Gestor */}
                  <button
                    type="button"
                    onClick={() =>
                      setCadastroForm({ ...cadastroForm, perfil: 'GESTOR' })
                    }
                    className={`p-3 rounded-2xl border text-left transition-all relative ${
                      cadastroForm.perfil === 'GESTOR'
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck
                        className={`w-4 h-4 ${
                          cadastroForm.perfil === 'GESTOR'
                            ? 'text-amber-600'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="text-xs font-extrabold text-slate-900">
                        GESTOR
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Acesso ao Catálogo e Fechamento de Faturamento.
                    </p>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                {carregando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Criando Conta...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Concluir Cadastro & Entrar</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* SEÇÃO DE ACESSO RÁPIDO (DEMO / TESTES) */}
          <div className="pt-3 border-t border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
              Acesso Rápido para Testes
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  executarLoginRapido('gestor@taskcalc.com', 'senha123')
                }
                disabled={carregando}
                className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                title="Entrar com conta padrão de GESTOR (vê todas as abas, incluindo o Catálogo)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Entrar como Gestor</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  executarLoginRapido('prestador@taskcalc.com', 'senha123')
                }
                disabled={carregando}
                className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                title="Entrar com conta padrão de PRESTADOR (aba Catálogo oculta)"
              >
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>Entrar como Prestador</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
