import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Shows nothing while the session check is in-flight (avoids flash).
 * Note: Real authorization is enforced server-side; this is a UI convenience.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;                    // wait for /me response
  if (!user)   return <Navigate to="/login" replace />;

  return children;
}
