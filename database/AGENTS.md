# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Existing guidance files
- `AGENTS.md` exists and should be kept as the canonical agent guide.
- No `WARP.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/*`, or `.github/copilot-instructions.md` were found.
- `README.md` currently only contains the project title (`# InvenSight`), so operational details must be inferred from source/config files.

## Common development commands
### Frontend (run from repo root)
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Create production build: `npm run build`

### Backend API (run from `server/`)
- Create virtual environment (PowerShell): `python -m venv .venv`
- Activate virtual environment (PowerShell): `.\.venv\Scripts\Activate.ps1`
- Install dependencies: `pip install -r requirements.txt`
- Run API locally: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

### Linting and tests (current state)
- No lint script is defined in root `package.json`.
- No frontend/backend test config or test files were found in project source directories.
- Running all tests: not available yet.
- Running a single test: not available yet.

## Architecture overview
### Big picture
- The repo is a split frontend/backend app with a PostgreSQL database:
  - Frontend: Vite + React (`src/`)
  - Backend: FastAPI + psycopg2 (`server/`)
  - Database artifact: `database/invensight.dump`
- Vite is configured as a multi-entry app (`vite.config.ts`):
  - `index.html` → admin application (`src/main.tsx`)
  - `pos.html` → POS terminal runtime (`src/pos-main.tsx`)

### Frontend composition
- `src/App.tsx` mounts the router and global toast layer (`sonner`).
- `src/routes.tsx` centralizes route registration; authenticated routes are wrapped by `RequireAuth`.
- `src/components/RequireAuth.tsx` gates navigation based on local session presence.
- `src/auth/session.ts` stores session state in `localStorage` (`invensight_session`).
- `src/layouts/Layout.tsx` is the main admin shell (sidebar/topbar + `<Outlet />`).

### API integration pattern
- `src/services/api.ts` is the typed API boundary used across frontend pages/components.
- API base URL is `import.meta.env.VITE_API_URL ?? "http://localhost:8000"`.
- Profile endpoints send `X-User-Id` via `requestWithUser`; other endpoints use plain JSON requests.

### Backend composition
- `server/main.py` creates the FastAPI app, configures CORS, includes routers under `/api`, verifies DB connectivity at startup, and applies schema/seed startup routines.
- Router responsibilities:
  - `server/routers/products.py`: catalog reads, categories/terminals, POS product CRUD
  - `server/routers/sales.py`: checkout transaction write path (sales, sold_items, stockmovements, payments, auditlog)
  - `server/routers/auth.py`: login by username or employee-id format, password verification, last_login + audit logging
  - `server/routers/users.py`: users/roles CRUD, dashboard stats, root-admin reset flow
  - `server/routers/profile.py`: profile read/update, password change, per-user activity stream
- `server/database.py` owns env loading and connection creation (`DATABASE_URL` or DB_* fallbacks).
- `server/models.py` defines Pydantic request/response contracts expected by routers.

## Cross-file contracts that are easy to break
- Sale request/response contract must stay aligned across:
  - `src/components/pos/POS.tsx` checkout payload assembly
  - `src/services/api.ts` (`CreateSalePayload`, `SaleResult`)
  - `server/models.py` (`CreateSaleRequest`)
  - `server/routers/sales.py` totals and transaction inserts
- POS product shape must stay aligned across:
  - `src/components/pages/POSManagement.tsx` form + table behavior
  - `src/services/api.ts` (`PosProduct`, `PosProductPayload`)
  - `server/models.py` (`CreatePosProductRequest`, `UpdatePosProductRequest`)
  - `server/routers/products.py` SQL for create/update/read
- Session/auth assumptions are split across:
  - `src/auth/session.ts` (client-side persistence)
  - `src/components/RequireAuth.tsx` (route gating)
  - `server/routers/auth.py` (credential validation + login side effects)
  - `server/routers/profile.py` (header-based user identity via `X-User-Id`)

