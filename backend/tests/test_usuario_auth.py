"""
Testes automatizados da camada de Usuários e Autenticação (Usuario Model, Security e Service).
Executar com: python tests/test_usuario_auth.py
"""

import sys
from pathlib import Path
from datetime import datetime

# Ajusta o sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal, engine, Base
import app.models
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate
from app.services.usuario_service import UsuarioService
from app.core.security import verificar_senha
from fastapi import HTTPException


def testar_usuarios_e_autenticacao():
    print("==================================================")
    print("INICIANDO TESTES DO MODEL USUARIO E AUTENTICACAO")
    print("==================================================")

    # 1. Garante que as tabelas sejam criadas no SQLite
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        service = UsuarioService(db)
        timestamp = int(datetime.now().timestamp())

        # 2. Cadastro de PRESTADOR
        email_prestador = f"prestador_{timestamp}@taskcalc.com"
        usuario_prestador = service.criar_usuario(
            UsuarioCreate(
                nome="João Prestador da Silva",
                email=email_prestador,
                senha="senhaSegura123",
                perfil="PRESTADOR"
            )
        )
        assert usuario_prestador.id is not None
        assert usuario_prestador.nome == "João Prestador da Silva"
        assert usuario_prestador.email == email_prestador
        assert usuario_prestador.perfil == "PRESTADOR"
        assert usuario_prestador.ativo is True
        # Verifica que a senha está hasheada e não em texto claro
        assert usuario_prestador.senha_hash != "senhaSegura123"
        assert verificar_senha("senhaSegura123", usuario_prestador.senha_hash) is True
        print(f"[OK] Usuário PRESTADOR criado com sucesso: ID #{usuario_prestador.id} ({usuario_prestador.email})")

        # 3. Cadastro de GESTOR
        email_gestor = f"gestor_{timestamp}@taskcalc.com"
        usuario_gestor = service.criar_usuario(
            UsuarioCreate(
                nome="Maria Gestora Financeira",
                email=email_gestor,
                senha="gestorForte2026",
                perfil="GESTOR"
            )
        )
        assert usuario_gestor.id is not None
        assert usuario_gestor.perfil == "GESTOR"
        assert verificar_senha("gestorForte2026", usuario_gestor.senha_hash) is True
        print(f"[OK] Usuário GESTOR criado com sucesso: ID #{usuario_gestor.id} ({usuario_gestor.email})")

        # 4. Bloqueio de e-mail duplicado
        try:
            service.criar_usuario(
                UsuarioCreate(
                    nome="Outro João",
                    email=email_prestador,
                    senha="outraSenha123",
                    perfil="PRESTADOR"
                )
            )
            assert False, "Deveria ter bloqueado e-mail duplicado!"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"[OK] Bloqueio de e-mail duplicado validado: {e.detail}")

        # 5. Autenticação bem-sucedida (Login)
        auth_ok = service.autenticar_usuario(email=email_prestador, senha="senhaSegura123")
        assert auth_ok.id == usuario_prestador.id
        print(f"[OK] Login com sucesso para {auth_ok.email} (Perfil: {auth_ok.perfil})")

        # 6. Falha na autenticação (Senha incorreta)
        try:
            service.autenticar_usuario(email=email_prestador, senha="senhaErrada")
            assert False, "Deveria ter rejeitado senha incorreta!"
        except HTTPException as e:
            assert e.status_code == 401
            print(f"[OK] Rejeição de senha inválida validada (401): {e.detail}")

        # 7. Falha na autenticação (E-mail inexistente)
        try:
            service.autenticar_usuario(email="inexistente@taskcalc.com", senha="qualquerSenha")
            assert False, "Deveria ter rejeitado e-mail inexistente!"
        except HTTPException as e:
            assert e.status_code == 401
            print(f"[OK] Rejeição de usuário inexistente validada (401): {e.detail}")

        # 8. Listar usuários
        lista = service.listar_usuarios()
        assert len(lista) >= 2
        print(f"[OK] Listagem de usuários retornou {len(lista)} contas cadastradas.")

        print("==================================================")
        print("TODOS OS TESTES DE USUÁRIO E AUTH CONCLUÍDOS COM 100% DE SUCESSO!")
        print("==================================================")

    finally:
        db.close()


if __name__ == "__main__":
    testar_usuarios_e_autenticacao()
