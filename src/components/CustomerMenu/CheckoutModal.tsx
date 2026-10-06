import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CartItem, CustomerDetails } from '../../types/cart.types';
import { Order } from '../../types/database.types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  discount: number;
  taxRate?: number; // e.g. 0.05 for 5% GST
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  discount,
  taxRate = 0.05,
  onOrderSuccess,
}) => {
  const [form, setForm] = useState<CustomerDetails>({
    tableNo: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const taxAmount = Number(((subtotal - discount) * taxRate).toFixed(2));
  const finalTotal = Math.max(0, Number((subtotal - discount + taxAmount).toFixed(2)));

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validation
    if (!form.tableNo.trim()) {
      setErrorMessage('Please enter your Table Number.');
      return;
    }
    if (!form.customerPhone.trim() || form.customerPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!form.customerEmail.trim() || !form.customerEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address for your digital bill.');
      return;
    }
    if (cartItems.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    try {
      setLoading(true);

      // Generate fallback bill number in case sequence isn't triggered
      const timestampSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedBillNo = `BILL-${Date.now().toString().slice(-4)}${timestampSuffix}`;

      // 1. Insert Order into Supabase Orders Table
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            bill_no: generatedBillNo,
            table_no: form.tableNo.toUpperCase().trim(),
            customer_name: form.customerName.trim() || 'Guest Customer',
            customer_phone: form.customerPhone.trim(),
            customer_email: form.customerEmail.trim(),
            subtotal: subtotal,
            discount_amount: discount,
            tax_amount: taxAmount,
            total_amount: finalTotal,
            status: 'pending',
            payment_mode: 'unpaid',
            notes: form.notes?.trim() || null,
          },
        ])
        .select()
        .single();

      if (orderError) {
        throw new Error(orderError.message);
      }

      // 2. Prepare Order Items
      const orderItemsPayload = cartItems.map((item) => ({
        order_id: orderData.id,
        item_id: item.menuItem.id,
        item_name: item.menuItem.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        special_instructions: item.appliedOffer
          ? `Offer Applied: ${item.appliedOffer.title}`
          : item.specialInstructions || null,
      }));

      // 3. Insert into Supabase Order_Items Table
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

      if (itemsError) {
        throw new Error(itemsError.message);
      }

      // Successful placement
      onOrderSuccess(orderData as Order);
    } catch (err: any) {
      console.error('Order submission error:', err);
      setErrorMessage(err.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Confirm & Place Order</h2>
            <p className="text-xs text-orange-100">Review bill summary & enter details</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold text-lg text-white"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Items Summary list */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
              Order Items ({cartItems.reduce((acc, c) => acc + c.quantity, 0)})
            </h4>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-600">{item.quantity}x</span>
                    <span className="text-gray-800 font-medium">{item.menuItem.name}</span>
                    {item.appliedOffer && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.2 rounded font-bold">
                        Deal
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-gray-900">₹{item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Bill calculation breakdown */}
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Discount Applied</span>
                  <span>- ₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-1.5 border-t border-dashed border-gray-300">
                <span>Total Payable</span>
                <span className="text-orange-600">₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Details Form */}
          <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              {/* Table Number */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Table No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="tableNo"
                  placeholder="e.g. T-04"
                  value={form.tableNo}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50"
                />
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  name="customerName"
                  placeholder="e.g. Arun"
                  value={form.customerName}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-gray-500 font-semibold">
                  +91
                </span>
                <input
                  type="tel"
                  name="customerPhone"
                  placeholder="9876543210"
                  maxLength={10}
                  value={form.customerPhone}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email Address (for e-receipt) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="customerEmail"
                placeholder="you@example.com"
                value={form.customerEmail}
                onChange={handleInputChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Kitchen Cooking Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Cooking Notes (Optional)
              </label>
              <textarea
                name="notes"
                rows={2}
                placeholder="e.g. Less spicy, extra sauce"
                value={form.notes}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-500 uppercase font-semibold">Total Amount</span>
            <span className="text-xl font-extrabold text-gray-900">₹{finalTotal.toFixed(2)}</span>
          </div>

          <button
            type="submit"
            form="checkout-form"
            disabled={loading}
            className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
              loading
                ? 'bg-orange-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Placing Order...</span>
              </>
            ) : (
              <>
                <span>Place Order</span>
                <span>➔</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
