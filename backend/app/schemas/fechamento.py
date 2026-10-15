"""
=============================================================================
SCHEMAS DE VALIDAÇÃO (Pydantic v2) - Fechamento de Período e Faturamento
=============================================================================
Papel na Arquitetura:
- Define os contratos de dados para o ciclo de Fechamento de Serviços.
- Valida entradas como datas de início e fim, descontos e acréscimos.
- Formata e documenta as respostas da API para o Frontend (React).
=============================================================================
"""

from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, List
from datetime import datetime
from app.schemas.lancamento_servico import LancamentoServicoResponse


# ---------------------------------------------------------------------------
# 1. Schema de Entrada: Criação e Efetivação do Fechamento
# ---------------------------------------------------------------------------
class FechamentoCreate(BaseModel):
    """
    Dados enviados pelo Frontend para consolidar e faturar os serviços de um período.
    """
    data_inicio: datetime = Field(
        ...,
        description="Data e hora de início do período a ser apurado (ex: 2026-10-01T00:00:00)."
    )
    data_fim: datetime = Field(
        ...,
        description="Data e hora de fim do período a ser apurado (ex: 2026-10-15T23:59:59)."
    )
    desconto: float = Field(
        default=0.0,
        ge=0.0,
        description="Valor de desconto opcional a abater do total bruto (R$)."
    )
    acrescimo: float = Field(
        default=0.0,
        ge=0.0,
        description="Valor de acréscimo opcional a somar ao total bruto (ex: taxa de deslocamento/urgência)."
    )
    observacoes: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Observações, termos de negociação ou anotações gerais sobre o fechamento."
    )

    @model_validator(mode="after")
    def validar_intervalo_datas(self) -> "FechamentoCreate":
        """Garante que a data inicial não seja posterior à data final."""
        if self.data_inicio > self.data_fim:
            raise ValueError("A data de início não pode ser posterior à data de fim do período.")
        return self


# ---------------------------------------------------------------------------
# 2. Schema de Entrada/Saída: Simulação / Pré-visualização do Fechamento
# ---------------------------------------------------------------------------
class FechamentoSimulacaoRequest(BaseModel):
    """
    Parâmetros para simular o fechamento sem alterar o banco de dados.
    """
    data_inicio: datetime = Field(..., description="Data/hora inicial do intervalo de apuração.")
    data_fim: datetime = Field(..., description="Data/hora final do intervalo de apuração.")
    desconto: float = Field(default=0.0, ge=0.0, description="Desconto estimado (R$).")
    acrescimo: float = Field(default=0.0, ge=0.0, description="Acréscimo estimado (R$).")

    @model_validator(mode="after")
    def validar_intervalo(self) -> "FechamentoSimulacaoRequest":
        if self.data_inicio > self.data_fim:
            raise ValueError("A data de início não pode ser posterior à data de fim do período.")
        return self


class FechamentoSimulacaoResponse(BaseModel):
    """
    Retorno da prévia de fechamento contendo a contagem e valores antes da confirmação.
    """
    data_inicio: datetime = Field(..., description="Início do período apurado")
    data_fim: datetime = Field(..., description="Fim do período apurado")
    total_lancamentos: int = Field(..., description="Quantidade de serviços pendentes encontrados")
    valor_bruto: float = Field(..., description="Soma bruta dos serviços prestados (R$)")
    desconto: float = Field(..., description="Desconto informado (R$)")
    acrescimo: float = Field(..., description="Acréscimo informado (R$)")
    valor_liquido: float = Field(..., description="Valor líquido calculado (R$)")
    lancamentos: List[LancamentoServicoResponse] = Field(
        default=[],
        description="Lista detalhada dos serviços pendentes incluídos nesta simulação"
    )


# ---------------------------------------------------------------------------
# 3. Schema de Resposta Oficial: Fechamento Concluído e Persistido
# ---------------------------------------------------------------------------
class FechamentoResponse(BaseModel):
    """
    Dados completos do Fechamento gerado, incluindo totais financeiros,
    status 'FATURADO', link para o PDF e relação de lançamentos.
    """
    id: int = Field(..., description="Identificador único do fechamento")
    data_inicio: datetime = Field(..., description="Data/hora de início do período")
    data_fim: datetime = Field(..., description="Data/hora de término do período")
    valor_bruto: float = Field(..., description="Total bruto consolidado dos serviços (R$)")
    desconto: float = Field(..., description="Desconto aplicado (R$)")
    acrescimo: float = Field(..., description="Acréscimo aplicado (R$)")
    valor_liquido: float = Field(..., description="Valor líquido a faturar/receber (R$)")
    status: str = Field(..., description="Status do fechamento (ex: 'FATURADO')")
    observacoes: Optional[str] = Field(None, description="Observações do fechamento")
    caminho_pdf: Optional[str] = Field(None, description="Caminho do arquivo PDF oficial gerado")
    criado_em: datetime = Field(..., description="Data e hora de geração do fechamento")
    total_lancamentos: int = Field(..., description="Quantidade total de lançamentos incluídos")
    lancamentos: List[LancamentoServicoResponse] = Field(
        default=[],
        description="Lançamentos de serviços que foram faturados neste fechamento"
    )

    model_config = ConfigDict(from_attributes=True)


class FechamentoResumoResponse(BaseModel):
    """
    Visão resumida para listagem histórica dos fechamentos sem carregar todos os itens.
    """
    id: int = Field(..., description="Identificador único do fechamento")
    data_inicio: datetime = Field(..., description="Início do período")
    data_fim: datetime = Field(..., description="Término do período")
    valor_bruto: float = Field(..., description="Valor bruto (R$)")
    desconto: float = Field(..., description="Desconto (R$)")
    acrescimo: float = Field(..., description="Acréscimo (R$)")
    valor_liquido: float = Field(..., description="Valor líquido (R$)")
    status: str = Field(..., description="Status do fechamento")
    criado_em: datetime = Field(..., description="Data de geração")
    total_lancamentos: int = Field(..., description="Quantidade de serviços faturados")
    caminho_pdf: Optional[str] = Field(None, description="Caminho do PDF")

    model_config = ConfigDict(from_attributes=True)
