import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { Order, MenuItem, Offer, Waiter } from '../types/database.types';
import { DailyCollectionsWidget } from '../components/Admin/DailyCollectionsWidget';
import { MenuPriceManagement } from '../components/Admin/MenuPriceManagement';
import { OffersManagement } from '../components/Admin/OffersManagement';
import { AnalyticsCharts } from '../components/Admin/AnalyticsCharts';

type AdminTab = 'overview' | 'menu' | 'offers' | 'history' | 'waiters';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 1. Fetch All Admin Data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`*, order_items(*), waiter:waiters(*)`)
        .order('created_at', { ascending: false });

      if (ordersData) setOrders(ordersData as Order[]);

      // Menu Items
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .order('category');

      if (menuData) setMenuItems(menuData as MenuItem[]);

      // Offers
      const { data: offersData } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (offersData) setOffers(offersData as Offer[]);

      // Waiters
      const { data: waitersData } = await supabase
        .from('waiters')
        .select('*')
        .order('name');

      if (waitersData) setWaiters(waitersData as Waiter[]);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();

    // Realtime listener for incoming orders and status updates
    const channel = supabase
      .channel('admin_dashboard_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);

  return (
    <>
      <Head>
        <title>Admin Dashboard & Analytics | Spice Garden</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-100 flex text-slate-800">
        {/* ========================================================= */}
        {/* 1. SIDEBAR LAYOUT                                         */}
        {/* ========================================================= */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-300 transform lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Brand Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-xl shadow-lg">
                  👑
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-tight text-white">Spice Garden</h2>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400">
                    Admin Portal
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-4 space-y-1.5">
              <button
                onClick={() => {
                  setActiveTab('overview');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'overview'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">📊</span>
                <span>Overview & Daily Sales</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('menu');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'menu'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">🍲</span>
                <span>Menu & Pricing</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('offers');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'offers'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">🏷️</span>
                <span>Offers & Promotions</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('history');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'history'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">📜</span>
                <span>Transactions & Orders</span>
              </button>
            </nav>
          </div>

          {/* Quick System Links */}
          <div className="p-4 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block px-2">
              Restaurant Modules
            </span>
            <div className="space-y-1 text-xs font-semibold">
              <a
                href="/"
                target="_blank"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <span>📱</span> Customer QR Menu ↗
              </a>
              <a
                href="/kitchen"
                target="_blank"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <span>👨‍🍳</span> Kitchen KDS ↗
              </a>
              <a
                href="/cashier"
                target="_blank"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <span>💰</span> Cashier Billing POS ↗
              </a>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}

        {/* ========================================================= */}
        {/* 2. MAIN CONTENT AREA                                      */}
        {/* ========================================================= */}
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                ☰
              </button>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  {activeTab === 'overview' && 'Executive Overview & Daily Sales'}
                  {activeTab === 'menu' && 'Menu & Pricing Management'}
                  {activeTab === 'offers' && 'Offers & Poster Promotions'}
                  {activeTab === 'history' && 'Order History & Settlements'}
                </h1>
                <p className="text-xs text-slate-400">
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchAllData}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <span>🔄</span>
                <span className="hidden sm:inline">Refresh Data</span>
              </button>

              <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                A
              </div>
            </div>
          </header>

          {/* Main Dashboard Body */}
          <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
            {loading ? (
              <div className="space-y-4">
                <div className="h-32 bg-white rounded-3xl animate-pulse" />
                <div className="h-72 bg-white rounded-3xl animate-pulse" />
              </div>
            ) : (
              <>
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Daily Collections Widget */}
                    <DailyCollectionsWidget orders={orders} />

                    {/* Analytics Charts */}
                    <AnalyticsCharts orders={orders} />

                    {/* Recent Orders Quick Snapshot */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-black text-slate-900">
                          Recent Orders Activity
                        </h3>
                        <button
                          onClick={() => setActiveTab('history')}
                          className="text-xs text-orange-600 font-bold hover:underline"
                        >
                          View All ➔
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black border-b border-slate-100">
                            <tr>
                              <th className="py-2.5 px-4">Bill No</th>
                              <th className="py-2.5 px-3">Table</th>
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Amount</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-4">Payment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {orders.slice(0, 5).map((o) => (
                              <tr key={o.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                                  {o.bill_no}
                                </td>
                                <td className="py-2.5 px-3 font-semibold">Table {o.table_no}</td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {o.customer_name || 'Guest'}
                                </td>
                                <td className="py-2.5 px-3 font-extrabold text-slate-900">
                                  ₹{o.total_amount.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                      o.status === 'paid'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : o.status === 'ready'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {o.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 uppercase text-[10px] font-bold text-slate-500">
                                  {o.payment_mode}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MENU & PRICES */}
                {activeTab === 'menu' && (
                  <MenuPriceManagement
                    menuItems={menuItems}
                    onItemUpdated={(updated) =>
                      setMenuItems((prev) =>
                        prev.map((item) => (item.id === updated.id ? updated : item))
                      )
                    }
                    onItemAdded={(newItem) => setMenuItems((prev) => [newItem, ...prev])}
                  />
                )}

                {/* TAB 3: OFFERS & PROMOTIONS */}
                {activeTab === 'offers' && (
                  <OffersManagement
                    offers={offers}
                    menuItems={menuItems}
                    onOfferAdded={(newOffer) => setOffers((prev) => [newOffer, ...prev])}
                    onOfferUpdated={(updated) =>
                      setOffers((prev) =>
                        prev.map((off) => (off.id === updated.id ? updated : off))
                      )
                    }
                    onOfferDeleted={(deletedId) =>
                      setOffers((prev) => prev.filter((off) => off.id !== deletedId))
                    }
                  />
                )}

                {/* TAB 4: ORDER HISTORY & AUDIT */}
                {activeTab === 'history' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base font-black text-slate-900 mb-4">
                      Complete Order History ({orders.length})
                    </h3>

                    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black border-b border-slate-100">
                          <tr>
                            <th className="py-3 px-4">Bill No</th>
                            <th className="py-3 px-3">Date & Time</th>
                            <th className="py-3 px-3">Table</th>
                            <th className="py-3 px-3">Customer Contact</th>
                            <th className="py-3 px-3">Subtotal</th>
                            <th className="py-3 px-3">GST (5%)</th>
                            <th className="py-3 px-3">Total Amount</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-4">Mode</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {orders.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                {o.bill_no}
                              </td>
                              <td className="py-3 px-3 text-slate-500">
                                {new Date(o.created_at).toLocaleString('en-IN', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </td>
                              <td className="py-3 px-3 font-semibold">Table {o.table_no}</td>
                              <td className="py-3 px-3 text-slate-600">
                                <div>{o.customer_name || 'Guest'}</div>
                                <div className="text-[10px] text-slate-400">
                                  {o.customer_phone || o.customer_email || '-'}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-slate-600">
                                ₹{o.subtotal.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-slate-600">
                                ₹{o.tax_amount.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 font-extrabold text-slate-900">
                                ₹{o.total_amount.toFixed(2)}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    o.status === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : o.status === 'ready'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {o.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-600">
                                {o.payment_mode}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
