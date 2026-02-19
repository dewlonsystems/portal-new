import { useState, FormEvent, useEffect } from 'react';
import { apiService } from '@/config/api';
import { Contract, ContractCreateRequest } from '@/types';
import { 
  DocumentTextIcon, 
  CheckCircleIcon,
  ClockIcon,
  ClipboardDocumentIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  TrashIcon,
  EnvelopeIcon,
  UserIcon,
  CalendarIcon,
  XMarkIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon as CheckCircleSolid, 
  XCircleIcon as XCircleSolid,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';

// --- Types ---
interface ContractStats {
  total: number;
  signed: number;
  pending: number;
  expired: number;
  total_value: number;
}

// --- Reusable Components ---

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  colorClass,
  subtitle 
}: { 
  title: string; 
  value: string; 
  icon: any; 
  trend?: string; 
  colorClass: string;
  subtitle?: string;
}) => (
  <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">{title}</p>
        <h3 className="text-2xl font-bold text-foreground mt-2">{value}</h3>
        {subtitle && <p className="text-xs text-foreground-muted mt-1">{subtitle}</p>}
      </div>
      <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon className={`h-5 w-5 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
    {trend && (
      <div className="mt-3 flex items-center text-xs">
        <span className="text-foreground-muted">{trend}</span>
      </div>
    )}
    <div className={`absolute -right-4 -bottom-4 h-16 w-16 rounded-full ${colorClass} opacity-5 blur-xl group-hover:opacity-10 transition-opacity`} />
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    'SIGNED': { bg: 'bg-green-500', text: 'text-green-700 dark:text-green-400', icon: CheckCircleSolid, label: 'Signed' },
    'SENT': { bg: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', icon: EnvelopeIcon, label: 'Sent' },
    'VIEWED': { bg: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', icon: EyeIcon, label: 'Viewed' },
    'PENDING': { bg: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', icon: ClockIcon, label: 'Pending' },
    'EXPIRED': { bg: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-400', icon: ClockIcon, label: 'Expired' },
    'CANCELLED': { bg: 'bg-red-500', text: 'text-red-700 dark:text-red-400', icon: XCircleSolid, label: 'Cancelled' },
  };
  
  const { bg, text, icon: Icon, label } = config[status] || config['PENDING'];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} bg-opacity-10 ${text}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};

// --- Main Page Component ---

export function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formError, setFormError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ContractCreateRequest>({
    client_name: '',
    client_email: '',
    client_phone: '',
    service_description: '',
    amount: '',
  });
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsRes, statsRes] = await Promise.all([
        apiService.get<{ results: Contract[] }>('/contracts/list/'),
        apiService.get<ContractStats>('/contracts/stats/').catch(() => null),
      ]);
      
      setContracts(contractsRes.results);
      if (statsRes) setStats(statsRes);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contracts';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const validateForm = (): boolean => {
    if (!formData.client_name.trim()) {
      setFormError('Client name is required');
      return false;
    }
    if (!formData.client_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
      setFormError('Valid client email is required');
      return false;
    }
    if (!formData.client_phone) {
      setFormError('Client phone number is required');
      return false;
    }
    if (!formData.service_description.trim()) {
      setFormError('Service description is required');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setFormError('Valid amount is required');
      return false;
    }
    return true;
  };
  
  const handleCreateContract = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!validateForm()) return;
    
    try {
      await apiService.post('/contracts/create/', formData);
      setSuccess('Contract created and sent to client for signature!');
      setShowCreateModal(false);
      fetchData();
      
      setFormData({
        client_name: '',
        client_email: '',
        client_phone: '',
        service_description: '',
        amount: '',
      });
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create contract';
      setFormError(errorMessage);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };
  
  const copySigningLink = (token: string) => {
    const link = `${window.location.origin}/sign-contract/${token}/`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };
  
  const closeModal = () => {
    setShowCreateModal(false);
    setFormError(null);
    setFormData({
      client_name: '',
      client_email: '',
      client_phone: '',
      service_description: '',
      amount: '',
    });
  };
  
  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(amount));
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });
  };
  
  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch = 
      contract.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.reference_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Loading State
  if (loading && contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-foreground-muted">Loading contracts...</p>
      </div>
    );
  }
  
  // Error State (Page-level)
  if (error && contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Unable to Load Contracts</h3>
        <p className="text-foreground-muted mb-6 max-w-md">{error}</p>
        <button 
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* --- Page Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Contracts</h1>
          <p className="text-foreground-muted mt-2 text-base">
            Create, manage, and track service contracts with e-signature
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          <PlusIcon className="h-5 w-5" />
          Create Contract
        </button>
      </div>

      {/* --- Stats Overview --- */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Contracts" 
            value={stats.total.toString()} 
            icon={DocumentTextIcon}
            colorClass="bg-blue-500"
            subtitle={`${formatCurrency(stats.total_value)} total value`}
          />
          <StatCard 
            title="Signed" 
            value={stats.signed.toString()} 
            icon={CheckCircleIcon}
            trend={`${stats.total > 0 ? Math.round((stats.signed / stats.total) * 100) : 0}% completion rate`}
            colorClass="bg-green-500"
          />
          <StatCard 
            title="Pending" 
            value={stats.pending.toString()} 
            icon={ClockIcon}
            colorClass="bg-amber-500"
          />
          <StatCard 
            title="Expired/Cancelled" 
            value={stats.expired.toString()} 
            icon={XCircleIcon}
            colorClass="bg-red-500"
          />
        </div>
      )}
      
      {/* --- Page-level Alerts --- */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <XCircleSolid className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Error</p>
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
          <CheckCircleSolid className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">Success</p>
            <p className="text-sm text-green-600 dark:text-green-300">{success}</p>
          </div>
        </div>
      )}
      
      {/* --- Filters & Search --- */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-muted" />
          <input
            type="text"
            placeholder="Search by client, email, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <FunnelIcon className="h-5 w-5 text-foreground-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="VIEWED">Viewed</option>
            <option value="SIGNED">Signed</option>
            <option value="PENDING">Pending</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>
      
      {/* --- Contracts Table --- */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-primary" />
            All Contracts
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-foreground-muted">
              {filteredContracts.length}
            </span>
          </h2>
          <button 
            onClick={fetchData}
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-foreground-muted">
              <tr>
                <th className="px-6 py-4 font-medium">Reference</th>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Service</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center text-foreground-muted">
                      <DocumentTextIcon className="h-16 w-16 mb-4 opacity-20" />
                      <p className="font-medium text-lg">No contracts found</p>
                      <p className="text-sm mt-1 max-w-md">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'Try adjusting your search or filters' 
                          : 'Create your first contract to get started'}
                      </p>
                      {!searchTerm && statusFilter === 'all' && (
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Create Contract
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-foreground-muted bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {contract.reference_code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{contract.client_name}</p>
                          <p className="text-xs text-foreground-muted">{contract.client_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-foreground line-clamp-2" title={contract.service_description}>
                        {contract.service_description}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-foreground">{formatCurrency(contract.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={contract.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-foreground-muted text-xs">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {formatDate(contract.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {contract.signing_token && contract.status !== 'SIGNED' && contract.status !== 'EXPIRED' && contract.status !== 'CANCELLED' ? (
                          <button
                            onClick={() => copySigningLink(contract.signing_token)}
                            className="p-2 text-foreground-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title={copiedToken === contract.signing_token ? 'Copied!' : 'Copy Signing Link'}
                          >
                            {copiedToken === contract.signing_token ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            ) : (
                              <ClipboardDocumentIcon className="h-4 w-4" />
                            )}
                          </button>
                        ) : null}
                        <button className="p-2 text-foreground-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="View">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-foreground-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
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
      
      {/* --- Create Contract Modal (Scrollable, with inline form errors) --- */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <DocumentTextIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Create New Contract</h3>
                  <p className="text-sm text-foreground-muted">Send a contract for e-signature</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-foreground-muted hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Form Error Alert (inside modal) */}
              {formError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                  <XCircleSolid className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Validation Error</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{formError}</p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleCreateContract} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Client Name *</label>
                    <input
                      type="text"
                      name="client_name"
                      value={formData.client_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Client Email *</label>
                    <input
                      type="email"
                      name="client_email"
                      value={formData.client_email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="client@example.com"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Client Phone *</label>
                  <input
                    type="tel"
                    name="client_phone"
                    value={formData.client_phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="254712345678"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Service Description *</label>
                  <textarea
                    name="service_description"
                    value={formData.service_description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    rows={3}
                    placeholder="Describe the service being provided..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Amount (KES) *</label>
                  <div className="relative">
                    <DocumentTextIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-muted" />
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="0.00"
                      step="0.01"
                      min="1"
                      required
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>What happens next?</strong> The client will receive a secure email with a signing link. 
                      Once they sign electronically, the contract becomes legally binding and an invoice is auto-generated.
                    </p>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Fixed Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-foreground rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="create-contract-form"
                onClick={handleCreateContract}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
              >
                <EnvelopeIcon className="h-4 w-4" />
                Create & Send Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}