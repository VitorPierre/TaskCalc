"""
=============================================================================
ENTRYPOINT DA APLICAÇÃO: FastAPI Main (main.py)
=============================================================================
Papel na Arquitetura:
- É o ponto de entrada da API.
- Inicializa a aplicação FastAPI.
- Gerencia o ciclo de vida (startup/shutdown):
  * No startup, instrui o SQLAlchemy a criar as tabelas no arquivo SQLite
    caso ainda não existam (`Base.metadata.create_all`).
- Configura middlewares essenciais, como CORS (Cross-Origin Resource Sharing),
  permitindo que o Frontend (React) se comunique com o Backend sem bloqueios do navegador.
- Registra e acopla todos os Controllers (rotas) da aplicação.
=============================================================================
Fluxo de uma Requisição no MVC + Service Layer:
  1. Frontend / Cliente faz a requisição HTTP (ex: POST /api/v1/servicos/)
  2. main.py roteia para o CONTROLLER correspondente (servico_controller.py)
  3. CONTROLLER valida o JSON de entrada usando o SCHEMA (servico.py - Pydantic)
  4. CONTROLLER solicita uma sessão do SQLite (get_db via database.py)
  5. CONTROLLER repassa a ação para a SERVICE LAYER (servico_service.py)
  6. SERVICE executa regras de negócio e usa o MODEL (servico.py - SQLAlchemy) para persistir
  7. Resposta trafega de volta: Model -> Service -> Controller -> Schema de saída -> JSON para o Cliente!
=============================================================================
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importações dos módulos internos
from sqlalchemy import text
from app.core.database import engine, Base
import app.models  # Garante que todos os models sejam descobertos pelo SQLAlchemy
from app.routers.catalogo_router import router as catalogo_router
from app.routers.lancamento_router import router as lancamento_router
from app.routers.fechamento_router import router as fechamento_router
from app.routers.auth_router import router as auth_router


# Gerenciador de ciclo de vida (Lifespan) da aplicação (padrão moderno do FastAPI)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    # Cria todas as tabelas no SQLite definidas nos Models que herdam de Base
    print("Inicializando banco de dados SQLite e sincronizando tabelas...")
    Base.metadata.create_all(bind=engine)

    # Migração defensiva: garante colunas status e fechamento_id se o SQLite já existia
    try:
        with engine.connect() as conn:
            cols = [col[1] for col in conn.execute(text("PRAGMA table_info(lancamentos_servicos)")).fetchall()]
            if cols:
                if "status" not in cols:
                    conn.execute(text("ALTER TABLE lancamentos_servicos ADD COLUMN status VARCHAR(20) DEFAULT 'PENDENTE' NOT NULL"))
                if "fechamento_id" not in cols:
                    conn.execute(text("ALTER TABLE lancamentos_servicos ADD COLUMN fechamento_id INTEGER REFERENCES fechamentos(id) ON DELETE SET NULL"))
                conn.commit()
    except Exception as e:
        print(f"Aviso durante sincronizacao de schema SQLite: {e}")

    print("Banco de dados pronto para uso.")
    
    yield  # Aqui a aplicação fica em execução atendendo requisições
    
    # --- SHUTDOWN ---
    print("Encerrando aplicação...")


# Instância principal do FastAPI
app = FastAPI(
    title="TaskCalc API - Sistema de Controle de Serviços",
    description="Backend em FastAPI com SQLAlchemy, SQLite e arquitetura MVC + Service Layer.",
    version="1.0.0",
    lifespan=lifespan
)

# Configuração de CORS para permitir requisições do Frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, substitua pelo domínio do frontend (ex: http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro dos Routers (Controllers) com prefixo de versionamento da API
app.include_router(catalogo_router, prefix="/api/v1")
app.include_router(catalogo_router, prefix="/api/v1/catalogo", tags=["Catálogo de Serviços"])
app.include_router(lancamento_router, prefix="/api/v1")
app.include_router(fechamento_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")




@app.get("/", tags=["Health Check"])
def raiz():
    """
    Rota inicial de verificação de saúde (Health Check).
    """
    return {
        "status": "online",
        "projeto": "TaskCalc API",
        "docs": "/docs",
        "mensagem": "Bem-vindo ao backend do TaskCalc!"
    }
