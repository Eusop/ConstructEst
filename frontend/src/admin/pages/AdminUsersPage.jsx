import { useEffect, useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import EmptyState from '../components/EmptyState';
import UserFormDialog from '../components/UserFormDialog';
import TypedConfirmDialog from '../../components/TypedConfirmDialog';
import { useAdminActivity } from '../context/AdminActivityContext';
import { useAdminToast } from '../context/AdminToastContext';
import { listAdminUsers, createAdminUser, updateAdminUser, setAdminUserActive, verifyAdminUser } from '../services/adminService';
import { getInitials } from '../../utils/getInitials';
import { colors } from '../../theme/palette';

const AVATAR_COLORS = [colors.accentBlue, colors.iconPurpleFg, colors.iconTealFg, colors.orange, colors.iconGreenFg];

function avatarColorFor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Admin accounts are protected from deactivation — see admin.controller.js's
// setUserActive, which rejects it server-side too. Without that, one click
// could deactivate every admin (including your own account) and leave nobody
// able to get back into the admin module.
function isAdminAccount(user) {
  return user?.accessRole === 'admin';
}

// A brand-new self-registered account (isVerified: false) reads as "Pending"
// regardless of isActive — distinct from an existing account an admin
// deliberately deactivated. See admin.controller.js's verifyUser /
// auth.controller.js's register.
function userStatus(user) {
  if (!user.isVerified) return { label: 'Pending', bg: colors.iconOrangeBg, fg: colors.iconOrangeFg };
  return user.isActive
    ? { label: 'Active', bg: colors.iconGreenBg, fg: colors.iconGreenFg }
    : { label: 'Inactive', bg: 'grey.100', fg: 'text.secondary' };
}

// One line of the account review shown inside the Deactivate/Reactivate/
// Activate confirmations — see UserProfileReview below.
function ProfileReviewRow({ label, value }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>{label}</Typography>
      <Typography sx={{ color: 'text.primary', fontSize: '0.82rem', fontWeight: 600, textAlign: 'right' }} noWrap>
        {value}
      </Typography>
    </Stack>
  );
}

// Shared account-review block used as the `message` for all three
// TypedConfirmDialogs below (Deactivate/Reactivate/Activate) — an admin
// reviews who they're actually acting on before the typed word unlocks the
// button, not just a one-line "are you sure" with a name buried in it.
function UserProfileReview({ user, intro }) {
  if (!user) return null;
  return (
    <Stack spacing={1.5}>
      <Typography sx={{ color: 'text.primary' }}>{intro}</Typography>
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: 'divider' }}>
        <Stack spacing={0.75}>
          <ProfileReviewRow label="Name" value={user.userName} />
          <ProfileReviewRow label="Employee ID" value={user.employeeId} />
          <ProfileReviewRow label="Email" value={user.email} />
          <ProfileReviewRow label="Registered" value={formatDate(user.createdAt)} />
        </Stack>
      </Paper>
    </Stack>
  );
}

// Mobile-only rendering (below `md`). Was a 4-band card per user (avatar
// row, chip row, a full Divider, then a footer row just for the date and
// two action icons) — with a real user list that's a very tall scroll for
// very little information per screen. Collapsed down to two lines: identity
// (with the two actions moved behind a single kebab menu, the same
// shared-Menu pattern already used for Admin Materials' mobile cards) plus
// one line of chips + registration date. Desktop's table and its two
// separate action icons are completely untouched.
function UserMobileCard({ user, onOpenMenu }) {
  return (
    <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', p: 1.25 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Avatar sx={{ width: 36, height: 36, fontSize: '0.8rem', fontWeight: 700, bgcolor: avatarColorFor(user.id), flexShrink: 0 }}>
          {getInitials(user.userName)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'text.primary' }} noWrap>
            {user.userName}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem' }} noWrap>
            {user.employeeId} · {user.email}
          </Typography>
        </Box>
        <IconButton size="small" onClick={(event) => onOpenMenu(event, user)} sx={{ flexShrink: 0, mr: -0.5 }} aria-label="User actions">
          <MoreVertRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Stack direction="row" spacing={0.75}>
          <Chip
            label={user.accessRole === 'admin' ? 'Admin' : 'User'}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 700,
              bgcolor: user.accessRole === 'admin' ? colors.iconPurpleBg : 'grey.100',
              color: user.accessRole === 'admin' ? colors.iconPurpleFg : 'text.secondary',
            }}
          />
          <Chip
            label={userStatus(user).label}
            size="small"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: userStatus(user).bg, color: userStatus(user).fg }}
          />
        </Stack>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.68rem', flexShrink: 0 }} noWrap>
          {formatDate(user.createdAt)}
        </Typography>
      </Stack>
    </Paper>
  );
}

