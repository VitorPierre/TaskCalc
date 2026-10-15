"""
=============================================================================
SERVICE DE GERAÇÃO DE PDF - GeradorPDFFechamento (ReportLab)
=============================================================================
Papel na Arquitetura:
- Componente responsável por transformar os dados consolidados do Fechamento
  e seus respectivos lançamentos em um relatório profissional em PDF (formato A4).
- Utiliza a biblioteca 'reportlab' (Platypus - Page Layout and Typography Using Scripts).
- Implementa design limpo, moderno e corporativo:
  * Cabeçalho institucional com número do fechamento e período de apuração.
  * Tabela de serviços executados com zebrado, alinhamento numérico e tipografia legível.
  * Box de consolidação financeira com destaque para Valor Bruto, Descontos,
    Acréscimos e Valor Líquido Final.
  * Rodapé automático com paginação dinâmica no formato "Página X de Y" via NumberedCanvas.
=============================================================================
"""

import os
from pathlib import Path
from datetime import datetime
from typing import List

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable
)
from reportlab.pdfgen import canvas

from app.models.fechamento import Fechamento
from app.models.lancamento_servico import LancamentoServico


class NumberedCanvas(canvas.Canvas):
    """
    Canvas customizado de duas passagens (Two-pass Canvas).
    
    Por que é necessário?
    - No ReportLab padrão, quando a página 1 está sendo desenhada, o gerador
      ainda não sabe quantas páginas o documento terá no total.
    - O NumberedCanvas armazena o estado de cada página em memória e, ao final
      (no método save), percorre todas as páginas desenhando o rodapé com o número
      total correto ("Página X de Y").
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        # Salva o estado da página atual para reprocessamento no save()
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        # Quantidade total de páginas identificada
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count: int):
        """Desenha a linha separadora e os textos do rodapé."""
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))  # Slate gray

        # Linha fina de separação do rodapé
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        # Margens: 36 pt (esquerda) até 559 pt (direita) na página A4 (595 pt)
        self.line(36, 42, 559, 42)

        # Informações textuais do rodapé
        texto_esquerda = "TaskCalc - Sistema de Controle de Serviços | Autenticidade Snapshot RD01"
        texto_direita = f"Página {self._pageNumber} de {page_count}"
        self.drawString(36, 30, texto_esquerda)
        self.drawRightString(559, 30, texto_direita)

        self.restoreState()


class GeradorPDFFechamento:
    """
    Classe utilitária para renderização do relatório de fechamento em PDF.
    """

    @staticmethod
    def formatar_moeda(valor: float) -> str:
        """
        Formata um número float no padrão monetário brasileiro (ex: R$ 1.250,50).
        """
        if valor is None:
            valor = 0.0
        return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    @staticmethod
    def formatar_data(dt: datetime) -> str:
        """Formata data no padrão brasileiro DD/MM/AAAA."""
        if not dt:
            return "-"
        return dt.strftime("%d/%m/%Y")

    @staticmethod
    def formatar_data_hora(dt: datetime) -> str:
        """Formata data e hora no padrão brasileiro DD/MM/AAAA às HH:MM:SS."""
        if not dt:
            return "-"
        return dt.strftime("%d/%m/%Y às %H:%M:%S")

    @classmethod
    def gerar(cls, fechamento: Fechamento, destino_arquivo: str) -> str:
        """
        Método principal que orquestra a montagem do documento PDF e o salva no disco.

        :param fechamento: Instância do Model Fechamento com os lançamentos associados.
        :param destino_arquivo: Caminho completo onde o arquivo .pdf deve ser gravado.
        :return: O caminho absoluto do arquivo salvo.
        """
        # Garante que o diretório pai exista
        caminho_dir = Path(destino_arquivo).resolve().parent
        os.makedirs(caminho_dir, exist_ok=True)

        # Configura o documento A4 com margens de 36pt (~12.7mm)
        margem = 36
        doc = SimpleDocTemplate(
            destino_arquivo,
            pagesize=A4,
            leftMargin=margem,
            rightMargin=margem,
            topMargin=margem,
            bottomMargin=margem + 18,
            title=f"Fechamento #{fechamento.id:04d} - TaskCalc",
            author="TaskCalc API"
        )

        largura_util = doc.width  # 595.27 - 72 = 523.27 pontos

        # Obtenção e criação da paleta de estilos
        styles = getSampleStyleSheet()

        # Estilo do Título Principal
        estilo_titulo = ParagraphStyle(
            "DocTitulo",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0F172A")  # Slate 900
        )

        # Estilo do Subtítulo / Razão
        estilo_subtitulo = ParagraphStyle(
            "DocSubtitulo",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#64748B")  # Slate 500
        )

        # Estilo para células de cabeçalho de tabela
        estilo_th = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=colors.white,
            alignment=0
        )
        estilo_th_right = ParagraphStyle(
            "TableHeaderRight",
            parent=estilo_th,
            alignment=2
        )

        # Estilos para conteúdo de células normais
        estilo_td = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#1E293B")
        )
        estilo_td_sub = ParagraphStyle(
            "TableCellSub",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor("#64748B")
        )
        estilo_td_center = ParagraphStyle(
            "TableCellCenter",
            parent=estilo_td,
            alignment=1
        )
        estilo_td_right = ParagraphStyle(
            "TableCellRight",
            parent=estilo_td,
            alignment=2
        )

        # Lista de elementos fluídos (Flowables) que compõem o PDF
        story = []

        # -------------------------------------------------------------------
        # 1. CABEÇALHO DO DOCUMENTO
        # -------------------------------------------------------------------
        header_data = [
            [
                Paragraph("<b>TASKCALC</b> &bull; GESTÃO E CONTROLE DE SERVIÇOS", estilo_subtitulo),
                Paragraph(f"<b>FECHAMENTO #{fechamento.id:04d}</b>", ParagraphStyle(
                    "NumFech",
                    parent=estilo_subtitulo,
                    fontName="Helvetica-Bold",
                    fontSize=11,
                    textColor=colors.HexColor("#2563EB"),
                    alignment=2
                ))
            ],
            [
                Paragraph("RELATÓRIO DE FECHAMENTO DE PERÍODO", estilo_titulo),
                Paragraph(f"Status: <b>{fechamento.status}</b>", ParagraphStyle(
                    "StatusFech",
                    parent=estilo_subtitulo,
                    fontName="Helvetica-Bold",
                    fontSize=9.5,
                    textColor=colors.HexColor("#059669") if fechamento.status == "FATURADO" else colors.HexColor("#D97706"),
                    alignment=2
                ))
            ]
        ]

        tabela_header = Table(header_data, colWidths=[largura_util * 0.65, largura_util * 0.35])
        tabela_header.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
        ]))
        story.append(tabela_header)

        # Linha decorativa colorida
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#2563EB"), spaceAfter=12))

        # -------------------------------------------------------------------
        # 2. QUADRO INFORMATIVO DE DADOS DO FECHAMENTO (METADADOS)
        # -------------------------------------------------------------------
        periodo_str = (
            f"De <b>{cls.formatar_data(fechamento.data_inicio)}</b> até "
            f"<b>{cls.formatar_data(fechamento.data_fim)}</b>"
        )
        emissao_str = cls.formatar_data_hora(fechamento.criado_em)
        qtd_itens_str = f"{len(fechamento.lancamentos)} serviço(s) apurado(s)"

        info_meta_data = [
            [
                Paragraph(f"<b>Período Apurado:</b> {periodo_str}", estilo_td),
                Paragraph(f"<b>Emitido em:</b> {emissao_str}", estilo_td)
            ],
            [
                Paragraph(f"<b>Volume de Atendimentos:</b> {qtd_itens_str}", estilo_td),
                Paragraph(
                    f"<b>Observações:</b> {fechamento.observacoes or 'Nenhuma observação informada.'}",
                    estilo_td
                )
            ]
        ]

        tabela_meta = Table(info_meta_data, colWidths=[largura_util * 0.55, largura_util * 0.45])
        tabela_meta.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#F1F5F9")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(tabela_meta)
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------------
        # 3. TABELA DETALHADA DOS LANÇAMENTOS DE SERVIÇOS
        # -------------------------------------------------------------------
        story.append(Paragraph("<b>DETALHAMENTO DOS SERVIÇOS EXECUTADOS</b>", ParagraphStyle(
            "SecaoItens",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#1E293B")
        )))
        story.append(Spacer(1, 6))

        # Larguras calculadas das colunas (total = 523.27 pt)
        col_widths = [
            65,                 # Data de execução
            largura_util - 275, # Descrição / Serviço (aprox 248.27 pt)
            45,                 # Qtd
            40,                 # Unidade
            60,                 # Valor Unitário
            65                  # Valor Total
        ]

        tabela_itens_data = [
            [
                Paragraph("Data Exec.", estilo_th),
                Paragraph("Serviço / Descrição", estilo_th),
                Paragraph("Qtd", estilo_th_right),
                Paragraph("Unid.", estilo_th_right),
                Paragraph("Unitário", estilo_th_right),
                Paragraph("Total", estilo_th_right)
            ]
        ]

        # Preenchimento das linhas da tabela
        lancamentos: List[LancamentoServico] = fechamento.lancamentos or []
        for lanc in lancamentos:
            # Monta o bloco do serviço com nome e observação (se houver)
            bloco_servico = [Paragraph(f"<b>{lanc.nome_servico}</b>", estilo_td)]
            if lanc.descricao:
                bloco_servico.append(Paragraph(lanc.descricao, estilo_td_sub))

            tabela_itens_data.append([
                Paragraph(cls.formatar_data(lanc.data_execucao), estilo_td),
                bloco_servico,
                Paragraph(f"{lanc.quantidade:g}", estilo_td_right),
                Paragraph(lanc.unidade_medida or "UN", estilo_td_right),
                Paragraph(cls.formatar_moeda(lanc.valor_unitario), estilo_td_right),
                Paragraph(cls.formatar_moeda(lanc.valor_total), estilo_td_right)
            ])

        tabela_itens = Table(tabela_itens_data, colWidths=col_widths, repeatRows=1)

        # Estilização da tabela de itens (Zebrado + Bordas refinadas)
        estilos_itens = [
            # Cabeçalho da tabela
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),  # Slate escuro
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#0F172A")),
            ("INNERGRID", (0, 1), (-1, -1), 0.5, colors.HexColor("#F1F5F9")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ]

        # Linhas zebradas alternadas para fácil leitura visual
        for i in range(1, len(tabela_itens_data)):
            bg = colors.HexColor("#FFFFFF") if i % 2 != 0 else colors.HexColor("#F8FAFC")
            estilos_itens.append(("BACKGROUND", (0, i), (-1, i), bg))
            estilos_itens.append(("TOPPADDING", (0, i), (-1, i), 5))
            estilos_itens.append(("BOTTOMPADDING", (0, i), (-1, i), 5))

        tabela_itens.setStyle(TableStyle(estilos_itens))
        story.append(tabela_itens)
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------------
        # 4. QUADRO RESUMO FINANCEIRO (TOTAIS CONSOLIDADOS)
        # -------------------------------------------------------------------
        resumo_financeiro_bloco = []

        # Estilo para os rótulos de valores
        estilo_lbl_totais = ParagraphStyle(
            "LblTotais",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            textColor=colors.HexColor("#475569")
        )
        estilo_val_totais = ParagraphStyle(
            "ValTotais",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=colors.HexColor("#1E293B"),
            alignment=2
        )
        estilo_val_destaque = ParagraphStyle(
            "ValDestaque",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            textColor=colors.HexColor("#059669"),  # Verde esmeralda de recebimento
            alignment=2
        )

        dados_resumo = [
            [
                Paragraph("<b>Total Bruto dos Serviços:</b>", estilo_lbl_totais),
                Paragraph(cls.formatar_moeda(fechamento.valor_bruto), estilo_val_totais)
            ],
            [
                Paragraph("Desconto Concedido (-):", estilo_lbl_totais),
                Paragraph(f"- {cls.formatar_moeda(fechamento.desconto)}", ParagraphStyle(
                    "ValDesc", parent=estilo_val_totais, textColor=colors.HexColor("#DC2626")
                ))
            ],
            [
                Paragraph("Acréscimos / Taxas (+):", estilo_lbl_totais),
                Paragraph(f"+ {cls.formatar_moeda(fechamento.acrescimo)}", ParagraphStyle(
                    "ValAcresc", parent=estilo_val_totais, textColor=colors.HexColor("#2563EB")
                ))
            ],
            [
                Paragraph("<b>VALOR LÍQUIDO A RECEBER (=):</b>", ParagraphStyle(
                    "LblFinal", parent=estilo_lbl_totais, fontName="Helvetica-Bold", fontSize=11, textColor=colors.HexColor("#0F172A")
                )),
                Paragraph(cls.formatar_moeda(fechamento.valor_liquido), estilo_val_destaque)
            ]
        ]

        # Alinha a caixa de totais à direita da página (ocupa 250pt de largura)
        largura_resumo = 260
        tabela_resumo = Table(dados_resumo, colWidths=[largura_resumo * 0.60, largura_resumo * 0.40])
        tabela_resumo.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -2), colors.HexColor("#F8FAFC")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#ECFDF5")),  # Fundo verde sutil para o líquido
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ("LINEBELOW", (0, -2), (-1, -2), 1, colors.HexColor("#059669")),  # Divisória antes do total líquido
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ]))

        # Alinhamento da tabela de resumo em layout com duas colunas (notas à esquerda, totais à direita)
        texto_seguranca = Paragraph(
            "<b>Declaração de Conformidade:</b><br/>"
            "Os valores e itens constantes neste demonstrativo refletem o snapshot histórico "
            "das ordens de serviço prestadas no período e possuem eficácia financeira imediata.",
            ParagraphStyle("AvisoFim", parent=styles["Normal"], fontSize=8, leading=10, textColor=colors.HexColor("#94A3B8"))
        )

        tabela_rodape_grid = Table(
            [[texto_seguranca, tabela_resumo]],
            colWidths=[largura_util - largura_resumo - 15, largura_resumo + 15]
        )
        tabela_rodape_grid.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))

        resumo_financeiro_bloco.append(tabela_rodape_grid)
        story.append(KeepTogether(resumo_financeiro_bloco))

        # -------------------------------------------------------------------
        # 5. CONSTRUÇÃO FINAL DO DOCUMENTO COM O NUMBEREDCANVAS
        # -------------------------------------------------------------------
        doc.build(story, canvasmaker=NumberedCanvas)

        return os.path.abspath(destino_arquivo)
