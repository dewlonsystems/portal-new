import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, UserRole } from '@/types';

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  setTokens: (access: string, refresh: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  logout: () => void;
  
  // Helpers
  isAdmin: () => boolean;
  isStaff: () => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
      }),
      
      setAccessToken: (token) => set({ accessToken: token }),
      
      setRefreshToken: (token) => set({ refreshToken: token }),
      
      setTokens: (access, refresh) => set({ 
        accessToken: access, 
        refreshToken: refresh,
        isAuthenticated: true,
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      logout: () => {
        set(initialState);
        // Clear storage
        localStorage.removeItem('auth-storage');
      },
      
      isAdmin: () => get().user?.role === 'ADMIN',
      
      isStaff: () => get().user?.role === 'STAFF',
      
      hasRole: (role) => {
        const userRole = get().user?.role;
        if (!userRole) return false;
        
        if (Array.isArray(role)) {
          return role.includes(userRole);
        }
        
        return userRole === role;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);