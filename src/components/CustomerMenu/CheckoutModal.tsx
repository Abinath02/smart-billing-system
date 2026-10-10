import React, { useState, useEffect } from 'react';
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
  initialTableNo?: string;
  isTableLocked?: boolean;
  onOrderSuccess: (order: Order, isAppended?: boolean) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  discount,
  taxRate = 0.05,
  initialTableNo = '',
  isTableLocked = false,
  onOrderSuccess,
}) => {
  const [form, setForm] = useState<CustomerDetails>({
    tableNo: initialTableNo || '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multi-round active table order state
  const [existingOrder, setExistingOrder] = useState<Order | null>(null);
  const [appendToExisting, setAppendToExisting] = useState<boolean>(true);
  const [checkingExisting, setCheckingExisting] = useState<boolean>(false);

  // Sync initial table if provided
  useEffect(() => {
    if (initialTableNo) {
      setForm((prev) => ({ ...prev, tableNo: initialTableNo }));
    }
  }, [initialTableNo]);

  // Check if this table has an active running order (pending, cooking, ready)
  useEffect(() => {
    const checkTableSession = async () => {
      const table = form.tableNo.trim().toUpperCase();
      if (!table || table.length < 2) {
        setExistingOrder(null);
        return;
      }

      setCheckingExisting(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('table_no', table)
          .in('status', ['pending', 'cooking', 'ready'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          setExistingOrder(data[0] as Order);
          setAppendToExisting(true);
        } else {
          setExistingOrder(null);
        }
      } catch (err) {
        console.warn('Error checking table session:', err);
      } finally {
        setCheckingExisting(false);
      }
    };

    if (isOpen && form.tableNo) {
      const debounceTimer = setTimeout(checkTableSession, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [isOpen, form.tableNo]);

  if (!isOpen) return null;

  const taxAmount = Number(((subtotal - discount) * taxRate).toFixed(2));
  const finalTotal = Math.max(0, Number((subtotal - discount + taxAmount).toFixed(2)));

  const standardTables = [
    'T-01', 'T-02', 'T-03', 'T-04', 'T-05',
    'T-06', 'T-07', 'T-08', 'T-09', 'T-10',
    'T-11', 'T-12', 'VIP-1', 'VIP-2'
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validation
    const cleanTable = form.tableNo.trim().toUpperCase();
    if (!cleanTable) {
      setErrorMessage('Please enter or select your Table Number.');
      return;
    }
    const cleanDigits = form.customerPhone.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 9) {
      setErrorMessage('Please enter a valid Sri Lankan phone number (e.g. 771234567 or 0771234567).');
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

    const formattedSriLankanPhone = cleanDigits.startsWith('94')
      ? `+${cleanDigits}`
      : cleanDigits.startsWith('0')
      ? `+94${cleanDigits.slice(1)}`
      : `+94${cleanDigits}`;

    try {
      setLoading(true);

      // Secure Server-Side Ordering API Call (Fixes Client-Side Price Manipulation Vulnerability)
      const res = await fetch('/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNo: cleanTable,
          customerName: form.customerName.trim() || 'Guest Customer',
          customerPhone: formattedSriLankanPhone,
          customerEmail: form.customerEmail.trim(),
          notes: form.notes?.trim() || null,
          appendToExisting: Boolean(existingOrder && appendToExisting),
          cartItems: cartItems.map((c) => ({
            itemId: c.menuItem.id,
            quantity: c.quantity,
            offerId: c.appliedOffer?.id || undefined,
            specialInstructions: c.specialInstructions || (c.appliedOffer ? `Offer: ${c.appliedOffer.title}` : undefined),
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to place order securely.');
      }

      // Successful placement verified by server
      onOrderSuccess(data.order as Order, data.isAppended);
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
            <p className="text-xs text-orange-100">Verified server pricing & instant kitchen dispatch</p>
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

          {/* Running Table Session Banner (Issue 5 Fix) */}
          {existingOrder && (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🍲</span>
                  <div>
                    <h5 className="text-xs font-black text-amber-950">
                      Active Table Session Detected!
                    </h5>
                    <p className="text-[11px] text-amber-800">
                      Table {existingOrder.table_no} already has an open bill ({existingOrder.bill_no})
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  {existingOrder.status}
                </span>
              </div>

              <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900">
                  <input
                    type="checkbox"
                    checked={appendToExisting}
                    onChange={(e) => setAppendToExisting(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <span>Add as Round 2 (Append to this bill)</span>
                </label>
                <span className="text-[10px] text-amber-700 font-semibold">Recommended</span>
              </div>
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
                  <span className="font-bold text-gray-900">Rs. {item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Bill calculation breakdown */}
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Discount Applied</span>
                  <span>- Rs. {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST / Service (5%)</span>
                <span>Rs. {taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-1.5 border-t border-dashed border-gray-300">
                <span>Estimated Payable</span>
                <span className="text-orange-600">Rs. {finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Details Form */}
          <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              {/* Table Number with Auto-lock & Validation (Issue 7 Fix) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">
                    Table No <span className="text-red-500">*</span>
                  </label>
                  {isTableLocked && (
                    <span className="text-[10px] text-green-700 font-extrabold flex items-center gap-0.5">
                      <span>🔒</span> QR Locked
                    </span>
                  )}
                </div>

                {isTableLocked ? (
                  <input
                    type="text"
                    name="tableNo"
                    value={form.tableNo}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-green-300 bg-green-50/60 text-green-950 text-sm font-black uppercase tracking-wider cursor-not-allowed"
                  />
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      name="tableNo"
                      placeholder="e.g. T-04"
                      value={form.tableNo}
                      onChange={handleInputChange}
                      list="tables-datalist"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50"
                    />
                    <datalist id="tables-datalist">
                      {standardTables.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  name="customerName"
                  placeholder="e.g. Dinesh"
                  value={form.customerName}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Sri Lanka Phone Number */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Phone Number (WhatsApp Bill) <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 top-2.5 text-xs text-gray-700 font-black flex items-center gap-1">
                  <span>🇱🇰</span> +94
                </span>
                <input
                  type="tel"
                  name="customerPhone"
                  placeholder="77 123 4567"
                  maxLength={12}
                  value={form.customerPhone}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-16 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">
                Enter Sri Lankan mobile number (e.g. 771234567 or 0771234567)
              </span>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email Address (E-Receipt) <span className="text-red-500">*</span>
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
                Cooking Instructions (Optional)
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
            <span className="text-[11px] text-gray-500 uppercase font-semibold">
              {existingOrder && appendToExisting ? 'Round Total' : 'Total Amount'}
            </span>
            <span className="text-xl font-extrabold text-gray-900">Rs. {finalTotal.toFixed(2)}</span>
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
                <span>Verifying & Placing...</span>
              </>
            ) : existingOrder && appendToExisting ? (
              <>
                <span>Add to Bill (Round 2)</span>
                <span>➔</span>
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
