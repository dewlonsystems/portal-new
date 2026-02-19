import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/config/api';
import { User } from '@/types';
import { UserPlusIcon, TrashIcon, KeyIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { Navigate } from 'react-router-dom';

interface CreateUserFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: 'ADMIN' | 'STAFF';
  password: string;
}

export function UserManagementPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState<CreateUserFormData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role: 'STAFF',
    password: '',
  });
  
  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{ results: User[] }>('/users/list/');
      setUsers(response.results);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Valid email is required');
      return false;
    }
    
    if (!formData.first_name.trim()) {
      setError('First name is required');
      return false;
    }
    
    if (!formData.phone_number) {
      setError('Phone number is required');
      return false;
    }
    
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    
    return true;
  };
  
  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await apiService.post('/users/list/', formData);
      setSuccess(`User ${formData.username} created successfully. Temporary password sent to their email.`);
      setShowCreateModal(false);
      fetchUsers();
      
      // Reset form
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        role: 'STAFF',
        password: '',
      });
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
    }
  };
  
  const handleResetPassword = async (userId: number, username: string) => {
    if (!confirm(`Reset password for ${username}? A temporary password will be sent to their email.`)) {
      return;
    }
    
    try {
      await apiService.post(`/users/admin-reset/${userId}/`, { admin_note: 'Password reset by admin' });
      setSuccess(`Password reset for ${username}. Temporary password sent to their email.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
    }
  };
  
  const handleDisableUser = async (userId: number, username: string, isLocked: boolean) => {
    const action = isLocked ? 'enable' : 'disable';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user ${username}?`)) {
      return;
    }
    
    try {
      await apiService.patch(`/users/${userId}/`, { is_locked: !isLocked });
      setSuccess(`User ${username} ${action}d successfully`);
      fetchUsers();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} user`;
      setError(errorMessage);
    }
  };
  
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await apiService.delete(`/users/${selectedUser.id}/`);
      setSuccess(`User ${selectedUser.username} deleted successfully`);
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMessage);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const getRoleBadge = (role: string) => {
    return role === 'ADMIN' ? (
      <span className="badge badge-primary">Admin</span>
    ) : (
      <span className="badge badge-secondary">Staff</span>
    );
  };
  
  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-foreground-muted mt-1">
            Create, manage, and control user access
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>
      
      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-error/10 border border-error rounded-lg flex items-start gap-3">
          <XCircleIcon className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-error font-medium">Error</p>
            <p className="text-sm text-error/80">{error}</p>
          </div>
        </div>
      )}
      
      {/* Success Alert */}
      {success && (
        <div className="p-4 bg-success/10 border border-success rounded-lg flex items-start gap-3">
          <CheckCircleIcon className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-success font-medium">Success</p>
            <p className="text-sm text-success/80">{success}</p>
          </div>
        </div>
      )}
      
      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-foreground">
            All Users ({users.length})
          </h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-foreground-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <UserCircleIcon className="h-8 w-8 text-foreground-muted" />
                        <div>
                          <p className="font-medium text-foreground">{user.first_name} {user.last_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-sm">{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.phone_number}</td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>
                      {user.is_locked ? (
                        <span className="badge badge-error">Disabled</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResetPassword(user.id, user.username)}
                          className="btn btn-sm btn-secondary"
                          title="Reset Password"
                        >
                          <KeyIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDisableUser(user.id, user.username, user.is_locked)}
                          className="btn btn-sm btn-secondary"
                          title={user.is_locked ? 'Enable User' : 'Disable User'}
                        >
                          {user.is_locked ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteConfirm(true);
                          }}
                          className="btn btn-sm btn-danger"
                          title="Delete User"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-foreground">Create New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-foreground-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="input"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="input-label">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Phone Number</label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="254712345678"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="input-label">Temporary Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                  />
                  <p className="input-helper">User will be required to change this on first login</p>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-error">Delete User</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-foreground-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="text-foreground mb-4">
                Are you sure you want to delete <strong>{selectedUser.username}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="btn btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}