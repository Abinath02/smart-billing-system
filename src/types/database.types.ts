export type UserRole = 'admin' | 'cashier' | 'kitchen';
export type OrderStatus = 'pending' | 'cooking' | 'ready' | 'paid' | 'cancelled';
export type PaymentMode = 'cash' | 'card' | 'upi' | 'online' | 'unpaid';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Waiter {
  id: string;
  name: string;
  phone?: string | null;
  emp_code?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url?: string | null;
  description?: string | null;
  is_available: boolean;
  preparation_time_mins: number;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  item_id?: string | null;
  title: string;
  discount_details: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  poster_url?: string | null;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  bill_no: string;
  table_no: string;
  waiter_id?: string | null;
  created_by?: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: OrderStatus;
  payment_mode: PaymentMode;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  order_items?: OrderItem[];
  waiter?: Waiter;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id?: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string | null;
  created_at: string;
}
