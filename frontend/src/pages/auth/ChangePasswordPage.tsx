import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { changePassword, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  
  const [fieldErrors, setFieldErrors] = useState<{
    old_password?: string;
    new_password?: string;
    confirm_password?: string;
  }>({});
  
  const [success, setSuccess] = useState(false);
  
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
  
  const validateForm = () => {
    const errors: {
      old_password?: string;
      new_password?: string;
      confirm_password?: string;
    } = {};
    
    if (!formData.old_password) {
      errors.old_password = 'Current password is required';
    }
    
    const newPasswordError = validatePassword(formData.new_password);
    if (!formData.new_password) {
      errors.new_password = 'New password is required';
    } else if (newPasswordError) {
      errors.new_password = newPasswordError;
    }
    
    if (!formData.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (formData.new_password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    const result = await changePassword(formData.old_password, formData.new_password);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };
  
  const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm') => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };
  
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary">
        <div className="text-center">
          <CheckCircleIcon className="h-16 w-16 text-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Password Changed Successfully!</h2>
          <p className="text-foreground-muted">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <LockClosedIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Change Password</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            For security, please change your temporary password
          </p>
        </div>
        
        {/* Change Password Card */}
        <div className="card">
          <div className="card-body">
            {/* Global Error */}
            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg flex items-start gap-3">
                <ExclamationCircleIcon className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-error font-medium">Password change failed</p>
                  <p className="text-sm text-error/80">{error}</p>
                </div>
              </div>
            )}
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Old Password */}
              <div>
                <label htmlFor="old_password" className="input-label">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-foreground-muted" />
                  </div>
                  <input
                    id="old_password"
                    name="old_password"
                    type={showPasswords.old ? 'text' : 'password'}
                    required
                    value={formData.old_password}
                    onChange={handleInputChange}
                    className={`input pl-10 pr-10 ${fieldErrors.old_password ? 'input-error' : ''}`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('old')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.old ? (
                      <EyeSlashIcon className="h-5 w-5 text-foreground-muted hover:text-foreground" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-foreground-muted hover:text-foreground" />
                    )}
                  </button>
                </div>
                {fieldErrors.old_password && (
                  <p className="input-error-message">{fieldErrors.old_password}</p>
                )}
              </div>
              
              {/* New Password */}
              <div>
                <label htmlFor="new_password" className="input-label">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-foreground-muted" />
                  </div>
                  <input
                    id="new_password"
                    name="new_password"
                    type={showPasswords.new ? 'text' : 'password'}
                    required
                    value={formData.new_password}
                    onChange={handleInputChange}
                    className={`input pl-10 pr-10 ${fieldErrors.new_password ? 'input-error' : ''}`}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.new ? (
                      <EyeSlashIcon className="h-5 w-5 text-foreground-muted hover:text-foreground" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-foreground-muted hover:text-foreground" />
                    )}
                  </button>
                </div>
                {fieldErrors.new_password && (
                  <p className="input-error-message">{fieldErrors.new_password}</p>
                )}
                <p className="input-helper">
                  Min 8 characters, alphanumeric + special character
                </p>
              </div>
              
              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm_password" className="input-label">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-foreground-muted" />
                  </div>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    required
                    value={formData.confirm_password}
                    onChange={handleInputChange}
                    className={`input pl-10 pr-10 ${fieldErrors.confirm_password ? 'input-error' : ''}`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.confirm ? (
                      <EyeSlashIcon className="h-5 w-5 text-foreground-muted hover:text-foreground" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-foreground-muted hover:text-foreground" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirm_password && (
                  <p className="input-error-message">{fieldErrors.confirm_password}</p>
                )}
              </div>
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Changing password...</span>
                  </div>
                ) : (
                  'Change Password'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}