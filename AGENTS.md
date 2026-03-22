# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project shape
- Monorepo-style split:
  - Frontend: Vite + React in `src/`
  - Backend API: FastAPI + psycopg2 in `server/`
  - DB artifact: PostgreSQL dump at `database/invensight.dump`
- Frontend is multi-page:
  - `index.html` → `src/main.tsx` (admin app)
  - `pos.html` → `src/pos-main.tsx` (POS terminal)
  - Defined in `vite.config.ts` via `build.rollupOptions.input`.

## Commands used in this repo
### Frontend (run from repository root)
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Production build: `npm run build`

### Backend (run from `server/`)
- Create venv (PowerShell): `python -m venv .venv`
- Activate venv (PowerShell): `.\.venv\Scripts\Activate.ps1`
- Install backend dependencies: `pip install -r requirements.txt`
- Run API: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

### Testing and linting status (current)
- There is no configured frontend lint command in `package.json`.
- There are no test files/configurations in `src/` or `server/`.
- As of now, there is no repository command for:
  - running all tests
  - running a single test

## Runtime integration contracts
- Frontend API base URL comes from `VITE_API_URL`, falling back to `http://localhost:8000` (`src/services/api.ts`).
- CORS is set in `server/main.py` for localhost origins (including Vite defaults).
- Local dev expectation: frontend on Vite default port (`5173`), backend on `8000`.

## High-level architecture
### Frontend app surfaces
- Main app bootstraps in `src/main.tsx` and renders `src/App.tsx`.
- `src/App.tsx` mounts a `RouterProvider`; route tree is centralized in `src/routes.tsx`.
- `src/layouts/Layout.tsx` is the shell that owns sidebar/nav and renders route content via `<Outlet />`.

### POS architecture
- POS runs as a separate page/runtime (`/pos.html`) mounted by `src/pos-main.tsx`.
- `src/components/pos/POS.tsx` handles POS catalog polling, cart state, checkout, and receipt rendering.
- `src/components/pages/POSManagement.tsx` is the admin surface for POS catalog CRUD and archive/unarchive.
- `src/services/api.ts` is the typed frontend boundary for all live API calls used by POS and POS management.

### Backend architecture
- `server/main.py` wires app setup and mounts routers under `/api`.
- `server/routers/products.py` handles product/category/terminal reads plus POS product CRUD.
- `server/routers/sales.py` handles sale creation, including totals validation and payment checks.
- `server/models.py` defines request contracts used by the routers.
- `server/database.py` centralizes PostgreSQL connection setup via env vars.

### Critical cross-file coupling
- Sale payload changes must stay synchronized across:
  - `src/services/api.ts` (`CreateSalePayload`)
  - `src/components/pos/POS.tsx` (payload creation at checkout)
  - `server/models.py` (`CreateSaleRequest`)
  - `server/routers/sales.py` (SQL and transaction logic)
- POS product fields must stay synchronized across:
  - `src/services/api.ts` (`PosProduct` and `PosProductPayload`)
  - `src/components/pages/POSManagement.tsx` (form + table)
  - `server/models.py` (`CreatePosProductRequest`, `UpdatePosProductRequest`)
  - `server/routers/products.py` (CRUD SQL statements)

## Current maturity notes
- Most non-POS pages in `src/components/pages/` are UI-first and not deeply integrated with backend APIs yet.
- Shared UI/domain types for those pages live in `src/types/index.ts`.

