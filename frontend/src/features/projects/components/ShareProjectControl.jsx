import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import { apiRequest } from '../../../services/apiClient';
import { useProjects } from '../../../context/ProjectsContext';
import { isProjectComplete } from '../utils/projectStatus';
import { useToast } from '../../../context/ToastContext';
import { ROUTES } from '../../../routes/paths';
import { colors } from '../../../theme/palette';

const SWITCH_SX = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: colors.accentBlue },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: colors.accentBlue },
};

/**
 * "Share in Explore" switches for the active project. Only shown for Complete
 * projects. Off by default; others then see its name, size, cost and
 * materials, never its owner or location. The floor plan is a separate choice
 * and needs sharing to be on.
 */
function ShareProjectControl() {
  const { activeProject, updateActiveProject } = useProjects();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  if (!activeProject || typeof activeProject.id !== 'number' || !isProjectComplete(activeProject)) return null;

  const shared = Boolean(activeProject.shareInExplore);
  const floorPlan = Boolean(activeProject.shareFloorPlan);
  const save = async (shareInExplore, shareFloorPlan) => {
    setSaving(true);
    try {
      const { project } = await apiRequest(`/projects/${activeProject.id}/sharing`, { method: 'PATCH', body: { shareInExplore, shareFloorPlan } });
      updateActiveProject({ shareInExplore: project.shareInExplore, shareFloorPlan: project.shareFloorPlan });
    } catch (error) {
      showToast(error.message || 'Could not change sharing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: { xs: 1.5, sm: 2 }, py: 1, bgcolor: 'common.white' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.5, md: 2.5 }} sx={{ alignItems: { md: 'center' } }}>
        <FormControlLabel
          sx={{ mr: 0 }}
          control={<Switch size="small" checked={shared} disabled={saving} onChange={(e) => save(e.target.checked, e.target.checked && floorPlan)} sx={SWITCH_SX} />}
          label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Share in Explore</Typography>}
        />
        <FormControlLabel
          sx={{ mr: 0 }}
          control={<Switch size="small" checked={floorPlan} disabled={saving || !shared} onChange={(e) => save(true, e.target.checked)} sx={SWITCH_SX} />}
          label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: shared ? 'text.primary' : 'text.disabled' }}>Include floor plan</Typography>}
        />
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', flex: 1 }}>
          {shared
            ? <>Others can see this project&apos;s name, size, cost and materials in <Link component={RouterLink} to={ROUTES.EXPLORE} underline="hover">Explore</Link>, but not its owner or location.</>
            : 'Not shared. Turn on to let others see this project’s name, size, cost and materials, without its owner or location.'}
        </Typography>
      </Stack>
    </Box>
  );
}

export default ShareProjectControl;
