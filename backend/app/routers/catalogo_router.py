"""
=============================================================================
ROUTER / CONTROLLER (Camada de Apresentação HTTP) - CatalogoRouter
=============================================================================
Papel na Arquitetura Limpa:
- No FastAPI, os "Routers" desempenham o papel dos CONTROLLERS no padrão MVC.
- Eles são os pontos de entrada para o mundo externo via protocolo HTTP.
- Responsabilidades do Router:
  1. Mapear URLs e métodos HTTP (POST /servicos, GET /servicos).
  2. Receber e delegar a validação sintática do JSON para os Schemas (Pydantic).
  3. Obter a sessão do banco de dados (SQLite) via Injeção de Dependência (get_db).
  4. Delegar TODA a lógica de negócios para a Service Layer (CatalogoService).
  5. Retornar a resposta final com o código HTTP adequado (201 Created, 200 OK)
     formatada pelo Schema de Saída (CatalogoServicoResponse).

=============================================================================
COMO O ROUTER SE COMUNICA COM O SERVICE? (Fluxo de Execução)
=============================================================================
1. Uma requisição HTTP chega ao endpoint (ex: POST /api/v1/servicos com JSON no body).
2. O FastAPI intercepta a requisição e valida o JSON usando o Schema `CatalogoServicoCreate`.
3. O FastAPI resolve a dependência `get_catalogo_service`:
   - Abre uma sessão com o banco SQLite (`get_db`).
   - Instancia a classe `CatalogoService(db)`.
4. O Router chama o método do Service:
   `servico_criado = service.cadastrar_servico(dados)`
5. O Service aplica as regras de negócio e persiste o Model no SQLite.
6. O Router recebe o resultado do Service e devolve para o cliente:
   - O FastAPI converte automaticamente o Model SQLAlchemy para o Schema
     `CatalogoServicoResponse` (JSON) e responde com status 201 Created.

Regra Fundamental:
O Router NUNCA deve fazer `db.query()`, `db.add()` ou `db.commit()` diretamente.
Qualquer regra ou acesso a banco DEVE passar pelo Service!
=============================================================================
"""

from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

# Importações da Arquitetura
from app.core.database import get_db
from app.core.deps import exigir_gestor
from app.models.usuario import Usuario
from app.schemas.catalogo_servico import (
    CatalogoServicoCreate,
    CatalogoServicoUpdate,
    CatalogoServicoResponse
)
from app.services.catalogo_service import CatalogoService

# Criação do roteador para a entidade Catálogo de Serviços
router = APIRouter(
    prefix="/servicos",
    tags=["Catálogo de Serviços"]
)


# ---------------------------------------------------------------------------
# Injeção de Dependência da Camada de Serviço
# ---------------------------------------------------------------------------
def get_catalogo_service(db: Session = Depends(get_db)) -> CatalogoService:
    """
    Função Provedora de Dependência (Dependency Provider).
    """
    return CatalogoService(db)


# ---------------------------------------------------------------------------
# Endpoint 1: POST /servicos - Cadastrar novo serviço (Apenas GESTOR)
# ---------------------------------------------------------------------------
@router.post(
    "/",
    response_model=CatalogoServicoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar serviço no catálogo (Apenas GESTOR)",
    description=(
        "Recebe os dados do novo serviço, valida via Pydantic e envia para a Service Layer persistir. "
        "Acesso restrito exclusivamente a usuários com o perfil 'GESTOR'."
    )
)
def cadastrar_servico(
    dados: CatalogoServicoCreate,
    usuario_gestor: Usuario = Depends(exigir_gestor),
    service: CatalogoService = Depends(get_catalogo_service)
):
    """
    Cadastra um novo serviço no catálogo.
    Exige autenticação e perfil 'GESTOR'.
    """
    return service.cadastrar_servico(dados)


