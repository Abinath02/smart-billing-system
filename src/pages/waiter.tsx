import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { Order, OrderItem, Waiter } from '../types/database.types';
import { WaiterLogin } from '../components/Waiter/WaiterLogin';
import { formatRs } from '../utils/currency';

export const WaiterDashboard: React.FC = () => {
  // Waiter Auth State
  const [currentWaiter, setCurrentWaiter] = useState<Waiter | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'unconfirmed' | 'my_tables' | 'all_tables'>('unconfirmed');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Selected Order for Modal/Inspection
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger Toast Notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Web Audio Synthesizer for alerts
  const playAlertSound = useCallback((type: 'new_order' | 'ready_order') => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'new_order') {
        // High double-tone chime for incoming customer table order
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

        osc1.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.45);
      } else {
        // 3-note pleasant chime for Kitchen Dish Ready!
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.35);
        });
      }
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  }, []);

  // 1. Auth Guard Check on Mount & Navigation (with bfcache protection)
  useEffect(() => {
    const checkAuth = async () => {
      setAuthChecking(true);
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('active_waiter');
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as Waiter;
              if (parsed && parsed.id) {
                // Verify with database that waiter is still active
                const { data: dbWaiter } = await supabase
                  .from('waiters')
                  .select('*')
                  .eq('id', parsed.id)
                  .single();

                if (dbWaiter && dbWaiter.is_active !== false) {
                  setCurrentWaiter(dbWaiter as Waiter);
                  setAuthChecking(false);
                  return;
                }
              }
            } catch (e) {
              console.warn('Invalid stored waiter data:', e);
            }
          }
        }

        // Check Supabase session fallback
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setCurrentWaiter({
              id: profile.id,
              name: profile.full_name,
              phone: profile.phone || null,
              emp_code: 'STAFF',
              is_active: profile.is_active !== false,
              created_at: profile.created_at,
            });
            setAuthChecking(false);
            return;
          }
        }

        setCurrentWaiter(null);
      } catch (err) {
        console.error('Waiter auth check error:', err);
        setCurrentWaiter(null);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();

    // Re-verify on browser back/forward cache navigation
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        checkAuth();
      }
    };

    const handlePopState = () => {
      checkAuth();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 2. Fetch Live Orders
  const fetchAllOrders = useCallback(async (silent = false) => {
    if (!silent) setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          waiter:waiters (*)
        `)
        .neq('status', 'paid')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as Order[]) || []);
    } catch (err: any) {
      console.error('Error fetching waiter orders:', err);
    } finally {
      if (!silent) setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (currentWaiter) {
      fetchAllOrders();
    }
  }, [currentWaiter, fetchAllOrders]);

  // 3. Periodic Background Sync (every 5 seconds)
  useEffect(() => {
    if (!currentWaiter) return;
    const interval = setInterval(() => {
      fetchAllOrders(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentWaiter, fetchAllOrders]);

  // 4. Supabase Realtime Channel
  useEffect(() => {
    if (!currentWaiter) return;

    const channel = supabase
      .channel('waiter_live_orders_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase
              .from('orders')
              .select('*, order_items(*), waiter:waiters(*)')
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setOrders((prev) => [data as Order, ...prev.filter((o) => o.id !== data.id)]);
              if (soundEnabled) playAlertSound('new_order');
              showToast(`🔔 New Order from Table ${data.table_no}! Please confirm at desk.`);
            }
          } else if (payload.eventType === 'UPDATE') {
            const { data } = await supabase
              .from('orders')
              .select('*, order_items(*), waiter:waiters(*)')
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setOrders((prev) =>
                prev.map((ord) => (ord.id === data.id ? (data as Order) : ord))
              );

              // If order belongs to this waiter and became ready, alert the waiter!
              if (
                data.waiter_id === currentWaiter.id &&
                data.status === 'ready' &&
                payload.old.status !== 'ready'
              ) {
                if (soundEnabled) playAlertSound('ready_order');
                showToast(`🛎️ Dishes for Table ${data.table_no} are READY! Serve now.`);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((ord) => ord.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWaiter, soundEnabled, playAlertSound]);

  // 5. Actions: Confirm & Approve Order at Table -> Dispatches to Kitchen
  const handleApproveAndSendToKitchen = async (order: Order) => {
    if (!currentWaiter) return;
    setActionLoadingId(order.id);

    try {
      const serverNote = `[Confirmed at Table by Server: ${currentWaiter.name} (${currentWaiter.emp_code || 'Floor'})]`;
      const combinedNotes = order.notes ? `${order.notes} | ${serverNote}` : serverNote;

      const { data, error } = await supabase
        .from('orders')
        .update({
          waiter_id: currentWaiter.id,
          status: 'pending', // Official status for kitchen queue
          notes: combinedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .select(`*, order_items(*), waiter:waiters(*)`);

      if (error) throw error;

      const updated = data && data.length > 0 ? (data[0] as Order) : { ...order, waiter_id: currentWaiter.id, waiter: currentWaiter };
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));

      showToast(`✅ Table ${order.table_no} confirmed! Order dispatched to Kitchen.`);
      if (selectedOrder?.id === order.id) setSelectedOrder(null);
    } catch (err: any) {
      console.error('Error approving order:', err);
      alert('Failed to approve order: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 6. Action: Cancel Order (Customer left or cancelled)
  const handleCancelOrder = async (order: Order) => {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel order ${order.bill_no} for Table ${order.table_no}?`
    );
    if (!confirmCancel) return;

    setActionLoadingId(order.id);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          notes: `${order.notes || ''} [Cancelled by Waiter: ${currentWaiter?.name}]`.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      showToast(`Order for Table ${order.table_no} marked as Cancelled.`);
      if (selectedOrder?.id === order.id) setSelectedOrder(null);
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      alert('Failed to cancel order: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 7. Action: Mark as Served to Table
  const handleMarkAsServed = async (order: Order) => {
    setActionLoadingId(order.id);
    try {
      const serverNote = `[Served to guests by: ${currentWaiter?.name} at ${new Date().toLocaleTimeString()}]`;
      const { data, error } = await supabase
        .from('orders')
        .update({
          notes: order.notes ? `${order.notes} | ${serverNote}` : serverNote,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .select(`*, order_items(*), waiter:waiters(*)`);

      if (error) throw error;
      const updated = data && data.length > 0 ? (data[0] as Order) : order;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      showToast(`🍽️ Table ${order.table_no} dishes served to guests!`);
      if (selectedOrder?.id === order.id) setSelectedOrder(null);
    } catch (err: any) {
      console.error('Error serving order:', err);
      alert('Failed to update: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 8. Logout Handler (with history wipe to prevent back button restoration)
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (e) {
      console.warn('Signout error:', e);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('active_waiter');
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
      } catch (e) {}
      window.history.replaceState(null, '', window.location.pathname);
      window.location.replace(window.location.pathname);
    }
    setCurrentWaiter(null);
  };

  // Filtered Queues
  // Queue 1: Customer orders awaiting waiter desk visit & confirmation
  const unconfirmedOrders = useMemo(() => {
    return orders.filter(
      (o) => !o.waiter_id && o.status !== 'paid' && o.status !== 'cancelled'
    );
  }, [orders]);

  // Queue 2: Orders confirmed by and assigned to THIS logged-in waiter
  const myAssignedOrders = useMemo(() => {
    if (!currentWaiter) return [];
    return orders.filter(
      (o) => o.waiter_id === currentWaiter.id && o.status !== 'paid' && o.status !== 'cancelled'
    );
  }, [orders, currentWaiter]);

  // Queue 3: All active restaurant orders
  const allActiveOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'paid' && o.status !== 'cancelled');
  }, [orders]);

  // Time elapsed helper
  const getTimeElapsed = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1 min ago';
    return `${mins} mins ago`;
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Checking Waiter Floor Shift...</span>
        </div>
      </div>
    );
  }

  // Auth Guard Gate
  if (!currentWaiter) {
    return <WaiterLogin onLoginSuccess={(waiter) => setCurrentWaiter(waiter)} />;
  }

  return (
    <>
      <Head>
        <title>Waiter Service POS | Smart Restaurant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-md">
                🤵
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight">Waiter Service POS</h1>
                <p className="text-[11px] text-slate-400">
                  Floor Server: <strong className="text-amber-400">{currentWaiter.name}</strong>{' '}
                  {currentWaiter.emp_code ? `(${currentWaiter.emp_code})` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  soundEnabled
                    ? 'bg-slate-800 border-slate-700 text-amber-300'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                }`}
                title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
              >
                <span>{soundEnabled ? '🔔' : '🔕'}</span>
                <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
              </button>

              <button
                type="button"
                onClick={() => fetchAllOrders()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                🔄 Sync
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-bold rounded-xl transition"
              >
                End Shift
              </button>
            </div>
          </div>
        </header>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-16 right-4 z-50 animate-bounce bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border border-emerald-400">
            <span>✨</span>
            <span>{toastMessage}</span>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
          {/* Status & Tab Navigation Bar */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-5 flex flex-wrap sm:flex-nowrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('unconfirmed')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                activeTab === 'unconfirmed'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🔔</span>
              <span>Needs Desk Confirmation</span>
              {unconfirmedOrders.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white text-orange-600 text-[11px] font-black animate-pulse">
                  {unconfirmedOrders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my_tables')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                activeTab === 'my_tables'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🤵</span>
              <span>My Assigned Tables</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-black">
                {myAssignedOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all_tables')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                activeTab === 'all_tables'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🏪</span>
              <span>All Floor Tables</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-black">
                {allActiveOrders.length}
              </span>
            </button>
          </div>

          {/* TAB 1: Unconfirmed Orders Awaiting Waiter Desk Visit */}
          {activeTab === 'unconfirmed' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-200">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🚨</span>
                  <div>
                    <h2 className="text-sm font-black text-orange-950">
                      Table Orders Awaiting Server Desk Confirmation ({unconfirmedOrders.length})
                    </h2>
                    <p className="text-xs text-orange-800">
                      Customers ordered from table QR. Visit their desk, confirm items, then approve to dispatch to kitchen chefs.
                    </p>
                  </div>
                </div>
              </div>

              {loadingOrders ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-56 bg-white rounded-3xl border border-slate-200 animate-pulse" />
                  ))}
                </div>
              ) : unconfirmedOrders.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <span className="text-5xl block mb-2">🎉</span>
                  <h3 className="text-base font-black text-slate-800">All Table Orders Confirmed!</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    No customers waiting for order verification right now. New table orders will ding here immediately.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unconfirmedOrders.map((ord) => {
                    const isActionLoading = actionLoadingId === ord.id;
                    const items = ord.order_items || [];

                    return (
                      <div
                        key={ord.id}
                        className="bg-white rounded-3xl shadow-sm border-2 border-orange-300 p-5 flex flex-col justify-between hover:shadow-md transition relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                          Needs Confirmation
                        </div>

                        <div>
                          {/* Table Header */}
                          <div className="flex items-start justify-between mb-3 pr-20">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-slate-900">
                                  Table {ord.table_no}
                                </span>
                              </div>
                              <span className="text-xs font-mono text-slate-400 font-bold block">
                                {ord.bill_no} • {getTimeElapsed(ord.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Customer Details */}
                          <div className="p-2.5 bg-slate-50 rounded-xl text-xs mb-3 border border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold uppercase block">
                                Guest
                              </span>
                              <span className="font-bold text-slate-800">
                                {ord.customer_name || 'Guest'}
                              </span>
                            </div>
                            {ord.customer_phone && (
                              <div className="text-right">
                                <span className="text-slate-400 text-[10px] font-bold uppercase block">
                                  Phone
                                </span>
                                <a
                                  href={`tel:${ord.customer_phone}`}
                                  className="text-orange-600 font-bold hover:underline"
                                >
                                  {ord.customer_phone}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Items Preview */}
                          <div className="space-y-1.5 mb-3 border-t border-b border-slate-100 py-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Ordered Items ({items.length})
                            </span>
                            {items.map((it) => (
                              <div
                                key={it.id}
                                className="flex items-center justify-between text-xs py-0.5"
                              >
                                <span className="font-semibold text-slate-800">
                                  <strong className="text-orange-600">{it.quantity}x</strong>{' '}
                                  {it.item_name}
                                  {it.special_instructions && (
                                    <span className="block text-[10px] text-slate-400 font-normal">
                                      📝 {it.special_instructions}
                                    </span>
                                  )}
                                </span>
                                <span className="font-mono font-bold text-slate-600">
                                  {formatRs(it.total_price)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Notes if any */}
                          {ord.notes && (
                            <div className="p-2 bg-amber-50 rounded-lg text-[11px] text-amber-900 mb-3 border border-amber-200">
                              <strong>Special Note:</strong> {ord.notes}
                            </div>
                          )}

                          <div className="flex justify-between items-center text-xs pt-1 mb-4">
                            <span className="text-slate-500 font-bold">Total Bill:</span>
                            <span className="text-base font-black text-orange-600">
                              {formatRs(ord.total_amount)}
                            </span>
                          </div>
                        </div>

                        {/* Confirmation Actions */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleApproveAndSendToKitchen(ord)}
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            {isActionLoading ? (
                              <span>Dispatching to Kitchen...</span>
                            ) : (
                              <>
                                <span>🚶‍♂️ Confirm at Desk &amp; Send to Kitchen</span>
                                <span>➔</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleCancelOrder(ord)}
                            className="w-full py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-[11px] rounded-xl transition border border-slate-200"
                          >
                            Cancel / Guest Left Table
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: My Assigned Tables (Confirmed by THIS waiter) */}
          {activeTab === 'my_tables' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-4 rounded-2xl border border-slate-200">
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Tables Assigned to {currentWaiter.name} ({myAssignedOrders.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    You confirmed these tables. Monitor cooking progress, serve ready dishes, and coordinate checkout.
                  </p>
                </div>
              </div>

              {myAssignedOrders.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <span className="text-5xl block mb-2">🤵</span>
                  <h3 className="text-base font-black text-slate-800">No Tables Assigned Yet</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Check the &quot;Needs Desk Confirmation&quot; tab to approve incoming table orders and take responsibility for them.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAssignedOrders.map((ord) => {
                    const isActionLoading = actionLoadingId === ord.id;
                    const items = ord.order_items || [];
                    const isReady = ord.status === 'ready';

                    return (
                      <div
                        key={ord.id}
                        className={`bg-white rounded-3xl shadow-sm p-5 flex flex-col justify-between transition border-2 ${
                          isReady
                            ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/20'
                            : 'border-slate-200'
                        }`}
                      >
                        <div>
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-black text-slate-900">
                                  Table {ord.table_no}
                                </span>
                                <span
                                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                                    isReady
                                      ? 'bg-emerald-100 text-emerald-800 animate-pulse border border-emerald-300'
                                      : ord.status === 'cooking'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isReady ? '🛎️ READY TO SERVE' : ord.status}
                                </span>
                              </div>
                              <span className="text-xs font-mono text-slate-400 block mt-0.5">
                                {ord.bill_no} • {getTimeElapsed(ord.created_at)}
                              </span>
                            </div>

                            <span className="text-xs font-black text-emerald-700">
                              {formatRs(ord.total_amount)}
                            </span>
                          </div>

                          {/* Guest info */}
                          <div className="text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span>Guest: <strong>{ord.customer_name || 'Dine-in Customer'}</strong></span>
                            {ord.customer_phone && <span className="block text-[11px] text-slate-400">{ord.customer_phone}</span>}
                          </div>

                          {/* Items summary */}
                          <div className="space-y-1 mb-3 text-xs divide-y divide-slate-100">
                            {items.map((it) => (
                              <div key={it.id} className="pt-1 flex justify-between">
                                <span className="font-semibold text-slate-800">
                                  {it.quantity}x {it.item_name}
                                </span>
                                <span className="font-mono text-slate-500">
                                  {formatRs(it.total_price)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Notes */}
                          {ord.notes && (
                            <p className="text-[11px] text-slate-500 italic mb-3 bg-slate-50 p-2 rounded-lg">
                              📝 {ord.notes}
                            </p>
                          )}
                        </div>

                        {/* Status specific actions */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          {isReady ? (
                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => handleMarkAsServed(ord)}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              {isActionLoading ? (
                                <span>Updating...</span>
                              ) : (
                                <>
                                  <span>🍽️ Deliver &amp; Mark as Served</span>
                                  <span>✓</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-center text-xs font-bold">
                              👨‍🍳 Kitchen chefs are preparing this order...
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                          >
                            Inspect Receipt / Details ➔
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: All Restaurant Tables Store-wide Overview */}
          {activeTab === 'all_tables' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <h2 className="text-sm font-black text-slate-900">
                  Floor-wide Dining Status ({allActiveOrders.length} Active Tables)
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time status of all tables across the restaurant.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allActiveOrders.map((ord) => {
                  const hasAssignedWaiter = Boolean(ord.waiter_id);
                  const isMine = ord.waiter_id === currentWaiter.id;

                  return (
                    <div
                      key={ord.id}
                      className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-lg font-black text-slate-900">
                              Table {ord.table_no}
                            </span>
                            <span className="text-xs font-mono text-slate-400 block">
                              {ord.bill_no}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                              ord.status === 'ready'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'cooking'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-50 rounded-xl text-xs mb-3 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Responsible Server:</span>
                            <span className="font-bold text-slate-800">
                              {isMine
                                ? '⭐ You (Assigned)'
                                : ord.waiter?.name
                                ? `🤵 ${ord.waiter.name}`
                                : '⚠️ Unconfirmed'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Total Amount:</span>
                            <span className="font-bold text-emerald-700">
                              {formatRs(ord.total_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Ordered:</span>
                            <span className="font-medium text-slate-600">
                              {getTimeElapsed(ord.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-500 mb-3">
                          {ord.order_items?.length || 0} items ordered
                        </div>
                      </div>

                      <div>
                        {!hasAssignedWaiter && (
                          <button
                            type="button"
                            onClick={() => handleApproveAndSendToKitchen(ord)}
                            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition shadow"
                          >
                            Claim &amp; Confirm at Table ➔
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* Order Details / Receipt Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Table {selectedOrder.table_no} Order Details
                  </h3>
                  <span className="text-xs font-mono text-slate-400 font-bold">
                    {selectedOrder.bill_no}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Guest</span>
                    <span className="font-bold text-slate-800">{selectedOrder.customer_name || 'Guest'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone</span>
                    <span className="font-bold text-slate-800">{selectedOrder.customer_phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                    <span className="font-bold text-orange-600 uppercase">{selectedOrder.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Waiter</span>
                    <span className="font-bold text-emerald-700">{selectedOrder.waiter?.name || 'Unassigned'}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                    Items List
                  </h4>
                  <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                    {(selectedOrder.order_items || []).map((it) => (
                      <div key={it.id} className="p-2.5 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800">{it.quantity}x {it.item_name}</span>
                          {it.special_instructions && (
                            <span className="block text-[10px] text-slate-400">{it.special_instructions}</span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-slate-700">{formatRs(it.total_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1 font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatRs(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (5%):</span>
                    <span>{formatRs(selectedOrder.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="text-orange-600">{formatRs(selectedOrder.total_amount)}</span>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="p-2.5 bg-amber-50 rounded-xl text-amber-900 border border-amber-200">
                    <strong className="block text-[10px] uppercase">Notes / Instructions:</strong>
                    <span>{selectedOrder.notes}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WaiterDashboard;
