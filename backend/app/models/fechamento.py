"""
=============================================================================
MODEL DO BANCO (SQLAlchemy ORM) - Entidade Fechamento (Faturamento de Período)
=============================================================================
Papel na Arquitetura:
- Representa a tabela física 'fechamentos' no banco de dados SQLite.
- Consolida os lançamentos de serviços prestados em um determinado intervalo de tempo
  (ex: semanal, quinzenal ou mensal).
- Registra os valores totais calculados no momento do faturamento:
  * Valor Bruto: soma total de todos os serviços prestados no intervalo.
  * Descontos: abatimentos negociados com o cliente ou ajustes pontuais.
  * Acréscimos: taxas de deslocamento, urgência ou serviços adicionais.
  * Valor Líquido: total final a ser cobrado ou pago (Bruto - Desconto + Acréscimo).
- Mantém o status do fechamento (ex: 'FATURADO') e o caminho do arquivo PDF oficial
  gerado para auditoria e prestação de contas.

Relação com a Regra RD01 (Imutabilidade):
- Uma vez realizado o fechamento, os lançamentos vinculados são marcados como 'FATURADO'.
- Isso impede que lançamentos já faturados sejam incluídos em novos fechamentos ou
  alterados indevidamente, preservando a coerência contábil do sistema.
=============================================================================
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class Fechamento(Base):
    """
    Model que representa a tabela 'fechamentos'.
    Armazena o fechamento contábil e financeiro consolidado de um período de atendimentos.
    """
    __tablename__ = "fechamentos"

    # 1. Identificador único do fechamento (Chave Primária autoincrementada)
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 2. Intervalo de datas apurado no fechamento
    # data_inicio: início do período considerado (ex: 01/10/2026 00:00:00)
    data_inicio = Column(DateTime, nullable=False, index=True)
    # data_fim: término do período considerado (ex: 15/10/2026 23:59:59)
    data_fim = Column(DateTime, nullable=False, index=True)

    # 3. Consolidação financeira
    # valor_bruto: soma exata do valor_total de todos os lançamentos incluídos
    valor_bruto = Column(Float, nullable=False, default=0.0)

    # desconto: valor total deduzido do fechamento (ex: R$ 50,00)
    desconto = Column(Float, nullable=False, default=0.0)

    # acrescimo: valor total adicionado ao fechamento (ex: taxa de urgência de R$ 30,00)
    acrescimo = Column(Float, nullable=False, default=0.0)

    # valor_liquido: resultado final: (valor_bruto - desconto + acrescimo)
    valor_liquido = Column(Float, nullable=False, default=0.0)

    # 4. Status do fechamento
    # Por padrão, ao ser concluído e consolidado, recebe o status 'FATURADO'.
    status = Column(String(20), nullable=False, default="FATURADO", index=True)

    # 5. Observações gerais ou justificativas de descontos/acréscimos
    observacoes = Column(Text, nullable=True)

    # 6. Localização física ou relativa do arquivo PDF gerado
    # Permite que o sistema acesse ou faça download do comprovante em PDF sem recalcular.
    caminho_pdf = Column(String(255), nullable=True)

    # 7. Data e hora em que o fechamento foi processado (UTC)
    criado_em = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # 8. Relacionamento 1 para N: Um Fechamento possui N Lançamentos de Serviço vinculados
    lancamentos = relationship(
        "LancamentoServico",
        back_populates="fechamento",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<Fechamento(id={self.id}, periodo='{self.data_inicio.strftime('%d/%m/%Y')} a "
            f"{self.data_fim.strftime('%d/%m/%Y')}', bruto={self.valor_bruto}, "
            f"liquido={self.valor_liquido}, status='{self.status}')>"
        )
