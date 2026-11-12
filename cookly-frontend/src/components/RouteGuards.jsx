/**
 * Route guards:
 * - RequireAuth: logged-out users are sent to /login (and come back afterwards).
 * - GuestOnly:   logged-in users skip the landing / auth pages.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function FullPageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <span className="spinner" style={{ width: 32, height: 32, color: 'var(--primary)' }} aria-label="Loading" />
    </div>
  );
}

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/home" replace />;
  return <Outlet />;
}
