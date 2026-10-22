import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  UtensilsIcon,
  ArrowRightIcon,
  ShieldIcon,
  CashIcon,
  ChefIcon,
  WaiterIcon,
  QrCodeIcon,
} from '../components/common/Icons';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found | Spice Garden Smart Billing</title>
        <meta
          name="description"
          content="The requested page or dining table was not found on Spice Garden Smart Billing System."
        />
      </Head>

      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
        {/* Subtle decorative background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Minimal Brand Bar */}
        <header className="px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-slate-900 relative z-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-md transition group-hover:scale-105">
              <UtensilsIcon className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-white block">
                Spice Garden
              </span>
              <span className="text-[10px] text-slate-400 font-semibold block">
                Smart Restaurant Billing POS
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
          >
            <span>Dine-In Menu</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </header>

        {/* Main 404 Content */}
        <main className="max-w-xl mx-auto px-6 py-16 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            Error 404 • Destination Missing
          </div>

          <h1 className="text-7xl sm:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-4">
            404
          </h1>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3">
            Table or Page Not Found
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto mb-8">
            The page, QR bill, or table location you are attempting to reach does not exist or has been relocated to another service station.
          </p>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
            >
              <QrCodeIcon className="w-4 h-4" />
              <span>Open Customer Menu</span>
            </Link>

            <Link
              href="/admin"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
            >
              <ShieldIcon className="w-4 h-4 text-amber-400" />
              <span>Admin Portal</span>
            </Link>
          </div>

          {/* Quick Staff Portal Directory */}
          <div className="p-5 bg-slate-900/80 border border-slate-800/90 rounded-3xl text-left backdrop-blur-md">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-3">
              Staff &amp; Station Portals
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Link
                href="/cashier"
                className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-2xl transition flex items-center gap-2.5 group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CashIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block group-hover:text-emerald-400 transition">
                    Cashier POS
                  </span>
                  <span className="text-[10px] text-slate-400">Bill settlements</span>
                </div>
              </Link>

              <Link
                href="/kitchen"
                className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-2xl transition flex items-center gap-2.5 group"
              >
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <ChefIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block group-hover:text-orange-400 transition">
                    Kitchen KDS
                  </span>
                  <span className="text-[10px] text-slate-400">Live order queue</span>
                </div>
              </Link>

              <Link
                href="/waiter"
                className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-2xl transition flex items-center gap-2.5 group"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <WaiterIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block group-hover:text-purple-400 transition">
                    Waiter Service
                  </span>
                  <span className="text-[10px] text-slate-400">Desk confirm</span>
                </div>
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-6 border-t border-slate-900 text-center text-xs text-slate-500 relative z-10">
          <p>© {new Date().getFullYear()} Spice Garden Restaurant. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
