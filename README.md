# RAGHive

> **Glass-Box Multi-Agent Explainable RAG Platform**  
> *"See exactly why the AI said what it said, before it says it."*

---

## Repository Structure

```text
raghive/
├── frontend/                           # Next.js 16 Web Application
│   ├── src/                            # Components, pages, hooks, state, API client
│   ├── public/                         # Static assets & icons
│   ├── package.json                    # Frontend dependencies & scripts
│   ├── next.config.ts                  # Next.js configuration
│   ├── tsconfig.json                   # TypeScript configuration
│   ├── .env.example                    # Frontend environment variables template
│   └── ...
├── backend/                            # FastAPI RAG Backend
│   ├── app/                            # API routes, LangGraph agents, DB models, services
│   ├── data/                           # Local SQLite storage, ChromaDB, document uploads
│   ├── requirements.txt                # Python dependencies
│   ├── .env.example                    # Backend environment variables template
│   └── README.md                       # Backend specific documentation
├── docs/                               # System architecture & agent design specs
│   ├── PROJECT.md                      # Full project documentation & API contract
│   ├── RAGHive_Planner_Agent_Build_Prompt.md
│   ├── RAGHive_Extractor_Agent_Build_Prompt.md
│   └── RAGHive_Reasoning_Agent_Build_Prompt.md
├── .git/                               # Git repository tracking
├── .gitignore                          # Monorepo ignore rules (frontend & backend)
├── AGENTS.md                           # AI pair-programming & editor config
├── CLAUDE.md                           # Claude configuration
└── README.md                           # Monorepo overview and quickstart
```

---

## Quick Start

### 1. Backend Setup (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
# Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS:
# python -m venv .venv
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env   # On Linux/macOS: cp .env.example .env

# Run FastAPI backend (port 8000)
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup (Next.js)

```bash
# Navigate to frontend directory
cd frontend

# Configure environment
copy .env.example .env.local   # On Linux/macOS: cp .env.example .env.local

# Install dependencies
pnpm install   # or npm install

# Start development server (port 3000)
pnpm dev       # or npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- [PROJECT.md](./docs/PROJECT.md): Complete architecture, shared API contract, SSE stream protocols, and HITL (Human-In-The-Loop) mechanisms.
- [Planner Agent Specification](./docs/RAGHive_Planner_Agent_Build_Prompt.md): Decomposition, entity extraction, and dual verification.
- [Extractor Agent Specification](./docs/RAGHive_Extractor_Agent_Build_Prompt.md): Dual-scoring retrieval (cosine similarity + NormEnsembleXAI).
- [Reasoning Agent Specification](./docs/RAGHive_Reasoning_Agent_Build_Prompt.md): Synthesis, citation grounding, and attention erasure verification.
