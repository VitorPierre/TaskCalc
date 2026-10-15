# backend/app/routers/__init__.py
from app.routers.catalogo_router import router as catalogo_router
from app.routers.lancamento_router import router as lancamento_router
from app.routers.fechamento_router import router as fechamento_router

__all__ = ["catalogo_router", "lancamento_router", "fechamento_router"]

