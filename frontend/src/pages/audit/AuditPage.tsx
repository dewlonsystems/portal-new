import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/config/api';
import { Navigate } from 'react-router-dom';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { XCircleIcon } from '@heroicons/react/24/solid';

interface AuditLog {
  id: number;
  user: number | null;
  user_username: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
  action: string;
  description: string;
  ip_address: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function AuditPage() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  useEffect(() => {
    fetchLogs();
  }, [currentPage, actionFilter]);
  
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(searchTerm && { search: searchTerm }),
      });
      
      const response = await apiService.get<PaginatedResponse<AuditLog>>(`/audit/logs/?${params}`);
      setLogs(response.results);
      setTotalCount(response.count);
      setTotalPages(Math.ceil(response.count / 20));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audit logs';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs();
  };
  
  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      LOGIN: 'badge-success',
      LOGOUT: 'badge-secondary',
      USER_CREATED: 'badge-primary',
      USER_DELETED: 'badge-error',
      PASSWORD_CHANGED: 'badge-warning',
      PAYMENT_INITIATED: 'badge-primary',
      PAYMENT_COMPLETED: 'badge-success',
      PAYMENT_FAILED: 'badge-error',
      PAYOUT_INITIATED: 'badge-primary',
      PAYOUT_COMPLETED: 'badge-success',
      CONTRACT_SIGNED: 'badge-success',
      INVOICE_CREATED: 'badge-primary',
      INVOICE_SENT: 'badge-primary',
      RECEIPT_GENERATED: 'badge-secondary',
      DOCUMENT_VERIFIED: 'badge-secondary',
    };
    
    return (
      <span className={`badge ${colors[action] || 'badge-secondary'}`}>
        {action.replace(/_/g, ' ')}
      </span>
    );
  };
  
  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-foreground-muted mt-1">
          View all system activities and user actions
        </p>
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
      
      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-foreground-muted" />
              </div>
              <input
                type="text"
                placeholder="Search by user or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="input pl-10"
              />
            </div>
            
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="input"
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="USER_CREATED">User Created</option>
              <option value="USER_DELETED">User Deleted</option>
              <option value="PAYMENT_COMPLETED">Payment Completed</option>
              <option value="PAYMENT_FAILED">Payment Failed</option>
              <option value="PAYOUT_COMPLETED">Payout Completed</option>
              <option value="CONTRACT_SIGNED">Contract Signed</option>
              <option value="INVOICE_CREATED">Invoice Created</option>
            </select>
            
            <button onClick={handleSearch} className="btn btn-primary">
              <FunnelIcon className="h-5 w-5 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="card bg-primary text-white">
        <div className="card-body">
          <p className="text-sm text-white/80">Total Audit Logs</p>
          <p className="text-3xl font-bold mt-1">{totalCount}</p>
        </div>
      </div>
      
      {/* Audit Logs Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-foreground">
            System Activity
          </h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Description</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-foreground-muted">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-sm text-foreground-muted whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      {log.user_username ? (
                        <div>
                          <p className="font-medium">{log.user_first_name} {log.user_last_name}</p>
                          <p className="text-xs text-foreground-muted">@{log.user_username}</p>
                        </div>
                      ) : (
                        <span className="text-foreground-muted">System</span>
                      )}
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    <td className="max-w-md truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="text-sm text-foreground-muted font-mono">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer flex items-center justify-between">
            <p className="text-sm text-foreground-muted">
              Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-sm btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-sm btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}