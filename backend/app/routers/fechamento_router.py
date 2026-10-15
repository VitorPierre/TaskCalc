"""
=============================================================================
ROUTER / CONTROLLER - FechamentoRouter (/fechamentos)
=============================================================================
Papel na Arquitetura:
- Ponto de entrada HTTP para o ciclo de Fechamento de Período e emissão de PDFs.
- Expõe endpoints RESTful:
  * POST /fechamentos/ : Efetiva o fechamento, fatura os serviços e gera o PDF.
  * POST /fechamentos/simular : Simula e calcula totais antes de consolidar.
  * GET  /fechamentos/ : Lista o histórico de fechamentos realizados.
  * GET  /fechamentos/{id} : Retorna os dados completos de um fechamento.
  * GET  /fechamentos/{id}/pdf : Faz download ou visualização direta do PDF no navegador.
=============================================================================
"""

import os
from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.fechamento import (
    FechamentoCreate,
    FechamentoSimulacaoRequest,
    FechamentoSimulacaoResponse,
    FechamentoResponse,
    FechamentoResumoResponse
)
from app.services.fechamento_service import FechamentoService

router = APIRouter(
    prefix="/fechamentos",
    tags=["Fechamento de Período & Faturamento"]
)


def get_fechamento_service(db: Session = Depends(get_db)) -> FechamentoService:
    """Injeta a sessão do banco e retorna a instância do FechamentoService."""
    return FechamentoService(db)


@router.post(
    "/simular",
    response_model=FechamentoSimulacaoResponse,
    status_code=status.HTTP_200_OK,
    summary="Simular fechamento de período (Prévia)",
    description=(
        "Permite simular o fechamento financeiro de um intervalo de datas sem persistir alterações. "
        "Calcula o total de serviços pendentes, valor bruto, desconto, acréscimo e valor líquido final."
    )
)
def simular_fechamento(
    dados: FechamentoSimulacaoRequest,
    service: FechamentoService = Depends(get_fechamento_service)
):
    return service.simular_fechamento(dados)


@router.post(
    "/",
    response_model=FechamentoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Efetivar fechamento de período e gerar PDF",
    description=(
        "Consolida os lançamentos com status 'PENDENTE' no intervalo de datas informado, "
        "aplica descontos ou acréscimos, calcula o valor líquido, altera o status dos "
        "lançamentos para 'FATURADO' e gera o documento PDF oficial consolidado."
    )
)
def criar_fechamento(
    dados: FechamentoCreate,
    service: FechamentoService = Depends(get_fechamento_service)
):
    fechamento = service.criar_fechamento(dados)
    # Garante o preenchimento da contagem de lançamentos para o schema de resposta
    fechamento.total_lancamentos = len(fechamento.lancamentos)
    return fechamento


@router.get(
    "/",
    response_model=List[FechamentoResumoResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar histórico de fechamentos",
    description="Retorna a lista resumida de todos os fechamentos contábeis já efetuados na plataforma."
)
def listar_fechamentos(
    service: FechamentoService = Depends(get_fechamento_service)
):
    fechamentos = service.listar_fechamentos()
    # Adiciona dinamicamente total_lancamentos para cada item da listagem
    for f in fechamentos:
        f.total_lancamentos = len(f.lancamentos)
    return fechamentos


@router.get(
    "/{fechamento_id}",
    response_model=FechamentoResponse,
    status_code=status.HTTP_200_OK,
    summary="Buscar fechamento por ID",
    description="Retorna os dados detalhados de um fechamento, incluindo a lista de lançamentos que foram faturados nele."
)
def buscar_fechamento_por_id(
    fechamento_id: int,
    service: FechamentoService = Depends(get_fechamento_service)
):
    fechamento = service.buscar_por_id(fechamento_id)
    fechamento.total_lancamentos = len(fechamento.lancamentos)
    return fechamento


@router.get(
    "/{fechamento_id}/pdf",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
    summary="Visualizar ou baixar PDF do fechamento",
    description="Retorna o arquivo binário do PDF do fechamento para visualização em aba do navegador ou download direto."
)
def baixar_pdf_fechamento(
    fechamento_id: int,
    service: FechamentoService = Depends(get_fechamento_service)
):
    caminho_pdf = service.obter_ou_regenerar_pdf(fechamento_id)
    if not os.path.exists(caminho_pdf):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo PDF não foi encontrado no servidor."
        )

    nome_arquivo = os.path.basename(caminho_pdf)
    return FileResponse(
        path=caminho_pdf,
        media_type="application/pdf",
        filename=nome_arquivo,
        headers={
            "Content-Disposition": f"inline; filename={nome_arquivo}"
        }
    )
