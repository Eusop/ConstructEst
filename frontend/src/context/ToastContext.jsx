import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const ToastContext = createContext(null);

/**
 * App-wide popup feedback for actions that leave no other trace: a blocked
 * form submit (validation failed or the backend rejected it), a background
 * action succeeding or failing, etc.
 *
 * Mounted at the root (App.jsx), outside every route and role gate, so it also
 * works on Login and Sign up. Unlike AdminToastContext (admin only), nothing is
 * kept once dismissed.
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'error', duration: 4000, key: 0 });

  // duration: longer for messages that need reading (e.g. the over budget warning).
  // A new key per message, so a new toast replaces the one on screen and its
  // timer starts over.
  const showToast = useCallback((message, severity = 'error', duration = 4000) => {
    setToast((prev) => ({ open: true, message, severity, duration, key: prev.key + 1 }));
  }, []);

  // A click elsewhere does not close it. That click is often the one showing
  // the next toast (e.g. picking another store in Store Locator), so it used to
  // close the new message right away. It closes on its timer or with the X.
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast.key}
        open={toast.open}
        autoHideDuration={toast.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={toast.severity} variant="filled" sx={{ fontWeight: 600 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
