import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import { colors } from '../../../theme/palette';

/**
 * Presentation (icon + colour) per activity type, keyed the same as the
 * `type` passed to `logActivity()`. Kept separate from the activity log
 * itself (see context/DashboardActivityContext) so the log stays plain
 * data — icons/colours are resolved at render time, same as StatusChip
 * resolves its colours from a label.
 *
 * Every `type` a `logActivity()` call site uses must have an entry here —
 * a missing one previously crashed the Dashboard entirely (RecentActivity
 * rendered `undefined` as a component). DEFAULT_ACTIVITY_TYPE below is a
 * safety net for that same class of mistake, not a substitute for keeping
 * this map in sync.
 */
export const ACTIVITY_TYPES = {
  project_created: { icon: FolderRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
  dxf_parsed: { icon: UploadFileRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
  estimation_completed: { icon: CheckCircleRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg },
  brand_selection_completed: { icon: SellRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg },
  bom_generated: { icon: DescriptionRoundedIcon, iconBg: colors.iconPurpleBg, iconFg: colors.iconPurpleFg },
  pdf_downloaded: { icon: DownloadRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg },
  // The two the BACKEND writes to activity_log (see projects.controller.js's
  // logActivity calls). They only started reaching this map once the dashboard
  // began fetching persisted entries instead of only showing what happened in
  // the current session — before that they rendered nowhere, so their absence
  // here went unnoticed.
  estimation_recomputed: { icon: CheckCircleRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg },
  brand_selection_saved: { icon: SellRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg },
};

/** Fallback presentation for any activity `type` not (yet) registered above. */
export const DEFAULT_ACTIVITY_TYPE = { icon: InfoRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg };
