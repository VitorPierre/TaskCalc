"""
=============================================================================
SERVICE LAYER: LancamentoService (Regra de Negócio Crítica - Snapshot RD01)
=============================================================================
Papel na Arquitetura Limpa:
- Orquestra os lançamentos (execuções) de serviços no sistema.
- Implementa a Regra de Negócio RD01:
  * "O preço e o título do serviço lançado devem gravar o 'snapshot' (cópia exata)
    do momento da execução. Nunca altere dados de lançamentos já passados ou vinculados a fechamentos."

COMO FUNCIONA A LÓGICA DO SNAPSHOT AQUI?
1. Serviço Padronizado (com catalogo_servico_id):
   - O prestador seleciona um serviço do catálogo (ex: "Troca de Óleo" com valor base R$ 250,00).
   - O Service busca o cadastro no catálogo.
   - O Service copia (faz o snapshot) do nome e da unidade de medida do catálogo.
   - Preço Unitário: Se o usuário informou um preço específico (ex: concedeu desconto ou cobrou
     adicional por dificuldade), usamos o valor livre informado; se não informou, COPIA
     o valor_base do catálogo.
   - Assim, mesmo se amanhã a "Troca de Óleo" subir para R$ 300,00 no catálogo, este lançamento
     continua gravado com os R$ 250,00 exatos do momento do atendimento!

2. Serviço Variável / Avulso (sem catalogo_servico_id):
   - O prestador prestou um serviço sob medida (ex: "Conserto emergencial de cano").
   - O Service valida que o nome e o valor_unitário foram fornecidos.
   - Não vincula a nenhum catálogo (catalogo_servico_id = None).

3. Cálculo Automático do Total:
   - valor_total = round(quantidade * valor_unitario, 2)
=============================================================================
"""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.catalogo_servico import CatalogoServico
from app.models.lancamento_servico import LancamentoServico
from app.schemas.lancamento_servico import LancamentoServicoCreate


class LancamentoService:
    """
    Camada de serviço responsável pelas regras de lançamento de serviços prestados.
    """

    def __init__(self, db: Session):
        self.db = db

    def criar_lancamento(self, dados: LancamentoServicoCreate) -> LancamentoServico:
        """
        Caso de Uso: Registrar um novo serviço executado aplicando a regra de Snapshot (RD01).
        """
        # Variáveis que armazenarão o Snapshot congelado
        nome_snapshot: str
        unidade_snapshot: str
        valor_unitario_snapshot: float
        descricao_snapshot: Optional[str] = dados.descricao

        # -------------------------------------------------------------------
        # CENÁRIO 1: Serviço Padronizado (Vinculado ao Catálogo)
        # -------------------------------------------------------------------
        if dados.catalogo_servico_id is not None:
            # 1.1 Busca o item correspondente no catálogo
            catalogo = (
                self.db.query(CatalogoServico)
                .filter(CatalogoServico.id == dados.catalogo_servico_id)
                .first()
            )
            if not catalogo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Serviço de catálogo com ID {dados.catalogo_servico_id} não foi encontrado."
                )

            # 1.2 Não permite novos lançamentos de serviços inativos no catálogo
            if not catalogo.ativo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"O serviço '{catalogo.nome}' está desativado no catálogo para novos lançamentos."
                )

            # 1.3 SNAPSHOT DO NOME: Se o usuário customizou o nome, usa o customizado; senão, copia do catálogo
            nome_snapshot = dados.nome_servico.strip() if dados.nome_servico else catalogo.nome

            # 1.4 SNAPSHOT DA UNIDADE: Se não especificada, copia do catálogo
            unidade_snapshot = (
                dados.unidade_medida.strip().upper()
                if dados.unidade_medida
                else catalogo.unidade_medida
            )

            # 1.5 SNAPSHOT DO PREÇO: Se o usuário passou um valor livre, usa-o; senão, copia o valor_base do catálogo
            if dados.valor_unitario is not None:
                valor_unitario_snapshot = float(dados.valor_unitario)
            else:
                valor_unitario_snapshot = float(catalogo.valor_base)

            # 1.6 SNAPSHOT DA DESCRIÇÃO: Se o usuário não enviou descrição específica, herda a padrão do catálogo
            if not descricao_snapshot and catalogo.descricao_padrao:
                descricao_snapshot = catalogo.descricao_padrao

        # -------------------------------------------------------------------
        # CENÁRIO 2: Serviço Variável / Avulso (Sem Catálogo)
        # -------------------------------------------------------------------
        else:
            # 2.1 Para serviços avulsos, o nome é obrigatório
            if not dados.nome_servico or not dados.nome_servico.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Para lançamentos avulsos (sem catálogo), o campo 'nome_servico' é obrigatório."
                )
            nome_snapshot = dados.nome_servico.strip()

            # 2.2 Para serviços avulsos, o valor unitário é obrigatório
            if dados.valor_unitario is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Para lançamentos avulsos (sem catálogo), o campo 'valor_unitario' é obrigatório."
                )
            valor_unitario_snapshot = float(dados.valor_unitario)

            # 2.3 Unidade padrão 'UN' caso não seja informada
            unidade_snapshot = (
                dados.unidade_medida.strip().upper()
                if dados.unidade_medida
                else "UN"
            )

        # -------------------------------------------------------------------
        # CÁLCULOS E PERSISTÊNCIA DO SNAPSHOT
        # -------------------------------------------------------------------
        # Cálculo exato do valor total (quantidade * valor unitário congelado)
        valor_total_calculado = round(dados.quantidade * valor_unitario_snapshot, 2)

        # Data da execução (se não informada pelo usuário, usa a data atual UTC)
        data_exec = dados.data_execucao or datetime.now(timezone.utc)

        # Criação do Model já com os dados desnormalizados/congelados
        novo_lancamento = LancamentoServico(
            catalogo_servico_id=dados.catalogo_servico_id,
            nome_servico=nome_snapshot,
            descricao=descricao_snapshot,
            unidade_medida=unidade_snapshot,
            quantidade=dados.quantidade,
            valor_unitario=valor_unitario_snapshot,
            valor_total=valor_total_calculado,
            data_execucao=data_exec
        )

        self.db.add(novo_lancamento)
        self.db.commit()
        self.db.refresh(novo_lancamento)

        return novo_lancamento

    def listar_lancamentos(
        self,
        catalogo_id: Optional[int] = None,
        status_filtro: Optional[str] = None,
        data_inicio: Optional[datetime] = None,
        data_fim: Optional[datetime] = None
    ) -> List[LancamentoServico]:
        """
        Caso de Uso: Listar os serviços executados com suporte a filtros flexíveis.
        Retorna em ordem decrescente de data de execução (mais recentes primeiro).
        """
        query = self.db.query(LancamentoServico)

        if catalogo_id:
            query = query.filter(LancamentoServico.catalogo_servico_id == catalogo_id)

        if status_filtro:
            query = query.filter(LancamentoServico.status == status_filtro.strip().upper())

        if data_inicio:
            query = query.filter(LancamentoServico.data_execucao >= data_inicio)

        if data_fim:
            query = query.filter(LancamentoServico.data_execucao <= data_fim)

        return query.order_by(LancamentoServico.data_execucao.desc()).all()

    def buscar_por_id(self, lancamento_id: int) -> LancamentoServico:
        """
        Caso de Uso: Buscar detalhes de um lançamento específico.
        """
        lancamento = (
            self.db.query(LancamentoServico)
            .filter(LancamentoServico.id == lancamento_id)
            .first()
        )
        if not lancamento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lançamento com ID {lancamento_id} não foi encontrado."
            )
        return lancamento
