"""
=============================================================================
SERVICE LAYER: FechamentoService (Regra de Faturamento e Fechamento de Período)
=============================================================================
Papel na Arquitetura:
- É a classe central de orquestração do Fechamento Contábil e Financeiro.
- Implementa as regras de negócio:
  1. Busca de Lançamentos Pendentes:
     - Localiza todos os serviços com status 'PENDENTE' cuja data de execução
       esteja contida no intervalo delimitado por 'data_inicio' e 'data_fim'.
  2. Soma do Valor Bruto:
     - Itera sobre todos os lançamentos apurados e calcula o somatório exato
       dos valores totais (Snapshot RD01).
  3. Aplicação de Descontos e Acréscimos:
     - Deduz descontos negociados e incorpora acréscimos aplicáveis (deslocamento,
       adicionais noturnos ou de urgência), gerando o Valor Líquido Final.
  4. Transição de Status:
     - Altera de forma atômica o status de cada lançamento incluído de 'PENDENTE'
       para 'FATURADO' e vincula o identificador do fechamento ('fechamento_id').
  5. Geração e Armazenamento do Relatório em PDF:
     - Invoca o serviço 'GeradorPDFFechamento' para criar o documento A4
       oficial com layout corporativo e salva no disco.
=============================================================================
"""

import os
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.fechamento import Fechamento
from app.models.lancamento_servico import LancamentoServico
from app.schemas.fechamento import (
    FechamentoCreate,
    FechamentoSimulacaoRequest,
    FechamentoSimulacaoResponse
)
from app.services.pdf_generator import GeradorPDFFechamento


# Diretório base para persistência dos arquivos PDF gerados
# Cria-se uma pasta 'storage/fechamentos' na raiz da aplicação backend
PASTA_STORAGE_PDF = Path(__file__).resolve().parent.parent.parent / "storage" / "fechamentos"


