import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requirePasswordChange?: boolean;
}

export function ProtectedRoute({ allowedRoles, requirePasswordChange }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, mustChangePassword } = useAuth();
  
  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground-muted">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to password change if required
  if (mustChangePassword && requirePasswordChange !== false) {
    return <Navigate to="/change-password" replace />;
  }
  
  // Check role permissions
  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // Render child routes
  return <Outlet />;
}