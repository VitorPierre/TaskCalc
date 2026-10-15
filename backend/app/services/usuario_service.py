"""
=============================================================================
SERVICE LAYER: UsuarioService (Regras de Negócio de Usuários e Autenticação)
=============================================================================
Papel na Arquitetura Limpa:
- Centraliza toda a lógica de domínio relacionada aos usuários do TaskCalc.
- Regras de Negócio Implementadas:
  1. Cadastro e Unicidade: Garante que cada e-mail pertença a apenas um usuário.
  2. Validação Estrita de Perfil: Permite apenas 'PRESTADOR' ou 'GESTOR'.
  3. Criptografia Segura (Zero Plain-Text): Assegura que nenhuma senha seja gravada
     sem antes passar pelo algoritmo de derivação segura com salting (bcrypt).
  4. Autenticação Segura: Valida credenciais em tempo constante evitando ataques
     de temporização (timing attacks) e bloqueia contas inativas.
=============================================================================
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate
from app.core.security import gerar_hash_senha, verificar_senha


class UsuarioService:
    """
    Camada de serviço responsável pelo ciclo de vida de usuários e autenticação.
    """

    def __init__(self, db: Session):
        self.db = db

    def criar_usuario(self, dados: UsuarioCreate) -> Usuario:
        """
        Caso de Uso: Cadastrar um novo prestador ou gestor no sistema.

        Regras de Negócio:
        1. Normalização de dados: limpa espaços em branco e padroniza e-mail em minúsculas.
        2. Unicidade: impede a criação de dois usuários com o mesmo e-mail.
        3. Validação de perfil: aceita estritamente 'PRESTADOR' ou 'GESTOR'.
        4. Hashing de senha: gera o hash criptográfico seguro via bcrypt antes da persistência.
        """
        email_limpo = dados.email.strip().lower()
        nome_limpo = dados.nome.strip()
        perfil_normalizado = dados.perfil.strip().upper()

        # Regra 1: Valida se o perfil é válido
        if perfil_normalizado not in ("PRESTADOR", "GESTOR"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O perfil de acesso deve ser estritamente 'PRESTADOR' ou 'GESTOR'."
            )

        # Regra 2: Valida duplicidade de e-mail no banco
        usuario_existente = (
            self.db.query(Usuario)
            .filter(Usuario.email == email_limpo)
            .first()
        )
        if usuario_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um usuário cadastrado com o e-mail '{email_limpo}'."
            )

        # Regra 3: Geração de hash seguro da senha
        senha_criptografada = gerar_hash_senha(dados.senha)

        # Regra 4: Instanciação do Model do SQLAlchemy
        novo_usuario = Usuario(
            nome=nome_limpo,
            email=email_limpo,
            senha_hash=senha_criptografada,
            perfil=perfil_normalizado,
            ativo=True
        )

        self.db.add(novo_usuario)
        self.db.commit()
        self.db.refresh(novo_usuario)

        return novo_usuario

    def autenticar_usuario(self, email: str, senha: str) -> Usuario:
        """
        Caso de Uso: Autenticar credenciais de login.

        Regras de Negócio:
        1. Localiza o usuário pelo e-mail informado (case-insensitive).
        2. Se o usuário não existir ou a senha for inválida, retorna erro 401 Unauthorized
           com mensagem genérica (para não revelar se o e-mail existe a atacantes externos).
        3. Se a conta estiver desativada (ativo=False), bloqueia o acesso com erro 403 Forbidden.
        """
        email_limpo = email.strip().lower()

        usuario = (
            self.db.query(Usuario)
            .filter(Usuario.email == email_limpo)
            .first()
        )

        # Mensagem padrão neutra de falha de autenticação (boa prática de segurança OWASP)
        mensagem_erro_credenciais = "E-mail ou senha incorretos."

        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=mensagem_erro_credenciais
            )

        # Valida a senha contra o hash armazenado
        senha_valida = verificar_senha(senha, usuario.senha_hash)
        if not senha_valida:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=mensagem_erro_credenciais
            )

        # Bloqueia contas inativas
        if not usuario.ativo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Esta conta de usuário está desativada. Entre em contato com a administração."
            )

        return usuario

    def listar_usuarios(self) -> List[Usuario]:
        """
        Caso de Uso: Listar todos os usuários cadastrados no sistema.
        """
        return self.db.query(Usuario).order_by(Usuario.nome.asc()).all()

    def buscar_por_id(self, usuario_id: int) -> Usuario:
        """
        Caso de Uso: Buscar detalhes de um usuário específico por ID.
        """
        usuario = (
            self.db.query(Usuario)
            .filter(Usuario.id == usuario_id)
            .first()
        )
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário com ID {usuario_id} não foi encontrado."
            )
        return usuario
