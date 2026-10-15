"""
Testes automatizados da camada de Fechamento de Período e Geração de PDF.
Executar com: python tests/test_fechamento.py
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Ajusta o sys.path para reconhecer o pacote app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal, engine, Base
import app.models
from app.models.lancamento_servico import LancamentoServico
from app.models.fechamento import Fechamento
from app.schemas.catalogo_servico import CatalogoServicoCreate
from app.schemas.lancamento_servico import LancamentoServicoCreate
from app.schemas.fechamento import (
    FechamentoCreate,
    FechamentoSimulacaoRequest
)
from app.services.catalogo_service import CatalogoService
from app.services.lancamento_service import LancamentoService
from app.services.fechamento_service import FechamentoService


def testar_fechamento_completo():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        catalogo_service = CatalogoService(db)
        lancamento_service = LancamentoService(db)
        fechamento_service = FechamentoService(db)

        # 1. Cria item no catálogo
        item_cat = catalogo_service.cadastrar_servico(
            CatalogoServicoCreate(
                nome=f"Suporte Técnico Avançado {datetime.now().timestamp()}",
                descricao_padrao="Atendimento especializado em infraestrutura",
                valor_base=120.0,
                unidade_medida="HORA"
            )
        )
        assert item_cat.id is not None

        # 2. Cria 2 lançamentos pendentes
        agora = datetime.now(timezone.utc)
        ontem = agora - timedelta(days=1)
        anteontem = agora - timedelta(days=2)

        l1 = lancamento_service.criar_lancamento(
            LancamentoServicoCreate(
                catalogo_servico_id=item_cat.id,
                quantidade=2.0,
                data_execucao=anteontem
            )
        )
        assert l1.status == "PENDENTE"
        assert l1.valor_total == 240.0

        l2 = lancamento_service.criar_lancamento(
            LancamentoServicoCreate(
                nome_servico="Configuração de Roteador Wi-Fi 6",
                unidade_medida="UN",
                quantidade=1.0,
                valor_unitario=160.0,
                data_execucao=ontem
            )
        )
        assert l2.status == "PENDENTE"
        assert l2.valor_total == 160.0

        # 3. Simula fechamento
        data_ini = anteontem - timedelta(hours=2)
        data_fim = agora + timedelta(hours=2)

        sim = fechamento_service.simular_fechamento(
            FechamentoSimulacaoRequest(
                data_inicio=data_ini,
                data_fim=data_fim,
                desconto=40.0,
                acrescimo=15.0
            )
        )
        assert sim.total_lancamentos >= 2
        assert sim.valor_bruto >= 400.0

        # 4. Efetiva fechamento
        fechamento = fechamento_service.criar_fechamento(
            FechamentoCreate(
                data_inicio=data_ini,
                data_fim=data_fim,
                desconto=40.0,
                acrescimo=15.0,
                observacoes="Fechamento de teste unitário."
            )
        )

        assert fechamento.status == "FATURADO"
        assert fechamento.caminho_pdf is not None
        assert os.path.exists(fechamento.caminho_pdf)
        assert os.path.getsize(fechamento.caminho_pdf) > 1000

        # 5. Verifica atualização no banco
        db.refresh(l1)
        db.refresh(l2)
        assert l1.status == "FATURADO"
        assert l1.fechamento_id == fechamento.id
        assert l2.status == "FATURADO"
        assert l2.fechamento_id == fechamento.id

        print("Testes unitários de fechamento e PDF executados com sucesso!")

    finally:
        db.close()


if __name__ == "__main__":
    testar_fechamento_completo()
