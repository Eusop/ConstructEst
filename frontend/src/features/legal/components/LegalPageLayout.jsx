import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Navbar from '../../../layouts/Navbar';
import Footer from '../../../layouts/Footer';
import { colors } from '../../../theme/palette';

/**
 * Shared chrome for the Terms of Service and Privacy Policy pages — same
 * Navbar/Footer as the landing page (so these read as real, navigable pages
 * rather than a bare content dump), a title, a "last updated" line, and a
 * simple stack of labeled sections.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.updatedLabel e.g. "Last updated: September 2026".
 * @param {Array<{heading: string, body: string}>} props.sections
 */
function LegalPageLayout({ title, updatedLabel, sections }) {
  return (
    <Box>
      <Navbar />
      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', md: '2rem' }, color: 'text.primary', mb: 0.5 }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 4 }}>{updatedLabel}</Typography>

        <Stack spacing={3.5}>
          {sections.map((section) => (
            <Box key={section.heading}>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: colors.accentBlue, mb: 1 }}>
                {section.heading}
              </Typography>
              <Typography sx={{ color: 'text.primary', fontSize: '0.95rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {section.body}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Container>
      <Footer />
    </Box>
  );
}

export default LegalPageLayout;
