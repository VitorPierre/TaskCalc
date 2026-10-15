"""
=============================================================================
MODEL DO BANCO (SQLAlchemy ORM) - Entidade CatalogoServico
=============================================================================
O QUE É O MODEL DO BANCO DE DADOS?
- O Model é a representação física/estrutural de uma TABELA no banco relacional (SQLite).
- Ele é escrito usando o SQLAlchemy e é responsável por:
  1. Definir a estrutura DDL (colunas, tipos SQL como VARCHAR, INTEGER, FLOAT, BOOLEAN).
  2. Estabelecer chaves primárias (primary_key), índices de busca (index) e valores default no banco.
  3. Mapear linhas da tabela 'catalogo_servicos' para objetos Python em memória.
  4. Gerenciar transações e persistência de dados no disco (INSERT, UPDATE, DELETE, SELECT).

DIFERENÇA CRUCIAL:
- O MODEL sabe COMO os dados são armazenados no disco, mas NÃO sabe como eles
  chegam pela internet nem como devem ser formatados em JSON para o Frontend.
- Nunca expomos o Model diretamente para o cliente externo: para isso existem
  os SCHEMAS do Pydantic!
=============================================================================
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime, timezone
from app.core.database import Base


class CatalogoServico(Base):
    """
    Representa a tabela 'catalogo_servicos' no banco de dados SQLite.
    
    Esta entidade funciona como o catálogo de serviços pré-definidos do sistema.
    É aqui que o prestador cadastra seus serviços padrão (ex: "Consultoria",
    "Formatação de PC", "Troca de Peça") com um valor sugerido e unidade de medida.
    """
    __tablename__ = "catalogo_servicos"

    # 1. Identificador único do serviço (Chave Primária autoincrementada)
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 2. Nome do serviço (Obrigatório e indexado para consultas rápidas)
    nome = Column(String(120), nullable=False, index=True)

    # 3. Descrição padrão/sugerida do serviço (Opcional)
    descricao_padrao = Column(String(500), nullable=True)

    # 4. Valor base sugerido para cobrança (Obrigatório)
    valor_base = Column(Float, nullable=False, default=0.0)

    # 5. Unidade de medida (Exemplos: 'HORA', 'UN', 'KM', 'DIARIA', 'M2')
    unidade_medida = Column(String(20), nullable=False, default="UN")

    # 6. Flag para desativação lógica (Soft-delete)
    # Serviços desativados não aparecem para novos lançamentos, mas preservam
    # a integridade de lançamentos e relatórios históricos já existentes.
    ativo = Column(Boolean, nullable=False, default=True)

    # 7. Data e hora de criação do registro no catálogo (UTC)
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self) -> str:
        """Representação em string para facilitar logs e depuração."""
        return f"<CatalogoServico(id={self.id}, nome='{self.nome}', valor_base={self.valor_base}, unidade='{self.unidade_medida}')>"
