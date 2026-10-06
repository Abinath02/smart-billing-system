import React, { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { Order, Waiter, MenuItem, Profile } from '../types/database.types';
import { KitchenLogin } from '../components/Kitchen/KitchenLogin';
import { OrderCard } from '../components/Kitchen/OrderCard';
import { AssignWaiterModal } from '../components/Kitchen/AssignWaiterModal';
import { AddWaiterModal } from '../components/Kitchen/AddWaiterModal';
import { MenuAvailabilityTab } from '../components/Kitchen/MenuAvailabilityTab';

export const KitchenDashboard: React.FC = () => {
  // Staff Auth State
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Kitchen Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'ready'>('orders');

  // Modals State
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<Order | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAddWaiterModalOpen, setIsAddWaiterModalOpen] = useState(false);

  // Sound chime notification toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio synthesizer chime for new incoming orders
  const playKitchenChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.log('Audio chime not allowed yet');
    }
  }, []);

  // 1. Check Authentication on Mount
  useEffect(() => {
    const checkAuth = async () => {
      setAuthChecking(true);
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
          setCurrentUser(profile as Profile);
        } else {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email!,
            full_name: 'Kitchen Staff',
            role: 'kitchen',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
      setAuthChecking(false);
    };

    checkAuth();
  }, []);

  // 2. Fetch Orders, Waiters, and Menu Items
  const fetchAllData = useCallback(async () => {
    setLoadingOrders(true);
    try {
      // Fetch orders with nested order_items
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          waiter:waiters (*)
        `)
        .order('created_at', { ascending: false });

      if (ordersErr) console.error('Orders error:', ordersErr);
      else setOrders(ordersData as Order[]);

      // Fetch active waiters
      const { data: waitersData } = await supabase
        .from('waiters')
        .select('*')
        .order('name');
      if (waitersData) setWaiters(waitersData as Waiter[]);

      // Fetch menu items
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .order('category');
      if (menuData) setMenuItems(menuData as MenuItem[]);
    } catch (err) {
      console.error('Error fetching kitchen dashboard data:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser, fetchAllData]);

  // 3. Supabase Realtime Subscription for Live Kitchen Orders
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('kitchen_live_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch complete order with items
            const { data } = await supabase
              .from('orders')
              .select('*, order_items(*), waiter:waiters(*)')
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setOrders((prev) => [data as Order, ...prev.filter((o) => o.id !== data.id)]);
              if (soundEnabled) playKitchenChime();
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
  }, [currentUser, soundEnabled, playKitchenChime]);

  // 4. Action: Start Cooking
  const handleStartCooking = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cooking' })
        .eq('id', orderId);

      if (error) throw error;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'cooking' } : o))
      );
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  // 5. Action: Open Modal to Mark as Cooked & Assign Waiter
  const handleOpenAssignModal = (order: Order) => {
    setSelectedOrderForAssign(order);
    setIsAssignModalOpen(true);
  };

  // 6. Action: Assign Waiter and Mark as Ready
  const handleAssignWaiterAndReady = async (orderId: string, waiterId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'ready',
        waiter_id: waiterId,
      })
      .eq('id', orderId);

    if (error) throw error;

    const assignedWaiter = waiters.find((w) => w.id === waiterId);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: 'ready', waiter_id: waiterId, waiter: assignedWaiter }
          : o
      )
    );
  };

  // 7. Action: Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  // Filter orders
  const activeKitchenOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'cooking'
  );

  const readyOrders = orders.filter((o) => o.status === 'ready');

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Loading Kitchen System...</span>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!currentUser) {
    return <KitchenLogin onLoginSuccess={(profile) => setCurrentUser(profile)} />;
  }

  return (
    <>
      <Head>
        <title>Kitchen Display System (KDS) | Live Orders</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
        {/* Top KDS Navbar */}
        <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-xl shadow-md">
                👨‍🍳
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight">Kitchen Display (KDS)</h1>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Staff: <span className="text-orange-400 font-bold">{currentUser.full_name}</span> ({currentUser.role})
                </p>
              </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'orders'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>🔥 Live Orders</span>
                {activeKitchenOrders.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white text-orange-600 text-[10px] font-extrabold">
                    {activeKitchenOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('ready')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'ready'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>🍽️ Ready to Serve</span>
                {readyOrders.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-white text-[10px] font-extrabold">
                    {readyOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('menu')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'menu'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>📦 Menu Availability</span>
              </button>
            </div>

            {/* Utility Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Chime sound is ON' : 'Chime sound is MUTED'}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm transition ${
                  soundEnabled
                    ? 'border-slate-700 bg-slate-800 text-yellow-400'
                    : 'border-slate-800 bg-slate-900 text-slate-500'
                }`}
              >
                {soundEnabled ? '🔔' : '🔕'}
              </button>

              <button
                onClick={() => setIsAddWaiterModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1"
              >
                <span>+</span> Add Waiter
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

        {/* Main Dashboard Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          {/* TAB 1: LIVE ORDERS */}
          {activeTab === 'orders' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Active Kitchen Orders
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live Realtime incoming food orders from customer QR scans
                  </p>
                </div>
                <button
                  onClick={fetchAllData}
                  className="px-3 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1"
                >
                  <span>🔄</span> Refresh
                </button>
              </div>

              {loadingOrders ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-64 bg-white rounded-3xl p-5 shadow-sm border border-gray-200 animate-pulse"
                    />
                  ))}
                </div>
              ) : activeKitchenOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center max-w-lg mx-auto my-12">
                  <span className="text-5xl">✨</span>
                  <h3 className="text-base font-bold text-slate-800 mt-3">
                    All caught up, Chef!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    No pending orders right now. New customer QR orders will appear here automatically in real time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeKitchenOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onMarkAsCooked={handleOpenAssignModal}
                      onStartCooking={handleStartCooking}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: READY TO SERVE ORDERS */}
          {activeTab === 'ready' && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Ready for Pickup
                </h2>
                <p className="text-xs text-slate-500">
                  Cooked dishes currently being served by assigned waiters
                </p>
              </div>

              {readyOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center max-w-md mx-auto my-12">
                  <span className="text-4xl">🍽️</span>
                  <p className="text-sm font-bold text-gray-700 mt-2">
                    No orders awaiting pickup
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {readyOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-3xl p-5 border border-green-200 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b pb-3 border-gray-100">
                          <div>
                            <span className="text-2xl font-black text-gray-900">
                              Table {order.table_no}
                            </span>
                            <p className="text-xs font-mono text-gray-400">{order.bill_no}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold uppercase">
                            Ready 🍽️
                          </span>
                        </div>

                        {/* Assigned Waiter Badge */}
                        <div className="mt-3 p-2.5 rounded-xl bg-green-50 border border-green-200 text-xs text-green-900 flex items-center justify-between">
                          <span className="font-medium">Assigned Waiter:</span>
                          <span className="font-extrabold text-sm text-green-800">
                            {order.waiter?.name || 'Assigned'}
                          </span>
                        </div>

                        {/* Items list */}
                        <div className="mt-3 space-y-1">
                          {order.order_items?.map((item) => (
                            <div
                              key={item.id}
                              className="text-xs flex justify-between text-gray-700 py-0.5"
                            >
                              <span>
                                {item.quantity}x {item.item_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MENU AVAILABILITY */}
          {activeTab === 'menu' && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Kitchen Menu Stock Control
                </h2>
                <p className="text-xs text-slate-500">
                  Toggle any dish instantly. Toggling OFF immediately hides the item from the customer QR menu.
                </p>
              </div>

              <MenuAvailabilityTab
                menuItems={menuItems}
                onItemUpdated={(updated) =>
                  setMenuItems((prev) =>
                    prev.map((item) => (item.id === updated.id ? updated : item))
                  )
                }
              />
            </div>
          )}
        </main>

        {/* MODAL 1: Assign Waiter & Mark Ready */}
        <AssignWaiterModal
          isOpen={isAssignModalOpen}
          order={selectedOrderForAssign}
          waiters={waiters}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedOrderForAssign(null);
          }}
          onAssign={handleAssignWaiterAndReady}
          onOpenAddWaiter={() => setIsAddWaiterModalOpen(true)}
        />

        {/* MODAL 2: Add New Waiter */}
        <AddWaiterModal
          isOpen={isAddWaiterModalOpen}
          onClose={() => setIsAddWaiterModalOpen(false)}
          onWaiterAdded={(newWaiter) => {
            setWaiters((prev) => [newWaiter, ...prev]);
            alert(`Waiter ${newWaiter.name} added successfully!`);
          }}
        />
      </div>
    </>
  );
};

export default KitchenDashboard;
