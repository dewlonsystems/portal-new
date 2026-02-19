import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ChangePasswordPage } from '@/pages/auth/ChangePasswordPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { PaymentsPage } from '@/pages/payments/PaymentsPage';
import { PayoutsPage } from '@/pages/payouts/PayoutsPage';
import { TransactionsPage } from '@/pages/transactions/TransactionsPage';
import { UserManagementPage } from '@/pages/users/UserManagementPage';
import { ContractsPage } from '@/pages/contracts/ContractsPage';
import { SignContractPage } from '@/pages/contracts/SignContractPage'; // ← NEW
import { QuotesPage } from '@/pages/quotes/QuotesPage';
import { InvoicesPage } from '@/pages/invoices/InvoicesPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { AuditPage } from '@/pages/audit/AuditPage';

// Placeholder pages
const UnauthorizedPage = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-error">403 - Unauthorized</h1>
    <p className="text-foreground-muted mt-2">You don't have permission to access this page.</p>
  </div>
);

const NotFoundPage = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-foreground">404 - Not Found</h1>
    <p className="text-foreground-muted mt-2">The page you're looking for doesn't exist.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        
        {/* Public Contract Signing (No Auth Required) */}
        <Route path="/sign-contract/:token" element={<SignContractPage />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="payouts" element={<PayoutsPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="audit" element={<AuditPage />} />
          </Route>
        </Route>
        
        {/* Password Change Route */}
        <Route element={<ProtectedRoute requirePasswordChange={true} />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>
        
        {/* Unauthorized */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
        
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;