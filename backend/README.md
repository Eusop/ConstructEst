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

   Seeded admin login: **User ID `20260001` (or email `admin@constructest.local`), password `ChangeMe123!`**; change the password via `PUT /api/users/me/password` once logged in.

   `schema.sql`/`seed.sql` alone are enough for a fresh install. If you're upgrading a database that was already seeded before a schema change, run the relevant files in `db/migrations/` in order instead (`npm run migrate -- db/migrations/00N_*.sql`); each one documents what it does and why at the top of the file.

2. **Node dependencies.**
   ```
   npm install
   ```

3. **Python dependencies.** Needs a Python 3 interpreter with `ezdxf` installed:
   ```
   pip install -r engine/requirements.txt
   ```

4. **Environment.** Copy `.env.example` to `.env` and fill in your DB password (XAMPP default is empty) and a real `JWT_SECRET` (a placeholder is not safe to ship). `PYTHON_BIN` should point at whichever `python`/`python3` command has `ezdxf` installed. `BREVO_API_KEY`/`BREVO_FROM_EMAIL`/`BREVO_FROM_NAME` are needed for self-registration's email-verification codes to actually send (see "Registration & verification" below); get a free API key from [Brevo](https://app.brevo.com/settings/keys/api), and verify the exact "from" address under Senders, Domains & Dedicated IPs > Senders > Single Sender — Brevo rejects any other address. Without real values here, registration correctly fails fast with an explanatory error rather than silently creating an unverifiable account.

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

All routes except `/api/health` and the pre-session auth endpoints (`register`, `check-availability`, `verify-email`, `resend-verification-code`, `login`, `forgot-password`, `reset-password`) require `Authorization: Bearer <token>`. `/api/admin/*` additionally requires the `admin` access role.

