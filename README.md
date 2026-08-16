# ConstructEst

**A Rule-Based Structural Material Cost Estimation, Optimization and Recommender System**

A capstone project (Tarlac State University, BSIT–Web and Mobile Applications) that takes an AutoCAD DXF floor plan for a one- or two-storey Philippine residential building and turns it into an itemized material quantity take-off, a cost-optimized Bill of Materials, and a hardware-store comparison — using a rule-based computation engine implementing the paper's Tables 12–19, not machine learning.

## What it does

1. **Upload a DXF floor plan.** The engine parses it (`WALL`/`DOOR`/`WINDOW`/`COLUMN`/`STAIR`/`ROOF`/`FLOOR` layers), extracts wall lengths, floor area, and opening/roof geometry, and computes quantities for 16 structural materials (cement, sand, gravel, CHB, rebar, tie wire, roofing sheets, purlins, ridge, flashing, angle bar, gutter, plywood, lumber, steel props, scaffolding).
2. **Calibrate.** Cement/steel/roofing/wastage factors and structural design parameters (column/beam/footing dimensions, floor-to-floor height, etc. — the inputs a 2D DXF can't derive) are editable per project, with admin-managed global defaults as the fallback.
3. **Compare stores and pick brands.** Per-store pricing is optimized against a user-defined budget ceiling, with automatic (Premium/Standard/Budget tier) or manual brand selection, and a Store Locator with Google Maps distance and material-unavailability notifications.
4. **Generate a Bill of Materials.** Downloadable as a PDF for procurement.

An Admin module manages users, the hardware-store/material-brand catalog and pricing, and the global calibration/design-parameter defaults every new project falls back to.

## Structure

```
backend/          Node/Express API + a Python rule-based DXF engine — see backend/README.md
frontend/         React + Vite + MUI single-page app — see frontend/README.md
```

Each has its own README with setup instructions. Quick start:

```
# 1. Database — start MySQL, then:
mysql -u root -p < backend/db/schema.sql
mysql -u root -p < backend/db/seed.sql

# 2. Backend
cd backend && npm install && cp .env.example .env   # fill in DB password + JWT_SECRET
npm run dev                                          # http://localhost:4000

# 3. Frontend (separate terminal)
cd frontend && npm install && cp .env.example .env   # optional: Google Maps API key
npm run dev                                          # http://localhost:5173
```

Seeded admin login: user ID `admin`, password `ChangeMe123!`.

## Stack

- **Frontend**: React 19, Vite, MUI, React Router
- **Backend**: Node.js/Express (ES modules), JWT auth, MySQL (`mysql2`)
- **Engine**: Python (`ezdxf`) for DXF parsing and the rule-based formulas, invoked from Node as a subprocess

## Documentation

- [`backend/README.md`](backend/README.md) — API surface, engine contract, environment variables, known assumptions/limitations
- [`frontend/README.md`](frontend/README.md) — pages, routing, admin vs. user module

## Status

Functional prototype covering the paper's full User and Administrator modules (upload/parse, calibration, cost optimization, store comparison, PDF BOM, and admin user/store/material/settings management). See `backend/README.md`'s "Known limitations" section for what's explicitly out of scope or approximated pending licensed-engineer validation.
