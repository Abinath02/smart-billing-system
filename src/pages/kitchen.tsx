import React, { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { Order, Waiter, MenuItem, Profile, InventoryItem, InventoryLog } from '../types/database.types';
import { KitchenLogin } from '../components/Kitchen/KitchenLogin';
import { OrderCard } from '../components/Kitchen/OrderCard';
import { AssignWaiterModal } from '../components/Kitchen/AssignWaiterModal';
import { AddWaiterModal } from '../components/Kitchen/AddWaiterModal';
import { MenuAvailabilityTab } from '../components/Kitchen/MenuAvailabilityTab';
import { KitchenInventoryTab } from '../components/Kitchen/KitchenInventoryTab';

const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
  { id: '10000000-0000-0000-0000-000000000001', name: 'Basmati Rice', category: 'Grains & Staples', quantity: 35.0, unit: 'kg', min_threshold: 10.0, cost_per_unit: 95, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000002', name: 'Burger Buns', category: 'Bakery', quantity: 60.0, unit: 'pcs', min_threshold: 20.0, cost_per_unit: 8, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000003', name: 'Cooking Salt', category: 'Seasoning', quantity: 15.0, unit: 'kg', min_threshold: 5.0, cost_per_unit: 22, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000004', name: 'Sunflower Cooking Oil', category: 'Oils', quantity: 25.0, unit: 'liters', min_threshold: 8.0, cost_per_unit: 140, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000005', name: 'Fresh Chicken', category: 'Meat & Poultry', quantity: 30.0, unit: 'kg', min_threshold: 10.0, cost_per_unit: 220, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000006', name: 'Wheat Flour (Atta)', category: 'Grains & Staples', quantity: 25.0, unit: 'kg', min_threshold: 6.0, cost_per_unit: 48, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000007', name: 'All-Purpose Flour (Maida)', category: 'Grains & Staples', quantity: 20.0, unit: 'kg', min_threshold: 5.0, cost_per_unit: 45, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000008', name: 'Refined White Sugar', category: 'Grains & Staples', quantity: 18.0, unit: 'kg', min_threshold: 5.0, cost_per_unit: 42, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000009', name: 'Fresh Milk', category: 'Dairy', quantity: 15.0, unit: 'liters', min_threshold: 5.0, cost_per_unit: 56, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000010', name: 'Butter & Ghee', category: 'Dairy', quantity: 8.0, unit: 'kg', min_threshold: 3.0, cost_per_unit: 580, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000011', name: 'Biryani Garam Masala', category: 'Seasoning', quantity: 5.0, unit: 'kg', min_threshold: 2.0, cost_per_unit: 650, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000012', name: 'Paneer (Cottage Cheese)', category: 'Dairy', quantity: 12.0, unit: 'kg', min_threshold: 4.0, cost_per_unit: 360, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const KitchenDashboard: React.FC = () => {
  // Staff Auth State
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Kitchen Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(DEFAULT_INVENTORY_ITEMS);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('');

  // Tab State: orders | inventory | menu | ready
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'menu' | 'ready'>('orders');

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

  // 1. Strict Authentication Check on Mount
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

          if (profile && (profile.role === 'kitchen' || profile.role === 'admin') && profile.is_active !== false) {
            setCurrentUser(profile as Profile);
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Kitchen auth check failed:', err);
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // 2. Fetch Orders, Waiters, Menu Items, and Inventory
  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setLoadingOrders(true);
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
      else if (ordersData) setOrders(ordersData as Order[]);

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

      // Fetch Inventory Raw Materials
      const { data: invData } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');
      if (invData && invData.length > 0) {
        setInventoryItems(invData as InventoryItem[]);
      }

      // Fetch Inventory Activity Logs
      const { data: logsData } = await supabase
        .from('inventory_logs')
        .select(`
          *,
          item:inventory_items (*)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      if (logsData) {
        setInventoryLogs(logsData as InventoryLog[]);
      }

      setLastRefreshedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error fetching kitchen dashboard data:', err);
    } finally {
      if (!silent) setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser, fetchAllData]);

  // 3. 5-Second Interval Polling Timer for Kitchen Live Orders Sync
  useEffect(() => {
    if (!currentUser) return;

    // Guaranteed 5-second auto refresh as required
    const intervalId = setInterval(() => {
      fetchAllData(true); // silent fetch every 5000ms
    }, 5000);

    return () => clearInterval(intervalId);
  }, [currentUser, fetchAllData]);

  // 4. Supabase Realtime Subscription for Instant Live Updates
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('kitchen_live_channel')
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

  // 5. Action: Start Cooking
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

  // 6. Action: Open Modal to Mark as Cooked & Assign Waiter
  const handleOpenAssignModal = (order: Order) => {
    setSelectedOrderForAssign(order);
    setIsAssignModalOpen(true);
  };

  // 7. Action: Assign Waiter and Mark as Ready
  const handleAssignWaiterAndReady = async (waiterId: string) => {
    if (!selectedOrderForAssign) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'ready',
          waiter_id: waiterId,
        })
        .eq('id', selectedOrderForAssign.id);

      if (error) throw error;

      // Update local state
      const assignedWaiter = waiters.find((w) => w.id === waiterId);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderForAssign.id
            ? { ...o, status: 'ready', waiter_id: waiterId, waiter: assignedWaiter }
            : o
        )
      );

      setIsAssignModalOpen(false);
      setSelectedOrderForAssign(null);
    } catch (err: any) {
      alert('Error assigning waiter: ' + err.message);
    }
  };

  // 8. Action: Mark as Paid (from Ready tab if necessary)
  const handleMarkAsServed = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'paid' } : o))
    );
  };

  // 9. Action: Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  // Filter orders
  const activeKitchenOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'cooking'
  );

  const readyOrders = orders.filter((o) => o.status === 'ready');

  const lowStockCount = inventoryItems.filter(
    (item) => item.quantity <= item.min_threshold
  ).length;

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Validating Kitchen Staff Access...</span>
        </div>
      </div>
    );
  }

  // Auth Guard Gate
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
                  {/* Live 5-second pulse sync badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-950/80 border border-emerald-800 rounded-full text-emerald-300 text-[10px] font-extrabold tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>LIVE 5s AUTO-SYNC</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Chef: <span className="text-orange-400 font-bold">{currentUser.full_name}</span> ({currentUser.role})
                  {lastRefreshedTime && (
                    <span className="text-slate-500 ml-2">Synced at {lastRefreshedTime}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
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

              {/* Store & Raw Materials Tab */}
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'inventory'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>📦 Raw Materials (இருப்பு)</span>
                {lowStockCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-extrabold animate-pulse">
                    {lowStockCount} Low
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 text-[10px]">
                    {inventoryItems.length}
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
                <span>🚫 Menu Toggle</span>
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
                <span>+</span> Waiter
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
          {/* TAB 1: LIVE ORDERS (Auto-refreshes every 5 seconds) */}
          {activeTab === 'orders' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Active Kitchen Orders</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ⚡ 5s Auto-Refresh Active
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live orders from customer QR menu refresh automatically every 5 seconds.
                  </p>
                </div>
                <button
                  onClick={() => fetchAllData(false)}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
                >
                  <span>🔄</span> Refresh Now
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
                  <div className="text-5xl mb-3">🍳</div>
                  <h3 className="text-lg font-bold text-slate-700">Kitchen is All Caught Up!</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    No active cooking orders right now. Orders placed by customers will automatically show up here within 5 seconds.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Monitoring live orders every 5s...</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeKitchenOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStartCooking={handleStartCooking}
                      onMarkAsCooked={handleOpenAssignModal}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STORE & RAW MATERIALS (INGREDIENTS INVENTORY & ALERT SYSTEM) */}
          {activeTab === 'inventory' && (
            <KitchenInventoryTab
              inventoryItems={inventoryItems}
              inventoryLogs={inventoryLogs}
              onRefresh={() => fetchAllData(true)}
              currentUser={currentUser}
            />
          )}

          {/* TAB 3: READY ORDERS */}
          {activeTab === 'ready' && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Dishes Ready for Table Service
                </h2>
                <p className="text-xs text-slate-500">
                  Assigned to waiters for immediate table delivery
                </p>
              </div>

              {readyOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center max-w-md mx-auto my-8">
                  <div className="text-4xl mb-2">🍽️</div>
                  <h3 className="text-base font-bold text-slate-700">No Orders Waiting to be Served</h3>
                  <p className="text-xs text-slate-400 mt-1">Cooked orders ready for delivery appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {readyOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-base font-black text-emerald-800">
                            Table {order.table_no}
                          </span>
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-extrabold uppercase">
                            Ready
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                          Bill: <span className="font-mono font-bold text-slate-700">{order.bill_no}</span>
                        </p>
                        <p className="text-xs text-slate-700 font-semibold mb-3">
                          Assigned Waiter:{' '}
                          <span className="text-orange-600 font-bold">
                            {order.waiter?.name || 'Assigned to Staff'}
                          </span>
                        </p>

                        <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          {order.order_items?.map((item) => (
                            <div key={item.id} className="text-xs flex justify-between">
                              <span className="text-slate-700 font-medium">{item.item_name}</span>
                              <span className="font-extrabold text-slate-900">
                                × {item.quantity}
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

          {/* TAB 4: MENU AVAILABILITY */}
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
