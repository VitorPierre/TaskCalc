"""
=============================================================================
VIEW / SCHEMAS (V do MVC em APIs REST): Validação e Serialização (Pydantic)
=============================================================================
Papel na Arquitetura:
- Em APIs REST, a "View" não gera HTML diretamente. A responsabilidade de
  renderizar a tela é do Frontend (React).
- No backend FastAPI, os Schemas (Pydantic) assumem o papel de "View Model / DTO":
  1. Validam e filtram os dados enviados pelo cliente (Request Body).
  2. Formatam e definem exatamente quais campos serão devolvidos como resposta JSON (Response Model).
  3. Protegem o Model do banco de ser exposto diretamente sem controle.
=============================================================================
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# 1. Esquema Base com campos compartilhados
class ServicoBase(BaseModel):
    titulo: str = Field(..., min_length=2, max_length=100, description="Nome ou título do serviço")
    descricao: Optional[str] = Field(None, max_length=255, description="Breve descrição do serviço")
    preco_base: float = Field(..., ge=0.0, description="Valor base do serviço, deve ser maior ou igual a zero")
    ativo: bool = Field(True, description="Indica se o serviço está disponível para seleção")


# 2. Esquema para Criação (Input da Requisição POST)
class ServicoCreate(ServicoBase):
    pass


# 3. Esquema para Atualização (Input da Requisição PUT / PATCH)
class ServicoUpdate(BaseModel):
    titulo: Optional[str] = Field(None, min_length=2, max_length=100)
    descricao: Optional[str] = Field(None, max_length=255)
    preco_base: Optional[float] = Field(None, ge=0.0)
    ativo: Optional[bool] = None


# 4. Esquema para Resposta (Output JSON enviado ao cliente)
class ServicoResponse(ServicoBase):
    id: int
    criado_em: datetime

    class Config:
        # Permite que o Pydantic leia diretamente atributos de instâncias do SQLAlchemy
        from_attributes = True
