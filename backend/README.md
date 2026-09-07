# ConstructEst backend

Node/Express API + a Python rule-based DXF engine, backing the `frontend/` React app.

## Stack

- **API**: Node.js (ES modules) + Express, JWT auth (bcryptjs), MySQL via `mysql2/promise`.
- **Engine**: Python (`ezdxf`) implementing the capstone paper's Table 12–19 formulas against the TCC DXF layer convention (WALL/DOOR/WINDOW/COLUMN/STAIR/ROOF/FLOOR). Invoked as a subprocess per DXF upload (`src/services/engine.service.js` → `engine/engine.py`), one JSON object in over stdin, one JSON object back over stdout.

## First-time setup

1. **Database.** Start MySQL (e.g. via XAMPP), then run the two SQL files in order against it, either through phpMyAdmin's Import tab or the CLI:
   ```
   mysql -u root -p < db/schema.sql
   mysql -u root -p < db/seed.sql
   ```
   `schema.sql` creates the `constructest` database and all tables. `seed.sql` populates it with an admin account, the 16-material brand catalog (3 brands each for the 14 brand-selectable materials, flat pricing for the 2 commodities (sand and gravel), 4 Tarlac City stores with per-store pricing, and the global default calibration constants.

   Seeded admin login: **Employee ID `admin`, password `ChangeMe123!`**; change the password via `PUT /api/users/me/password` once logged in.

   `schema.sql`/`seed.sql` alone are enough for a fresh install. If you're upgrading a database that was already seeded before a schema change, run the relevant files in `db/migrations/` in order instead (`npm run migrate -- db/migrations/00N_*.sql`); each one documents what it does and why at the top of the file.

2. **Node dependencies.**
   ```
   npm install
   ```

3. **Python dependencies.** Needs a Python 3 interpreter with `ezdxf` installed:
   ```
   pip install -r engine/requirements.txt
   ```

4. **Environment.** Copy `.env.example` to `.env` and fill in your DB password (XAMPP default is empty) and a real `JWT_SECRET` (a placeholder is not safe to ship). `PYTHON_BIN` should point at whichever `python`/`python3` command has `ezdxf` installed. `GMAIL_USER`/`GMAIL_APP_PASSWORD` are needed for self-registration's email-verification codes to actually send (see "Registration & verification" below); any personal Gmail account works, once it has 2-Step Verification on and a 16-character [App Password](https://myaccount.google.com/apppasswords) generated for it (not the account's real password). Without real values here, registration correctly fails fast with an explanatory error rather than silently creating an unverifiable account.

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
  scripts/     hashPassword.js (`npm run hash-password -- "somePassword"`)
