# TaskCalc - Sistema de Controle de Serviços, Lançamentos e Faturamento

Sistema corporativo de controle de serviços estruturado em arquitetura desacoplada:
- **Backend:** Python (FastAPI + SQLAlchemy + SQLite) com padrão MVC e Service Layer estrito.
- **Frontend:** React + Vite + Tailwind CSS v3.4 + Axios + Lucide Icons.
- **Regra Crítica (RD01):** Congelamento e Snapshot imutável no momento da execução dos serviços.
- **Fechamento Financeiro:** Consolidação de períodos com descontos, acréscimos e emissão de relatório PDF oficial via ReportLab.

---

## 📁 Estrutura do Repositório

```text
TaskCalc/
├── backend/
│   ├── app/
│   │   ├── core/               # Conexão com SQLite e get_db
│   │   ├── models/             # Tabelas SQLAlchemy (Catalogo, Lancamento, Fechamento)
│   │   ├── schemas/            # DTOs / Schemas Pydantic v2
│   │   ├── services/           # Regras de Negócio e Gerador de PDF (ReportLab)
│   │   ├── routers/            # Controllers / Rotas da API REST
│   │   └── main.py             # Entrypoint da aplicação FastAPI
│   ├── storage/fechamentos/    # Diretório de persistência dos PDFs gerados
│   ├── tests/                  # Testes automatizados da API e serviços
│   └── requirements.txt        # Dependências Python
│
├── frontend/
│   ├── src/
│   │   ├── api/                # Conexão base Axios com interceptors e endpoints
│   │   ├── components/         # Navbar, TabsNavigation e componentes visuais
│   │   ├── pages/              # Abas: Catálogo, Lançamentos e Fechamento
│   │   ├── App.jsx             # Componente raiz com navegação por abas
│   │   └── index.css           # Configuração base do Tailwind CSS
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
```

---

## 🚀 Como Executar o Projeto

### 1. Backend (FastAPI)

1. Abra um terminal na pasta `backend`:
   ```powershell
   cd backend
   ```

2. Ative o ambiente virtual:
   ```powershell
   # Windows (PowerShell)
   ..\.venv\Scripts\Activate.ps1
   ```

3. Instale as dependências (caso necessário):
   ```bash
   pip install -r requirements.txt
   ```

4. Inicie o servidor da API:
   ```powershell
   python -m uvicorn app.main:app --reload --port 8000
   ```
   * A API estará rodando em: `http://localhost:8000`
   * Swagger interativo: `http://localhost:8000/docs`

---

### 2. Frontend (React + Vite + Tailwind CSS)

1. Abra outro terminal na pasta `frontend`:
   ```powershell
   cd frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   * O Frontend estará acessível no navegador em: `http://localhost:5173`
