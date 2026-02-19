import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/config/api';
import { 
  CurrencyDollarIcon, 
  CreditCardIcon, 
  DocumentTextIcon, 
  ExclamationCircleIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// --- Types based on your Backend ---
export interface DashboardSummary {
  total_revenue: number;
  total_transactions: number;
  pending_contracts: number;
  overdue_invoices: number;
  revenue_growth?: number;
}

export interface Transaction {
  id: number;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

// --- Reusable Components ---

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  colorClass 
}: { 
  title: string; 
  value: string; 
  icon: any; 
  trend?: number; 
  colorClass: string;
}) => (
  <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-foreground-muted mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-foreground tracking-tight">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon className={`h-6 w-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
    {trend !== undefined && (
      <div className="mt-4 flex items-center text-sm">
        {trend >= 0 ? (
          <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
        ) : (
          <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
        )}
        <span className={trend >= 0 ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
        <span className="text-foreground-muted ml-2">vs last month</span>
      </div>
    )}
    <div className={`absolute -right-6 -bottom-6 h-24 w-24 rounded-full ${colorClass} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`} />
  </div>
);

const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
      {title}
    </h2>
    {action}
  </div>
);

// --- Main Page Component ---

export function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Fetch Data using apiService — paths corrected to match backend (reports app)
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ Corrected paths: reports app is mounted at /api/reports/
        const [summaryData, chartData, transactionsData] = await Promise.all([
          apiService.get<DashboardSummary>('/reports/dashboard/summary/'),
          apiService.get<ChartDataPoint[]>('/reports/dashboard/revenue-chart/'),
          apiService.get<Transaction[]>('/reports/reports/transactions/'),
        ]);

        setSummary(summaryData);
        setChartData(chartData);
        setTransactions(transactionsData);

      } catch (err: unknown) {
        console.error("Dashboard fetch error:", err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, chartData, transactionsData] = await Promise.all([
        apiService.get<DashboardSummary>('/reports/dashboard/summary/'),
        apiService.get<ChartDataPoint[]>('/reports/dashboard/revenue-chart/'),
        apiService.get<Transaction[]>('/reports/transactions/'),
      ]);
      setSummary(summaryData);
      setChartData(chartData);
      setTransactions(transactionsData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reload data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Error State — Real Error, No Mock Data
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Unable to Load Dashboard</h3>
        <p className="text-foreground-muted mb-6 max-w-md">{error}</p>
        <button 
          onClick={handleRetry}
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
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Welcome back, {user?.first_name} 👋
          </h1>
          <p className="text-foreground-muted mt-2 text-base">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-foreground rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Download Report
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            + New Invoice
          </button>
        </div>
      </div>

      {/* --- Summary Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={formatCurrency(summary?.total_revenue || 0)} 
          icon={CurrencyDollarIcon} 
          trend={summary?.revenue_growth}
          colorClass="bg-blue-500"
        />
        <StatCard 
          title="Transactions" 
          value={summary?.total_transactions?.toString() || '0'} 
          icon={CreditCardIcon} 
          colorClass="bg-indigo-500"
        />
        <StatCard 
          title="Pending Contracts" 
          value={summary?.pending_contracts?.toString() || '0'} 
          icon={DocumentTextIcon} 
          colorClass="bg-amber-500"
        />
        <StatCard 
          title="Overdue Invoices" 
          value={summary?.overdue_invoices?.toString() || '0'} 
          icon={ExclamationCircleIcon} 
          colorClass="bg-red-500"
        />
      </div>

      {/* --- Main Content Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <SectionHeader 
            title="Revenue Overview" 
            action={
              <select className="bg-gray-50 dark:bg-gray-700 border-none text-sm text-foreground-muted rounded-lg px-3 py-1 focus:ring-2 focus:ring-primary">
                <option>This Week</option>
                <option>This Month</option>
                <option>This Year</option>
              </select>
            } 
          />
          <div className="h-80 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-foreground-muted">
                <ArrowPathIcon className="h-8 w-8 mb-2 opacity-50" />
                <p>No revenue data available</p>
              </div>
            )}
          </div>
        </div>

        {/* User Activity */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <SectionHeader title="User Activity" />
          <div className="space-y-6">
            <div className="text-center py-8 text-foreground-muted">
              <UserGroupIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Activity feed will appear here</p>
              <p className="text-xs mt-1">Connect /reports/dashboard/user-activity/ endpoint to populate</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Recent Transactions Table --- */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Recent Transactions</h2>
          <button className="text-sm text-primary font-medium hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-foreground-muted">
              <tr>
                <th className="px-6 py-4 font-medium">Transaction ID</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-foreground-muted">#TRX-{tx.id}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{tx.description}</td>
                    <td className="px-6 py-4 text-foreground-muted flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      {tx.date}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${tx.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                          tx.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-foreground">
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center text-foreground-muted">
                      <CreditCardIcon className="h-12 w-12 mb-3 opacity-30" />
                      <p className="font-medium">No transactions yet</p>
                      <p className="text-sm mt-1">Transactions will appear here once they start coming in</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}