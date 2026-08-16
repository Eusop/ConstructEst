import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InsertChartRoundedIcon from '@mui/icons-material/InsertChartRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import { colors } from '../../../theme/palette';
import { ROUTES } from '../../../routes/paths';

/**
 * Presentation (icon + colour) per notification type, resolved at render
 * time the same way `features/dashboard/data/activityTypes` resolves
 * Recent Activity's icons — keeps NotificationsContext's stored entries
 * plain data instead of embedding components in state. Every `type` a
 * `useNotifications().addNotification()` call site uses must have an entry
 * here (and in NOTIFICATION_CATEGORIES below).
 */
export const NOTIFICATION_TYPES = {
  project_created: { icon: FolderRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
  dxf_parsed: { icon: CheckCircleRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg },
  estimation_completed: { icon: InsertChartRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
  store_selected: { icon: LocationOnRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg },
  brand_selection_completed: { icon: SellRoundedIcon, iconBg: colors.iconPurpleBg, iconFg: colors.iconPurpleFg },
  bom_generated: { icon: DescriptionRoundedIcon, iconBg: colors.iconTealBg, iconFg: colors.iconTealFg },
  pdf_downloaded: { icon: DownloadRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg },
  calibration_updated: { icon: TuneRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
  system_announcement: { icon: CampaignRoundedIcon, iconBg: colors.iconRedBg, iconFg: colors.iconRedFg },
  profile_updated: { icon: PersonRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
};

/** Fallback presentation for any notification `type` not (yet) registered above. */
export const DEFAULT_NOTIFICATION_TYPE = { icon: InfoRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg };

// Which filter chip each type belongs to — "System" covers account/platform-
// wide updates, "Projects" covers everything tied to a specific project's
// estimation flow.
export const NOTIFICATION_CATEGORIES = {
  project_created: 'projects',
  dxf_parsed: 'projects',
  estimation_completed: 'projects',
  store_selected: 'projects',
  brand_selection_completed: 'projects',
  bom_generated: 'projects',
  pdf_downloaded: 'projects',
  calibration_updated: 'system',
  system_announcement: 'system',
  profile_updated: 'system',
};

// Per-type action button: where "View X" / "Open Project" takes the user.
// Reuses the exact same routes the sidebar links to (see routes/paths) —
// clicking a notification's action button is just a normal client-side
// navigation to an existing page, not a special notification-only route.
// Types with no natural destination (e.g. a platform-wide announcement)
// simply have no entry, and NotificationCard renders no button for them.
export const NOTIFICATION_ACTIONS = {
  project_created: { label: 'Open Project', route: ROUTES.PROJECTS },
  dxf_parsed: { label: 'View Results', route: ROUTES.PROJECT_RESULTS },
  estimation_completed: { label: 'View Estimation', route: ROUTES.MATERIAL_ESTIMATION },
  store_selected: { label: 'View Store', route: ROUTES.STORE_LOCATOR },
  brand_selection_completed: { label: 'View Brand Selection', route: ROUTES.BRAND_SELECTION },
  bom_generated: { label: 'View Bill of Materials', route: ROUTES.BILL_OF_MATERIALS },
  pdf_downloaded: { label: 'View Bill of Materials', route: ROUTES.BILL_OF_MATERIALS },
  calibration_updated: { label: 'View Estimation', route: ROUTES.MATERIAL_ESTIMATION },
  profile_updated: { label: 'View Profile', route: ROUTES.PROFILE },
};
