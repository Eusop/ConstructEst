import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

/**
 * Reusable icon + title + description card, used by both FeaturesSection
 * and WhySection.
 *
 * @param {object} props
 * @param {React.ElementType} props.icon MUI icon component.
 * @param {string} props.iconBg Icon tile background colour.
 * @param {string} props.iconFg Icon colour.
 * @param {string} props.title
 * @param {string} props.description
 * @param {boolean} [props.bordered=true] Whether to draw the card border (FeaturesSection
 *   uses bordered cards, WhySection's are borderless).
 */
function FeatureCard({ icon: Icon, iconBg, iconFg, title, description, bordered = true }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: bordered ? '1px solid' : 'none',
        borderColor: 'grey.200',
        bgcolor: 'common.white',
        height: '100%',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <Icon sx={{ color: iconFg, fontSize: 22 }} />
      </Box>

      <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>{title}</Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>{description}</Typography>
    </Paper>
  );
}

export default FeatureCard;
