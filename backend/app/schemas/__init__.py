# backend/app/schemas/__init__.py
from app.schemas.servico import ServicoBase, ServicoCreate, ServicoUpdate, ServicoResponse
from app.schemas.catalogo_servico import (
    CatalogoServicoBase,
    CatalogoServicoCreate,
    CatalogoServicoUpdate,
    CatalogoServicoResponse
)

from app.schemas.lancamento_servico import (
    LancamentoServicoCreate,
    LancamentoServicoResponse
)
from app.schemas.fechamento import (
    FechamentoCreate,
    FechamentoSimulacaoRequest,
    FechamentoSimulacaoResponse,
    FechamentoResponse,
    FechamentoResumoResponse
)

__all__ = [
    "ServicoBase",
    "ServicoCreate",
    "ServicoUpdate",
    "ServicoResponse",
    "CatalogoServicoBase",
    "CatalogoServicoCreate",
    "CatalogoServicoUpdate",
    "CatalogoServicoResponse",
    "LancamentoServicoCreate",
    "LancamentoServicoResponse",
    "FechamentoCreate",
    "FechamentoSimulacaoRequest",
    "FechamentoSimulacaoResponse",
    "FechamentoResponse",
    "FechamentoResumoResponse"
]


