import { useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/authService';


export function useAuth() {
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    setLoading,
    setError,
    clearError,
    isAdmin,
    isStaff,
    hasRole,
  } = useAuthStore();
  
  // Login function
  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    clearError();
    
    try {
      const response = await authService.login({ username, password });
      
      // Fetch full user profile
      await authService.getProfile();
      
      return { success: true, data: response };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setError]);
  
  // Logout function
  const handleLogout = useCallback(() => {
    authService.logout();
  }, []);
  
  // Change password function
  const handleChangePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    setLoading(true);
    clearError();
    
    try {
      await authService.changePassword(oldPassword, newPassword);
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Password change failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setError]);
  
  // Check if user must change password
  const mustChangePassword = user?.must_change_password ?? false;
  
  return {
    // State
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    mustChangePassword,
    
    // Actions
    login,
    logout: handleLogout,
    changePassword: handleChangePassword,
    refreshProfile: authService.getProfile,
    updateProfile: authService.updateProfile,
    requestPasswordReset: authService.requestPasswordReset,
    
    // Helpers
    isAdmin: isAdmin(),
    isStaff: isStaff(),
    hasRole,
    
    // Expose clearError for form handling
    clearError,
  };
}