"""
=============================================================================
SCHEMA DE VALIDAÇÃO (Pydantic v2) - DTOs para CatalogoServico
=============================================================================
O QUE É O SCHEMA DE VALIDAÇÃO (PYDANTIC)?
- O Schema é o CONTRATO DE DADOS entre o mundo externo (Frontend React / requisições HTTP)
  e o interior da sua aplicação backend.
- Ele é escrito usando Pydantic e é responsável por:
  1. Validar os dados recebidos antes que eles cheguem no banco (ex: tamanho mínimo do nome,
     garantir que valor_base não seja negativo).
  2. Converter tipos de dados automaticamente (ex: string "150.50" -> float 150.50).
  3. Proteger a aplicação contra ataques de "Mass Assignment" (garantir que um usuário não
     consiga injetar um campo perigoso como 'id' ou alterar dados que não deveria).
  4. Formatar a resposta JSON exata devolvida para o Frontend (Response Model).

=============================================================================
TABELA COMPARATIVA: MODEL (SQLAlchemy) vs SCHEMA (Pydantic)
=============================================================================
Característica       | Model do Banco (SQLAlchemy)           | Schema de Validação (Pydantic)
-------------------- | ------------------------------------- | ------------------------------------
Finalidade           | Armazenamento e persistência em disco | Validação de entrada e saída HTTP
Onde atua            | Dentro do Banco de Dados (SQLite)     | Na borda da API (Rotas e Controllers)
Conhece JSON/HTTP?   | Não, lida com tabelas e colunas SQL   | Sim, serializa e desserializa JSON
Gera tabelas?        | Sim (Base.metadata.create_all)        | Não, nunca cria tabelas no banco
Quantidade           | Geralmente 1 Model por Tabela         | Vários Schemas por entidade
                     |                                       | (Create, Update, Response, etc.)
=============================================================================
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


# ---------------------------------------------------------------------------
# 1. Schema Base: Campos comuns compartilhados entre entrada e saída
# ---------------------------------------------------------------------------
class CatalogoServicoBase(BaseModel):
    """
    Campos comuns a todas as operações com CatalogoServico.
    Evita duplicação de código entre os schemas de criação e resposta.
    """
    nome: str = Field(
        ...,
        min_length=2,
        max_length=120,
        description="Nome identificador do serviço no catálogo",
        examples=["Formatação de Computador", "Hora de Consultoria"]
    )
    descricao_padrao: Optional[str] = Field(
        None,
        max_length=500,
        description="Descrição detalhada padrão do serviço (opcional)",
        examples=["Instalação de SO limpo com drivers e programas essenciais."]
    )
    valor_base: float = Field(
        ...,
        ge=0.0,
        description="Valor base de referência sugerido (deve ser maior ou igual a zero)",
        examples=[120.00]
    )
    unidade_medida: str = Field(
        default="UN",
        min_length=1,
        max_length=20,
        description="Unidade de medida para cobrança (ex: UN, HORA, KM, DIARIA, M2)",
        examples=["UN", "HORA"]
    )
    ativo: bool = Field(
        default=True,
        description="Indica se o serviço está ativo para novos lançamentos"
    )


# ---------------------------------------------------------------------------
# 2. Schema de Criação (Input do POST)
# ---------------------------------------------------------------------------
class CatalogoServicoCreate(CatalogoServicoBase):
    """
    Usado no Body da requisição POST para cadastrar um novo serviço.
    
    Por que não tem o campo 'id' aqui?
    - Porque o 'id' é gerado automaticamente pelo banco SQLite (autoincrement).
    - Não faz sentido o cliente enviar um ID ao cadastrar um novo item.
    """
    pass


# ---------------------------------------------------------------------------
# 3. Schema de Atualização (Input do PUT / PATCH)
# ---------------------------------------------------------------------------
class CatalogoServicoUpdate(BaseModel):
    """
    Usado no Body de requisições PUT / PATCH para atualizar um serviço existente.
    
    Todos os campos são opcionais, permitindo atualizar apenas o que foi alterado.
    """
    nome: Optional[str] = Field(None, min_length=2, max_length=120)
    descricao_padrao: Optional[str] = Field(None, max_length=500)
    valor_base: Optional[float] = Field(None, ge=0.0)
    unidade_medida: Optional[str] = Field(None, min_length=1, max_length=20)
    ativo: Optional[bool] = None


# ---------------------------------------------------------------------------
# 4. Schema de Resposta (Output devolvido ao Cliente / Frontend)
# ---------------------------------------------------------------------------
class CatalogoServicoResponse(CatalogoServicoBase):
    """
    Representa a estrutura do JSON que a API devolve para o Frontend.
    
    Inclui campos que só existem após a gravação no banco, como 'id' e 'criado_em'.
    """
    id: int = Field(..., description="Identificador único gerado pelo banco de dados")
    criado_em: datetime = Field(..., description="Data e hora do cadastro (UTC)")

    # Configuração moderna do Pydantic v2
    # from_attributes = True ensina o Pydantic a ler os dados diretamente de uma
    # instância do Model do SQLAlchemy (ex: servico.id, servico.nome)
    # em vez de esperar apenas um dicionário Python.
    model_config = ConfigDict(from_attributes=True)
