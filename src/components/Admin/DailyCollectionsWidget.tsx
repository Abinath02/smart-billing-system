import React from 'react';
import { Order } from '../../types/database.types';

interface DailyCollectionsWidgetProps {
  orders: Order[];
}

export const DailyCollectionsWidget: React.FC<DailyCollectionsWidgetProps> = ({ orders }) => {
  // Filter orders for today
  const todayStr = new Date().toISOString().split('T')[0];

  const todayOrders = orders.filter((o) => {
    const orderDate = new Date(o.created_at).toISOString().split('T')[0];
    return orderDate === todayStr;
  });

  const paidTodayOrders = todayOrders.filter((o) => o.status === 'paid');

  // Sum total collections for today
  const todayRevenue = paidTodayOrders.reduce((acc, curr) => acc + Number(curr.total_amount), 0);

  // Cash vs Card breakdown
  const cashRevenue = paidTodayOrders
    .filter((o) => o.payment_mode === 'cash')
    .reduce((acc, curr) => acc + Number(curr.total_amount), 0);

  const cardRevenue = paidTodayOrders
    .filter((o) => o.payment_mode === 'card')
    .reduce((acc, curr) => acc + Number(curr.total_amount), 0);

  // Average Order Value
  const avgOrderValue = paidTodayOrders.length > 0 ? todayRevenue / paidTodayOrders.length : 0;

  // Percentage split
  const cashPct = todayRevenue > 0 ? Math.round((cashRevenue / todayRevenue) * 100) : 0;
  const cardPct = todayRevenue > 0 ? 100 - cashPct : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Daily Collections Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute right-3 top-3 opacity-15 text-5xl font-black">₹</div>
        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200">
          Daily Collections
        </span>
        <h3 className="text-3xl font-black mt-1 tracking-tight">
          ₹{todayRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </h3>
        <p className="text-xs text-emerald-100 mt-2 flex items-center gap-1">
          <span className="font-bold text-white">+{paidTodayOrders.length}</span> settled orders today
        </p>
      </div>

      {/* 2. Total Orders Today */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Orders Processed
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-slate-900">{todayOrders.length}</h3>
            <span className="text-xs font-semibold text-emerald-600">
              ({paidTodayOrders.length} paid)
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Active Pending / Cooking:</span>
          <span className="font-extrabold text-amber-600">
            {todayOrders.length - paidTodayOrders.length}
          </span>
        </div>
      </div>

      {/* 3. Average Order Value (AOV) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Avg. Order Value (AOV)
          </span>
          <h3 className="text-3xl font-black text-slate-900 mt-1">
            ₹{avgOrderValue.toFixed(2)}
          </h3>
        </div>
        <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100">
          Per settled customer bill
        </p>
      </div>

      {/* 4. Payment Modes Breakdown */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Cash vs Card Split
          </span>
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1">💵 Cash: ₹{cashRevenue.toFixed(0)}</span>
              <span className="flex items-center gap-1">💳 Card: ₹{cardRevenue.toFixed(0)}</span>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${cashPct}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Cash: ${cashPct}%`}
              />
              <div
                style={{ width: `${cardPct}%` }}
                className="bg-blue-500 transition-all duration-500"
                title={`Card: ${cardPct}%`}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 font-semibold">
          <span>{cashPct}% Cash</span>
          <span>{cardPct}% Card / Digital</span>
        </div>
      </div>
    </div>
  );
};
