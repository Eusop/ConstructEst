export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY_EMAIL: '/verify-email',
  RESET_PASSWORD: '/reset-password',
  // After signing in with an admin's temporary password.
  SET_NEW_PASSWORD: '/set-new-password',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  NEW_PROJECT: '/projects/new',
  PROJECT_PROCESSING: '/projects/new/processing',
  PROJECT_RESULTS: '/projects/new/results',
  MATERIAL_ESTIMATION: '/projects/material-estimation',
  STORE_LOCATOR: '/projects/store-locator',
  BRAND_SELECTION: '/projects/brand-selection',
  BILL_OF_MATERIALS: '/projects/bill-of-materials',
  PROFILE: '/profile',
};

/** Routes for the Admin Module, kept separate from ROUTES so admin and user navigation never mix. */
export const ADMIN_ROUTES = {
  DASHBOARD: '/admin/dashboard',
  USERS: '/admin/users',
  STORES: '/admin/stores',
  MATERIALS: '/admin/materials',
  ACTIVITY_LOG: '/admin/activity-log',
  SETTINGS: '/admin/settings',
  PROFILE: '/admin/profile',
};
