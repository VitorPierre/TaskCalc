"""
=============================================================================
TESTES DE SEGURANÇA: RBAC & Proteção de Rotas do Catálogo (Dependency Injection)
=============================================================================
Objetivos:
1. Testar a dependência obter_usuario_atual (JWT Bearer e headers).
2. Testar a dependência exigir_gestor (RBAC):
   - Usuário GESTOR tem acesso liberado.
   - Usuário PRESTADOR recebe HTTP 403 Forbidden.
   - Usuário sem credenciais recebe HTTP 401 Unauthorized.
3. Testar endpoints HTTP de catálogo:
   - POST /api/v1/servicos/ (Cadastrar)
   - PUT  /api/v1/servicos/{id} (Editar)
   - PATCH /api/v1/servicos/{id}/toggle-status (Status)
   - GET  /api/v1/servicos/ (Listagem livre para consulta)
=============================================================================
"""

import sys
from pathlib import Path
from datetime import datetime

# Garante path correto
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from starlette.testclient import TestClient
from app.main import app as fastapi_app
from app.core.database import SessionLocal, Base, engine
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate
from app.services.usuario_service import UsuarioService
from app.core.security import criar_token_acesso


def testar_seguranca_catalogo():
    print("==================================================")
    print("INICIANDO TESTES DE SEGURANÇA E DEPENDÊNCIAS RBAC")
    print("==================================================")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    client = TestClient(fastapi_app)

    try:
        service = UsuarioService(db)
        timestamp = int(datetime.now().timestamp())

        # 1. Cria um usuário GESTOR e um usuário PRESTADOR para o teste
        email_gestor = f"gestor_rbac_{timestamp}@taskcalc.com"
        email_prestador = f"prestador_rbac_{timestamp}@taskcalc.com"

        gestor = service.criar_usuario(
            UsuarioCreate(
                nome="Amanda Gestora",
                email=email_gestor,
                senha="senhaGestor123",
                perfil="GESTOR"
            )
        )
        print(f"[OK] Usuário GESTOR cadastrado: {gestor.email}")

        prestador = service.criar_usuario(
            UsuarioCreate(
                nome="Bruno Prestador",
                email=email_prestador,
                senha="senhaPrestador123",
                perfil="PRESTADOR"
            )
        )
        print(f"[OK] Usuário PRESTADOR cadastrado: {prestador.email}")

        # 2. Gera os tokens JWT de teste
        token_gestor = criar_token_acesso({"sub": gestor.email, "id": gestor.id, "perfil": gestor.perfil})
        token_prestador = criar_token_acesso({"sub": prestador.email, "id": prestador.id, "perfil": prestador.perfil})

        headers_gestor = {"Authorization": f"Bearer {token_gestor}"}
        headers_prestador = {"Authorization": f"Bearer {token_prestador}"}

        # -------------------------------------------------------------------
        # Teste A: GET /api/v1/servicos/ deve ser público para consulta
        # -------------------------------------------------------------------
        res_get = client.get("/api/v1/servicos/")
        assert res_get.status_code == 200, f"Falha na listagem: {res_get.text}"
        print("[OK] Teste A: GET /api/v1/servicos/ permite consulta livre (HTTP 200)")

        # -------------------------------------------------------------------
        # Teste B: POST /api/v1/servicos/ SEM token -> Deve retornar 401 Unauthorized
        # -------------------------------------------------------------------
        payload_servico = {
            "nome": f"Serviço Teste {timestamp}",
            "descricao_padrao": "Descrição de teste para RBAC",
            "unidade_medida": "UN",
            "valor_base": 150.0
        }
        res_post_anonimo = client.post("/api/v1/servicos/", json=payload_servico)
        assert res_post_anonimo.status_code == 401, f"Deveria ser 401: {res_post_anonimo.text}"
        assert "Autenticação obrigatória" in res_post_anonimo.json()["detail"]
        print("[OK] Teste B: POST /api/v1/servicos/ sem autenticação bloqueado com HTTP 401")

        # -------------------------------------------------------------------
        # Teste C: POST /api/v1/servicos/ com token de PRESTADOR -> Deve retornar 403 Forbidden
        # -------------------------------------------------------------------
        res_post_prestador = client.post("/api/v1/servicos/", json=payload_servico, headers=headers_prestador)
        assert res_post_prestador.status_code == 403, f"Deveria ser 403: {res_post_prestador.text}"
        assert "Acesso negado" in res_post_prestador.json()["detail"]
        assert "perfil ('GESTOR')" in res_post_prestador.json()["detail"]
        print("[OK] Teste C: POST /api/v1/servicos/ por PRESTADOR bloqueado com HTTP 403")

        # -------------------------------------------------------------------
        # Teste D: POST /api/v1/servicos/ com token de GESTOR -> Deve retornar 201 Created
        # -------------------------------------------------------------------
        res_post_gestor = client.post("/api/v1/servicos/", json=payload_servico, headers=headers_gestor)
        assert res_post_gestor.status_code == 201, f"Deveria ser 201: {res_post_gestor.text}"
        servico_criado = res_post_gestor.json()
        servico_id = servico_criado["id"]
        assert servico_id is not None
        assert servico_criado["nome"] == payload_servico["nome"]
        print(f"[OK] Teste D: POST /api/v1/servicos/ por GESTOR permitido com sucesso (HTTP 201, ID #{servico_id})")

        # -------------------------------------------------------------------
        # Teste E: PUT /api/v1/servicos/{id} com PRESTADOR -> 403 Forbidden
        # -------------------------------------------------------------------
        payload_update = {
            "nome": f"Serviço Atualizado {timestamp}",
            "valor_base": 200.0
        }
        res_put_prestador = client.put(f"/api/v1/servicos/{servico_id}", json=payload_update, headers=headers_prestador)
        assert res_put_prestador.status_code == 403, f"Deveria ser 403: {res_put_prestador.text}"
        print("[OK] Teste E: PUT /api/v1/servicos/{id} por PRESTADOR bloqueado com HTTP 403")

        # -------------------------------------------------------------------
        # Teste F: PUT /api/v1/servicos/{id} com GESTOR -> 200 OK
        # -------------------------------------------------------------------
        res_put_gestor = client.put(f"/api/v1/servicos/{servico_id}", json=payload_update, headers=headers_gestor)
        assert res_put_gestor.status_code == 200, f"Deveria ser 200: {res_put_gestor.text}"
        assert res_put_gestor.json()["valor_base"] == 200.0
        print("[OK] Teste F: PUT /api/v1/servicos/{id} por GESTOR permitido com sucesso (HTTP 200)")

        # -------------------------------------------------------------------
        # Teste G: PATCH /api/v1/servicos/{id}/toggle-status com PRESTADOR -> 403 Forbidden
        # -------------------------------------------------------------------
        res_toggle_prestador = client.patch(f"/api/v1/servicos/{servico_id}/toggle-status", headers=headers_prestador)
        assert res_toggle_prestador.status_code == 403
        print("[OK] Teste G: PATCH toggle-status por PRESTADOR bloqueado com HTTP 403")

        # -------------------------------------------------------------------
        # Teste H: PATCH /api/v1/servicos/{id}/toggle-status com GESTOR -> 200 OK
        # -------------------------------------------------------------------
        res_toggle_gestor = client.patch(f"/api/v1/servicos/{servico_id}/toggle-status", headers=headers_gestor)
        assert res_toggle_gestor.status_code == 200
        assert res_toggle_gestor.json()["ativo"] is False
        print("[OK] Teste H: PATCH toggle-status por GESTOR executado com sucesso (HTTP 200, status inativado)")

        # -------------------------------------------------------------------
        # Teste I: Fallback com Header 'X-User-Email' para GESTOR
        # -------------------------------------------------------------------
        res_header_gestor = client.patch(
            f"/api/v1/servicos/{servico_id}/toggle-status",
            headers={"X-User-Email": gestor.email}
        )
        assert res_header_gestor.status_code == 200
        assert res_header_gestor.json()["ativo"] is True
        print("[OK] Teste I: Header X-User-Email com conta GESTOR autentica e autoriza corretamente (HTTP 200)")

        # -------------------------------------------------------------------
        # Teste J: Fallback com Header 'X-User-Email' para PRESTADOR -> 403 Forbidden
        # -------------------------------------------------------------------
        res_header_prestador = client.patch(
            f"/api/v1/servicos/{servico_id}/toggle-status",
            headers={"X-User-Email": prestador.email}
        )
        assert res_header_prestador.status_code == 403
        print("[OK] Teste J: Header X-User-Email com conta PRESTADOR é barrado com HTTP 403")

        print("\n==================================================")
        print("TODOS OS TESTES DE SEGURANÇA E RBAC FORAM APROVADOS!")
        print("==================================================")

    finally:
        db.close()


if __name__ == "__main__":
    testar_seguranca_catalogo()
