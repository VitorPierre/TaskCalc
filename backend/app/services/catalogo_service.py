"""
=============================================================================
SERVICE LAYER (Camada de Serviços / Casos de Uso) - CatalogoService
=============================================================================
Papel na Arquitetura Limpa (Clean Architecture):
- O Service Layer encapsula TODAS as regras de negócio e a orquestração de dados.
- Ele atua como um intermediário entre os Routers (camada de apresentação/HTTP)
  e os Models (camada de persistência/banco de dados).

Por que o Service é essencial?
1. Desacoplamento: O Service não sabe nada sobre HTTP (não lida com Request,
   Headers, Cookies ou URLs). Isso significa que você pode reaproveitar essa mesma
   classe em tarefas em segundo plano (Celery), scripts CLI ou testes automatizados!
2. Regras de Negócio e Validações de Domínio:
   - "Não posso cadastrar serviços com nomes duplicados."
   - "Limpar espaços em branco acidentais."
   - "Filtrar por serviços ativos/inativos."
3. Controle de Transações: Garante que os commits e rollbacks no banco ocorram
   apenas quando todas as validações forem satisfeitas.
=============================================================================
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.catalogo_servico import CatalogoServico
from app.schemas.catalogo_servico import CatalogoServicoCreate, CatalogoServicoUpdate


class CatalogoService:
    """
    Classe de serviço responsável pelos casos de uso do Catálogo de Serviços.
    
    Recebe a sessão do SQLAlchemy via Injeção de Dependência no construtor (__init__).
    """

    def __init__(self, db: Session):
        self.db = db

    def cadastrar_servico(self, dados: CatalogoServicoCreate) -> CatalogoServico:
        """
        Caso de Uso: Cadastrar um novo serviço no catálogo.
        
        Regras de Negócio:
        1. Sanitização: remove espaços em branco extras no nome e unidade.
        2. Unicidade: impede o cadastro de dois serviços com o mesmo nome (case-insensitive).
        3. Persistência: converte o Schema Pydantic para o Model SQLAlchemy e salva no SQLite.
        """
        # Sanitização simples
        nome_limpo = dados.nome.strip()
        unidade_limpa = dados.unidade_medida.strip().upper()

        # Regra 1: Validação de duplicidade no banco
        servico_existente = (
            self.db.query(CatalogoServico)
            .filter(CatalogoServico.nome.ilike(nome_limpo))
            .first()
        )
        if servico_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um serviço cadastrado com o nome '{nome_limpo}'."
            )

        # Regra 2: Criar a instância do Model do SQLAlchemy
        novo_servico = CatalogoServico(
            nome=nome_limpo,
            descricao_padrao=dados.descricao_padrao.strip() if dados.descricao_padrao else None,
            valor_base=dados.valor_base,
            unidade_medida=unidade_limpa,
            ativo=dados.ativo
        )

        # Regra 3: Persistir no SQLite com transação controlada
        self.db.add(novo_servico)
        self.db.commit()
        self.db.refresh(novo_servico)  # Atualiza o objeto com o ID e timestamps gerados pelo banco

        return novo_servico

    def listar_servicos(self, apenas_ativos: bool = False) -> List[CatalogoServico]:
        """
        Caso de Uso: Listar todos os serviços do catálogo.
        
        Regras de Negócio:
        1. Pode filtrar para exibir apenas os serviços disponíveis para novos lançamentos (ativo=True).
        2. Retorna a lista sempre ordenada alfabeticamente por nome para melhor usabilidade no Frontend.
        """
        query = self.db.query(CatalogoServico)

        if apenas_ativos:
            query = query.filter(CatalogoServico.ativo == True)

        # Ordenação alfabética
        return query.order_by(CatalogoServico.nome.asc()).all()

    def buscar_por_id(self, servico_id: int) -> CatalogoServico:
        """
        Caso de Uso: Buscar detalhes de um serviço específico.
        """
        servico = self.db.query(CatalogoServico).filter(CatalogoServico.id == servico_id).first()
        if not servico:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Serviço com ID {servico_id} não foi encontrado no catálogo."
            )
        return servico

    def atualizar_servico(
        self,
        servico_id: int,
        dados: CatalogoServicoUpdate
    ) -> CatalogoServico:
        """
        Caso de Uso: Editar informações de um serviço existente no catálogo.

        Regras de Negócio:
        1. Localiza o serviço pelo ID (retorna 404 se não existir).
        2. Se o nome for alterado, valida duplicidade garantindo que outro serviço não tenha o mesmo nome.
        3. Aplica atualização parcial apenas nos campos explicitamente enviados.
        4. O histórico de lançamentos passados NUNCA é recalculado (Snapshot RD01).
        """
        servico = self.buscar_por_id(servico_id)

        # Se houver alteração de nome, valida se não colide com outro item
        if dados.nome is not None:
            nome_limpo = dados.nome.strip()
            if nome_limpo.lower() != servico.nome.lower():
                existente = (
                    self.db.query(CatalogoServico)
                    .filter(
                        CatalogoServico.nome.ilike(nome_limpo),
                        CatalogoServico.id != servico_id
                    )
                    .first()
                )
                if existente:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Já existe outro serviço cadastrado com o nome '{nome_limpo}'."
                    )
            servico.nome = nome_limpo

        if dados.descricao_padrao is not None:
            servico.descricao_padrao = dados.descricao_padrao.strip() if dados.descricao_padrao else None

        if dados.valor_base is not None:
            servico.valor_base = float(dados.valor_base)

        if dados.unidade_medida is not None:
            servico.unidade_medida = dados.unidade_medida.strip().toUpperCase() if hasattr(dados.unidade_medida.strip(), 'toUpperCase') else dados.unidade_medida.strip().upper()

        if dados.ativo is not None:
            servico.ativo = bool(dados.ativo)

        self.db.commit()
        self.db.refresh(servico)
        return servico

    def alternar_status_servico(self, servico_id: int) -> CatalogoServico:
        """
        Caso de Uso: Inativar ou reativar um serviço do catálogo (Soft-delete).

        Regras de Negócio:
        - Inverte a flag booleana `ativo`.
        - Serviços inativos não aparecem para novos lançamentos, mas preservam
          a integridade dos lançamentos passados já realizados.
        """
        servico = self.buscar_por_id(servico_id)
        servico.ativo = not servico.ativo

        self.db.commit()
        self.db.refresh(servico)
        return servico

    def inativar_servico(self, servico_id: int) -> CatalogoServico:
        """
        Caso de Uso: Desativar logicamente um serviço do catálogo.
        """
        servico = self.buscar_por_id(servico_id)
        servico.ativo = False

        self.db.commit()
        self.db.refresh(servico)
        return servico
