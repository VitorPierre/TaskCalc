"""
=============================================================================
CORE: Conexão e Configuração do Banco de Dados (SQLAlchemy + SQLite)
=============================================================================
Papel na Arquitetura:
- Este arquivo gerencia o ciclo de vida da conexão com o banco de dados.
- Configura o SQLAlchemy para se comunicar com o arquivo SQLite local.
- Fornece a sessão (Session) que os Services e Repositories usarão para
  fazer consultas e transações (persistência dos Models).
=============================================================================
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from typing import Generator

# 1. URL de Conexão:
# Usamos SQLite local gerando o arquivo 'taskcalc.db' na raiz do backend.
SQLALCHEMY_DATABASE_URL = "sqlite:///./taskcalc.db"

# 2. Engine do SQLAlchemy:
# É o ponto central de comunicação com o banco.
# "check_same_thread": False é específico do SQLite para permitir que
# o FastAPI utilize mais de uma thread para processar requisições concorrentes.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# 3. SessionLocal (Fábrica de Sessões):
# Cada instância de SessionLocal será uma conexão/sessão ativa com o banco.
# autocommit=False e autoflush=False garantem que nós temos controle
# explícito sobre as transações (commits e rollbacks).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Base Declarativa:
# Todos os nossos Models do banco herdarão desta classe Base.
# Ela mapeia classes Python para tabelas relacionais do SQLite.
Base = declarative_base()


def get_db() -> Generator:
    """
    Função de Injeção de Dependência (Dependency Injection) do FastAPI.
    
    Como funciona:
    - Abre uma sessão de banco de dados quando uma requisição HTTP chega.
    - Disponibiliza a sessão para o Controller/Service via `Depends(get_db)`.
    - Ao finalizar a resposta da requisição (mesmo se ocorrer erro),
      o bloco `finally` garante o fechamento (db.close()), evitando vazamento
      de conexões.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
