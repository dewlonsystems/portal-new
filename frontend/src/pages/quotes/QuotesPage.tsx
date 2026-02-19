import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/config/api';
import { Quote, QuoteCreateRequest } from '@/types';
import { DocumentTextIcon, EnvelopeIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, XCircleIcon as XCircleSolid } from '@heroicons/react/24/solid';

export function QuotesPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [formData, setFormData] = useState<QuoteCreateRequest>({
    client_name: '',
    client_email: '',
    client_phone: '',
    service_description: '',
    amount: '',
  });
  
  useEffect(() => {
    fetchQuotes();
  }, []);
  
  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{ results: Quote[] }>('/quotes/list/');
      setQuotes(response.results);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load quotes';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const validateForm = (): boolean => {
    if (!formData.client_name.trim()) {
      setError('Client name is required');
      return false;
    }
    
    if (!formData.client_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
      setError('Valid client email is required');
      return false;
    }
    
    if (!formData.client_phone) {
      setError('Client phone number is required');
      return false;
    }
    
    if (!formData.service_description.trim()) {
      setError('Service description is required');
      return false;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Valid amount is required');
      return false;
    }
    
    return true;
  };
  
  const handleCreateQuote = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await apiService.post('/quotes/create/', formData);
      setSuccess('Quote created and sent to client!');
      setShowCreateModal(false);
      fetchQuotes();
      
      setFormData({
        client_name: '',
        client_email: '',
        client_phone: '',
        service_description: '',
        amount: '',
      });
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create quote';
      setError(errorMessage);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircleSolid className="h-3 w-3" />
            Accepted
          </span>
        );
      case 'SENT':
      case 'VIEWED':
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {status}
          </span>
        );
      case 'REJECTED':
      case 'EXPIRED':
        return (
          <span className="badge badge-error flex items-center gap-1">
            <XCircleSolid className="h-3 w-3" />
            {status}
          </span>
        );
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };
  
  if (loading && quotes.length === 0) {
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
          <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
          <p className="text-foreground-muted mt-1">
            Create and send service quotes to clients
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Create Quote
        </button>
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
      
      {/* Quotes Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-foreground">
            All Quotes ({quotes.length})
          </h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Client</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Valid Until</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-foreground-muted">
                    No quotes yet. Create your first quote to get started.
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id}>
                    <td className="font-mono text-sm">{quote.reference_code}</td>
                    <td>
                      <div>
                        <p className="font-medium">{quote.client_name}</p>
                        <p className="text-xs text-foreground-muted">{quote.client_email}</p>
                      </div>
                    </td>
                    <td className="max-w-xs truncate" title={quote.service_description}>
                      {quote.service_description}
                    </td>
                    <td className="font-semibold">KES {quote.amount}</td>
                    <td>{getStatusBadge(quote.status)}</td>
                    <td className="text-sm text-foreground-muted">
                      {new Date(quote.valid_until).toLocaleDateString()}
                    </td>
                    <td className="text-sm text-foreground-muted">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Create Quote Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-foreground">Create Quote</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-foreground-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateQuote} className="space-y-4">
                <div>
                  <label className="input-label">Client Name</label>
                  <input
                    type="text"
                    name="client_name"
                    value={formData.client_name}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="John Doe"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Client Email</label>
                  <input
                    type="email"
                    name="client_email"
                    value={formData.client_email}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="client@example.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Client Phone</label>
                  <input
                    type="tel"
                    name="client_phone"
                    value={formData.client_phone}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="254712345678"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Service Description</label>
                  <textarea
                    name="service_description"
                    value={formData.service_description}
                    onChange={handleInputChange}
                    className="input"
                    rows={3}
                    placeholder="Describe the service being quoted"
                    required
                  />
                </div>
                
                <div>
                  <label className="input-label">Amount (KES)</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="0.00"
                    step="0.01"
                    min="1"
                    required
                  />
                </div>
                
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-foreground-muted">
                    <strong>Note:</strong> The client will receive an email with the quote PDF attached. 
                    Quotes are valid for 30 days from creation.
                  </p>
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
                    Create & Send
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