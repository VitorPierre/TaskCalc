"""
=============================================================================
ROUTER / CONTROLLER - LancamentoRouter (/lancamentos)
=============================================================================
Papel na Arquitetura:
- Ponto de entrada HTTP para registrar execuções de serviços prestados.
- Expõe:
  * POST /lancamentos/ : Registra um serviço com aplicação da regra de Snapshot.
  * GET  /lancamentos/ : Retorna o histórico de lançamentos.
  * GET  /lancamentos/{id} : Detalhes de um lançamento.
=============================================================================
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.lancamento_servico import (
    LancamentoServicoCreate,
    LancamentoServicoResponse
)
from app.services.lancamento_service import LancamentoService

router = APIRouter(
    prefix="/lancamentos",
    tags=["Lançamentos de Serviços"]
)


def get_lancamento_service(db: Session = Depends(get_db)) -> LancamentoService:
    """Injeta a sessão do banco e retorna a instância do LancamentoService."""
    return LancamentoService(db)


@router.post(
    "/",
    response_model=LancamentoServicoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar lançamento de serviço",
    description=(
        "Registra a execução de um serviço aplicando a regra de Snapshot (RD01). "
        "Se fornecido 'catalogo_servico_id', copia nome e preço base do catálogo. "
        "Permite informar preço livre/ajustado ou cadastrar serviço avulso."
    )
)
def criar_lancamento(
    dados: LancamentoServicoCreate,
    service: LancamentoService = Depends(get_lancamento_service)
):
    return service.criar_lancamento(dados)


@router.get(
    "/",
    response_model=List[LancamentoServicoResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar histórico de lançamentos",
    description="Retorna os lançamentos realizados, ordenados pela data de execução mais recente, com filtros opcionais."
)
def listar_lancamentos(
    catalogo_id: Optional[int] = Query(
        default=None,
        description="Filtrar lançamentos originados de um serviço específico do catálogo."
    ),
    status_filtro: Optional[str] = Query(
        default=None,
        description="Filtrar por status financeiro: 'PENDENTE' ou 'FATURADO'."
    ),
    data_inicio: Optional[datetime] = Query(
        default=None,
        description="Data de início para filtrar lançamentos executados no período."
    ),
    data_fim: Optional[datetime] = Query(
        default=None,
        description="Data de fim para filtrar lançamentos executados no período."
    ),
    service: LancamentoService = Depends(get_lancamento_service)
):
    return service.listar_lancamentos(
        catalogo_id=catalogo_id,
        status_filtro=status_filtro,
        data_inicio=data_inicio,
        data_fim=data_fim
    )


@router.get(
    "/{lancamento_id}",
    response_model=LancamentoServicoResponse,
    status_code=status.HTTP_200_OK,
    summary="Buscar lançamento por ID"
)
def buscar_lancamento_por_id(
    lancamento_id: int,
    service: LancamentoService = Depends(get_lancamento_service)
):
    return service.buscar_por_id(lancamento_id)