class FechamentoService:
    """
    Camada de Serviço responsável pela apuração e fechamento de períodos de serviços.
    """

    def __init__(self, db: Session):
        self.db = db

    def simular_fechamento(
        self,
        dados: FechamentoSimulacaoRequest
    ) -> FechamentoSimulacaoResponse:
        """
        Caso de Uso: Simular o fechamento de um período antes de efetivá-lo.
        
        Permite ao prestador ou gestor visualizar:
        - Quantos serviços estão pendentes no intervalo informado.
        - Qual será o valor bruto total apurado.
        - O impacto financeiro do desconto e acréscimo antes de consolidar.
        
        NENHUM dado é alterado no banco de dados durante a simulação (operação Read-Only).
        """
        # 1. Busca os lançamentos pendentes no intervalo de datas
        lancamentos_pendentes = (
            self.db.query(LancamentoServico)
            .filter(
                LancamentoServico.status == "PENDENTE",
                LancamentoServico.data_execucao >= dados.data_inicio,
                LancamentoServico.data_execucao <= dados.data_fim
            )
            .order_by(LancamentoServico.data_execucao.asc())
            .all()
        )

        # 2. Totalização matemática
        valor_bruto = round(sum(lanc.valor_total for lanc in lancamentos_pendentes), 2)
        desconto = round(dados.desconto, 2)
        acrescimo = round(dados.acrescimo, 2)
        valor_liquido = round(valor_bruto - desconto + acrescimo, 2)

        return FechamentoSimulacaoResponse(
            data_inicio=dados.data_inicio,
            data_fim=dados.data_fim,
            total_lancamentos=len(lancamentos_pendentes),
            valor_bruto=valor_bruto,
            desconto=desconto,
            acrescimo=acrescimo,
            valor_liquido=valor_liquido,
            lancamentos=lancamentos_pendentes
        )

    def criar_fechamento(self, dados: FechamentoCreate) -> Fechamento:
        """
        Caso de Uso: Efetivar o Fechamento de Período, faturar os serviços e emitir o PDF oficial.
        
        Etapas da Regra de Negócio:
        1. Validação do intervalo e consistência de datas.
        2. Localização dos lançamentos que ainda se encontram com status 'PENDENTE'.
        3. Validação de integridade: se não houver nenhum lançamento pendente,
           o fechamento é rejeitado (evita fechamentos vazios).
        4. Apuração matemática: soma bruta, desconto, acréscimo e valor líquido.
        5. Persistência do registro de Fechamento com status 'FATURADO'.
        6. Atualização atômica dos lançamentos: status vira 'FATURADO' e fechamento_id é gravado.
        7. Geração física do relatório PDF com os dados consolidados.
        8. Gravação do caminho do PDF gerado no registro do fechamento.
        """
        # -------------------------------------------------------------------
        # ETAPA 1: Validação de consistência temporal
        # -------------------------------------------------------------------
        if dados.data_inicio > dados.data_fim:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A data de início não pode ser posterior à data de término do período."
            )

        # -------------------------------------------------------------------
        # ETAPA 2: Busca dos lançamentos elegíveis (PENDENTES no período)
        # -------------------------------------------------------------------
        lancamentos_pendentes: List[LancamentoServico] = (
            self.db.query(LancamentoServico)
            .filter(
                LancamentoServico.status == "PENDENTE",
                LancamentoServico.data_execucao >= dados.data_inicio,
                LancamentoServico.data_execucao <= dados.data_fim
            )
            .order_by(LancamentoServico.data_execucao.asc())
            .all()
        )

        # -------------------------------------------------------------------
        # ETAPA 3: Validação de Existência
        # -------------------------------------------------------------------
        if not lancamentos_pendentes:
            data_ini_fmt = dados.data_inicio.strftime("%d/%m/%Y")
            data_fim_fmt = dados.data_fim.strftime("%d/%m/%Y")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Nenhum lançamento com status 'PENDENTE' foi encontrado no período "
                    f"de {data_ini_fmt} a {data_fim_fmt} para efetuar o fechamento."
                )
            )

        # -------------------------------------------------------------------
        # ETAPA 4: Apuração dos Valores Financeiros
        # -------------------------------------------------------------------
        # Soma o valor bruto consolidado a partir do snapshot dos lançamentos
        valor_bruto = round(sum(lanc.valor_total for lanc in lancamentos_pendentes), 2)
        desconto = round(dados.desconto, 2)
        acrescimo = round(dados.acrescimo, 2)

        # Validação financeira: desconto não deve exceder o total bruto + acréscimo
        if desconto > (valor_bruto + acrescimo):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"O desconto informado (R$ {desconto:.2f}) não pode ser maior que o total "
                    f"dos serviços com acréscimos (R$ {(valor_bruto + acrescimo):.2f})."
                )
            )

        valor_liquido = round(valor_bruto - desconto + acrescimo, 2)

        # -------------------------------------------------------------------
        # ETAPA 5: Criação do Registro de Fechamento no Banco de Dados
        # -------------------------------------------------------------------
        novo_fechamento = Fechamento(
            data_inicio=dados.data_inicio,
            data_fim=dados.data_fim,
            valor_bruto=valor_bruto,
            desconto=desconto,
            acrescimo=acrescimo,
            valor_liquido=valor_liquido,
            status="FATURADO",
            observacoes=dados.observacoes.strip() if dados.observacoes else None,
            criado_em=datetime.now(timezone.utc)
        )

        self.db.add(novo_fechamento)
        # Flush envia o registro ao SQLite para gerar o ID autoincrementado
        # sem ainda efetivar o commit final da transação
        self.db.flush()

        # -------------------------------------------------------------------
        # ETAPA 6: Atualização dos Lançamentos para 'FATURADO'
        # -------------------------------------------------------------------
        # Cada lançamento agora fica bloqueado contra novos faturamentos
        for lanc in lancamentos_pendentes:
            lanc.status = "FATURADO"
            lanc.fechamento_id = novo_fechamento.id

        # Atribui a lista de lançamentos em memória para que o gerador de PDF
        # tenha acesso imediato a todos os dados consolidados
        novo_fechamento.lancamentos = lancamentos_pendentes

        # -------------------------------------------------------------------
        # ETAPA 7: Geração do Arquivo PDF Oficial
        # -------------------------------------------------------------------
        os.makedirs(PASTA_STORAGE_PDF, exist_ok=True)
        nome_arquivo_pdf = (
            f"fechamento_{novo_fechamento.id:04d}_"
            f"{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
        )
        caminho_completo_pdf = str(PASTA_STORAGE_PDF / nome_arquivo_pdf)

        try:
            GeradorPDFFechamento.gerar(
                fechamento=novo_fechamento,
                destino_arquivo=caminho_completo_pdf
            )
            # Salva o caminho relativo ou absoluto no banco de dados
            novo_fechamento.caminho_pdf = caminho_completo_pdf
        except Exception as erro:
            # Em caso de falha crítica na geração do PDF, desfaz a transação
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Falha ao gerar o arquivo PDF de fechamento: {str(erro)}"
            )

        # -------------------------------------------------------------------
        # ETAPA 8: Conclusão e Persistência Atômica (Commit)
        # -------------------------------------------------------------------
        self.db.commit()
        self.db.refresh(novo_fechamento)

        return novo_fechamento

    def listar_fechamentos(self) -> List[Fechamento]:
        """
        Caso de Uso: Listar todo o histórico de fechamentos realizados.
        Retorna ordenado pelo mais recente (criado_em DESC).
        """
        return (
            self.db.query(Fechamento)
            .order_by(Fechamento.criado_em.desc())
            .all()
        )

    def buscar_por_id(self, fechamento_id: int) -> Fechamento:
        """
        Caso de Uso: Buscar detalhes de um fechamento específico pelo seu ID.
        """
        fechamento = (
            self.db.query(Fechamento)
            .filter(Fechamento.id == fechamento_id)
            .first()
        )
        if not fechamento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fechamento com ID {fechamento_id} não foi encontrado."
            )
        return fechamento

    def obter_ou_regenerar_pdf(self, fechamento_id: int) -> str:
        """
        Caso de Uso: Obter o caminho físico do PDF do fechamento.
        Caso o arquivo tenha sido movido ou excluído do disco,
        o Service regenera o PDF de forma transparente e atualiza o caminho.
        """
        fechamento = self.buscar_por_id(fechamento_id)

        caminho_valido = (
            fechamento.caminho_pdf
            and os.path.exists(fechamento.caminho_pdf)
        )

        if not caminho_valido:
            # Regenera o PDF caso o arquivo não exista no disco
            os.makedirs(PASTA_STORAGE_PDF, exist_ok=True)
            nome_arquivo_pdf = (
                f"fechamento_{fechamento.id:04d}_"
                f"{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
            )
            novo_caminho = str(PASTA_STORAGE_PDF / nome_arquivo_pdf)

            GeradorPDFFechamento.gerar(
                fechamento=fechamento,
                destino_arquivo=novo_caminho
            )

            fechamento.caminho_pdf = novo_caminho
            self.db.commit()
            self.db.refresh(fechamento)

        return fechamento.caminho_pdf
