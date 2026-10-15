"""
=============================================================================
CONTROLLER (C do MVC): Rotas e Endpoints HTTP (FastAPI APIRouter)
=============================================================================
Papel na Arquitetura:
- É a porta de entrada das requisições externas (feitas pelo Frontend React, Postman, etc.).
- Responsabilidades do Controller:
  1. Definir os caminhos (URLs) e métodos HTTP (GET, POST, PUT, DELETE).
  2. Receber parâmetros da URL, Query Strings e o Body validado pelos Schemas.
  3. Obter a sessão do banco (via Depends(get_db)).
  4. Chamar a camada de serviço (ServicoService) para processar o caso de uso.
  5. Retornar a resposta HTTP com o status code correto (ex: 200 OK, 201 Created).
  
Regra de ouro: Controller "magro" (Skinny Controller). Nenhuma query de banco
ou regra de cálculo complexa deve ficar aqui!
=============================================================================
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.servico import ServicoCreate, ServicoUpdate, ServicoResponse
from app.services.servico_service import ServicoService

# Criação do roteador de serviços
router = APIRouter(
    prefix="/servicos",
    tags=["Serviços"]
)


def get_servico_service(db: Session = Depends(get_db)) -> ServicoService:
    """
    Função auxiliar de injeção de dependência para fornecer uma instância
    do ServicoService já configurada com a sessão de banco da requisição.
    """
    return ServicoService(db)


@router.get("/", response_model=List[ServicoResponse], summary="Listar serviços")
def listar_servicos(
    apenas_ativos: bool = False,
    service: ServicoService = Depends(get_servico_service)
):
    """
    Endpoint para listar todos os serviços cadastrados no catálogo.
    """
    return service.listar_todos(apenas_ativos=apenas_ativos)


@router.get("/{servico_id}", response_model=ServicoResponse, summary="Buscar serviço por ID")
def buscar_servico(
    servico_id: int,
    service: ServicoService = Depends(get_servico_service)
):
    """
    Endpoint para buscar detalhes de um serviço específico pelo seu ID.
    """
    return service.buscar_por_id(servico_id)


@router.post("/", response_model=ServicoResponse, status_code=status.HTTP_201_CREATED, summary="Cadastrar novo serviço")
def criar_servico(
    dados: ServicoCreate,
    service: ServicoService = Depends(get_servico_service)
):
    """
    Endpoint para criar um novo serviço no catálogo.
    """
    return service.criar(dados)


@router.put("/{servico_id}", response_model=ServicoResponse, summary="Atualizar serviço")
def atualizar_servico(
    servico_id: int,
    dados: ServicoUpdate,
    service: ServicoService = Depends(get_servico_service)
):
    """
    Endpoint para atualizar as informações de um serviço existente.
    """
    return service.atualizar(servico_id, dados)


@router.delete("/{servico_id}", response_model=ServicoResponse, summary="Desativar serviço")
def desativar_servico(
    servico_id: int,
    service: ServicoService = Depends(get_servico_service)
):
    """
    Endpoint para desativar (soft-delete) um serviço do catálogo.
    """
    return service.desativar(servico_id)
