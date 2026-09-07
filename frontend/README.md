# ConstructEst frontend

React + Vite + MUI single-page app, backing onto the `backend/` API.

## First-time setup

1. **Backend running first.** See `../backend/README.md`; this app expects it at `VITE_API_URL` (default `http://localhost:4000/api`).
2. **Dependencies.**
   ```
   npm install
   ```
3. **Environment.** Copy `.env.example` to `.env`. No map API key needed; the Store Locator/Admin Stores map runs on Leaflet + free OpenStreetMap tiles.

## Running

```
npm run dev       # http://localhost:5173
npm run build      # production build
npm run lint       # eslint
```

## Two modules, two logins

The same seeded admin account (Employee ID `admin` / `ChangeMe123!`) works for both; the app routes by the logged-in user's `accessRole`.

Self-registering a new account (`/signup`) doesn't log straight in; it goes to `/verify-email` for the 6-digit code emailed to the address given (see `backend/README.md`'s "Registration & verification"), then still needs an admin to approve it in the Admin module before it can sign in at all.

**User module** (`/dashboard`, `/projects/...`): upload a DXF, review the parsed quantity take-off, tune calibration factors and structural design parameters, compare stores, pick brands, download the BOM.

**Admin module** (`/admin/...`): user management, hardware stores (with a map view), materials & brands catalog (global brand definitions + per-store pricing/availability), and the global calibration/design-parameter defaults every new project falls back to.

## Project layout

```
src/
  admin/           Admin module: its own layout, pages, contexts, and services (adminService.js)
  components/      Shared UI (BrandMark, MapView, form fields, error boundary)
  context/         User module state: UserContext (auth), ProjectsContext (active project + drafts),
                    NotificationsContext, DashboardActivityContext
  features/        One folder per domain area (projects, estimation, brandSelection, storeLocator,
                    billOfMaterials, settings, notifications, dashboard, auth), each holding its
                    own components and a data/ module. Several data/ modules are a "live cache"
                    pattern: a mutable array/object populated from a real API response so existing
                    leaf components can read it synchronously without every one of them becoming
                    API-aware individually.
  layouts/         DashboardLayout + Sidebar (user module chrome)
  pages/           One file per route, composing feature components
  routes/          AppRoutes.jsx (react-router routes), paths.js (ROUTES/ADMIN_ROUTES), RequireRole
  services/        apiClient.js (fetch wrapper: base URL, auth header, error shape), authService.js,
                    usersService.js (the signed-in user's own profile/password)
  theme/           MUI theme + palette
```

## Known limitations

- **No route guard on the User module.** Reaching an authenticated page without a valid session surfaces as a generic failure on whatever action is attempted (e.g. a DXF upload fails with a raw "Missing or invalid Authorization header" message rather than redirecting to `/login`). The Admin module and the standalone learning-guide project both use a `RequireAuth`-style guard; this app doesn't yet.
- **Store distances are straight-line**, not actual driving distance; computed from the user's real browser geolocation when granted (`hooks/useUserLocation.js`), falling back to a fixed Tarlac City reference point when it's denied/unavailable.
