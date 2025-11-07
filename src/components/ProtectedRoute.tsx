import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { currentUser, userData, loading } = useAuth();
  const location = useLocation();

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    // Store current path so user can be redirected back after login
    sessionStorage.setItem('previousPath', location.pathname);
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but no userData, allow access with fallback role assumption
  if (currentUser && !userData) {
    console.log('User authenticated but no userData - allowing access');
    return <>{children}</>;
  }

  if (requiredRole && userData?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
