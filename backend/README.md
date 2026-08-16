# ConstructEst backend

Node/Express API + a Python rule-based DXF engine, backing the `frontend/` React app.

## Stack

- **API**: Node.js (ES modules) + Express, JWT auth (bcryptjs), MySQL via `mysql2/promise`.
- **Engine**: Python (`ezdxf`) implementing the capstone paper's Table 12–19 formulas against the TCC DXF layer convention (WALL/DOOR/WINDOW/COLUMN/STAIR/ROOF/FLOOR). Invoked as a subprocess per DXF upload (`src/services/engine.service.js` → `engine/engine.py`), one JSON object in over stdin, one JSON object back over stdout.

## First-time setup

1. **Database.** Start MySQL (e.g. via XAMPP), then run the two SQL files in order against it — either through phpMyAdmin's Import tab, or the CLI:
   ```
   mysql -u root -p < db/schema.sql
   mysql -u root -p < db/seed.sql
   ```
   `schema.sql` creates the `constructest` database and all tables. `seed.sql` populates it with an admin account, the 16-material brand catalog (3 brands each for the 14 brand-selectable materials, flat pricing for the 2 commodities — sand and gravel), 4 Tarlac City stores with per-store pricing, and the global default calibration constants.

   Seeded admin login: **user ID `admin`, password `ChangeMe123!`** — change the password via `PUT /api/users/me/password` once logged in.

   `schema.sql`/`seed.sql` alone are enough for a fresh install. If you're upgrading a database that was already seeded before a schema change, run the relevant files in `db/migrations/` in order instead (`npm run migrate -- db/migrations/00N_*.sql`) — each one documents what it does and why at the top of the file.

2. **Node dependencies.**
   ```
   npm install
   ```

3. **Python dependencies.** Needs a Python 3 interpreter with `ezdxf` installed:
   ```
   pip install -r engine/requirements.txt
   ```

4. **Environment.** Copy `.env.example` to `.env` and fill in your DB password (XAMPP default is empty) and a real `JWT_SECRET` (a placeholder is not safe to ship). `PYTHON_BIN` should point at whichever `python`/`python3` command has `ezdxf` installed.

## Running

```
npm run dev     # node --watch src/server.js
npm start        # node src/server.js
```

Listens on `http://localhost:4000` by default (`PORT` in `.env`). Health check: `GET /api/health`.

The frontend expects this at `VITE_API_URL` (see `frontend/.env.example`), default `http://localhost:4000/api`.

## Project layout

```
db/            schema.sql, seed.sql
engine/        Python DXF parsing + rule-based computation (dxf_reader.py, formulas.py, engine.py)
src/
  config/      MySQL pool + query() helper
  controllers/ one per resource (auth, projects, admin, stores, ...)
  middleware/  auth (JWT), upload (multer, .dxf only), error handler
  routes/      Express routers, mounted in app.js
  services/    engine bridge, cost-optimization logic, constants, activity log
  scripts/     hashPassword.js — `npm run hash-password -- "somePassword"`
uploads/       uploaded DXF files (gitignored)
```

## API surface

All routes except `/api/health`, `/api/auth/register`, `/api/auth/login` require `Authorization: Bearer <token>`. `/api/admin/*` additionally requires the `admin` access role.

- **Auth**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- **Users**: `PUT /users/me`, `PUT /users/me/password`
- **Projects**: `GET/POST /projects`, `GET/DELETE /projects/:id`, `POST /projects/:id/recompute` (re-runs the engine against the already-uploaded DXF with current constants/overrides)
- **Estimation**: `GET/PUT/DELETE /projects/:id/constants` (project-level calibration override), `GET/PUT /projects/:id/design-overrides` (project-level structural dimension overrides — column/beam/footing size, floor-to-floor height, etc.)
- **Store/brand optimization**: `GET /projects/:id/stores` (Table 20 cost optimization), `GET /projects/:id/brand-catalog?storeId=`, `POST /projects/:id/brand-selection`, `GET /projects/:id/bom?storeId=`
- **Stores**: `GET /stores`
- **Notifications**: `GET /notifications`, `PATCH /notifications/:id/read`
- **Dashboard**: `GET /dashboard/summary`
- **Admin**: `/admin/users`, `/admin/materials`, `/admin/stores` (+ `/admin/stores/:id/catalog` for a store's full priced/unpriced brand list, `/admin/stores/:storeId/materials/:materialBrandId` for per-store pricing), `/admin/estimation-constants` and `/admin/design-overrides` (global defaults every new project falls back to)

`POST /projects` is `multipart/form-data`: `projectName`, `location`, `budgetCeiling`, `storeys`, `includeRoofing`, `dxfFile`. It runs the whole DXF-upload → engine-parse → store pipeline synchronously and returns `{ project, estimation, parseError }` in one response.

## Known limitations / simplifications

Documented in detail in code comments at the relevant spot; the significant ones:

- **Engine assumptions not in the paper's tables.** A few formulas needed a documented default where the source paper's Table 12–19 excerpt didn't specify one (footing plan dimensions, main rebar diameter, beam run length approximated from wall run, angle bar quantity). Every one is flagged with a comment in `engine/formulas.py` — none of this has had the licensed-engineer validation the paper itself calls for, and should get it before being trusted for a real estimate.
- **Single DXF upload per project**, even for 2-storey buildings — the paper describes uploading a separate ground-floor and second-floor DXF; this implementation instead scales the single uploaded footprint by storeys. Two-file upload would need a small frontend + API change if the ground/second floors differ significantly.
- **No live distance/geolocation.** The frontend computes store distances via straight-line (haversine) distance from a fixed Tarlac City reference point, not the user's real location — wiring in the Google Maps Distance Matrix API would need a `VITE_GOOGLE_MAPS_API_KEY` and a small frontend change.
