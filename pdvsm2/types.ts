
export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  promotional_price?: number;
  cost?: number;
  unit?: string;
  description?: string;
  image: string;
  stock?: number;
  min_stock?: number;
  manage_stock?: boolean;
  is_catalog?: boolean;
  is_favorite?: boolean;
  company_id?: string;
  is_subscription_trigger?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  subscriptionReconciliationId?: string; // ID da assinatura específica no banco
  period_name?: string; // Ex: "OUTUBRO/2025" para exibição
}

export interface Category {
  id: string;
  name: string;
  company_id?: string;
}

export type PaymentMethod = 'money' | 'debit' | 'credit' | 'others' | 'pix' | 'credit_tab' | 'link';

export interface PaymentDetail {
  method: PaymentMethod;
  amount: number;
}

export interface Sale {
  id: string;
  code: string;
  date: string;
  clientName: string;
  customerId?: string;
  clientCpf?: string;
  sellerName: string;
  items: CartItem[];
  subtotal?: number;
  discount?: number;
  total: number;
  paymentMethod: PaymentMethod;
  payments?: PaymentDetail[];
  change?: number;
  status: 'completed' | 'cancelled' | 'pending';
  notes?: string;
  company_id?: string;
  is_subscription_payment?: boolean;
  reconciled_subscription_id?: string;
}

export interface Customer {
  id: string;
  avatarText: string;
  name: string;
  fantasyName?: string;
  socialReason?: string;
  phone: string;
  email: string;
  balance: number;
  cpf?: string;
  notes?: string;
  address?: string;
  complement?: string;
  allowTab?: boolean;
  createdAt?: string;
  company_id?: string;
  isSubscriber?: boolean;
}

export type UserRole = 'owner' | 'admin' | 'operator' | 'master' | 'customer';

export interface OperatorPermissions {
  dashboard: boolean;
  pos: boolean;
  orders: boolean;
  products: boolean;
  stock: boolean;
  customers: boolean;
  finance: boolean;
  history: boolean;
  users: boolean;
  settings: boolean;
  subscriptions: boolean;
  stats: boolean;
}

export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  company_id: string;
  email?: string;
  customer_id?: string; // Vinculo com a tabela customers se role for 'customer'
}

export interface Subscription {
  id: string;
  customer_id: string;
  provider: string;
  start_date: string;
  end_date: string;
  frequency: string;
  value: number;
  payment_date?: string | null;
  referral?: string;
  commission_value?: number;
  commission_payment_date?: string | null;
  status?: 'active' | 'cancelled';
  company_id?: string;
}

export interface Company {
  id: string;
  name: string;
  owner_id?: string;
  social_reason?: string;
  cnpj?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  email?: string;
  address?: string;
  complement?: string;
  currency?: string;
  show_decimals?: boolean;
  logo_url?: string;
  cancelled_sales_visibility?: 'strike' | 'hide';
  wallet_settings?: Record<string, string>;
  permissions?: {
    operator: OperatorPermissions;
  };
  subscription_status?: 'active' | 'inactive' | 'blocked';
  subscription_plan?: string;
  next_due_date?: string | null;
  created_at?: string;
}

export interface Wallet {
  id: string;
  company_id: string;
  name: string;
  type: string;
  balance: number;
  initial_balance?: number;
  color?: string;
}

export interface FinanceCategory {
  id: string;
  company_id: string;
  name: string;
  type: 'income' | 'expense';
  parent_id?: string | null;
  is_archived?: boolean;
  color?: string;
  icon?: string;
}

export interface FinanceTransaction {
  id: string;
  company_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  wallet_id: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  status: 'paid' | 'pending' | 'cancelled';
  date: string;
  notes?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  id_da_empresa: string;
}
