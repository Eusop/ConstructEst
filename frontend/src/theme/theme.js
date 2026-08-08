import { createTheme } from '@mui/material/styles';
import { colors } from './palette';

/**
 * Application theme.
 * Component-level defaults (rounded inputs, non-uppercase bold buttons, etc.)
 * live here so individual components stay free of repetitive styling.
 */
const theme = createTheme({
  palette: {
    primary: {
      main: colors.brandBlue,
      dark: colors.brandBlueDark,
      light: colors.brandBlueLight,
    },
    secondary: {
      main: colors.orange,
      dark: colors.orangeDark,
      contrastText: colors.white,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
  },

  typography: {
    fontFamily: ['Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h5: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
  },

  shape: { borderRadius: 8 },

  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: colors.white,
          '& fieldset': { borderColor: colors.inputBorder },
          '&:hover fieldset': { borderColor: colors.inputBorderHover },
        },
        input: {
          padding: '14px 14px',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingBlock: 12,
          fontSize: '1.05rem',
        },
      },
    },
  },
});

export default theme;
