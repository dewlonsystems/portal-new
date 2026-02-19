import { apiService } from '@/config/api';
import { LoginRequest, LoginResponse, TokenRefreshResponse, User } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

export const authService = {
  /**
   * Login user with username and password
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiService.post<LoginResponse>('/auth/login/', credentials);
    
    // Store tokens and user info
    useAuthStore.getState().setTokens(response.access, response.refresh);
    useAuthStore.getState().setUser({
      id: 0, // Will be fetched from profile
      username: credentials.username,
      email: '',
      first_name: response.first_name,
      last_name: '',
      phone_number: '',
      role: response.role,
      is_locked: false,
      date_joined: new Date().toISOString(),
      must_change_password: response.must_change_password,
    });
    
    return response;
  },
  
  /**
   * Refresh access token
   */
  refreshToken: async (): Promise<TokenRefreshResponse> => {
    const refreshToken = useAuthStore.getState().refreshToken;
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await apiService.post<TokenRefreshResponse>('/auth/refresh/', {
      refresh: refreshToken,
    });
    
    useAuthStore.getState().setAccessToken(response.access);
    
    return response;
  },
  
  /**
   * Get current user profile
   */
  getProfile: async (): Promise<User> => {
    const response = await apiService.get<User>('/users/profile/');
    useAuthStore.getState().setUser(response);
    return response;
  },
  
  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiService.patch<User>('/users/profile/', data);
    useAuthStore.getState().setUser(response);
    return response;
  },
  
  /**
   * Change password
   */
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await apiService.put('/users/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },
  
  /**
   * Request password reset (for staff)
   */
  requestPasswordReset: async (): Promise<void> => {
    await apiService.post('/users/request-reset/');
  },
  
  /**
   * Logout user
   */
  logout: () => {
    useAuthStore.getState().logout();
  },
};