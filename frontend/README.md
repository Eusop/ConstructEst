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

The same seeded admin account (User ID `20260001` or `admin@constructest.local` / `ChangeMe123!`) works for both; the app routes by the logged-in user's `accessRole`.

Self-registering a new account (`/signup`) doesn't log straight in; it goes to `/verify-email` for the 6-digit code emailed to the address given (see `backend/README.md`'s "Registration & verification"), then still needs an admin to approve it in the Admin module before it can sign in at all.

**User module** (`/dashboard`, `/projects/...`): upload a DXF (one per floor for 2 storeys), review the parsed quantity take-off, tune calibration factors and design parameters (Footings first, then Columns & Beams, Floor & Stairs, Formwork & Scaffolding), compare stores, pick brands, download the BOM.

**Password pages**: `/reset-password` (Forgot password: emailed code) and `/set-new-password`, where a user who signed in with an admin's temporary password must choose their own before anything else (`RequireRole` sends them there).

**Admin module** (`/admin/...`): user management (including Password help: send a reset code or set a temporary password), hardware stores (with a map view), materials & brands catalog (global brand definitions + per-store pricing/availability), and the global calibration/design-parameter defaults every new project falls back to.

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

- **Store distances are by road when routing is available.** Measured from the user's real browser geolocation when granted (`hooks/useUserLocation.js`), falling back to a fixed Tarlac City reference point when it's denied/unavailable. Straight-line distance shows first; `StoreLocatorPage` then asks `POST /api/stores/road-distances` (OpenRouteService on the backend) and swaps in road distance and drive time. Without a backend `ORS_API_KEY`, or when the request fails, it stays straight-line. The list can be sorted Cheapest or Nearest.
