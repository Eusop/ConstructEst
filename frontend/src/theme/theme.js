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
        // Desktop/tablet values (`fontSize: 1.05rem`, `paddingBlock: 12`)
        // are shared from `sm` up, so every button matches whether the
        // viewport is a tablet or a full desktop — only phones (`down('sm')`)
        // get the smaller, touch-sized variant. This used to key off
        // `down('md')`, which quietly shrank buttons on tablet-width
        // (600–900px) screens too; several call sites had already
        // hand-patched their own `sm`-and-up override back to the desktop
        // size (e.g. the Store Locator/Brand Selection/Bill of Materials
        // "Continue" buttons, "Download PDF report"), while others hadn't
        // (e.g. "New Project", "Save changes", "Create New Project",
        // "Change Photo") — that split was why buttons looked inconsistently
        // sized against each other specifically on tablet.
        //
        // `borderRadius: 10` (up from a flatter 8) is deliberately still a
        // rounded *rectangle*, not a pill — at this button's own height
        // (~54px desktop / ~47px mobile with the padding below), a pill
        // would need ~24-27px. 10 just softens the corner enough to read as
        // smooth/modern instead of a plain sharp-ish box. Every button in
        // the app goes through this one default, so the radius, height, and
        // the interaction states below stay identical everywhere — a
        // call site only ever overrides color, never shape.
        root: ({ theme }) => ({
          borderRadius: 10,
          paddingBlock: 12,
          fontSize: '1.05rem',
          transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'color', 'transform'], {
            duration: theme.transitions.duration.shortest,
          }),
          // A light press-down feel on every button — cheap, universal
          // tactile feedback that doesn't touch color, so it layers under
          // whatever hover/active bgcolor a call site already sets.
          '&:active': {
            transform: 'scale(0.98)',
          },
          // MUI's own contained/outlined/text buttons have no visible focus
          // indicator beyond the browser default outline (easy to lose
          // against a colored button). A consistent ring here — keyboard
          // focus only, not on a mouse click — makes every button in the
          // app accessibly focusable the same way, layered as a shadow so
          // it never fights a call site's own background/border color.
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
        // `disableElevation` (set above) strips MUI's default shadow so
        // every filled button starts perfectly flat, matching the app's flat
        // design language — but that also made a filled button's hover feel
        // completely inert. This adds just the hover/active shadow back
        // (skipped once disabled), independent of whatever bgcolor a call
        // site's own `:hover` sets, so filled buttons across the app get the
        // same subtle "lift" without any of them having to add it by hand.
        {
          props: { variant: 'contained' },
          style: {
            '&:hover:not(.Mui-disabled)': { boxShadow: '0 6px 16px rgba(20, 30, 60, 0.18)' },
            '&:active:not(.Mui-disabled)': { boxShadow: '0 2px 6px rgba(20, 30, 60, 0.16)' },
          },
        },
        // Same idea for outlined buttons that don't set their own hover
        // background (several call sites already do, e.g. NoActiveProjectState's
        // "Go to Projects" — that per-instance `sx` wins for the same
        // property, this is only ever the fallback).
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
