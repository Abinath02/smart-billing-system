import Head from 'next/head';
import CustomerMenuPage from './CustomerMenu';

export default function Home() {
  return (
    <>
      <Head>
        <title>Restaurant Smart QR Menu</title>
        <meta name="description" content="Dine-in Smart Menu and Instant Table Ordering" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>
      <div className="bg-slate-900 text-white text-[11px] py-1.5 px-3 flex items-center justify-between border-b border-slate-800">
        <span className="font-bold tracking-wider text-orange-400">SMART RESTAURANT SUITE</span>
        <div className="flex items-center gap-3">
          <a href="/" className="hover:underline font-bold text-white">📱 Customer Menu</a>
          <span className="text-slate-600">|</span>
          <a href="/kitchen" className="hover:underline text-slate-300">👨‍🍳 Kitchen KDS</a>
          <span className="text-slate-600">|</span>
          <a href="/cashier" className="hover:underline text-slate-300">💰 Cashier POS</a>
          <span className="text-slate-600">|</span>
          <a href="/admin" className="hover:underline text-amber-400 font-bold">👑 Admin Portal</a>
        </div>
      </div>
      <CustomerMenuPage />
    </>
  );
}
