"""
=============================================================================
SERVICE LAYER: Camada de Regras de Negócio e Casos de Uso
=============================================================================
Papel na Arquitetura:
- O Service Layer atua como a "ponte inteligente" entre o Controller e o Model.
- Por que usamos Services em vez de colocar lógica no Controller?
  1. O Controller só deve se preocupar com HTTP (receber request, devolver response).
  2. O Service implementa as REGRAS DE NEGÓCIO da aplicação (validações, cálculos,
     verificações de duplicidade, snapshots de preços, transações de banco).
  3. Facilita testes unitários, pois a lógica de negócio fica isolada do framework web.
=============================================================================
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from app.models.servico import Servico
from app.schemas.servico import ServicoCreate, ServicoUpdate


class ServicoService:
    """
    Classe de serviço responsável pelo gerenciamento de serviços no catálogo.
    """

    def __init__(self, db: Session):
        # Recebe a sessão do banco via injeção de dependência
        self.db = db

    def listar_todos(self, apenas_ativos: bool = False) -> List[Servico]:
        """
        Retorna a lista de serviços cadastrados.
        Pode filtrar apenas os serviços ativos para novos lançamentos.
        """
        query = self.db.query(Servico)
        if apenas_ativos:
            query = query.filter(Servico.ativo == True)
        return query.all()

    def buscar_por_id(self, servico_id: int) -> Servico:
        """
        Busca um serviço específico pelo ID.
        Lança erro HTTP 404 caso o serviço não exista.
        """
        servico = self.db.query(Servico).filter(Servico.id == servico_id).first()
        if not servico:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Serviço com ID {servico_id} não foi encontrado."
            )
        return servico

    def criar(self, dados: ServicoCreate) -> Servico:
        """
        Cria um novo serviço no catálogo.
        
        Regra de Negócio:
        - Não deve permitir dois serviços ativos com exatamente o mesmo título.
        """
        # 1. Verifica duplicidade de nome
        existente = (
            self.db.query(Servico)
            .filter(Servico.titulo.ilike(dados.titulo))
            .first()
        )
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um serviço cadastrado com o título '{dados.titulo}'."
            )

        # 2. Converte o Schema Pydantic para uma instância do Model SQLAlchemy
        novo_servico = Servico(
            titulo=dados.titulo,
            descricao=dados.descricao,
            preco_base=dados.preco_base,
            ativo=dados.ativo
        )

        # 3. Persiste no banco de dados SQLite
        self.db.add(novo_servico)
        self.db.commit()
        self.db.refresh(novo_servico)

        return novo_servico

    def atualizar(self, servico_id: int, dados: ServicoUpdate) -> Servico:
        """
        Atualiza dados do serviço no catálogo.
        """
        servico = self.buscar_por_id(servico_id)

        # Atualiza apenas os campos enviados no body
        dados_atualizacao = dados.model_dump(exclude_unset=True)
        for campo, valor in dados_atualizacao.items():
            setattr(servico, campo, valor)

        self.db.commit()
        self.db.refresh(servico)
        return servico

    def desativar(self, servico_id: int) -> Servico:
        """
        Desativa (soft delete) um serviço em vez de removê-lo fisicamente.
        
        Importante para a regra RD01 do TaskCalc:
        Excluir fisicamente serviços quebraria integridade referencial com
        lançamentos históricos. Desativar mantém o histórico intacto.
        """
        servico = self.buscar_por_id(servico_id)
        servico.ativo = False
        self.db.commit()
        self.db.refresh(servico)
        return servico