/**
 * Admin User Management: real, persisted data via /api/admin/users (the
 * backend already has full CRUD here). Starts empty except for whatever
 * accounts genuinely exist (at minimum the seeded admin account) — no fake
 * rows. The header's "Add User" button was removed per spec; this page's
 * own toolbar button is the one place users actually get created from.
 */
function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  // Mobile-only row action menu (kebab) — see UserMobileCard above.
  const [rowMenu, setRowMenu] = useState(null);
  // Both directions of the active/inactive toggle are gated behind a typed
  // word (DEACTIVATE / REACTIVATE) — see handleToggleActive.
  const [pendingToggleUser, setPendingToggleUser] = useState(null);
  // Approving a pending self-registered account is gated behind typing
  // ACTIVATE — see handleVerify.
  const [pendingVerifyUser, setPendingVerifyUser] = useState(null);
  const { logActivity } = useAdminActivity();
  const { showToast } = useAdminToast();

  const load = () => {
    setIsLoading(true);
    listAdminUsers()
      .then(({ users: list }) => setUsers(list))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => [user.userName, user.employeeId, user.email].some((value) => value?.toLowerCase().includes(term)));
  }, [users, search]);

  const handleAdd = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const openRowMenu = (event, user) => setRowMenu({ anchorEl: event.currentTarget, user });
  const closeRowMenu = () => setRowMenu(null);

  const handleSubmit = async (form) => {
    if (editingUser) {
      await updateAdminUser(editingUser.id, { firstName: form.firstName, lastName: form.lastName, email: form.email, accessRole: form.accessRole });
      logActivity({ message: `User updated: ${form.firstName} ${form.lastName}`, icon: EditRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg });
      showToast('User updated');
    } else {
      await createAdminUser(form);
      logActivity({ message: `User account created: ${form.firstName} ${form.lastName}`, icon: AddRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg });
      showToast('User created');
    }
    setDialogOpen(false);
    load();
  };

  const performToggleActive = async (user) => {
    await setAdminUserActive(user.id, !user.isActive);
    logActivity({
      message: `User ${user.isActive ? 'deactivated' : 'reactivated'}: ${user.userName}`,
      icon: user.isActive ? BlockRoundedIcon : CheckCircleOutlineRoundedIcon,
      iconBg: user.isActive ? colors.iconRedBg : colors.iconGreenBg,
      iconFg: user.isActive ? colors.iconRedFg : colors.iconGreenFg,
    });
    showToast(user.isActive ? 'User deactivated' : 'User reactivated', user.isActive ? 'warning' : 'success');
    load();
  };

  const handleToggleActive = (user) => setPendingToggleUser(user);

  const handleConfirmToggle = async () => {
    try {
      await performToggleActive(pendingToggleUser);
      setPendingToggleUser(null);
    } catch (error) {
      const verb = pendingToggleUser.isActive ? 'deactivate' : 'reactivate';
      showToast(error.message || `Could not ${verb} this user. Try again.`, 'warning');
      throw error;
    }
  };

  const handleVerify = (user) => setPendingVerifyUser(user);

  const handleConfirmVerify = async () => {
    try {
      await verifyAdminUser(pendingVerifyUser.id);
      logActivity({
        message: `Verified user account: ${pendingVerifyUser.userName}`,
        icon: CheckCircleOutlineRoundedIcon,
        iconBg: colors.iconGreenBg,
        iconFg: colors.iconGreenFg,
      });
      showToast('User verified', 'success');
      setPendingVerifyUser(null);
      load();
    } catch (error) {
      showToast(error.message || 'Could not activate this user. Try again.', 'warning');
      throw error;
    }
  };

  return (
    <Stack spacing={2.5} sx={{ width: '100%', flex: 1, minHeight: 0 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>User Management</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>View, create, and manage registered accounts.</Typography>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', p: { xs: 1.5, md: 2.5 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Mobile: search + "Add User" used to stack as two full-width rows
            (a wide search bar, then a full-width button below it) — on
            their own that's two whole rows of vertical space before a
            single user is visible. Now always a single row: the button
            shrinks to an icon-only square next to the search field instead
            of dropping below it. sm+ is untouched (was already a row with
            the full text button). */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexShrink: 0, alignItems: { xs: 'center', sm: 'stretch' } }}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'grey.100',
              border: '1px solid',
              borderColor: 'grey.200',
              borderRadius: 2,
              px: 1.5,
              py: 1,
            }}
          >
            <SearchRoundedIcon sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />
            <Box
              component="input"
              placeholder="Search users by name, employee ID, or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ border: 'none', outline: 'none', bgcolor: 'transparent', width: '100%', minWidth: 0, font: 'inherit', color: 'text.primary' }}
            />
          </Box>
          <Button
            onClick={handleAdd}
            variant="contained"
            disableElevation
            aria-label="Add user"
            sx={{
              bgcolor: colors.accentBlue,
              '&:hover': { bgcolor: colors.accentBlueDark },
              flexShrink: 0,
              minWidth: { xs: 44, sm: 'auto' },
              width: { xs: 44, sm: 'auto' },
              height: { xs: 44, sm: 'auto' },
              px: { xs: 0, sm: 2 },
            }}
          >
            <AddRoundedIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 1 }}>
              Add User
            </Box>
          </Button>
        </Stack>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 240 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={GroupRoundedIcon}
            iconBg={colors.iconBlueBg}
            iconFg={colors.iconBlueFg}
            title={users.length === 0 ? 'No registered users yet.' : 'No users match your search.'}
            description={
              users.length === 0
                ? 'Accounts you create will show up here, ready to manage.'
                : 'Try a different name, employee ID, or email.'
            }
            action={
              users.length === 0 ? (
                <Button onClick={handleAdd} variant="contained" disableElevation startIcon={<AddRoundedIcon />} sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}>
                  Add User
                </Button>
              ) : null
            }
            minHeight={280}
          />
        ) : (
          <>
            <Stack spacing={1} sx={{ display: { xs: 'flex', md: 'none' }, flex: 1, minHeight: 0, overflow: 'auto' }}>
              {filteredUsers.map((user) => (
                <UserMobileCard key={user.id} user={user} onOpenMenu={openRowMenu} />
              ))}
            </Stack>

          <Box sx={{ display: { xs: 'none', md: 'block' }, flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' }}>Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' }}>Registered</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700, bgcolor: avatarColorFor(user.id) }}>
                          {getInitials(user.userName)}
                        </Avatar>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.userName}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{user.employeeId}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.accessRole === 'admin' ? 'Admin' : 'User'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: user.accessRole === 'admin' ? colors.iconPurpleBg : 'grey.100',
                          color: user.accessRole === 'admin' ? colors.iconPurpleFg : 'text.secondary',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={userStatus(user).label}
                        size="small"
                        sx={{ fontWeight: 700, bgcolor: userStatus(user).bg, color: userStatus(user).fg }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{formatDate(user.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(user)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!user.isVerified ? (
                          <Tooltip title="Verify">
                            <IconButton size="small" onClick={() => handleVerify(user)}>
                              <CheckCircleOutlineRoundedIcon fontSize="small" color="success" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          // Admin accounts can't be deactivated (the backend
                          // rejects it too) — otherwise an admin could lock
                          // every admin, themselves included, out of this
                          // module. Shown disabled rather than hidden so the
                          // reason is visible instead of the button just
                          // silently missing on some rows.
                          <Tooltip title={isAdminAccount(user) ? 'Admin accounts cannot be deactivated' : user.isActive ? 'Deactivate' : 'Activate'}>
                            <span>
                              <IconButton size="small" disabled={isAdminAccount(user)} onClick={() => handleToggleActive(user)}>
                                {user.isActive ? <BlockRoundedIcon fontSize="small" color={isAdminAccount(user) ? 'disabled' : 'error'} /> : <CheckCircleOutlineRoundedIcon fontSize="small" color={isAdminAccount(user) ? 'disabled' : 'success'} />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          </>
        )}
      </Paper>

      <UserFormDialog open={dialogOpen} user={editingUser} onClose={() => setDialogOpen(false)} onSubmit={handleSubmit} />

      <TypedConfirmDialog
        key={pendingToggleUser?.id ?? 'closed'}
        open={Boolean(pendingToggleUser)}
        title={pendingToggleUser?.isActive ? 'Deactivate user' : 'Reactivate user'}
        confirmWord={pendingToggleUser?.isActive ? 'DEACTIVATE' : 'REACTIVATE'}
        message={
          <UserProfileReview
            user={pendingToggleUser}
            intro={
              pendingToggleUser?.isActive
                ? 'Review this account before deactivating it. This locks them out — they can be reactivated later.'
                : 'Review this account before reactivating it. This restores their access.'
            }
          />
        }
        confirmLabel={pendingToggleUser?.isActive ? 'Yes, Deactivate' : 'Yes, Reactivate'}
        onCancel={() => setPendingToggleUser(null)}
        onConfirm={handleConfirmToggle}
      />

      <TypedConfirmDialog
        key={pendingVerifyUser?.id ?? 'closed'}
        open={Boolean(pendingVerifyUser)}
        title="Activate user"
        confirmWord="ACTIVATE"
        message={<UserProfileReview user={pendingVerifyUser} intro="Review this account before activating it." />}
        confirmLabel="Yes, Activate"
        onCancel={() => setPendingVerifyUser(null)}
        onConfirm={handleConfirmVerify}
      />

      {/* Mobile only — opened from UserMobileCard's kebab button. */}
      <Menu anchorEl={rowMenu?.anchorEl} open={Boolean(rowMenu)} onClose={closeRowMenu} disableScrollLock>
        <MenuItem
          onClick={() => {
            handleEdit(rowMenu.user);
            closeRowMenu();
          }}
        >
          <ListItemIcon>
            <EditRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        {rowMenu && !rowMenu.user.isVerified ? (
          <MenuItem
            onClick={() => {
              handleVerify(rowMenu.user);
              closeRowMenu();
            }}
          >
            <ListItemIcon>
              <CheckCircleOutlineRoundedIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Verify</ListItemText>
          </MenuItem>
        ) : (
          // Same admin protection as the desktop table above.
          <MenuItem
            disabled={Boolean(rowMenu && isAdminAccount(rowMenu.user))}
            onClick={() => {
              handleToggleActive(rowMenu.user);
              closeRowMenu();
            }}
          >
            <ListItemIcon>
              {rowMenu?.user.isActive ? (
                <BlockRoundedIcon fontSize="small" color="error" />
              ) : (
                <CheckCircleOutlineRoundedIcon fontSize="small" color="success" />
              )}
            </ListItemIcon>
            <ListItemText>
              {rowMenu && isAdminAccount(rowMenu.user)
                ? 'Admins cannot be deactivated'
                : rowMenu?.user.isActive ? 'Deactivate' : 'Activate'}
            </ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Stack>
  );
}

export default AdminUsersPage;
