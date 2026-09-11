import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import EmptyState from '../components/EmptyState';
import { listAdminActivityLog, downloadQuotationFile } from '../services/adminService';
import { useAdminToast } from '../context/AdminToastContext';
import { colors } from '../../theme/palette';

const CATEGORIES = [
  { value: 'user_management', label: 'User Management', icon: GroupRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
  { value: 'store_management', label: 'Store Management', icon: StorefrontRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg },
];

function formatDateTime(value) {
  return new Date(value).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Admin activity backlog — a real, persisted history of what admins have
 * done (see backend/src/controllers/admin.controller.js's logAdminActivity
 * and the admin_activity_log table), categorized into the two tabs below.
 *
 * Deliberately read-only: this page has no edit or delete control anywhere,
 * and the backend never exposes a route that could change or remove an
 * entry — every row here is the actual, permanent record of what happened,
 * not the ephemeral session-only "Recent activity" widget on the Dashboard
 * (see AdminActivityContext, which is unrelated and left untouched).
 */
function AdminActivityLogPage() {
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useAdminToast();

  const handleDownloadQuotation = (metadata) => {
    downloadQuotationFile(metadata.quotationStoredName, metadata.quotationFileName).catch(() => {
      showToast('Could not download the quotation file. Try again.', 'warning');
    });
  };

  useEffect(() => {
    let cancelled = false;
    // Deferred a tick so this isn't a synchronous setState call inside the
    // effect body (see MapView.jsx for the same fix) — fires on the next
    // microtask, well before paint, so there's no visible flicker.
    queueMicrotask(() => {
      if (!cancelled) setIsLoading(true);
    });
    listAdminActivityLog({ category, limit: 100 })
      .then(({ entries: rows }) => {
        if (!cancelled) setEntries(rows);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  const activeCategory = CATEGORIES.find((item) => item.value === category);

  return (
    <Stack spacing={2.5} sx={{ width: '100%', flex: 1, minHeight: 0 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Activity Log</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
          A permanent record of admin actions. Nothing here can be edited or removed.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Tabs
          value={category}
          onChange={(event, value) => setCategory(value)}
          // scrollable rather than the default standard variant — at the
          // narrowest phones (320px) "User Management" + "Store Management"
          // don't both fit and the second tab was clipped against the
          // card's edge. scrollable only changes anything when content
          // actually overflows its own row, so this is a no-op everywhere
          // both labels already fit (360px and up, and every tablet/desktop
          // width, which all have far more room than two short tab labels
          // need).
          variant="scrollable"
          scrollButtons={false}
          sx={{ px: { xs: 1.5, md: 2.5 }, pt: 1, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {CATEGORIES.map((item) => (
            <Tab key={item.value} value={item.value} label={item.label} sx={{ textTransform: 'none', fontWeight: 600 }} />
          ))}
        </Tabs>

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: { xs: 1.5, md: 2.5 } }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
              <CircularProgress size={28} />
            </Box>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={HistoryRoundedIcon}
              iconBg={activeCategory.iconBg}
              iconFg={activeCategory.iconFg}
              title="No activity yet."
              description={`Actions taken under ${activeCategory.label} will show up here as a permanent record.`}
              minHeight={240}
            />
          ) : (
            <Stack divider={<Divider />}>
              {entries.map((entry) => {
                const Icon = activeCategory.icon;
                return (
                  <Stack key={entry.id} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', py: 1.5 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        borderRadius: 1.5,
                        bgcolor: activeCategory.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mt: 0.25,
                      }}
                    >
                      <Icon sx={{ color: activeCategory.iconFg, fontSize: 18 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ color: 'text.primary', fontSize: '0.88rem', lineHeight: 1.4 }}>{entry.message}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.25 }}>
                        {entry.adminName} · {formatDateTime(entry.createdAt)}
                      </Typography>
                      {entry.metadata?.quotationStoredName && (
                        <Link
                          component="button"
                          type="button"
                          onClick={() => handleDownloadQuotation(entry.metadata)}
                          underline="hover"
                          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, mt: 0.5, fontSize: '0.78rem', color: colors.iconBlueFg, fontWeight: 600 }}
                        >
                          <DescriptionRoundedIcon sx={{ fontSize: 14 }} />
                          {entry.metadata.quotationFileName ?? 'View quotation'}
                        </Link>
                      )}
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Box>
      </Paper>
    </Stack>
  );
}

export default AdminActivityLogPage;
