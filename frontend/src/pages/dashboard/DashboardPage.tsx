import { useAuth } from '@/hooks/useAuth';

export function DashboardPage() {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Hello, {user?.first_name} 👋
        </h1>
        <p className="text-foreground-muted mt-1">
          Welcome to your dashboard. Here's what's happening today.
        </p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-foreground-muted">Total Revenue</p>
            <p className="text-2xl font-bold text-primary mt-1">KES 0.00</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-foreground-muted">Transactions</p>
            <p className="text-2xl font-bold text-primary mt-1">0</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-foreground-muted">Pending Contracts</p>
            <p className="text-2xl font-bold text-accent mt-1">0</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-foreground-muted">Overdue Invoices</p>
            <p className="text-2xl font-bold text-error mt-1">0</p>
          </div>
        </div>
      </div>
      
      {/* Welcome Message */}
      <div className="card">
        <div className="card-body">
          <h2 className="text-lg font-semibold text-foreground mb-2">Getting Started</h2>
          <p className="text-foreground-muted">
            Your dashboard is ready. Start by initiating a payment, creating a quote, or managing users.
          </p>
        </div>
      </div>
    </div>
  );
}