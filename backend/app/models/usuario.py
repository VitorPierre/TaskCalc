"""
=============================================================================
MODEL DO BANCO (SQLAlchemy ORM) - Entidade Usuario
=============================================================================
Papel na Arquitetura:
- Representa a tabela física 'usuarios' no banco de dados SQLite.
- Armazena as credenciais de autenticação e nível de acesso ao TaskCalc:
  * id: Chave primária autoincrementada.
  * nome: Nome completo do prestador de serviço ou gestor.
  * email: Endereço de e-mail único para login e notificações.
  * senha_hash: Senha criptografada com algoritmo bcrypt (NUNCA armazena senha em texto plano).
  * perfil: Perfil de acesso ao sistema ('PRESTADOR' ou 'GESTOR').
    - 'PRESTADOR': focado no catálogo de serviços e registros de atendimentos.
    - 'GESTOR': acesso a fechamentos financeiros e apurações consolidadas.
  * ativo: Flag para desativação lógica da conta.
  * criado_em: Data e hora do cadastro (UTC).
=============================================================================
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime, timezone
from app.core.database import Base


class Usuario(Base):
    """
    Model que representa a tabela 'usuarios'.
    Gerencia as contas de acesso de prestadores e gestores do sistema.
    """
    __tablename__ = "usuarios"

    # 1. Identificador único do usuário (Chave Primária autoincrementada)
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 2. Nome completo do usuário
    nome = Column(String(120), nullable=False)

    # 3. E-mail único de acesso ao sistema (indexado para autenticação veloz)
    email = Column(String(150), unique=True, index=True, nullable=False)

    # 4. Hash seguro da senha (bcrypt) - Nunca gravar senha pura
    senha_hash = Column(String(255), nullable=False)

    # 5. Perfil de permissão: 'PRESTADOR' ou 'GESTOR'
    perfil = Column(String(20), nullable=False, default="PRESTADOR", index=True)

    # 6. Flag para ativação/desativação da conta
    ativo = Column(Boolean, nullable=False, default=True)

    # 7. Data e hora do cadastro no sistema (UTC)
    criado_em = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<Usuario(id={self.id}, nome='{self.nome}', email='{self.email}', "
            f"perfil='{self.perfil}', ativo={self.ativo})>"
        )
