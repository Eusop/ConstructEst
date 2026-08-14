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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import EmptyState from '../components/EmptyState';
import UserFormDialog from '../components/UserFormDialog';
import { useAdminActivity } from '../context/AdminActivityContext';
import { useAdminToast } from '../context/AdminToastContext';
import { listAdminUsers, createAdminUser, updateAdminUser, setAdminUserActive } from '../services/adminService';
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
    return users.filter((user) => [user.userName, user.username, user.email].some((value) => value?.toLowerCase().includes(term)));
  }, [users, search]);

  const handleAdd = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleSubmit = async (form) => {
    if (editingUser) {
      await updateAdminUser(editingUser.id, { firstName: form.firstName, lastName: form.lastName, email: form.email, accessRole: form.accessRole });
      logActivity({ message: `User updated — ${form.firstName} ${form.lastName}`, icon: EditRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg });
      showToast('User updated');
    } else {
      await createAdminUser(form);
      logActivity({ message: `User account created — ${form.firstName} ${form.lastName}`, icon: AddRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg });
      showToast('User created');
    }
    setDialogOpen(false);
    load();
  };

  const handleToggleActive = async (user) => {
    await setAdminUserActive(user.id, !user.isActive);
    logActivity({
      message: `User ${user.isActive ? 'deactivated' : 'reactivated'} — ${user.userName}`,
      icon: user.isActive ? BlockRoundedIcon : CheckCircleOutlineRoundedIcon,
      iconBg: user.isActive ? colors.iconRedBg : colors.iconGreenBg,
      iconFg: user.isActive ? colors.iconRedFg : colors.iconGreenFg,
    });
    showToast(user.isActive ? 'User deactivated' : 'User reactivated', user.isActive ? 'warning' : 'success');
    load();
  };

  return (
    <Stack spacing={2.5} sx={{ width: '100%', flex: 1, minHeight: 0 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'text.primary' }}>User Management</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>View, create, and manage registered accounts.</Typography>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', p: { xs: 2, md: 2.5 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2, flexShrink: 0 }}>
          <Box
            sx={{
              flex: 1,
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
            <SearchRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Box
              component="input"
              placeholder="Search users by name, username, or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ border: 'none', outline: 'none', bgcolor: 'transparent', width: '100%', font: 'inherit', color: 'text.primary' }}
            />
          </Box>
          <Button
            onClick={handleAdd}
            variant="contained"
            disableElevation
            startIcon={<AddRoundedIcon />}
            sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark }, flexShrink: 0 }}
          >
            Add User
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
                : 'Try a different name, username, or email.'
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
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' }}>Username</TableCell>
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
                    <TableCell sx={{ color: 'text.secondary' }}>{user.username}</TableCell>
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
                        label={user.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: user.isActive ? colors.iconGreenBg : 'grey.100',
                          color: user.isActive ? colors.iconGreenFg : 'text.secondary',
                        }}
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
                        <Tooltip title={user.isActive ? 'Deactivate' : 'Activate'}>
                          <IconButton size="small" onClick={() => handleToggleActive(user)}>
                            {user.isActive ? <BlockRoundedIcon fontSize="small" color="error" /> : <CheckCircleOutlineRoundedIcon fontSize="small" color="success" />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      <UserFormDialog open={dialogOpen} user={editingUser} onClose={() => setDialogOpen(false)} onSubmit={handleSubmit} />
    </Stack>
  );
}

export default AdminUsersPage;