- **Auth**: `POST /auth/register`, `GET /auth/check-availability?field=email&value=` (live duplicate email check as the signup form is filled in; the User ID, year + 4 digits like `20260001`, is assigned by `register` through `src/services/userId.service.js` and returned as `userId`), `POST /auth/verify-email`, `POST /auth/resend-verification-code`, `POST /auth/login`, `POST /auth/forgot-password` and `POST /auth/reset-password` (emailed 6-digit code), `GET /auth/me` and `POST /auth/set-new-password` (both require auth; the second replaces an admin's temporary password, see "Password help" below)
- **Users**: `PUT /users/me`, `PUT /users/me/password`
- **Projects**: `GET/POST /projects`, `GET/DELETE /projects/:id`, `POST /projects/:id/recompute` (re-runs the engine against the already-uploaded DXF with current constants/overrides)
- **Estimation**: `GET/PUT/DELETE /projects/:id/constants` (project-level calibration override), `GET/PUT /projects/:id/design-overrides` (project-level design parameters: column/beam/footing size and footing thickness/count, ground floor and 2nd floor height, slab bar size and spacing, column/beam rebar ratio with main bar and tie/stirrup sizes, and formwork/scaffolding uses; bar sizes are limited to 10/12/16mm)
- **Store/brand optimization**: `GET /projects/:id/stores` (Table 20 cost optimization; excludes deactivated stores), `GET /projects/:id/brand-catalog?storeId=`, `POST /projects/:id/brand-selection`, `GET /projects/:id/bom?storeId=`
- **Stores**: `GET /stores`, `POST /stores/road-distances` (body `{ origin: { lat, lng } }`; road km and drive minutes to every active store through OpenRouteService; returns `{ available: false }` when `ORS_API_KEY` isn't set or routing fails, and the frontend then keeps straight-line distances)
- **Notifications**: `GET /notifications`, `PATCH /notifications/:id/read`
- **Dashboard**: `GET /dashboard/summary`
- **Admin**: `/admin/users` (+ `/admin/users/:id/status` deactivate/reactivate, `/admin/users/:id/verify` approve a pending self-registered account, `POST /admin/users/:id/send-reset-code` and `POST /admin/users/:id/temporary-password` for password help), `/admin/materials`, `/admin/stores` (+ `/admin/stores/:id/status` deactivate/reactivate without deleting, `/admin/stores/:id/catalog` for a store's full priced/unpriced brand list, `/admin/stores/:storeId/materials/:materialBrandId` for per-store pricing (a real price change requires a `quotationFile`, PDF/Word/Excel, as documentary proof, uploaded multipart alongside `price`/`inStock`; saving the same price again, e.g. to update only `stockQty`, the stock on hand from migration 032, needs no file; `/admin/quotations/:storedName` downloads one back)), `/admin/estimation-constants` and `/admin/design-overrides` (global defaults every new project falls back to)

`POST /projects` is `multipart/form-data`: `projectName`, `location`, `budgetCeiling`, `storeys`, `includeRoofing`, `dxfFile`, `secondFloorDxfFile` (required when `storeys` is 2; see Known limitations below). It runs the whole DXF-upload → engine-parse → store pipeline synchronously and returns `{ project, estimation, parseError }` in one response.

## Registration & verification

A self-registered account has to clear two independent gates before it can log in, checked in this order:

1. **Email ownership.** `register` emails a 6-digit code (via `src/services/mailer.service.js`, Brevo's HTTP API) and creates the account with `email_verified_at = NULL`; `POST /auth/verify-email` (`{ email, code }`) sets it once the correct code is typed back (10-minute expiry, 5 wrong attempts before it's invalidated and a fresh one has to be requested via `POST /auth/resend-verification-code`, 45s cooldown between resends). If the email genuinely can't be sent, the just-created row is rolled back rather than left as an unverifiable, permanently-squatting `email` (its User ID number is not reused).
2. **Admin approval.** Independent of the above; an admin reviews and approves the account (`PATCH /admin/users/:id/verify`, `is_verified`/`is_active`), same as before this feature existed.

`login` checks email verification first, then admin approval, then active status, each with its own distinct error code (`EMAIL_NOT_VERIFIED`, `PENDING_VERIFICATION`, `ACCOUNT_DEACTIVATED`) so the frontend can route to the right explanation. A temporary password past its 24 hours gets `TEMP_PASSWORD_EXPIRED`. An account created directly by an admin (`POST /admin/users`), or any account that already existed before this feature shipped, is exempt from the email-verification step; it's specifically about proving a *self-registered* stranger's email is real.

## Password help

A user who forgot their password uses **Forgot password** on the login page (`POST /auth/forgot-password`, then `POST /auth/reset-password` with the emailed code: 10-minute expiry, 5 attempts, 45s between sends). The forgot-password reply is the same whether or not the email has an account.

An admin can help from **User Management › Password help** (key icon) without ever seeing or choosing the user's own password:

- **Send reset code** (`POST /admin/users/:id/send-reset-code`) emails the same code, with a line saying an administrator sent it. For users who can open their email.
- **Set temporary password** (`POST /admin/users/:id/temporary-password`) is for users who can't open their email. The server generates a random 12-character password (no look-alike characters), stores only its hash, and returns it once for the admin to hand over in person or by private message. It expires after 24 hours (`users.temp_password_expires_at`). Signing in with it sets `mustChangePassword` in the token, and `middleware/auth.js` then blocks every request except `GET /auth/me`, `POST /auth/set-new-password` and the heartbeat until the user chooses their own password (which can't be the temporary one). The frontend sends them to `/set-new-password`.

Both refuse deactivated accounts and accounts whose email isn't verified, are written to the admin activity log (never with the password or code), and an admin can't set a temporary password on their own account. Shared code is in `src/services/passwordReset.service.js`; the columns come from migration 030.

## Known limitations / simplifications

Documented in detail in code comments at the relevant spot; the significant ones:

- **Rates follow the paper, corrected by the engineers and by Fajardo.** The base formulas are the paper's Tables 12–19, corrected by Engr. Espiritu's replies (Sep 2026). Since 2026-10-03 the rates also follow Max Fajardo's *Simplified Construction Estimate*, the reference the engineers use: CHB mortar by CHB size (4" or 6", from the wall thickness in the drawing), wall rebar with laps, tie wire counted from the bars, 10mm column ties at the code spacing, column bar extras (footing bend, footing depth, dowels), roof sheet effective width and end lap, gutter/flashing/ridge piece lengths, and form lap with Table 5-1 frame lumber. Where the engineer's own sheet (2026-10-04) differs, it wins: footing, column and beam rebar by weight (100, 180 and 160 kg per m3 of concrete; columns and beams half main bars and half ties or stirrups, 16mm and 10mm by default; the sizes only split each half into lengths, since 2026-10-05 bars are not counted from the plan), form areas without Fajardo's laps, and truss angle bar by weight (roof area x 17.5 kg/m2 / 3.4 kg/m / 6 m, plus the general 5% wastage). Each value is a named constant in `engine/formulas.py` with its Fajardo table or page in the comment.
- **Engine assumptions with no source yet.** Footing plan size (0.60 x 0.60 m) and thickness (0.30 m), the 2-storey column size, stair rebar size, and beam run approximated from wall run when there is no BEAM layer. These are editable defaults, flagged in `engine/formulas.py`, pending the engineers' answers.
- **Not computed.** Plaster, nails, roof fasteners, footing tie beams and finishing are out of scope.
- **A 2-storey project needs both floor files.** Each floor is its own DXF, so walls, the suspended slab, columns, roofing and formwork use each floor's real footprint. `createProject` returns 400 for 2 storeys with one file, and the roof is read only from the second floor file. Projects saved before this rule (one file, ground floor reused) still recalculate. See `engine/formulas.py`'s `geometry2` parameter.
- **Walls are measured once.** A wall drawn as two parallel faces 80 to 300 mm apart (LINE or polyline) is counted once by pairing the faces, and an MLINE along its reference line (`wall_run_length` in `engine/dxf_reader.py`). Walls thicker or thinner than that range, and curved walls, are not paired.
- **Formwork materials are quantified as a one-time purchase, not reuse-adjusted (reviewed and endorsed).** Plywood/lumber/steel props/scaffolding (Table 19) are computed from total formwork area with no reuse/cycling factor, and `computeBom` (`services/optimization.service.js`) prices that raw quantity like any other material. This matches Table 19's own formula, which has no reuse variable. The expert validation form raised formwork reuse as a concern, and a local civil engineer reviewed that specific question on 2026-09-07 and endorsed keeping quantity as one-time use: reuse is real but thickness-dependent (thin 1/4"-1/8" plywood on a house is effectively single-use; thicker 3/4" plywood on jobs already expecting 3+ pours can reach about 3 uses, with thinner ply needing more stud lumber either way), and you cannot know in advance whether a stripped/cut piece is still a usable shape for the next structure. His recommendation was to treat reuse as an optional *price* adjustment rather than dividing the quantity by an assumed reuse count. See `engine/formulas.py`'s module docstring, which cites the same review. That price adjustment is now in **Design parameters › Formwork & Scaffolding**: formwork uses (1 to 3, default 1) divides the plywood and lumber price, and scaffolding uses (1 to 10, default 4 from the engineers' 2026-10-03 meeting) divides the scaffolding price. Both can be set per project or as admin defaults (migration 029).
- **Store distance is by road when routing is available.** Store Locator shows straight-line (haversine) distance first, then swaps in road distance and drive time from OpenRouteService (`POST /stores/road-distances`, needs `ORS_API_KEY`). Without the key, or if the request fails, it keeps straight-line. Distance is measured from the user's browser location, a spot they set on the map, or Tarlac City center, and the page says which (see `hooks/useUserLocation.js` and `pages/StoreLocatorPage.jsx`).
