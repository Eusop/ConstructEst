import AppRoutes from './routes/AppRoutes';
import ScrollToTop from './routes/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { UserProvider } from './context/UserContext';

function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <ScrollToTop />
        <AppRoutes />
      </UserProvider>
    </ErrorBoundary>
  );
}

export default App;
