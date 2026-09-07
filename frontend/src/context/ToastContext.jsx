import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const ToastContext = createContext(null);

/**
 * App-wide ephemeral popup feedback — "what just happened" for actions that
 * don't otherwise leave any visible trace: a blocked form submit (validation
 * failed, or the backend rejected it — wrong password, duplicate email...),
 * a background action succeeding/failing, etc.
 *
 * Mounted once at the very root (see App.jsx), *outside* every route/role
 * gate, so it's available on the unauthenticated Login/Sign up pages too —
 * unlike NotificationsContext (persisted bell feed, User Module only) and
 * AdminToastContext (Admin Module only), this one has no login requirement
 * and nothing is kept once dismissed.
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'error' });

  const showToast = useCallback((message, severity = 'error') => {
    setToast({ open: true, message, severity });
  }, []);

  const handleClose = () => setToast((prev) => ({ ...prev, open: false }));

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
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
