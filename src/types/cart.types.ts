import { MenuItem, Offer } from './database.types';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  appliedOffer?: Offer | null;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
}

export interface CustomerDetails {
  tableNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes?: string;
}
