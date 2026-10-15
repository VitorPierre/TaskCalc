"""
=============================================================================
ROUTER / CONTROLLER - AuthRouter (/auth)
=============================================================================
Papel na Arquitetura:
- Ponto de entrada HTTP para cadastro de usuários e autenticação no TaskCalc.
- Endpoints expostos:
  * POST /auth/cadastro : Cadastro inicial de usuários (PRESTADOR ou GESTOR).
  * POST /auth/login : Autenticação básica com validação de senha hasheada.
  * GET  /auth/usuarios : Listagem de usuários para testes e conferência.
  * GET  /auth/perfis : Retorna os perfis permitidos na plataforma.
=============================================================================
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.usuario import (
    UsuarioCreate,
    UsuarioResponse,
    UsuarioLogin,
    UsuarioLoginResponse,
    PerfilUsuario
)
from app.services.usuario_service import UsuarioService

router = APIRouter(
    prefix="/auth",
    tags=["Autenticação & Usuários"]
)


def get_usuario_service(db: Session = Depends(get_db)) -> UsuarioService:
    """Injeta a sessão do banco e retorna a instância de UsuarioService."""
    return UsuarioService(db)


@router.post(
    "/cadastro",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar novo usuário",
    description=(
        "Cadastra um novo usuário no TaskCalc com validação de perfil ('PRESTADOR' ou 'GESTOR'). "
        "A senha é criptografada com algoritmo bcrypt antes de ser gravada no SQLite."
    )
)
def cadastrar_usuario(
    dados: UsuarioCreate,
    service: UsuarioService = Depends(get_usuario_service)
):
    """
    Cadastra um novo prestador de serviços ou gestor no sistema.
    """
    return service.criar_usuario(dados)


@router.post(
    "/login",
    response_model=UsuarioLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Autenticação básica (Login)",
    description=(
        "Valida o e-mail e a senha fornecidos contra o hash gravado no banco de dados. "
        "Retorna os dados do usuário autenticado e status do acesso."
    )
)
def autenticar_usuario(
    credenciais: UsuarioLogin,
    service: UsuarioService = Depends(get_usuario_service)
):
    """
    Realiza o login do usuário verificando a senha com bcrypt.
    """
    usuario = service.autenticar_usuario(
        email=credenciais.email,
        senha=credenciais.senha
    )
    return UsuarioLoginResponse(
        mensagem=f"Bem-vindo(a), {usuario.nome}! Autenticação realizada com sucesso.",
        autenticado=True,
        usuario=usuario,
        token_tipo="Bearer"
    )


@router.get(
    "/usuarios",
    response_model=List[UsuarioResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar usuários cadastrados (Testes)",
    description="Retorna a lista de contas cadastradas com seus respectivos perfis e status."
)
def listar_usuarios(
    service: UsuarioService = Depends(get_usuario_service)
):
    """
    Lista todos os usuários para fins didáticos e validação de testes.
    """
    return service.listar_usuarios()


@router.get(
    "/perfis",
    response_model=List[str],
    status_code=status.HTTP_200_OK,
    summary="Listar perfis aceitos",
    description="Retorna os perfis de acesso permitidos pelo sistema ('PRESTADOR' e 'GESTOR')."
)
def listar_perfis():
    """
    Retorna os perfis suportados pela plataforma.
    """
    return [p.value for p in PerfilUsuario]
