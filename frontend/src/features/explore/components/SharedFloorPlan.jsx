import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import DXFPreview from '../../../components/DXFPreview';
import { apiRequest } from '../../../services/apiClient';

/**
 * Floor plan of a shared project, only drawn when its owner shared it. The
 * server sends lines and shapes only, never the DXF file or its text.
 *
 * @param {object} props
 * @param {number} props.projectId
 * @param {number} [props.height]
 * @param {boolean} [props.showSecondFloor] Also draw the second floor, if any.
 */
function SharedFloorPlan({ projectId, height = 150, showSecondFloor = false }) {
  const [plan, setPlan] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/explore/${projectId}/floor-plan`)
      .then((data) => { if (!cancelled) setPlan(data); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (failed) {
    return <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>Floor plan not available.</Typography>;
  }
  if (!plan) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={18} />
      </Box>
    );
  }
  const floors = [['Ground floor', plan.ground], ...(showSecondFloor && plan.second ? [['Second floor', plan.second]] : [])];
  return (
    <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: `repeat(${floors.length}, 1fr)` } }}>
      {floors.map(([label, floor]) => (
        <Box key={label}>
          {showSecondFloor && <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>{label}</Typography>}
          <DXFPreview shapes={floor.shapes} bounds={floor.bounds} height={height} />
        </Box>
      ))}
    </Box>
  );
}

export default SharedFloorPlan;
