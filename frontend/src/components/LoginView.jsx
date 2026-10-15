/**
 * =============================================================================
 * COMPONENTE: LoginView.jsx (Minimalist Design System - Zinc / Shadcn)
 * =============================================================================
 * Papel na Arquitetura:
 * - Tela de autenticação e criação de conta com design sóbrio e minimalista.
 * - Formulários de Login e Cadastro com inputs limpos (rounded-md, border-zinc-200).
 * - Segmented Control para alternância entre Login e Cadastro.
 * - Botão primário de alto contraste em grafite escuro (bg-zinc-900 text-white).
 * - Atalhos rápidos para contas de teste (GESTOR e PRESTADOR).
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
  UserCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
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
    perfil: 'PRESTADOR',
  });

  // Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!loginForm.email.trim() || !loginForm.senha.trim()) {
      setErro('Informe seu e-mail e senha.');
      return;
    }

    setCarregando(true);
    try {
      const res = await authAPI.login({
        email: loginForm.email.trim(),
        senha: loginForm.senha,
      });

      localStorage.setItem('taskcalc_token', res.access_token);
      localStorage.setItem('taskcalc_user', JSON.stringify(res.usuario));
      localStorage.setItem('taskcalc_user_email', res.usuario.email);
      localStorage.setItem('taskcalc_perfil', res.usuario.perfil);

      setSucesso(`Bem-vindo, ${res.usuario.nome}!`);

      if (onLoginSuccess) {
        onLoginSuccess(res.usuario);
      }
    } catch (err) {
      setErro(err.message || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setCarregando(false);
    }
  };

  // Cadastro
  const handleCadastroSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!cadastroForm.nome.trim()) {
      setErro('Informe seu nome completo.');
      return;
    }
    if (!cadastroForm.email.trim()) {
      setErro('Informe um e-mail válido.');
      return;
    }
    if (!cadastroForm.senha || cadastroForm.senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setCarregando(true);
    try {
      await authAPI.cadastro({
        nome: cadastroForm.nome.trim(),
        email: cadastroForm.email.trim(),
        senha: cadastroForm.senha,
        perfil: cadastroForm.perfil,
      });

      const loginRes = await authAPI.login({
        email: cadastroForm.email.trim(),
        senha: cadastroForm.senha,
      });

      localStorage.setItem('taskcalc_token', loginRes.access_token);
      localStorage.setItem('taskcalc_user', JSON.stringify(loginRes.usuario));
      localStorage.setItem('taskcalc_user_email', loginRes.usuario.email);
      localStorage.setItem('taskcalc_perfil', loginRes.usuario.perfil);

      setSucesso('Conta criada com sucesso!');

      if (onLoginSuccess) {
        onLoginSuccess(loginRes.usuario);
      }
    } catch (err) {
      setErro(err.message || 'Falha ao criar conta. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  // Atalhos demo
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

      setSucesso(`Acesso concedido: ${res.usuario.nome}!`);

      if (onLoginSuccess) {
        onLoginSuccess(res.usuario);
      }
    } catch (err) {
      setErro(err.message || 'Falha no acesso de demonstração.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white border border-zinc-200/80 rounded-lg shadow-xs p-6 sm:p-7 space-y-6">
        
        {/* Cabeçalho Minimalista */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-md bg-zinc-900 text-white flex items-center justify-center mx-auto">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              TaskCalc
            </h2>
            <p className="text-xs text-zinc-500">
              Controle de Serviços e Faturamento
            </p>
          </div>
        </div>

        {/* Segmented Control (Estilo iOS / Shadcn) */}
        <div className="bg-zinc-100 p-1 rounded-md flex">
          <button
            type="button"
            onClick={() => {
              setModo('login');
              setErro(null);
              setSucesso(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${
              modo === 'login'
                ? 'bg-white shadow-xs text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900'
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
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${
              modo === 'cadastro'
                ? 'bg-white shadow-xs text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Alertas Discretos */}
        {erro && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* Formulário de Login */}
        {modo === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="nome@empresa.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={loginForm.senha}
                  onChange={(e) => setLoginForm({ ...loginForm, senha: e.target.value })}
                  className="w-full text-sm pl-9 pr-9 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                >
                  {mostrarSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium rounded-md transition-colors disabled:opacity-50 mt-1 shadow-xs"
            >
              {carregando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Formulário de Cadastro */}
        {modo === 'cadastro' && (
          <form onSubmit={handleCadastroSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Nome Completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="Nome do usuário"
                  value={cadastroForm.nome}
                  onChange={(e) => setCadastroForm({ ...cadastroForm, nome: e.target.value })}
                  className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                E-mail *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@empresa.com"
                  value={cadastroForm.email}
                  onChange={(e) => setCadastroForm({ ...cadastroForm, email: e.target.value })}
                  className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Senha (mínimo de 6 caracteres) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={cadastroForm.senha}
                  onChange={(e) => setCadastroForm({ ...cadastroForm, senha: e.target.value })}
                  className="w-full text-sm pl-9 pr-9 py-2 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                >
                  {mostrarSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Perfil de Acesso
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCadastroForm({ ...cadastroForm, perfil: 'PRESTADOR' })}
                  className={`p-2.5 rounded-md border text-left transition-colors ${
                    cadastroForm.perfil === 'PRESTADOR'
                      ? 'border-zinc-900 bg-zinc-50 text-zinc-900 font-semibold'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <span className="text-xs block">PRESTADOR</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Lança atendimentos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCadastroForm({ ...cadastroForm, perfil: 'GESTOR' })}
                  className={`p-2.5 rounded-md border text-left transition-colors ${
                    cadastroForm.perfil === 'GESTOR'
                      ? 'border-zinc-900 bg-zinc-50 text-zinc-900 font-semibold'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <span className="text-xs block">GESTOR</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Acesso total</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium rounded-md transition-colors disabled:opacity-50 mt-1 shadow-xs"
            >
              {carregando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
                  <span>Criando Conta...</span>
                </>
              ) : (
                <span>Concluir Cadastro</span>
              )}
            </button>
          </form>
        )}

        {/* Acesso Rápido para Testes */}
        <div className="pt-4 border-t border-zinc-200/80">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 block mb-2 text-center">
            Acesso Rápido (Demonstração)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => executarLoginRapido('gestor@taskcalc.com', 'senha123')}
              disabled={carregando}
              className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
              <span>Gestor</span>
            </button>

            <button
              type="button"
              onClick={() => executarLoginRapido('prestador@taskcalc.com', 'senha123')}
              disabled={carregando}
              className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-zinc-600" />
              <span>Prestador</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
