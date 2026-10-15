"""
=============================================================================
MODEL (M do MVC): Modelos ORM do SQLAlchemy
=============================================================================
Papel na Arquitetura:
- Representa a estrutura de dados persistida no banco relacional (tabelas e colunas).
- Define tipos de dados, chaves primárias, relacionamentos e restrições.
- É a camada com a qual o SQLAlchemy interage para criar e consultar tabelas.
=============================================================================
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime, timezone
from app.core.database import Base


class Servico(Base):
    """
    Model que representa a tabela 'servicos' no banco SQLite.
    
    Este é o catálogo de serviços oferecidos pelo sistema.
    Exemplo: "Troca de Óleo", "Manutenção Preventiva", etc.
    """
    __tablename__ = "servicos"

    # Chave primária autoincrementada
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Título ou nome do serviço
    titulo = Column(String(100), nullable=False, index=True)

    # Descrição detalhada do serviço
    descricao = Column(String(255), nullable=True)

    # Preço base/tabelado atual
    preco_base = Column(Float, nullable=False, default=0.0)

    # Status indicando se o serviço está ativo para novos lançamentos
    ativo = Column(Boolean, default=True, nullable=False)

    # Data de criação do registro (UTC)
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
