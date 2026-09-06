import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { colors } from '../../theme/palette';

const ACCEPTED_EXTENSIONS = /\.(pdf|docx?|xlsx?)$/i;
const INVALID_QUOTATION_MESSAGE = 'Only PDF, Word (.doc/.docx), or Excel (.xls/.xlsx) files are accepted.';

/**
 * "Attach a quotation" file field — required proof (a supplier quote) before
 * an admin can set or change a store's material price (see
 * admin.controller.js's upsertStoreMaterialPrice), shared between
 * BrandFormDialog and BulkMaterialDialog since both let an admin decide a
 * price.
 *
 * @param {object} props
 * @param {File|null} props.file
 * @param {(file: File|null) => void} props.onFileChange
 * @param {string} [props.error]
 */
function QuotationFilePicker({ file, onFileChange, error }) {
  const inputRef = useRef(null);
  const [typeError, setTypeError] = useState('');
  const shownError = typeError || error;

  const handleSelect = (fileList) => {
    const picked = fileList?.[0];
    if (!picked) return;
    if (!ACCEPTED_EXTENSIONS.test(picked.name)) {
      setTypeError(INVALID_QUOTATION_MESSAGE);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setTypeError('');
    onFileChange(picked);
  };

  return (
    <Box>
      <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>
        Quotation (proof of price)
      </Typography>

      {file ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1, pl: 1.5 }}
        >
          <DescriptionRoundedIcon sx={{ fontSize: 18, color: colors.iconBlueFg, flexShrink: 0 }} />
          <Typography noWrap sx={{ fontSize: '0.85rem', color: 'text.primary', flex: 1, minWidth: 0 }}>
            {file.name}
          </Typography>
          <IconButton
            size="small"
            aria-label="Remove quotation file"
            onClick={() => {
              onFileChange(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ) : (
        <Button
          onClick={() => inputRef.current?.click()}
          startIcon={<UploadFileRoundedIcon />}
          fullWidth
          sx={{
            justifyContent: 'flex-start',
            bgcolor: 'common.white',
            color: 'text.secondary',
            border: '1px solid',
            borderColor: shownError ? colors.iconRedFg : 'grey.300',
            '&:hover': { bgcolor: 'grey.50' },
            py: 1,
          }}
        >
          Upload PDF, Word, or Excel file
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        hidden
        onChange={(event) => handleSelect(event.target.files)}
      />

      <Typography sx={{ color: shownError ? colors.iconRedFg : 'text.secondary', fontSize: '0.75rem', mt: 0.5 }}>
        {shownError || 'Required — a supplier quote or similar documentation justifying this price.'}
      </Typography>
    </Box>
  );
}

export default QuotationFilePicker;
