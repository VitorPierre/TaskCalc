"""
=============================================================================
DEPENDÊNCIAS DE SEGURANÇA (Dependency Injection) - TaskCalc RBAC
=============================================================================
Papel na Arquitetura Limpa:
- Centraliza a identificação, autenticação e autorização por perfil (RBAC).
- Integração nativa com FastAPI Dependency Injection (`Depends`).
- Compatível com o padrão OpenAPI/Swagger UI (exibe o cadeado de autorização).
- Suporta:
  1. Header padrão RFC 6750: `Authorization: Bearer <JWT_TOKEN>`
  2. Fallback de desenvolvimento e testes: cabeçalho `X-User-Email` ou `X-User-Id`
- Funções exportadas:
  * obter_usuario_atual: Retorna a entidade Usuario logada ou levanta 401.
  * exigir_perfil(*perfis): Valida se o perfil do usuário está autorizado ou levanta 403.
  * exigir_gestor: Atalho de injeção exclusivo para perfil 'GESTOR'.
=============================================================================
"""

from typing import Optional, List
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decodificar_token_acesso
from app.models.usuario import Usuario

# Esquema de segurança OpenAPI HTTPBearer para integração com Swagger /docs
security_scheme = HTTPBearer(
    auto_error=False,
    description="Informe o token JWT no formato: Bearer <seu_token>"
)


def obter_usuario_atual(
    credenciais: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    x_user_email: Optional[str] = Header(
        None,
        alias="X-User-Email",
        description="Cabeçalho alternativo para testes rápidos sem token JWT"
    ),
    x_user_id: Optional[int] = Header(
        None,
        alias="X-User-Id",
        description="Cabeçalho alternativo para testes por ID de usuário"
    ),
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Dependência FastAPI que identifica e recupera o usuário autenticado.

    Fluxo de Resolução:
    1. Verifica se foi enviado o cabeçalho 'Authorization: Bearer <token>'.
       Se sim, decodifica o JWT e obtém o e-mail (claim 'sub').
    2. Caso contrário, verifica se foram passados cabeçalhos de teste ('X-User-Email' ou 'X-User-Id').
    3. Busca o registro correspondente na tabela 'usuarios'.
    4. Valida se a conta está ativa.

    :raises HTTPException 401: Se as credenciais estiverem ausentes, inválidas ou expiradas.
    :raises HTTPException 403: Se o usuário estiver com a conta inativa.
    :return: Instância de Usuario autenticada.
    """
    email_identificado: Optional[str] = None
    id_identificado: Optional[int] = None

    # 1. Tentativa via Token JWT (Bearer)
    if credenciais and credenciais.credentials:
        payload = decodificar_token_acesso(credenciais.credentials)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de autenticação inválido ou expirado.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        email_identificado = payload.get("sub")
        if not email_identificado:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de autenticação inválido (identificador ausente).",
                headers={"WWW-Authenticate": "Bearer"}
            )

    # 2. Fallback para testes/desenvolvimento via Headers HTTP
    elif x_user_email:
        email_identificado = x_user_email.strip().lower()
    elif x_user_id is not None:
        id_identificado = x_user_id

    # 3. Nenhuma credencial foi fornecida
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação obrigatória. Envie o cabeçalho 'Authorization: Bearer <token>' ou realize login.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 4. Localiza o usuário no banco de dados
    query = db.query(Usuario)
    if email_identificado:
        usuario = query.filter(Usuario.email == email_identificado).first()
    else:
        usuario = query.filter(Usuario.id == id_identificado).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário associado às credenciais informadas não foi localizado no sistema.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 5. Verifica se a conta está ativa
    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso bloqueado: a conta deste usuário está desativada."
        )

    return usuario


def exigir_perfil(*perfis_permitidos: str):
    """
    Fábrica de Injeção de Dependência (Dependency Factory) para controle de acesso (RBAC).
    Verifica se o perfil do usuário logado está contido na lista de perfis autorizados.

    Uso:
        @router.post("/", dependencies=[Depends(exigir_perfil("GESTOR"))])
        def rota(...): ...
        ou
        def rota(usuario: Usuario = Depends(exigir_perfil("GESTOR"))): ...
    """
    def _verificar_permissao(
        usuario_atual: Usuario = Depends(obter_usuario_atual)
    ) -> Usuario:
        perfil_usuario = (usuario_atual.perfil or "").strip().upper()
        perfis_autorizados = [p.strip().upper() for p in perfis_permitidos]

        if perfil_usuario not in perfis_autorizados:
            perfis_formatados = ", ".join(f"'{p}'" for p in perfis_autorizados)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Acesso negado: permissão insuficiente. Esta operação exige perfil ({perfis_formatados}), "
                    f"mas o usuário '{usuario_atual.nome}' possui o perfil '{usuario_atual.perfil}'."
                )
            )
        return usuario_atual

    return _verificar_permissao


# ---------------------------------------------------------------------------
# Atalhos Semânticos para Injeção Direta
# ---------------------------------------------------------------------------
# Exclusivo para Gestores (Cadastro, Edição do Catálogo, Configurações de Faturamento)
exigir_gestor = exigir_perfil("GESTOR")

# Acesso compartilhado para Prestadores e Gestores
exigir_prestador_ou_gestor = exigir_perfil("PRESTADOR", "GESTOR")
