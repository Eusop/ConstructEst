import Box from '@mui/material/Box';
import authBackground from '../assets/login-background.png';

/**
 * Full-bleed background for the auth pages (Sign In, Sign Up): the
 * blueprint-style hero image, scaled to cover the viewport, with a dark
 * overlay so the card stays readable.
 */
function AuthBackground() {
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        backgroundImage: `url(${authBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(8, 11, 24, 0.25)' }} />
    </Box>
  );
}

export default AuthBackground;