# ---------------------------------------------------------------------------
# Endpoint 2: GET /servicos - Listar serviços (Público / Prestador & Gestor)
# ---------------------------------------------------------------------------
@router.get(
    "/",
    response_model=List[CatalogoServicoResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar serviços do catálogo",
    description="Retorna a lista de serviços cadastrados, permitindo filtrar apenas os ativos."
)
def listar_servicos(
    apenas_ativos: bool = Query(
        default=False,
        description="Se True, retorna apenas serviços com status ativo para novos lançamentos."
    ),
    service: CatalogoService = Depends(get_catalogo_service)
):
    return service.listar_servicos(apenas_ativos=apenas_ativos)


# ---------------------------------------------------------------------------
# Endpoint 3: GET /servicos/{servico_id} - Obter detalhes de um serviço
# ---------------------------------------------------------------------------
@router.get(
    "/{servico_id}",
    response_model=CatalogoServicoResponse,
    status_code=status.HTTP_200_OK,
    summary="Buscar serviço por ID"
)
def buscar_servico_por_id(
    servico_id: int,
    service: CatalogoService = Depends(get_catalogo_service)
):
    return service.buscar_por_id(servico_id)


# ---------------------------------------------------------------------------
# Endpoint 4: PUT /servicos/{servico_id} - Atualizar serviço existente (Apenas GESTOR)
# ---------------------------------------------------------------------------
@router.put(
    "/{servico_id}",
    response_model=CatalogoServicoResponse,
    status_code=status.HTTP_200_OK,
    summary="Editar serviço do catálogo (Apenas GESTOR)",
    description=(
        "Atualiza os dados de um item do catálogo preservando a integridade dos lançamentos já efetuados (RD01). "
        "Acesso restrito exclusivamente a usuários com o perfil 'GESTOR'."
    )
)
def atualizar_servico(
    servico_id: int,
    dados: CatalogoServicoUpdate,
    usuario_gestor: Usuario = Depends(exigir_gestor),
    service: CatalogoService = Depends(get_catalogo_service)
):
    """
    Atualiza dados do serviço no catálogo.
    Exige autenticação e perfil 'GESTOR'.
    """
    return service.atualizar_servico(servico_id, dados)


# ---------------------------------------------------------------------------
# Endpoint 5: PATCH /servicos/{servico_id}/toggle-status - Alternar status Ativo/Inativo (Apenas GESTOR)
# ---------------------------------------------------------------------------
@router.patch(
    "/{servico_id}/toggle-status",
    response_model=CatalogoServicoResponse,
    status_code=status.HTTP_200_OK,
    summary="Alternar status ativo/inativo (Apenas GESTOR)",
    description=(
        "Ativa ou inativa um serviço. Serviços inativos não aparecem para novos lançamentos. "
        "Acesso restrito exclusivamente a usuários com o perfil 'GESTOR'."
    )
)
def alternar_status_servico(
    servico_id: int,
    usuario_gestor: Usuario = Depends(exigir_gestor),
    service: CatalogoService = Depends(get_catalogo_service)
):
    """
    Alterna o status ativo/inativo de um serviço.
    Exige autenticação e perfil 'GESTOR'.
    """
    return service.alternar_status_servico(servico_id)


# ---------------------------------------------------------------------------
# Endpoint 6: DELETE /servicos/{servico_id} - Inativação lógica (Apenas GESTOR)
# ---------------------------------------------------------------------------
@router.delete(
    "/{servico_id}",
    response_model=CatalogoServicoResponse,
    status_code=status.HTTP_200_OK,
    summary="Inativar serviço (Soft Delete) (Apenas GESTOR)",
    description=(
        "Desativa logicamente o serviço do catálogo preservando o histórico contábil. "
        "Acesso restrito exclusivamente a usuários com o perfil 'GESTOR'."
    )
)
def inativar_servico(
    servico_id: int,
    usuario_gestor: Usuario = Depends(exigir_gestor),
    service: CatalogoService = Depends(get_catalogo_service)
):
    """
    Inativa logicamente o serviço no catálogo.
    Exige autenticação e perfil 'GESTOR'.
    """
    return service.inativar_servico(servico_id)
