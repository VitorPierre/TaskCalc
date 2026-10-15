"""
=============================================================================
MODEL DO BANCO: LancamentoServico (Implementação da Regra de Snapshot - RD01)
=============================================================================
Papel na Arquitetura:
- Representa a tabela física 'lancamentos_servicos' no banco de dados SQLite.
- Cada registro representa a EXECUÇÃO real de um serviço (prestação de serviço).

POR QUE ESSA TABELA GRAVA DADOS "REPETIDOS" DO CATÁLOGO? (Regra de Snapshot - RD01)
- Em bancos relacionais puros, aprende-se a evitar redundância (normalização),
  armazenando apenas 'catalogo_servico_id'.
- PORÉM, em sistemas financeiros e comerciais, isso causaria um problema gravíssimo:
  * Exemplo de Bug de Normalização:
    1. Hoje você cobra R$ 100,00 pelo serviço "Formatação".
    2. O cliente paga e você emite o fechamento de R$ 100,00.
    3. No próximo mês, a inflação sobe e você altera o preço no Catálogo para R$ 150,00.
    4. Se o lançamento apenas "apontasse" para o Catálogo, o relatório histórico do mês
       passado seria recalculado retroativamente para R$ 150,00! Isso destruiria a contabilidade!
  
- A SOLUÇÃO: PADRÃO SNAPSHOT (Cópia Congelada):
  * Gravamos explicitamente: 'nome_servico', 'valor_unitario' e 'unidade_medida'
    nesta tabela no exato momento da execução.
  * Mesmo que o Catálogo mude de preço, mude de nome ou seja desativado amanhã,
    o histórico do lançamento permanece 100% imutável e fiel ao momento em que ocorreu.
=============================================================================
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class LancamentoServico(Base):
    """
    Model que representa a tabela 'lancamentos_servicos'.
    Registra cada serviço prestado, congelando os valores em um Snapshot imutável.
    """
    __tablename__ = "lancamentos_servicos"

    # 1. Chave Primária autoincrementada do lançamento
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 2. Vínculo opcional com o Catálogo (se o serviço partiu de um cadastro prévio)
    # Se catalogo_servico_id for nulo, significa que foi um serviço avulso/variável.
    catalogo_servico_id = Column(
        Integer,
        ForeignKey("catalogo_servicos.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # -----------------------------------------------------------------------
    # CAMPOS DE SNAPSHOT (CONGELADOS NO MOMENTO DA EXECUÇÃO)
    # -----------------------------------------------------------------------
    # Nome do serviço no momento da execução (imutável)
    nome_servico = Column(String(120), nullable=False)

    # Descrição ou observação específica desta execução do serviço
    descricao = Column(Text, nullable=True)

    # Unidade de medida (ex: 'HORA', 'UN', 'KM') congelada no momento
    unidade_medida = Column(String(20), nullable=False, default="UN")

    # Quantidade executada (ex: 1 serviço, 2.5 horas, 15 km)
    quantidade = Column(Float, nullable=False, default=1.0)

    # Preço unitário cobrado no momento da execução (Snapshot)
    valor_unitario = Column(Float, nullable=False)

    # Valor total calculado: (quantidade * valor_unitario)
    valor_total = Column(Float, nullable=False)

    # Data e hora em que o serviço foi efetivamente executado/prestado
    data_execucao = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    # Data e hora do registro no sistema (Auditoria)
    criado_em = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relacionamento opcional com o CatalogoServico para consultas agregadas
    catalogo = relationship("CatalogoServico", backref="lancamentos")

    def __repr__(self) -> str:
        return (
            f"<LancamentoServico(id={self.id}, nome='{self.nome_servico}', "
            f"qtd={self.quantidade}, unitario={self.valor_unitario}, total={self.valor_total})>"
        )
