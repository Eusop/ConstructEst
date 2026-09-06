import AppRoutes from './routes/AppRoutes';
import ScrollToTop from './routes/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { UserProvider } from './context/UserContext';
import { ToastProvider } from './context/ToastContext';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <UserProvider>
          <ScrollToTop />
          <AppRoutes />
        </UserProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
