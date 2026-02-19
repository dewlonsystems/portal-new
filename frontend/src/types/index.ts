// User Types
export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: UserRole;
  is_locked: boolean;
  date_joined: string;
  must_change_password?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  refresh: string;
  access: string;
  role: UserRole;
  must_change_password: boolean;
  first_name: string;
}

export interface TokenRefreshResponse {
  access: string;
}

// Transaction Types
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type PaymentMethod = 'MPESA' | 'PAYSTACK';

export interface Transaction {
  id: number;
  reference_code: string;
  provider_reference: string | null;
  amount: string;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  description: string;
  phone_number: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  failed_reason: string | null;
  user: number;
  user_username: string;
  user_first_name: string;
  user_last_name: string;
}

export interface TransactionInitiateRequest {
  amount: string;
  payment_method: PaymentMethod;
  phone_number?: string;
  email?: string;
  description?: string;
}

export interface TransactionSummary {
  total_amount: string;
  total_transactions: number;
  completed_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
}

// Payout Types
export interface Payout {
  id: number;
  reference_code: string;
  provider_reference: string | null;
  recipient_name: string;
  recipient_phone: string;
  amount: string;
  reason: string;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  failed_reason: string | null;
  admin_user: number;
  admin_username: string;
  admin_first_name: string;
}

export interface PayoutInitiateRequest {
  recipient_name: string;
  recipient_phone: string;
  amount: string;
  reason: string;
}

// Contract Types
export type ContractStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'EXPIRED' | 'CANCELLED';

export interface Contract {
  id: number;
  reference_code: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service_description: string;
  amount: string;
  status: ContractStatus;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  created_by: number;
  created_by_username: string;
  invoice_reference: string | null;
  signing_token: string;
}

export interface ContractCreateRequest {
  client_name: string;
  client_email: string;
  client_phone: string;
  service_description: string;
  amount: string;
}

export interface ContractSignRequest {
  signature_image: string; // Base64
  place_of_signing: string;
}

// Invoice Types
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Invoice {
  id: number;
  reference_code: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_company: string | null;
  service_description: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  due_date: string;
  status: InvoiceStatus;
  paid_at: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: number;
  created_by_username: string;
  created_by_first_name: string;
}

export interface InvoiceCreateRequest {
  client_name: string;
  client_email: string;
  client_phone: string;
  client_company?: string;
  service_description: string;
  amount: string;
  tax_amount?: string;
  due_date?: string;
  notes?: string;
}

// Quote Types
export type QuoteStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface Quote {
  id: number;
  reference_code: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service_description: string;
  amount: string;
  valid_until: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  created_by: number;
  created_by_username: string;
  created_by_first_name: string;
}

export interface QuoteCreateRequest {
  client_name: string;
  client_email: string;
  client_phone: string;
  service_description: string;
  amount: string;
}

// Receipt Types
export interface Receipt {
  id: number;
  reference_code: string;
  transaction: number;
  transaction_reference: string;
  transaction_amount: string;
  transaction_status: string;
  transaction_payment_method: string;
  pdf_file: string | null;
  status: string;
  generated_at: string;
  downloaded_at: string | null;
  downloaded_by: number | null;
  downloaded_by_username: string | null;
  download_count: number;
}

// Dashboard Types
export interface DashboardSummary {
  total_revenue: string;
  total_transactions: number;
  total_payouts: string;
  active_users: number;
  pending_contracts: number;
  overdue_invoices: number;
}

export interface RevenueChartData {
  date: string;
  amount: string;
  transaction_count: number;
}

export interface TrendData {
  label: string;
  value: string;
  percentage_change: number;
}

// Verification Types
export interface VerificationRequest {
  document_code: string;
}

export interface VerificationResponse {
  is_valid: boolean;
  document_type: string;
  document_code: string;
  date_of_issue: string | null;
  issuing_user: string | null;
  message: string;
}

// Notification Types
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NotificationType = 
  | 'PASSWORD_RESET_REQUEST'
  | 'USER_CREATED'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'PAYOUT_COMPLETED'
  | 'PAYOUT_FAILED'
  | 'CONTRACT_SIGNED'
  | 'INVOICE_OVERDUE'
  | 'SYSTEM_ALERT';

export interface Notification {
  id: number;
  recipient: number;
  recipient_username: string;
  notification_type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
  expires_at: string | null;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  detail?: string;
  error?: string;
  message?: string;
  status?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
}