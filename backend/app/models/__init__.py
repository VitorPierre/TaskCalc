"""
Exposição centralizada dos Models para o SQLAlchemy e Alembic (se usado).
Importar todos os models aqui garante que o Base.metadata.create_all()
reconheça todas as tabelas ao iniciar a aplicação.
"""

from app.core.database import Base
from app.models.servico import Servico
from app.models.catalogo_servico import CatalogoServico
from app.models.lancamento_servico import LancamentoServico
from app.models.fechamento import Fechamento
from app.models.usuario import Usuario

__all__ = ["Base", "Servico", "CatalogoServico", "LancamentoServico", "Fechamento", "Usuario"]


