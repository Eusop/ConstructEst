# ConstructEst frontend

React + Vite + MUI single-page app, backing onto the `backend/` API.

## First-time setup

1. **Backend running first.** See `../backend/README.md` — this app expects it at `VITE_API_URL` (default `http://localhost:4000/api`).
2. **Dependencies.**
   ```
   npm install
   ```
3. **Environment.** Copy `.env.example` to `.env`. `VITE_GOOGLE_MAPS_API_KEY` is optional — the Store Locator map degrades gracefully without one (shows a "Map unavailable" placeholder instead of failing).

## Running

```
npm run dev       # http://localhost:5173
npm run build      # production build
npm run lint       # eslint
```

## Two modules, two logins

The same seeded admin account (`admin` / `ChangeMe123!`) works for both — the app routes by the logged-in user's `accessRole`.

**User module** (`/dashboard`, `/projects/...`): upload a DXF, review the parsed quantity take-off, tune calibration factors and structural design parameters, compare stores, pick brands, download the BOM.

**Admin module** (`/admin/...`): user management, hardware stores (with a Google Maps view), materials & brands catalog (global brand definitions + per-store pricing/availability), and the global calibration/design-parameter defaults every new project falls back to.

## Project layout

```
src/
  admin/           Admin module — its own layout, pages, contexts, and services (adminService.js)
  components/      Shared UI (BrandMark, GoogleMapView, form fields, error boundary)
  context/         User module state: UserContext (auth), ProjectsContext (active project + drafts),
                    NotificationsContext, DashboardActivityContext
  features/        One folder per domain area (projects, estimation, brandSelection, storeLocator,
                    billOfMaterials, settings, notifications, dashboard, auth) — each holding its
                    own components and a data/ module. Several data/ modules are a "live cache"
                    pattern: a mutable array/object populated from a real API response so existing
                    leaf components can read it synchronously without every one of them becoming
                    API-aware individually.
  layouts/         DashboardLayout + Sidebar (user module chrome)
  pages/           One file per route, composing feature components
  routes/          AppRoutes.jsx (react-router routes), paths.js (ROUTES/ADMIN_ROUTES), RequireRole
  services/        apiClient.js (fetch wrapper: base URL, auth header, error shape), authService.js
  theme/           MUI theme + palette
```

## Known limitations

- **No route guard on the User module.** Reaching an authenticated page without a valid session surfaces as a generic failure on whatever action is attempted (e.g. a DXF upload fails with a raw "Missing or invalid Authorization header" message rather than redirecting to `/login`). The Admin module and the standalone learning-guide project both use a `RequireAuth`-style guard; this app doesn't yet.
- **Google Maps store distances are straight-line**, computed from a fixed Tarlac City reference point, not the user's real location or actual driving distance.
