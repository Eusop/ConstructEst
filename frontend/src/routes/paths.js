export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
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
  NOTIFICATIONS: '/notifications',
};

/** Routes for the Admin Module — kept separate from ROUTES so admin/user navigation never cross. */
export const ADMIN_ROUTES = {
  DASHBOARD: '/admin/dashboard',
  USERS: '/admin/users',
  STORES: '/admin/stores',
  MATERIALS: '/admin/materials',
  ACTIVITY_LOG: '/admin/activity-log',
  SETTINGS: '/admin/settings',
  PROFILE: '/admin/profile',
};
