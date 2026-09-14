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
    fontFamily: ['Sora', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h5: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
    // Every fontSize in this app is authored as a `rem` literal (page
    // titles, headings, body text, labels, buttons, nav, tables, form
    // fields, helper text — none of it goes through MUI's variant/pxToRem
    // system, which is barely used here). That makes the actual root
    // <html> font-size — set to match, in styles/index.css — the one lever
    // that scales all of it down together by the same one-step ratio,
    // instead of hand-editing hundreds of individual sx values. This just
    // keeps MUI's own internal pxToRem() math (used by a handful of
    // unstyled built-in component defaults, e.g. Tooltip) consistent with
    // that real root size.
    htmlFontSize: 15,
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
        // A single non-responsive value here was previously desktop-sized
        // for every input in the app, including on phones — this keeps
        // desktop (`md`+) exactly as it was and only shrinks the touch
        // target's padding below it, matching MuiButton's split below.
        input: ({ theme }) => ({
          padding: '14px 14px',
          [theme.breakpoints.down('md')]: { padding: '12px 14px' },
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        // Desktop values (`fontSize: 1.05rem`, `paddingBlock: 12`) are
        // unchanged from before — only the `down('md')` block is new, so
        // every button in the app gets a touch-appropriate size on mobile
        // without each call site having to hand-patch its own `sx` override.
        root: ({ theme }) => ({
          borderRadius: 8,
          paddingBlock: 12,
          fontSize: '1.05rem',
          [theme.breakpoints.down('md')]: {
            fontSize: '0.95rem',
            paddingBlock: 10,
            minHeight: 44,
          },
        }),
      },
    },
  },
});

export default theme;
