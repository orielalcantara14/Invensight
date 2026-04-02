# AGENTS.md

This file provides guidance to WARP (warp.dev) and other AI coding assistants when working with code in this repository.

## Project Overview
InvenSight is a Sales and Inventory Management System with a React frontend and a FastAPI backend, using PostgreSQL for data persistence.

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

## Architecture overview
### Big picture
- **Frontend**: Vite + React (`src/`)
- **Backend**: FastAPI + psycopg2 (`server/`)
- **Database**: PostgreSQL. Schema management is handled via startup events in `server/main.py`.

### Key Module Changes (April 2026)
- **POS Management Removal**: The dedicated POS Management module has been removed. POS functionality is now consolidated.
- **Unified Product Source**: Both the POS Terminal and the Product Module now pull data from the same `products` and `inventory` tables.
- **Sales Module Integration**: The POS Terminal is now launched from a button within the Sales Management module.
- **Inventory & Product Sync**: Changes in the Product Module (like price/SRP updates) are automatically synchronized with the Inventory and POS systems.

### Frontend Composition
- `src/App.tsx`: Router and global providers.
- `src/routes.tsx`: Centralized route registration.
- `src/layouts/Layout.tsx`: Main admin shell with sidebar navigation.
- `src/services/api.ts`: Typed API client. Note: `react-router-dom` is explicitly required for compatibility.

### Backend Composition
- `server/main.py`: Entry point. Contains `ensure_*` startup functions for database schema hardening and migrations.
- `server/routers/`:
  - `products.py`: Unified product catalog, categories, and POS product endpoints.
  - `inventory.py`: Stock management, SKU generation, and inventory auditing.
  - `sales.py`: Transaction processing (sales, payments, stock movements).
- `server/models.py`: Pydantic models for request/response validation. All numeric price/stock fields should be handled as `FLOAT` or `DECIMAL`.

## Important Implementation Details
- **SKU Generation**: Handled in `server/routers/inventory.py` and `products.py` using a category-based prefixing system.
- **Specific Categories**: A standardized list of 50+ automotive/hardware categories is used across Inventory and Product modules, implemented with searchable dropdowns.
- **Database Types**: Numeric fields (Quantity, Expected, Actual, Price) must be strictly typed as `INTEGER` or `DECIMAL/FLOAT` to prevent Pydantic validation errors.
- **Vite Cache**: If `npm run dev` fails with `ENOENT` on dependencies, clearing `node_modules/.vite` is the standard fix.

## Cross-file contracts
- **Product Shape**: Must stay aligned between `server/models.py`, `src/services/api.ts`, and the UI components in `src/components/modals/` (Add/Edit Product/Inventory).
- **Price Formatting**: Frontend components must use nullish coalescing (e.g., `value ?? 0`) before calling `toLocaleString()` to prevent crashes on null database values.
- **Inventory Audit**: Updating `actual` count in the Inventory module with a `reason_adjustment` will automatically synchronize the live `quantity`.
