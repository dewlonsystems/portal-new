import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/config/api';
import { Payout, PayoutInitiateRequest } from '@/types';
import { ArrowUpOnSquareIcon, PhoneIcon, UserIcon, CurrencyBangladeshiIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/solid';
import { Navigate } from 'react-router-dom';

interface PayoutFormData {
  recipient_name: string;
  recipient_phone: string;
  amount: string;
  reason: string;
}

export function PayoutsPage() {
  const { isAdmin } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pollingPayout, setPollingPayout] = useState<Payout | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'completed' | 'failed'>('idle');
  
  const [formData, setFormData] = useState<PayoutFormData>({
    recipient_name: '',
    recipient_phone: '',
    amount: '',
    reason: '',
  });
  
  const [summary, setSummary] = useState<{
    total_amount: string;
    total_payouts: number;
    completed_payouts: number;
  } | null>(null);
  
  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  useEffect(() => {
    fetchPayouts();
    fetchSummary();
  }, []);
  
  // Poll for B2C payout status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (pollingPayout && pollingStatus === 'polling') {
      pollInterval = setInterval(async () => {
        try {
          const response = await apiService.get<Payout>(`/payouts/${pollingPayout.id}/`);
          
          if (response.status === 'COMPLETED') {
            setPollingStatus('completed');
            setSuccess(`Payout of KES ${response.amount} completed to ${response.recipient_name}`);
            fetchPayouts();
            fetchSummary();
            setTimeout(() => {
              setPollingPayout(null);
              setPollingStatus('idle');
              setSuccess(null);
            }, 4000);
          } else if (response.status === 'FAILED') {
            setPollingStatus('failed');
            setError(response.failed_reason || 'Payout failed');
            setTimeout(() => {
              setPollingPayout(null);
              setPollingStatus('idle');
              setError(null);
            }, 5000);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000);
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollingPayout, pollingStatus]);
  
  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{ results: Payout[] }>('/payouts/list/');
      setPayouts(response.results);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payouts';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSummary = async () => {
    try {
      const response = await apiService.get<{
        total_amount: string;
        total_payouts: number;
        completed_payouts: number;
      }>('/payouts/summary/');
      setSummary(response);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };
  
  const validateForm = (): boolean => {
    if (!formData.recipient_name.trim()) {
      setError('Recipient name is required');
      return false;
    }
    
    if (!formData.recipient_phone) {
      setError('Phone number is required');
      return false;
    }
    
    if (!formData.recipient_phone.startsWith('254')) {
      setError('Phone number must start with 254 (e.g., 254712345678)');
      return false;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    
    if (!formData.reason.trim()) {
      setError('Reason is required');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const payload: PayoutInitiateRequest = {
        recipient_name: formData.recipient_name,
        recipient_phone: formData.recipient_phone,
        amount: formData.amount,
        reason: formData.reason,
      };
      
      const response = await apiService.post<Payout>('/payouts/initiate/', payload);
      
      // Start polling for B2C status
      setPollingPayout(response);
      setPollingStatus('polling');
      
      // Reset form
      setFormData({
        recipient_name: '',
        recipient_phone: '',
        amount: '',
        reason: '',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Payout initiation failed';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      case 'PROCESSING':
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {status}
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
  
  if (loading && payouts.length === 0) {
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
        <h1 className="text-2xl font-bold text-foreground">Payouts</h1>
        <p className="text-foreground-muted mt-1">
          Initiate Mpesa B2C disbursements to recipients
        </p>
      </div>
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <p className="text-sm text-white/80">Total Disbursed</p>
              <p className="text-3xl font-bold mt-1">KES {summary.total_amount}</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <p className="text-sm text-foreground-muted">Total Payouts</p>
              <p className="text-3xl font-bold text-primary mt-1">{summary.total_payouts}</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <p className="text-sm text-foreground-muted">Completed</p>
              <p className="text-3xl font-bold text-success mt-1">{summary.completed_payouts}</p>
            </div>
          </div>
        </div>
      )}
      
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
      
      {/* Payout Form Card */}
      <div className="card max-w-2xl">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-foreground">Initiate Payout</h2>
        </div>
        <div className="card-body">
          {/* Polling Status */}
          {pollingPayout && pollingStatus === 'polling' && (
            <div className="mb-6 p-6 bg-primary/10 border border-primary rounded-lg text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-foreground font-medium">Processing B2C Payout</p>
              <p className="text-sm text-foreground-muted mt-1">
                Waiting for Mpesa confirmation...
              </p>
              <p className="text-xs text-foreground-muted mt-2">
                Reference: {pollingPayout.reference_code}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recipient Name */}
            <div>
              <label htmlFor="recipient_name" className="input-label">
                Recipient Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-foreground-muted" />
                </div>
                <input
                  id="recipient_name"
                  name="recipient_name"
                  type="text"
                  required
                  value={formData.recipient_name}
                  onChange={handleInputChange}
                  className="input pl-10"
                  placeholder="John Doe"
                />
              </div>
            </div>
            
            {/* Recipient Phone */}
            <div>
              <label htmlFor="recipient_phone" className="input-label">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PhoneIcon className="h-5 w-5 text-foreground-muted" />
                </div>
                <input
                  id="recipient_phone"
                  name="recipient_phone"
                  type="tel"
                  required
                  value={formData.recipient_phone}
                  onChange={handleInputChange}
                  className="input pl-10"
                  placeholder="254712345678"
                />
              </div>
              <p className="input-helper">Format: 2547XXXXXXXX</p>
            </div>
            
            {/* Amount */}
            <div>
              <label htmlFor="amount" className="input-label">
                Amount (KES)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CurrencyBangladeshiIcon className="h-5 w-5 text-foreground-muted" />
                </div>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="input pl-10"
                  placeholder="Enter amount"
                />
              </div>
            </div>
            
            {/* Reason */}
            <div>
              <label htmlFor="reason" className="input-label">
                Reason / Description
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                required
                value={formData.reason}
                onChange={handleInputChange}
                className="input"
                placeholder="e.g., Salary payment, Commission, Refund"
              />
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing || pollingStatus === 'polling'}
              className="w-full btn btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : pollingStatus === 'polling' ? (
                'Waiting for Mpesa...'
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <ArrowUpOnSquareIcon className="h-5 w-5" />
                  <span>Initiate Payout</span>
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* Payouts History Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-foreground">
            Payout History ({payouts.length})
          </h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Recipient</th>
                <th>Phone</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-foreground-muted">
                    No payouts yet
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="font-mono text-sm">{payout.reference_code}</td>
                    <td>{payout.recipient_name}</td>
                    <td>{payout.recipient_phone}</td>
                    <td className="font-semibold">KES {payout.amount}</td>
                    <td>{getStatusBadge(payout.status)}</td>
                    <td className="text-sm text-foreground-muted">
                      {new Date(payout.created_at).toLocaleDateString()}
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