uploads/       uploaded DXF files (gitignored)
```

## API surface

All routes except `/api/health` and the pre-session auth endpoints (`register`, `check-availability`, `verify-email`, `resend-verification-code`, `login`) require `Authorization: Bearer <token>`. `/api/admin/*` additionally requires the `admin` access role.

- **Auth**: `POST /auth/register`, `GET /auth/check-availability?field=email|employeeId&value=` (live duplicate check as a signup form is filled in), `POST /auth/verify-email`, `POST /auth/resend-verification-code`, `POST /auth/login`, `GET /auth/me` (requires auth, unlike the rest of this list)
- **Users**: `PUT /users/me`, `PUT /users/me/password`
- **Projects**: `GET/POST /projects`, `GET/DELETE /projects/:id`, `POST /projects/:id/recompute` (re-runs the engine against the already-uploaded DXF with current constants/overrides)
- **Estimation**: `GET/PUT/DELETE /projects/:id/constants` (project-level calibration override), `GET/PUT /projects/:id/design-overrides` (project-level structural dimension overrides: column/beam/footing size, floor-to-floor height, etc.)
- **Store/brand optimization**: `GET /projects/:id/stores` (Table 20 cost optimization; excludes deactivated stores), `GET /projects/:id/brand-catalog?storeId=`, `POST /projects/:id/brand-selection`, `GET /projects/:id/bom?storeId=`
- **Stores**: `GET /stores`
- **Notifications**: `GET /notifications`, `PATCH /notifications/:id/read`
- **Dashboard**: `GET /dashboard/summary`
- **Admin**: `/admin/users` (+ `/admin/users/:id/status` deactivate/reactivate, `/admin/users/:id/verify` approve a pending self-registered account), `/admin/materials`, `/admin/stores` (+ `/admin/stores/:id/status` deactivate/reactivate without deleting, `/admin/stores/:id/catalog` for a store's full priced/unpriced brand list, `/admin/stores/:storeId/materials/:materialBrandId` for per-store pricing (a real price change requires a `quotationFile`, PDF/Word/Excel, as documentary proof, uploaded multipart alongside `price`/`inStock`; `/admin/quotations/:storedName` downloads one back)), `/admin/estimation-constants` and `/admin/design-overrides` (global defaults every new project falls back to)

`POST /projects` is `multipart/form-data`: `projectName`, `location`, `budgetCeiling`, `storeys`, `includeRoofing`, `dxfFile`, `secondFloorDxfFile` (optional, 2-storey only; see Known limitations below). It runs the whole DXF-upload → engine-parse → store pipeline synchronously and returns `{ project, estimation, parseError }` in one response.

## Registration & verification

A self-registered account has to clear two independent gates before it can log in, checked in this order:

1. **Email ownership.** `register` emails a 6-digit code (via `src/services/mailer.service.js`, Gmail SMTP) and creates the account with `email_verified_at = NULL`; `POST /auth/verify-email` (`{ email, code }`) sets it once the correct code is typed back (10-minute expiry, 5 wrong attempts before it's invalidated and a fresh one has to be requested via `POST /auth/resend-verification-code`, 45s cooldown between resends). If the email genuinely can't be sent, the just-created row is rolled back rather than left as an unverifiable, permanently-squatting `email`/`employee_id`.
2. **Admin approval.** Independent of the above; an admin reviews and approves the account (`PATCH /admin/users/:id/verify`, `is_verified`/`is_active`), same as before this feature existed.

`login` checks email verification first, then admin approval, then active status, each with its own distinct error code (`EMAIL_NOT_VERIFIED`, `PENDING_VERIFICATION`, `ACCOUNT_DEACTIVATED`) so the frontend can route to the right explanation. An account created directly by an admin (`POST /admin/users`), or any account that already existed before this feature shipped, is exempt from the email-verification step; it's specifically about proving a *self-registered* stranger's email is real.

## Known limitations / simplifications

Documented in detail in code comments at the relevant spot; the significant ones:

- **Engine assumptions not in the paper's tables.** A few formulas needed a documented default where the source paper's Table 12–19 excerpt didn't specify one (footing plan dimensions, main rebar diameter, beam run length approximated from wall run, angle bar quantity). Every one is flagged with a comment in `engine/formulas.py`; none of this has had the licensed-engineer validation the paper itself calls for, and should get it before being trusted for a real estimate.
- **Second-floor DXF upload is optional.** A 2-storey project may upload a separate ground-floor and second-floor DXF (matching the paper's original description) for accurate per-floor materials: wall quantities, the suspended (2nd floor) slab, roofing, and formwork/steel props all use each floor's own real footprint instead of the ground floor's reused twice. Uploading only one file falls back to the original behavior of scaling that single footprint by storeys, the safer default when both floors are similar, but a real approximation when they differ significantly (quantified on a real duplex plan at ~15–23% depending on the material). See `engine/formulas.py`'s `geometry2` parameter.
- **Formwork materials are priced as a one-time purchase, not reuse-adjusted.** Plywood/lumber/steel props/scaffolding (Table 19) are computed from total formwork area with no reuse/cycling factor, and `computeBom` (`services/optimization.service.js`) prices that raw quantity like any other material. This matches Table 19's own formula, which has no reuse variable; the expert validation form notes that a real bill of materials would additionally account for how many times a contractor reuses the same formwork panels/props across pour stages, which this system doesn't model. Deliberately out of scope: the paper's Table 19 (and this engine) estimate raw material need, not procurement/reuse planning.
- **Distance is still straight-line, not real driving distance.** Store distances use haversine straight-line distance, now from the user's real browser geolocation when granted (falling back to a fixed Tarlac City reference point when it's denied/unavailable/unsupported; see `hooks/useUserLocation.js` and `features/storeLocator/data/storesMock.js`'s `loadStores`); wiring in real driving distance/time would still need a routing API (e.g. OSRM, which like the map tiles has a free public instance).
