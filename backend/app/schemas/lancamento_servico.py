"""
=============================================================================
SCHEMA DE VALIDAÇÃO (Pydantic v2) - LancamentoServico
=============================================================================
Papel na Arquitetura:
- Define o contrato de dados para o LANÇAMENTO (execução) de serviços.
- Validação flexível:
  * Se o serviço for padronizado (catalogo_servico_id preenchido), o cliente
    não precisa enviar nome e valor_unitario (o backend fará o snapshot).
  * Se o cliente enviar valor_unitario mesmo com catalogo_servico_id, ele
    pode negociar um valor livre/diferenciado para aquela execução pontual.
  * Se for um serviço variável/avulso (sem catalogo_servico_id), nome e
    valor_unitario são validados e obrigatórios.
=============================================================================
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


# ---------------------------------------------------------------------------
# 1. Schema de Entrada: Criação de Lançamento (POST /lancamentos)
# ---------------------------------------------------------------------------
class LancamentoServicoCreate(BaseModel):
    """
    Dados enviados pelo Frontend para registrar a execução de um serviço.
    """
    catalogo_servico_id: Optional[int] = Field(
        default=None,
        description="ID do serviço no catálogo. Se fornecido, nome e preço base são copiados automaticamente."
    )
    nome_servico: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=120,
        description="Nome do serviço. Obrigatório apenas se catalogo_servico_id não for informado."
    )
    descricao: Optional[str] = Field(
        default=None,
        description="Descrição ou detalhe específico deste atendimento."
    )
    unidade_medida: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Unidade de medida (ex: 'UN', 'HORA', 'KM'). Se omitido com catálogo, copia do catálogo."
    )
    quantidade: float = Field(
        default=1.0,
        gt=0.0,
        description="Quantidade executada (deve ser maior que zero, ex: 1, 2.5 horas)."
    )
    valor_unitario: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Preço unitário cobrado. Se omitido com catálogo, copia o valor_base do catálogo. Se avulso, é obrigatório."
    )
    data_execucao: Optional[datetime] = Field(
        default=None,
        description="Data e hora em que o serviço foi prestado. Se omitido, assume o momento atual (UTC)."
    )


# ---------------------------------------------------------------------------
# 2. Schema de Resposta: Dados retornados ao Frontend (GET e retorno do POST)
# ---------------------------------------------------------------------------
class LancamentoServicoResponse(BaseModel):
    """
    JSON retornado pela API contendo o Snapshot completo e imutável do serviço executado.
    """
    id: int = Field(..., description="ID único do lançamento")
    catalogo_servico_id: Optional[int] = Field(None, description="ID de referência no catálogo (pode ser nulo)")
    nome_servico: str = Field(..., description="Nome do serviço congelado no momento da execução (Snapshot)")
    descricao: Optional[str] = Field(None, description="Observações do atendimento")
    unidade_medida: str = Field(..., description="Unidade de medida congelada no Snapshot")
    quantidade: float = Field(..., description="Quantidade executada")
    valor_unitario: float = Field(..., description="Valor unitário congelado no Snapshot (R$)")
    valor_total: float = Field(..., description="Valor total da execução (quantidade * valor_unitario)")
    data_execucao: datetime = Field(..., description="Data/hora em que o serviço foi executado")
    criado_em: datetime = Field(..., description="Data/hora do registro no sistema")

    model_config = ConfigDict(from_attributes=True)
