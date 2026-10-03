# ConstructEst

**A Rule-Based Structural Material Cost Estimation, Optimization and Recommender System**

A capstone project (Tarlac State University, BSIT–Web and Mobile Applications) that takes an AutoCAD DXF floor plan for a one- or two-storey Philippine residential building and turns it into an itemized material quantity take-off, a cost-optimized Bill of Materials, and a hardware-store comparison, using a rule-based computation engine implementing the paper's Tables 12–19, not machine learning.

## What it does

1. **Upload a DXF floor plan.** The engine parses it (`WALL`/`DOOR`/`WINDOW`/`COLUMN`/`STAIR`/`ROOF`/`FLOOR` layers), extracts wall lengths, floor area, and opening/roof geometry, and computes quantities for 16 structural materials (cement, sand, gravel, CHB, rebar, tie wire, roofing sheets, purlins, ridge, flashing, angle bar, gutter, plywood, lumber, steel props, scaffolding). Rates follow the paper's tables, corrected by the domain experts and by Max Fajardo's *Simplified Construction Estimate*, the reference the engineers use. A 2-storey house is uploaded as one DXF per floor. Rebar is also listed as 6 m bars per size. A post-parse toggle excludes roofing materials entirely for a floor plan with no ROOF layer drawn.
2. **Calibrate.** Cement/steel/roofing/wastage factors and design parameters (footing size, thickness and count, column/beam sizes, floor-to-floor height, slab/column/stirrup bar size and spacing, beam rebar from the schedule, and formwork/scaffolding reuse, the inputs a 2D DXF can't derive) are editable per project, with admin-managed global defaults as the fallback.
3. **Compare stores and pick brands.** Per-store pricing is optimized against a user-defined budget ceiling, with automatic (Premium/Standard/Budget tier) or manual brand selection, and a Store Locator with map distance and material-unavailability notifications.
4. **Generate a Bill of Materials.** Downloadable as a PDF for procurement.

An Admin module manages users (including approving self-registered accounts, which must also first verify their email via a 6-digit code before an admin ever sees them), the hardware-store/material-brand catalog and pricing (store price changes require an attached quotation file as proof; stores can be deactivated/reactivated without deleting them), and the global calibration/design-parameter defaults every new project falls back to. Admins can also help a user with their password (send a reset code, or set a one-time temporary password the user must replace at sign in) without ever seeing the user's own password.

## Structure

```
backend/          Node/Express API + a Python rule-based DXF engine (see backend/README.md)
frontend/         React + Vite + MUI single-page app (see frontend/README.md)
```

Each has its own README with setup instructions. Quick start:

```
# 1. Database: start MySQL, then:
mysql -u root -p < backend/db/schema.sql
mysql -u root -p < backend/db/seed.sql

# 2. Backend
cd backend && npm install && cp .env.example .env   # fill in DB password, JWT_SECRET, BREVO_API_KEY
npm run dev                                          # http://localhost:4000

# 3. Frontend (separate terminal)
cd frontend && npm install && cp .env.example .env
npm run dev                                          # http://localhost:5173
```

Seeded admin login: User ID `20260001` (or email `admin@constructest.local`), password `ChangeMe123!`. User IDs are assigned by the system (year + 4 digits). (Self-registered accounts need a real Brevo API key and verified sender in the backend's `.env` to receive their verification code, and `ORS_API_KEY` turns on road distances in Store Locator; see `backend/README.md`.)

## Stack

- **Frontend**: React 19, Vite, MUI, React Router, Leaflet (free OpenStreetMap tiles, no API key)
- **Backend**: Node.js/Express (ES modules), JWT auth, MySQL (`mysql2`)
- **Engine**: Python (`ezdxf`) for DXF parsing and the rule-based formulas, invoked from Node as a subprocess

## Documentation

- [`backend/README.md`](backend/README.md): API surface, engine contract, environment variables, known assumptions/limitations
- [`frontend/README.md`](frontend/README.md): pages, routing, admin vs. user module

## Status

Functional prototype covering the paper's full User and Administrator modules (upload/parse, calibration, cost optimization, store comparison, PDF BOM, and admin user/store/material/settings management). See `backend/README.md`'s "Known limitations" section for what's explicitly out of scope or approximated pending licensed-engineer validation.
