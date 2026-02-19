import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserCircleIcon, LockClosedIcon, KeyIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, XCircleIcon as XCircleSolid } from '@heroicons/react/24/solid';

export function ProfilePage() {
  const { user, updateProfile, changePassword, requestPasswordReset } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isStaff] = useState(user?.role === 'STAFF');
  
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return 'Password must contain alphanumeric characters';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };
  
  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      await updateProfile(profileData);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
    }
  };
  
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    
    const passwordError = validatePassword(passwordData.new_password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
    try {
      await changePassword(passwordData.old_password, passwordData.new_password);
      setSuccess('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
      setError(errorMessage);
    }
  };
  
  const handleRequestPasswordReset = async () => {
    if (!confirm('Request password reset? An admin will review and reset your password.')) {
      return;
    }
    
    try {
      await requestPasswordReset();
      setSuccess('Password reset requested! An admin will review your request.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request password reset';
      setError(errorMessage);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-foreground-muted mt-1">
          Manage your account settings and password
        </p>
      </div>
      
      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-error/10 border border-error rounded-lg flex items-start gap-3">
          <XCircleSolid className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-error font-medium">Error</p>
            <p className="text-sm text-error/80">{error}</p>
          </div>
        </div>
      )}
      
      {/* Success Alert */}
      {success && (
        <div className="p-4 bg-success/10 border border-success rounded-lg flex items-start gap-3">
          <CheckCircleSolid className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-success font-medium">Success</p>
            <p className="text-sm text-success/80">{success}</p>
          </div>
        </div>
      )}
      
      {/* Profile Card */}
      <div className="card max-w-2xl">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Account Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-sm btn-secondary"
            >
              <UserCircleIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
          )}
        </div>
        <div className="card-body">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <UserCircleIcon className="h-16 w-16 text-foreground-muted" />
              <div>
                <p className="text-lg font-semibold text-foreground">{user?.first_name} {user?.last_name}</p>
                <p className="text-sm text-foreground-muted">{user?.role}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={profileData.first_name}
                  onChange={handleInputChange}
                  className="input"
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="input-label">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={profileData.last_name}
                  onChange={handleInputChange}
                  className="input"
                  disabled={!isEditing}
                />
              </div>
            </div>
            
            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleInputChange}
                className="input"
                disabled={!isEditing}
              />
            </div>
            
            <div>
              <label className="input-label">Phone Number</label>
              <input
                type="tel"
                name="phone_number"
                value={profileData.phone_number}
                onChange={handleInputChange}
                className="input"
                disabled={!isEditing}
              />
            </div>
            
            <div>
              <label className="input-label">Username</label>
              <input
                type="text"
                value={user?.username || ''}
                className="input bg-secondary"
                disabled
              />
              <p className="input-helper">Username cannot be changed</p>
            </div>
            
            {isEditing && (
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setProfileData({
                      first_name: user?.first_name || '',
                      last_name: user?.last_name || '',
                      email: user?.email || '',
                      phone_number: user?.phone_number || '',
                    });
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
      
      {/* Password Card */}
      <div className="card max-w-2xl">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-foreground">Security</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div className="flex items-center gap-3">
              <LockClosedIcon className="h-6 w-6 text-foreground-muted" />
              <div>
                <p className="font-medium text-foreground">Change Password</p>
                <p className="text-sm text-foreground-muted">Update your password regularly for security</p>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="btn btn-secondary"
            >
              <KeyIcon className="h-4 w-4 mr-2" />
              Change
            </button>
          </div>
          
          {isStaff && (
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <KeyIcon className="h-6 w-6 text-foreground-muted" />
                <div>
                  <p className="font-medium text-foreground">Request Password Reset</p>
                  <p className="text-sm text-foreground-muted">Staff can request admin to reset password</p>
                </div>
              </div>
              <button
                onClick={handleRequestPasswordReset}
                className="btn btn-secondary"
              >
                Request Reset
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-foreground">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-foreground-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="input-label">Current Password</label>
                  <input
                    type="password"
                    name="old_password"
                    value={passwordData.old_password}
                    onChange={handlePasswordChange}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">New Password</label>
                  <input
                    type="password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    className="input"
                    required
                    minLength={8}
                  />
                </div>
                
                <div>
                  <label className="input-label">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    className="input"
                    required
                  />
                </div>
                
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs text-foreground-muted">
                    Password must be at least 8 characters with alphanumeric and special characters
                  </p>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}