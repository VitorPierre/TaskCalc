"""
=============================================================================
SCHEMAS DE VALIDAÇÃO (Pydantic v2) - DTOs para Usuario & Autenticação
=============================================================================
Papel na Arquitetura:
- Define o contrato de dados para cadastro, autenticação e visualização de usuários.
- Garante validações rigorosas de entrada (tamanho mínimo de senha, formato de e-mail).
- Validação estrita do campo 'perfil', aceitando apenas 'PRESTADOR' ou 'GESTOR'.
- Proteção de dados sensíveis: NUNCA expõe o campo 'senha_hash' nas respostas da API.
=============================================================================
"""

from enum import Enum
from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator


class PerfilUsuario(str, Enum):
    """Perfis de acesso autorizados na plataforma TaskCalc."""
    PRESTADOR = "PRESTADOR"
    GESTOR = "GESTOR"


# ---------------------------------------------------------------------------
# 1. Schema Base
# ---------------------------------------------------------------------------
class UsuarioBase(BaseModel):
    """Campos compartilhados de dados públicos do usuário."""
    nome: str = Field(
        ...,
        min_length=2,
        max_length=120,
        description="Nome completo do usuário",
        examples=["Carlos Alberto", "Mariana Silva"]
    )
    email: str = Field(
        ...,
        min_length=5,
        max_length=150,
        description="Endereço de e-mail válido para login",
        examples=["prestador@taskcalc.com", "gestor@taskcalc.com"]
    )
    perfil: Literal["PRESTADOR", "GESTOR"] = Field(
        default="PRESTADOR",
        description="Nível de perfil do usuário no sistema ('PRESTADOR' ou 'GESTOR')",
        examples=["PRESTADOR", "GESTOR"]
    )

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str) -> str:
        v_limpo = v.strip().lower()
        if "@" not in v_limpo or "." not in v_limpo:
            raise ValueError("O formato do e-mail informado é inválido.")
        return v_limpo

    @field_validator("perfil")
    @classmethod
    def normalizar_perfil(cls, v: str) -> str:
        v_upper = v.strip().upper()
        if v_upper not in ("PRESTADOR", "GESTOR"):
            raise ValueError("O perfil deve ser estritamente 'PRESTADOR' ou 'GESTOR'.")
        return v_upper


# ---------------------------------------------------------------------------
# 2. Schema de Cadastro / Criação (Input do POST /auth/cadastro)
# ---------------------------------------------------------------------------
class UsuarioCreate(UsuarioBase):
    """
    Dados enviados pelo cliente para cadastrar um novo usuário.
    Recebe a senha em texto plano (que será convertida para hash antes de salvar).
    """
    senha: str = Field(
        ...,
        min_length=6,
        max_length=100,
        description="Senha de acesso em texto plano (mínimo de 6 caracteres)",
        examples=["senhaForte123"]
    )


# ---------------------------------------------------------------------------
# 3. Schema de Atualização (Input do PUT/PATCH /usuarios/{id})
# ---------------------------------------------------------------------------
class UsuarioUpdate(BaseModel):
    """Dados opcionais para atualização de cadastro."""
    nome: Optional[str] = Field(None, min_length=2, max_length=120)
    email: Optional[str] = Field(None, min_length=5, max_length=150)
    senha: Optional[str] = Field(None, min_length=6, max_length=100)
    perfil: Optional[Literal["PRESTADOR", "GESTOR"]] = None
    ativo: Optional[bool] = None


# ---------------------------------------------------------------------------
# 4. Schema de Resposta Pública (Output da API - Seguro)
# ---------------------------------------------------------------------------
class UsuarioResponse(BaseModel):
    """
    JSON retornado para o cliente contendo apenas informações seguras.
    O campo 'senha_hash' NUNCA é retornado.
    """
    id: int = Field(..., description="Identificador único do usuário no banco")
    nome: str = Field(..., description="Nome do usuário")
    email: str = Field(..., description="E-mail de acesso")
    perfil: str = Field(..., description="Perfil atribuído ('PRESTADOR' ou 'GESTOR')")
    ativo: bool = Field(..., description="Status da conta (ativa/inativa)")
    criado_em: datetime = Field(..., description="Data/hora de registro no sistema")

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# 5. Schemas de Autenticação / Login
# ---------------------------------------------------------------------------
class UsuarioLogin(BaseModel):
    """Credenciais enviadas para autenticação (POST /auth/login)."""
    email: str = Field(..., description="E-mail cadastrado")
    senha: str = Field(..., description="Senha em texto claro")

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, v: str) -> str:
        return v.strip().lower()


class UsuarioLoginResponse(BaseModel):
    """Retorno de login bem-sucedido com dados do usuário autenticado."""
    mensagem: str = Field("Autenticação realizada com sucesso!", description="Mensagem de status")
    autenticado: bool = Field(True, description="Indica se o login foi validado")
    usuario: UsuarioResponse = Field(..., description="Dados do usuário logado")
    token_tipo: str = Field("Bearer", description="Tipo de credencial/token")
