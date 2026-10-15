# TaskCalc - Backend (FastAPI + SQLAlchemy + SQLite)

Sistema de Controle de Serviços estruturado no padrão **MVC (Model-View-Controller) com Service Layer**.

---

## 📁 Estrutura de Diretórios e Papel dos Componentes

```text
backend/
├── app/
│   ├── core/
│   │   ├── database.py         # Conexão com SQLite via SQLAlchemy e injeção de dependência (get_db)
│   ├── models/                 # MODEL (M): Estrutura das tabelas do banco de dados (SQLAlchemy)
│   │   └── servico.py
│   ├── schemas/                # VIEW / DTO (V): Validação e formatação de JSON entrada/saída (Pydantic)
│   │   └── servico.py
│   ├── services/               # SERVICE LAYER: Regras de negócio, cálculos e lógica da aplicação
│   │   └── servico_service.py
│   ├── controllers/            # CONTROLLER (C): Endpoints e rotas HTTP (FastAPI APIRouter)
│   │   └── servico_controller.py
│   └── main.py                 # Arquivo principal (criação de tabelas, CORS, registro de rotas)
├── requirements.txt            # Dependências Python do backend
└── taskcalc.db                 # Arquivo do banco SQLite (gerado automaticamente no startup)
```

---

## 🚀 Como Executar o Backend

### 1. Criar e ativar o ambiente virtual (venv)
No terminal, dentro da pasta `backend`:

**No Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Instalar as dependências
```bash
pip install -r requirements.txt
```

### 3. Iniciar o servidor de desenvolvimento
Dentro da pasta `backend`:
```powershell
python -m uvicorn app.main:app --reload
```

A API estará rodando em: `http://localhost:8000`

---

## 📚 Documentação Interativa (Swagger / OpenAPI)

O FastAPI gera documentação interativa automática onde você pode testar todos os endpoints:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
