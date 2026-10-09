import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { Order, MenuItem, Offer, Waiter, Profile } from '../types/database.types';
import { DailyCollectionsWidget } from '../components/Admin/DailyCollectionsWidget';
import { MenuPriceManagement } from '../components/Admin/MenuPriceManagement';
import { OffersManagement } from '../components/Admin/OffersManagement';
import { AnalyticsCharts } from '../components/Admin/AnalyticsCharts';
import { AdminLogin } from '../components/Admin/AdminLogin';

type AdminTab = 'overview' | 'menu' | 'offers' | 'history' | 'qrcodes';

export const AdminDashboard: React.FC = () => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedTable, setCopiedTable] = useState<string | null>(null);

  // 1. Auth Guard Check
  useEffect(() => {
    const checkAuth = async () => {
      setAuthChecking(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && profile.role === 'admin') {
            setCurrentUser(profile as Profile);
          } else if (profile) {
            setCurrentUser(null);
          } else {
            setCurrentUser({
              id: session.user.id,
              email: session.user.email!,
              full_name: 'Administrator',
              role: 'admin',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.error('Admin auth check failed:', err);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // 2. Fetch All Admin Data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`*, order_items(*), waiter:waiters(*)`)
        .order('created_at', { ascending: false });

      if (ordersData) setOrders(ordersData as Order[]);

      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .order('category');

      if (menuData) setMenuItems(menuData as MenuItem[]);

      const { data: offersData } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (offersData) setOffers(offersData as Offer[]);

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
    if (currentUser) {
      fetchAllData();

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
    }
  }, [currentUser, fetchAllData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const copyTableLink = (tableNo: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/?table=${tableNo}`;
    navigator.clipboard.writeText(url);
    setCopiedTable(tableNo);
    setTimeout(() => setCopiedTable(null), 2000);
  };

  // GSTR-1 Tax Report CSV Export
  const handleExportGSTR1 = () => {
    if (!orders || orders.length === 0) {
      alert('No orders available to export.');
      return;
    }

    const headers = [
      'Bill Number',
      'Invoice Date',
      'Invoice Time',
      'Table Number',
      'Customer Name',
      'Customer Phone',
      'Taxable Subtotal (INR)',
      'CGST 2.5% (INR)',
      'SGST 2.5% (INR)',
      'Total GST 5% (INR)',
      'Discount (INR)',
      'Invoice Total (INR)',
      'Payment Mode',
      'Status',
    ];

    const rows = orders.map((o) => {
      const d = new Date(o.created_at);
      const dateStr = d.toLocaleDateString('en-IN');
      const timeStr = d.toLocaleTimeString('en-IN');
      const halfTax = (Number(o.tax_amount) / 2).toFixed(2);

      return [
        `"${o.bill_no}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${o.table_no}"`,
        `"${(o.customer_name || 'Guest').replace(/"/g, '""')}"`,
        `"${o.customer_phone || ''}"`,
        Number(o.subtotal).toFixed(2),
        halfTax,
        halfTax,
        Number(o.tax_amount).toFixed(2),
        Number(o.discount_amount).toFixed(2),
        Number(o.total_amount).toFixed(2),
        `"${o.payment_mode}"`,
        `"${o.status}"`,
      ].join(',');
    });

    const csvData = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvData);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GSTR1_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Standard restaurant tables list
  const standardTables = [
    'T-01', 'T-02', 'T-03', 'T-04', 'T-05',
    'T-06', 'T-07', 'T-08', 'T-09', 'T-10',
    'T-11', 'T-12', 'VIP-1', 'VIP-2', 'Garden-1', 'Garden-2'
  ];

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Validating Administrator Credentials...</span>
        </div>
      </div>
    );
  }

  // Auth Guard Gate
  if (!currentUser) {
    return <AdminLogin onLoginSuccess={(profile) => setCurrentUser(profile)} />;
  }

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
                <span>Orders & Tax Audit</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('qrcodes');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'qrcodes'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">🔲</span>
                <span>Table QR Codes</span>
              </button>
            </nav>
          </div>

          {/* User profile & Module links */}
          <div className="p-4 border-t border-slate-800 space-y-3">
            <div className="px-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                Logged in as
              </span>
              <p className="text-xs font-bold text-white truncate">{currentUser.full_name}</p>
              <p className="text-[10px] text-amber-400 font-semibold">{currentUser.role.toUpperCase()}</p>
            </div>

            <div className="space-y-1 text-xs font-semibold pt-1 border-t border-slate-800/80">
              <a
                href="/"
                target="_blank"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <span>📱</span> Customer QR Menu ↗
              </a>
              <a
                href="/kitchen"
                target="_blank"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <span>👨‍🍳</span> Kitchen KDS ↗
              </a>
              <a
                href="/cashier"
                target="_blank"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <span>💰</span> Cashier Billing POS ↗
              </a>
            </div>

            <button
              onClick={handleLogout}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
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
                  {activeTab === 'history' && 'Order History & GST Tax Audit'}
                  {activeTab === 'qrcodes' && 'Dine-In Table QR Codes Generator'}
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

              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition"
              >
                Sign Out
              </button>
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

                    {/* Analytics Charts with Real Category Data */}
                    <AnalyticsCharts orders={orders} menuItems={menuItems} />

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
                            {orders.slice(0, 6).map((o) => (
                              <tr key={o.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                                  {o.bill_no}
                                </td>
                                <td className="py-2.5 px-3 font-semibold">Table {o.table_no}</td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {o.customer_name || 'Guest'}
                                </td>
                                <td className="py-2.5 px-3 font-extrabold text-slate-900">
                                  ₹{Number(o.total_amount).toFixed(2)}
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

                {/* TAB 4: ORDER HISTORY & GST REPORT EXPORT */}
                {activeTab === 'history' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          Complete Order History ({orders.length})
                        </h3>
                        <p className="text-xs text-slate-400">
                          Itemized records, settlements, and GST tax records
                        </p>
                      </div>

                      <button
                        onClick={handleExportGSTR1}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                      >
                        <span>📥</span>
                        <span>Export GSTR-1 Tax Report (CSV)</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black border-b border-slate-100">
                          <tr>
                            <th className="py-3 px-4">Bill No</th>
                            <th className="py-3 px-3">Date & Time</th>
                            <th className="py-3 px-3">Table</th>
                            <th className="py-3 px-3">Customer Contact</th>
                            <th className="py-3 px-3">Subtotal</th>
                            <th className="py-3 px-3">CGST (2.5%)</th>
                            <th className="py-3 px-3">SGST (2.5%)</th>
                            <th className="py-3 px-3">Total GST (5%)</th>
                            <th className="py-3 px-3">Grand Total</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-4">Mode</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {orders.map((o) => {
                            const halfTax = (Number(o.tax_amount) / 2).toFixed(2);
                            return (
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
                                  ₹{Number(o.subtotal).toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-slate-600 font-mono">
                                  ₹{halfTax}
                                </td>
                                <td className="py-3 px-3 text-slate-600 font-mono">
                                  ₹{halfTax}
                                </td>
                                <td className="py-3 px-3 text-slate-600">
                                  ₹{Number(o.tax_amount).toFixed(2)}
                                </td>
                                <td className="py-3 px-3 font-extrabold text-slate-900">
                                  ₹{Number(o.total_amount).toFixed(2)}
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
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 5: TABLE QR CODES GENERATOR WITH VISUAL PRINTABLE QR CARDS */}
                {activeTab === 'qrcodes' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4 border-slate-100">
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          Dine-In Table QR Code Tent Cards
                        </h3>
                        <p className="text-xs text-slate-500">
                          Print these QR cards and place them on dining tables. Customers scan with their phone camera to instantly view the menu and place orders.
                        </p>
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow"
                      >
                        <span>🖨️</span>
                        <span>Print All Table Cards</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {standardTables.map((tbl) => {
                        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://spicegarden.com';
                        const tableUrl = `${origin}/?table=${tbl}`;
                        const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${encodeURIComponent(tableUrl)}`;

                        return (
                          <div
                            key={tbl}
                            className="p-5 rounded-3xl border-2 border-slate-200 bg-white flex flex-col items-center text-center shadow-sm hover:border-orange-500 transition group"
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">
                              SPICE GARDEN
                            </span>
                            <h4 className="text-lg font-black text-slate-900 mt-0.5">Table {tbl}</h4>

                            {/* Scannable Visual QR Code Image */}
                            <div className="w-36 h-36 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center my-3 group-hover:scale-105 transition-transform">
                              <img
                                src={qrCodeImgUrl}
                                alt={`QR Code for Table ${tbl}`}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            </div>

                            <p className="text-[11px] font-bold text-slate-600">
                              Scan to View Menu & Order
                            </p>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mt-1 font-semibold">
                              🔒 Auto-Locked Table
                            </span>

                            <div className="mt-4 flex gap-2 w-full pt-2 border-t border-slate-100">
                              <button
                                onClick={() => copyTableLink(tbl)}
                                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                              >
                                {copiedTable === tbl ? '✓ Copied' : 'Copy URL'}
                              </button>
                              <a
                                href={`/?table=${tbl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition"
                                title="Open customer view"
                              >
                                Open ↗
                              </a>
                            </div>
                          </div>
                        );
                      })}
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
