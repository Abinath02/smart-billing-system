import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { Order, OrderItem, Profile } from '../types/database.types';
import { generateInvoicePDF } from '../utils/generateInvoicePDF';
import { sendInvoiceNotification } from '../utils/sendInvoiceNotification';
import { CashierLogin } from '../components/Cashier/CashierLogin';

type CashierPaymentMode = 'cash' | 'card' | 'upi' | 'split';

export const CashierDashboard: React.FC = () => {
  // Staff Auth State
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Search and Orders State
  const [searchBillNo, setSearchBillNo] = useState('');
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Payment Form State
  const [paymentMode, setPaymentMode] = useState<CashierPaymentMode>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [verifiedAmount, setVerifiedAmount] = useState<number>(0);
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [closingBill, setClosingBill] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [whatsappShareUrl, setWhatsappShareUrl] = useState<string | null>(null);
  const [billClosedSuccess, setBillClosedSuccess] = useState<boolean>(false);

  const restaurantVpa = process.env.NEXT_PUBLIC_RESTAURANT_UPI_VPA || 'spicegarden@upi';
  const restaurantName = process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Spice Garden';

  // 1. Auth Guard Check
  useEffect(() => {
    const checkAuth = async () => {
      setAuthChecking(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!profile && session.user.email) {
            const { data: profileByEmail } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', session.user.email.toLowerCase())
              .single();
            if (profileByEmail) profile = profileByEmail;
          }

          if (profile && (profile.role === 'cashier' || profile.role === 'admin') && profile.is_active !== false) {
            setCurrentUser(profile as Profile);
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Cashier auth check failed:', err);
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // 2. Fetch Open Unpaid Orders
  const fetchOpenOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          waiter:waiters (*)
        `)
        .neq('status', 'paid')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnpaidOrders((data as Order[]) || []);
    } catch (err: any) {
      console.error('Error fetching open orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchOpenOrders();

      const channel = supabase
        .channel('cashier_orders_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            fetchOpenOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser, fetchOpenOrders]);

  // 3. Select an Order
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderItems(order.order_items || []);
    const total = Number(order.total_amount);
    setVerifiedAmount(total);
    setCashTendered(total.toString());
    setSplitCashAmount((Math.floor(total / 2)).toString());
    setSearchBillNo(order.bill_no);
    setSearchError(null);
    setBillClosedSuccess(false);
    setNotificationStatus(null);
    setWhatsappShareUrl(null);
  };

  // 4. Search Handler
  const handleSearchBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchBillNo.trim()) {
      setSearchError('Please enter a Bill Number or Table Number.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSelectedOrder(null);
    setBillClosedSuccess(false);

    try {
      const term = searchBillNo.trim();
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          waiter:waiters (*)
        `)
        .or(`bill_no.ilike.%${term}%,table_no.ilike.%${term}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setSearchError(`No order found matching "${term}".`);
      } else {
        handleSelectOrder(data[0] as Order);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Error finding bill.');
    } finally {
      setSearching(false);
    }
  };

  // 5. Change Due Calculation
  const tendered = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tendered - verifiedAmount);

  // Split calculation
  const splitCash = Math.min(verifiedAmount, Math.max(0, parseFloat(splitCashAmount) || 0));
  const splitDigital = Math.max(0, verifiedAmount - splitCash);

  // Dynamic UPI URL & QR
  const upiIntentString = useMemo(() => {
    if (!selectedOrder) return '';
    const amountToPay = paymentMode === 'split' ? splitDigital : verifiedAmount;
    return `upi://pay?pa=${restaurantVpa}&pn=${encodeURIComponent(restaurantName)}&am=${amountToPay.toFixed(2)}&cu=INR&tn=Bill%20${selectedOrder.bill_no}`;
  }, [selectedOrder, verifiedAmount, splitDigital, paymentMode, restaurantVpa, restaurantName]);

  const upiQrImageUrl = useMemo(() => {
    if (!upiIntentString) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(upiIntentString)}`;
  }, [upiIntentString]);

  // 6. Close Bill Handler
  const handleCloseBill = async () => {
    if (!selectedOrder) return;
    if (verifiedAmount <= 0) {
      alert('Total amount must be greater than zero.');
      return;
    }

    setClosingBill(true);
    setNotificationStatus(null);
    setWhatsappShareUrl(null);

    try {
      const dbPaymentMode = paymentMode === 'split' ? 'cash' : paymentMode;

      // 1. Update order status to 'paid' in Supabase
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_mode: dbPaymentMode,
          total_amount: verifiedAmount,
          notes: paymentMode === 'split'
            ? `${selectedOrder.notes || ''} [Split Payment: Cash ₹${splitCash.toFixed(2)} + Digital ₹${splitDigital.toFixed(2)}]`.trim()
            : selectedOrder.notes,
        })
        .eq('id', selectedOrder.id)
        .select(`*, order_items(*), waiter:waiters(*)`)
        .single();

      if (updateError) throw updateError;

      const finalOrder = updatedOrder as Order;
      setSelectedOrder(finalOrder);
      setBillClosedSuccess(true);

      // 2. Generate PDF Invoice & Trigger Download Locally
      let pdfDataUri = '';
      try {
        pdfDataUri = await generateInvoicePDF(finalOrder, finalOrder.order_items || orderItems);
      } catch (pdfErr) {
        console.warn('PDF download warning:', pdfErr);
      }

      // 3. API Notification & WhatsApp Click-to-Chat Generation
      const notifyResult = await sendInvoiceNotification({
        order: finalOrder,
        email: finalOrder.customer_email || undefined,
        phone: finalOrder.customer_phone || undefined,
        pdfDataUri,
      });

      setNotificationStatus(notifyResult.message);
      if (notifyResult.whatsappShareUrl) {
        setWhatsappShareUrl(notifyResult.whatsappShareUrl);
      }

      // Refresh unpaid queue
      fetchOpenOrders();
    } catch (err: any) {
      console.error('Error closing bill:', err);
      alert('Failed to close bill: ' + err.message);
    } finally {
      setClosingBill(false);
    }
  };

  // 7. Manual PDF Re-download
  const handleManualDownloadPDF = async () => {
    if (selectedOrder) {
      await generateInvoicePDF(selectedOrder, orderItems);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Verifying Cashier Till Session...</span>
        </div>
      </div>
    );
  }

  // Auth Guard Gate
  if (!currentUser) {
    return <CashierLogin onLoginSuccess={(profile) => setCurrentUser(profile)} />;
  }

  return (
    <>
      <Head>
        <title>Cashier Billing POS | Smart Restaurant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
        {/* Cashier Top Navigation */}
        <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-md">
                💰
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight">Cashier POS Billing Counter</h1>
                <p className="text-[11px] text-slate-400">
                  Cashier: <strong className="text-emerald-400">{currentUser.full_name}</strong> ({currentUser.role})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Till
              </span>
              <button
                onClick={fetchOpenOrders}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                🔄 Sync Bills
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-bold rounded-xl transition"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Layout */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: Open Orders Queue & Search (5 Columns) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Search Bar */}
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Search Order / Bill
                </label>
                <form onSubmit={handleSearchBill} className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔍</span>
                    <input
                      type="text"
                      placeholder="Enter Bill No (e.g. BILL-1001 or Table)"
                      value={searchBillNo}
                      onChange={(e) => setSearchBillNo(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching}
                    className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 flex items-center gap-1"
                  >
                    {searching ? 'Finding...' : 'Search'}
                  </button>
                </form>

                {searchError && (
                  <p className="mt-2 text-xs font-semibold text-red-600 bg-red-50 p-2 rounded-lg">
                    ⚠️ {searchError}
                  </p>
                )}
              </div>

              {/* Live Pending & Ready Bills Queue */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Awaiting Settlement ({unpaidOrders.length})
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">Click to Load</span>
                </div>

                {loadingOrders ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : unpaidOrders.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <span className="text-3xl">🎉</span>
                    <p className="text-xs font-bold text-slate-700 mt-2">All Bills Settled!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">No unpaid tables right now.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {unpaidOrders.map((ord) => {
                      const isSelected = selectedOrder?.id === ord.id;
                      return (
                        <div
                          key={ord.id}
                          onClick={() => handleSelectOrder(ord)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50/60 shadow-md ring-2 ring-orange-200'
                              : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm">
                                Table {ord.table_no}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                  ord.status === 'ready'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {ord.status}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-400 font-medium">
                              {ord.bill_no}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-orange-600">
                              ₹{Number(ord.total_amount).toFixed(2)}
                            </span>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {ord.order_items?.length || 0} items
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Full Bill Details & Checkout Settlement (7 Columns) */}
            <div className="lg:col-span-7">
              {selectedOrder ? (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
                  {/* Bill Header */}
                  <div className="flex flex-wrap items-start justify-between border-b pb-4 border-slate-100 gap-2">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800">
                          Table {selectedOrder.table_no}
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-600">
                          {selectedOrder.bill_no}
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-slate-900 mt-1">
                        Order Settlement
                      </h2>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase ${
                          selectedOrder.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        ● {selectedOrder.status}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(selectedOrder.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Customer Information Preview */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl text-xs text-slate-600 border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Customer
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedOrder.customer_name || 'Guest Customer'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Phone
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedOrder.customer_phone || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Email
                      </span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {selectedOrder.customer_email || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Itemized Bill Table */}
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                      Purchased Items ({orderItems.length})
                    </h4>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-4">Item</th>
                            <th className="py-2.5 px-3 text-center">Qty</th>
                            <th className="py-2.5 px-3 text-right">Price</th>
                            <th className="py-2.5 px-4 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {orderItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-4 font-semibold text-slate-800">
                                {item.item_name}
                                {item.special_instructions && (
                                  <span className="block text-[10px] text-orange-600 font-normal">
                                    {item.special_instructions}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-600">
                                ₹{Number(item.unit_price).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                                ₹{Number(item.total_price).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Calculations Breakdown */}
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-1.5 text-xs text-slate-600 border border-slate-100">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{Number(selectedOrder.subtotal).toFixed(2)}</span>
                    </div>
                    {selectedOrder.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Discount:</span>
                        <span>- ₹{Number(selectedOrder.discount_amount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>GST (5%):</span>
                      <span className="font-semibold">₹{Number(selectedOrder.tax_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                      <span>Total Amount:</span>
                      <span className="text-orange-600">
                        ₹{Number(selectedOrder.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Settlement & Payment Controls */}
                  <div className="space-y-4 pt-2">
                    {/* Amount Verification Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Verify / Settle Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={verifiedAmount}
                        onChange={(e) => setVerifiedAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    {/* Payment Method Toggle Buttons: Cash, Card, UPI & Split Billing */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMode('cash')}
                          className={`py-2.5 px-2 rounded-2xl font-black text-xs flex flex-col sm:flex-row items-center justify-center gap-1 border-2 transition-all ${
                            paymentMode === 'cash'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>💵</span>
                          <span>Cash</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMode('card')}
                          className={`py-2.5 px-2 rounded-2xl font-black text-xs flex flex-col sm:flex-row items-center justify-center gap-1 border-2 transition-all ${
                            paymentMode === 'card'
                              ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>💳</span>
                          <span>Card</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMode('upi')}
                          className={`py-2.5 px-2 rounded-2xl font-black text-xs flex flex-col sm:flex-row items-center justify-center gap-1 border-2 transition-all ${
                            paymentMode === 'upi'
                              ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>📱</span>
                          <span>UPI QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMode('split')}
                          className={`py-2.5 px-2 rounded-2xl font-black text-xs flex flex-col sm:flex-row items-center justify-center gap-1 border-2 transition-all ${
                            paymentMode === 'split'
                              ? 'border-amber-600 bg-amber-50 text-amber-800 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>⚖️</span>
                          <span>Split</span>
                        </button>
                      </div>
                    </div>

                    {/* MODE 1: Cash Tendered & Change Return Calculator */}
                    {paymentMode === 'cash' && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-xs font-bold text-emerald-900">
                            Cash Received from Customer:
                          </label>
                          <div className="relative w-36">
                            <span className="absolute left-2.5 top-2 text-xs font-bold text-emerald-700">
                              ₹
                            </span>
                            <input
                              type="number"
                              value={cashTendered}
                              onChange={(e) => setCashTendered(e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-black text-slate-900 text-right focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-emerald-200 font-extrabold text-emerald-950">
                          <span>Change to Return:</span>
                          <span className="text-base text-emerald-700">₹{changeDue.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* MODE 2: Dynamic UPI QR Code Scanner (High Priority Enhancement) */}
                    {paymentMode === 'upi' && (
                      <div className="p-4 rounded-3xl bg-purple-50 border-2 border-purple-200 text-purple-950 flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-36 h-36 bg-white p-2 rounded-2xl shadow-md flex items-center justify-center border border-purple-200 flex-shrink-0">
                          <img
                            src={upiQrImageUrl}
                            alt="Dynamic UPI QR Code"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="space-y-1 text-center sm:text-left flex-1">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-purple-200 text-purple-900 px-2.5 py-0.5 rounded-full inline-block">
                            Dynamic UPI QR Code
                          </span>
                          <h4 className="text-lg font-black text-purple-950 mt-1">
                            ₹{verifiedAmount.toFixed(2)}
                          </h4>
                          <p className="text-xs text-purple-800 font-medium">
                            Customer scans with Google Pay, PhonePe, Paytm or BHIM
                          </p>
                          <p className="text-[11px] text-purple-600 font-mono pt-1">
                            VPA: {restaurantVpa}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* MODE 3: Split Billing Controls (Medium Priority Enhancement) */}
                    {paymentMode === 'split' && (
                      <div className="p-4 rounded-3xl bg-amber-50 border-2 border-amber-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-amber-950">
                            Split Payment Allocation
                          </h5>
                          <span className="text-[11px] font-bold text-amber-800">
                            Total: ₹{verifiedAmount.toFixed(2)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-700 font-bold mb-1">
                              💵 Cash Portion (₹)
                            </label>
                            <input
                              type="number"
                              value={splitCashAmount}
                              onChange={(e) => setSplitCashAmount(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-black text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">
                              📱 Digital / UPI (₹)
                            </label>
                            <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-purple-700">
                              ₹{splitDigital.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {splitDigital > 0 && (
                          <div className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                            <span className="text-purple-800 font-semibold">UPI Link for ₹{splitDigital.toFixed(2)}</span>
                            <a
                              href={upiIntentString}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold text-purple-700 underline"
                            >
                              Show UPI Intent ↗
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notification Alert */}
                    {notificationStatus && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                        <span>📲</span>
                        <span>{notificationStatus}</span>
                      </div>
                    )}

                    {/* Main Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      {selectedOrder.status !== 'paid' ? (
                        <button
                          type="button"
                          disabled={closingBill}
                          onClick={handleCloseBill}
                          className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-sm tracking-wide shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          {closingBill ? (
                            <span>Settling & Closing Bill...</span>
                          ) : (
                            <>
                              <span>Close Bill & Print Receipt</span>
                              <span>🧾</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex-1 flex flex-col sm:flex-row gap-2">
                          <div className="flex-1 py-3 px-4 bg-emerald-100 text-emerald-800 font-black text-xs rounded-2xl text-center flex items-center justify-center gap-1.5 border border-emerald-200">
                            <span>✅</span>
                            <span>Bill Settled & Paid</span>
                          </div>

                          {whatsappShareUrl && (
                            <a
                              href={whatsappShareUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow transition"
                            >
                              <span>📲</span>
                              <span>WhatsApp Bill</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={handleManualDownloadPDF}
                            className="px-4 py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition"
                          >
                            <span>📥</span>
                            <span>Download PDF</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty Selection Placeholder */
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
                  <span className="text-5xl">🧾</span>
                  <h3 className="text-base font-black text-slate-800 mt-3">
                    No Order Selected
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Search for a Bill Number or Table Number on the left, or select an open order from the awaiting settlement queue.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default CashierDashboard;
