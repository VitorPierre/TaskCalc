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
from app.schemas.catalogo_servico import (
    CatalogoServicoCreate,
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
    
    Como funciona:
    - O FastAPI injeta a sessão de banco ativa da requisição (`db`).
    - Retorna uma instância pronta de `CatalogoService` conectada a essa sessão.
    - Isso isola o Router de saber como o banco é instanciado.
    """
    return CatalogoService(db)


# ---------------------------------------------------------------------------
# Endpoint 1: POST /servicos - Cadastrar novo serviço
# ---------------------------------------------------------------------------
@router.post(
    "/",
    response_model=CatalogoServicoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar serviço no catálogo",
    description="Recebe os dados do novo serviço, valida via Pydantic e envia para a Service Layer persistir."
)
def cadastrar_servico(
    dados: CatalogoServicoCreate,
    service: CatalogoService = Depends(get_catalogo_service)
):
    """
    Controlador responsável pelo cadastro de novos serviços:
    - `dados`: JSON da requisição já validado pelo Pydantic (CatalogoServicoCreate).
    - `service`: Instância de CatalogoService injetada pelo FastAPI.
    - Retorna: Status 201 Created com o serviço cadastrado serializado em JSON.
    """
    return service.cadastrar_servico(dados)


# ---------------------------------------------------------------------------
# Endpoint 2: GET /servicos - Listar serviços
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
    """
    Controlador responsável pela listagem de serviços:
    - `apenas_ativos`: Parâmetro de busca via Query String (ex: /servicos?apenas_ativos=true).
    - `service`: Camada de serviço responsável pela consulta no banco e ordenação.
    - Retorna: Status 200 OK com a lista de serviços formatada.
    """
    return service.listar_servicos(apenas_ativos=apenas_ativos)
