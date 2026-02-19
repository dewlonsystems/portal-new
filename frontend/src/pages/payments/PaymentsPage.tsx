import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/config/api';
import { CreditCardIcon, CurrencyBangladeshiIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { Transaction, TransactionInitiateRequest, PaymentMethod } from '@/types';

interface PaymentFormData {
  amount: string;
  payment_method: PaymentMethod;
  phone_number: string;
  email: string;
  description: string;
}

export function PaymentsPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: '',
    payment_method: 'MPESA',
    phone_number: '',
    email: user?.email || '',
    description: '',
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Transaction | null>(null);
  const [pollingTransaction, setPollingTransaction] = useState<Transaction | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'completed' | 'failed'>('idle');
  
  // Poll for Mpesa transaction status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (pollingTransaction && pollingStatus === 'polling') {
      pollInterval = setInterval(async () => {
        try {
          const response = await apiService.get<Transaction>(
            `/payments/status/${pollingTransaction.reference_code}/`
          );
          
          if (response.status === 'COMPLETED') {
            setPollingStatus('completed');
            setSuccess(response);
            setTimeout(() => {
              setPollingTransaction(null);
              setPollingStatus('idle');
              setSuccess(null);
            }, 3000);
          } else if (response.status === 'FAILED') {
            setPollingStatus('failed');
            setError(response.failed_reason || 'Payment failed');
            setTimeout(() => {
              setPollingTransaction(null);
              setPollingStatus('idle');
              setError(null);
            }, 5000);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollingTransaction, pollingStatus]);
  
  const validateForm = (): boolean => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    
    if (formData.payment_method === 'MPESA' && !formData.phone_number) {
      setError('Phone number is required for Mpesa payments');
      return false;
    }
    
    if (formData.payment_method === 'PAYSTACK' && !formData.email) {
      setError('Email is required for Paystack payments');
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
      const payload: TransactionInitiateRequest = {
        amount: formData.amount,
        payment_method: formData.payment_method,
        description: formData.description,
      };
      
      if (formData.payment_method === 'MPESA') {
        payload.phone_number = formData.phone_number;
      } else {
        payload.email = formData.email;
      }
      
      const response = await apiService.post<Transaction>('/payments/initiate/', payload);
      
      if (formData.payment_method === 'MPESA') {
        // Start polling for Mpesa
        setPollingTransaction(response);
        setPollingStatus('polling');
      } else if (formData.payment_method === 'PAYSTACK') {
        // Redirect to Paystack checkout
        const paystackData = response as unknown as { authorization_url?: string };
        if (paystackData.authorization_url) {
          window.location.href = paystackData.authorization_url;
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Payment initiation failed';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payments</h1>
        <p className="text-foreground-muted mt-1">
          Initiate payments via Mpesa or Paystack
        </p>
      </div>
      
      {/* Payment Form Card */}
      <div className="card max-w-2xl">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-foreground">Initiate Payment</h2>
        </div>
        <div className="card-body">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg flex items-start gap-3">
              <XCircleIcon className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-error font-medium">Payment failed</p>
                <p className="text-sm text-error/80">{error}</p>
              </div>
            </div>
          )}
          
          {/* Success Alert */}
          {success && (
            <div className="mb-6 p-4 bg-success/10 border border-success rounded-lg flex items-start gap-3">
              <CheckCircleIcon className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-success font-medium">Payment completed!</p>
                <p className="text-sm text-success/80">
                  Reference: {success.reference_code}
                </p>
              </div>
            </div>
          )}
          
          {/* Mpesa Polling Modal */}
          {pollingTransaction && pollingStatus === 'polling' && (
            <div className="mb-6 p-6 bg-primary/10 border border-primary rounded-lg text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-foreground font-medium">Processing Mpesa Payment</p>
              <p className="text-sm text-foreground-muted mt-1">
                Check your phone for the STK push prompt
              </p>
              <p className="text-xs text-foreground-muted mt-2">
                Reference: {pollingTransaction.reference_code}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
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
            
            {/* Payment Method */}
            <div>
              <label htmlFor="payment_method" className="input-label">
                Payment Method
              </label>
              <select
                id="payment_method"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleInputChange}
                className="input"
              >
                <option value="MPESA">Mpesa (STK Push)</option>
                <option value="PAYSTACK">Paystack (Card/Bank)</option>
              </select>
            </div>
            
            {/* Phone Number (Mpesa) */}
            {formData.payment_method === 'MPESA' && (
              <div>
                <label htmlFor="phone_number" className="input-label">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="h-5 w-5 text-foreground-muted" />
                  </div>
                  <input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="input pl-10"
                    placeholder="254712345678"
                  />
                </div>
                <p className="input-helper">Format: 2547XXXXXXXX</p>
              </div>
            )}
            
            {/* Email (Paystack) */}
            {formData.payment_method === 'PAYSTACK' && (
              <div>
                <label htmlFor="email" className="input-label">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-foreground-muted" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input pl-10"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            )}
            
            {/* Description */}
            <div>
              <label htmlFor="description" className="input-label">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="input"
                placeholder="What is this payment for?"
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
                `Pay with ${formData.payment_method === 'MPESA' ? 'Mpesa' : 'Paystack'}`
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* Payment Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <CreditCardIcon className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-foreground">Mpesa Payments</h3>
            </div>
            <ul className="text-sm text-foreground-muted space-y-2">
              <li>• STK Push to your phone</li>
              <li>• Enter Mpesa PIN to complete</li>
              <li>• Instant confirmation</li>
              <li>• Reference code: DPXXXXXXXX</li>
            </ul>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <CreditCardIcon className="h-6 w-6 text-accent" />
              <h3 className="font-semibold text-foreground">Paystack Payments</h3>
            </div>
            <ul className="text-sm text-foreground-muted space-y-2">
              <li>• Card or Bank Transfer</li>
              <li>• Secure checkout page</li>
              <li>• Email confirmation</li>
              <li>• Reference code: DPXXXXXXXX</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}