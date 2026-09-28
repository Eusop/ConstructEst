import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import { colors } from '../../../theme/palette';

/**
 * Icon and colour per activity type, keyed like the `type` passed to
 * `logActivity()`. Kept apart from the activity log so the log stays plain
 * data, and resolved at render time (like StatusChip). Every `type` used by a
 * `logActivity()` call needs an entry here, or the Dashboard crashed
 * (RecentActivity rendered `undefined` as a component). DEFAULT_ACTIVITY_TYPE
 * is a safety net, not a replacement for keeping this map in sync.
 */
export const ACTIVITY_TYPES = {
  project_created: { icon: FolderRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
  dxf_parsed: { icon: UploadFileRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
  estimation_completed: { icon: CheckCircleRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg },
  brand_selection_completed: { icon: SellRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg },
  bom_generated: { icon: DescriptionRoundedIcon, iconBg: colors.iconPurpleBg, iconFg: colors.iconPurpleFg },
  pdf_downloaded: { icon: DownloadRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg },
  // The two types the BACKEND writes to activity_log (see logActivity calls in
  // projects.controller.js). They only show up now that the dashboard fetches
  // saved entries instead of just the current session.
  estimation_recomputed: { icon: CheckCircleRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg },
  brand_selection_saved: { icon: SellRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg },
};

/** Fallback presentation for any activity `type` not (yet) registered above. */
export const DEFAULT_ACTIVITY_TYPE = { icon: InfoRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg };
