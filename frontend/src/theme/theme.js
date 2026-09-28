import { createTheme, alpha } from '@mui/material/styles';
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
    // Every fontSize in the app is a `rem` literal, so the real <html> font-size
    // (set in styles/index.css) scales all text together. This keeps MUI's own
    // pxToRem() math (e.g. Tooltip defaults) consistent with that root size.
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
        // Desktop (`md`+) keeps its size; phones get a smaller touch target
        // padding, matching MuiButton below.
        input: ({ theme }) => ({
          padding: '14px 14px',
          [theme.breakpoints.down('md')]: { padding: '12px 14px' },
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        // Desktop and tablet values (`fontSize: 1.05rem`, `paddingBlock: 12`)
        // apply from `sm` up, so buttons match on tablet and desktop. Only
        // phones (`down('sm')`) get the smaller touch size.
        //
        // `borderRadius: 10` is a softened rounded rectangle, not a pill (a pill
        // would need ~24-27px at this height). Every button uses this default,
        // so radius, height and interaction states stay the same everywhere;
        // call sites only override color.
        root: ({ theme }) => ({
          borderRadius: 10,
          paddingBlock: 12,
          fontSize: '1.05rem',
          transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'color', 'transform'], {
            duration: theme.transitions.duration.shortest,
          }),
          // Light press-down feel on every button. Doesn't touch color, so it
          // sits under any hover/active bgcolor a call site sets.
          '&:active': {
            transform: 'scale(0.98)',
          },
          // MUI buttons have no visible keyboard focus ring beyond the browser
          // default. This adds a consistent ring (keyboard focus only) as a
          // shadow, so it never conflicts with a call site's background or border.
          '&.Mui-focusVisible': {
            boxShadow: `0 0 0 3px ${alpha(colors.accentBlue, 0.35)}`,
          },
          [theme.breakpoints.down('sm')]: {
            fontSize: '0.95rem',
            paddingBlock: 10,
            minHeight: 44,
          },
        }),
      },
      variants: [
        // `disableElevation` removes MUI's shadow, which made filled buttons feel
        // inert on hover. This adds a subtle hover/active lift back (not when
        // disabled), independent of any bgcolor a call site sets.
        {
          props: { variant: 'contained' },
          style: {
            '&:hover:not(.Mui-disabled)': { boxShadow: '0 6px 16px rgba(20, 30, 60, 0.18)' },
            '&:active:not(.Mui-disabled)': { boxShadow: '0 2px 6px rgba(20, 30, 60, 0.16)' },
          },
        },
        // Same for outlined buttons that don't set their own hover background.
        // A call site's own `sx` (e.g. NoActiveProjectState "Go to Projects")
        // wins; this is only the fallback.
        {
          props: { variant: 'outlined' },
          style: {
            '&:hover:not(.Mui-disabled)': { backgroundColor: 'rgba(20, 30, 60, 0.04)' },
          },
        },
      ],
    },
  },
});

export default theme;
