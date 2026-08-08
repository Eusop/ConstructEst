/**
 * Notifications start empty for every user/session — there's nothing to
 * show until the user actually does something (create a project, parse a
 * DXF, pick a store, ...). Each of those actions calls
 * `useNotifications().addNotification()` at the point it happens (see
 * NewProjectPage, ProjectProcessingPage, StoreLocatorPage,
 * BrandSelectionPage, BillOfMaterialsPage, ProfilePage, SettingsPage) —
 * this file only exists so NotificationsContext has a single, obvious spot
 * to swap for a real "fetch the user's notifications" call later.
 */
export const NOTIFICATIONS_SEED = [];
