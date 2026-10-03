import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { colors } from '../../theme/palette';

/**
 * Shows a generated temporary password once, right after the admin sets it.
 * It is not stored anywhere readable, so closing this dialog is the last time
 * anyone sees it. The user must choose their own at the next sign in.
 *
 * @param {object} props
 * @param {{userName: string, userId: string, password: string, expiresInHours: number} | null} props.result
 * @param {() => void} props.onClose
 */
function TemporaryPasswordDialog({ result, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.password);
      setCopied(true);
    } catch {
      // Clipboard blocked: the password stays visible to copy by hand.
      setCopied(false);
    }
  };

  return (
    <Dialog open={Boolean(result)} onClose={onClose} disableScrollLock maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Temporary password set</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
            Give this password to <strong>{result?.userName}</strong> ({result?.userId}). They must choose a new
            password when they sign in.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 2,
              py: 1.5,
              borderRadius: 2,
              bgcolor: 'grey.100',
            }}
          >
            <Typography
              data-testid="temporary-password"
              sx={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.08em', userSelect: 'all' }}
            >
              {result?.password}
            </Typography>
            <Button
              size="small"
              onClick={handleCopy}
              startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
              sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 700 }}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </Box>
          <Alert severity="warning" sx={{ fontSize: '0.82rem' }}>
            This is the only time it is shown. It stops working after {result?.expiresInHours} hours if unused.
            Give it to the user in person or by a private message.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" disableElevation onClick={onClose} sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TemporaryPasswordDialog;
