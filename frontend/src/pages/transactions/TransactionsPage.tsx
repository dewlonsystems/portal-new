import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/config/api';
import { Transaction, PaginatedResponse } from '@/types';
import {
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/solid';

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [summary, setSummary] = useState<{ total_amount: string } | null>(null);
  
  useEffect(() => {
    fetchTransactions();
    fetchSummary();
  }, []);
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PaginatedResponse<Transaction>>('/payments/list/');
      setTransactions(response.results);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSummary = async () => {
    try {
      const response = await apiService.get<{ total_amount: string }>('/payments/summary/');
      setSummary(response);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };
  
  const downloadReceipt = async (transactionId: number, referenceCode: string) => {
    try {
      // First generate receipt if not exists
      await apiService.post('/receipts/generate/', { transaction_id: transactionId });
      
      // Then download
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/receipts/${transactionId}/download/`, {
        headers: {
          'Authorization': `Bearer ${useAuth().accessToken}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to download receipt');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt_${referenceCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download receipt';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircleIcon className="h-3 w-3" />
            Completed
          </span>
        );
      case 'PENDING':
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            Pending
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-error flex items-center gap-1">
            <XCircleIcon className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };
  
  const getMethodBadge = (method: string) => {
    return method === 'MPESA' ? (
      <span className="badge badge-primary">Mpesa</span>
    ) : (
      <span className="badge" style={{ backgroundColor: '#635bff', color: 'white' }}>Paystack</span>
    );
  };
  
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.reference_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.user_username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || tx.payment_method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });
  
  if (loading) {
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
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <p className="text-foreground-muted mt-1">
          View all payment transactions and download receipts
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
      
      {/* Summary Card */}
      {summary && (
        <div className="card bg-primary text-white">
          <div className="card-body">
            <p className="text-sm text-white/80">Total Amount Collected</p>
            <p className="text-3xl font-bold mt-1">KES {summary.total_amount}</p>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-foreground-muted" />
              </div>
              <input
                type="text"
                placeholder="Search by reference or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
            
            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Methods</option>
              <option value="MPESA">Mpesa</option>
              <option value="PAYSTACK">Paystack</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Transactions Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-foreground">
            Transactions ({filteredTransactions.length})
          </h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>User</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-foreground-muted">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="font-mono text-sm">{tx.reference_code}</td>
                    <td>{tx.user_first_name} {tx.user_last_name}</td>
                    <td className="font-semibold">KES {tx.amount}</td>
                    <td>{getMethodBadge(tx.payment_method)}</td>
                    <td>{getStatusBadge(tx.status)}</td>
                    <td className="text-sm text-foreground-muted">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {tx.status === 'COMPLETED' ? (
                        <button
                          onClick={() => downloadReceipt(tx.id, tx.reference_code)}
                          className="btn btn-sm btn-secondary"
                          title="Download Receipt"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-foreground-muted text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}