import React, { useEffect, useState, useMemo } from 'react';
import { Order, MenuItem } from '../../types/database.types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnalyticsChartsProps {
  orders: Order[];
  menuItems?: MenuItem[];
}

const COLORS = ['#ea580c', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ orders, menuItems = [] }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Calculate Past 7 Days Revenue Trend
  const dailyTrendData = useMemo(() => {
    const daysMap: { [day: string]: { revenue: number; ordersCount: number } } = {};

    // Generate last 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      daysMap[key] = { revenue: 0, ordersCount: 0 };
    }

    orders.forEach((o) => {
      if (o.status === 'paid') {
        const orderDay = new Date(o.created_at).toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        if (daysMap[orderDay]) {
          daysMap[orderDay].revenue += Number(o.total_amount);
          daysMap[orderDay].ordersCount += 1;
        }
      }
    });

    return Object.keys(daysMap).map((dateKey) => ({
      date: dateKey,
      revenue: Math.round(daysMap[dateKey].revenue),
      orders: daysMap[dateKey].ordersCount,
    }));
  }, [orders]);

  // 2. Dynamically Calculate Real Category Breakdown from Settled Orders
  const categoryData = useMemo(() => {
    const catMap: { [category: string]: number } = {};
    const itemCategoryMap = new Map<string, string>();

    // Build lookup map from menuItems
    menuItems.forEach((m) => {
      itemCategoryMap.set(m.id, m.category);
      itemCategoryMap.set(m.name.toLowerCase().trim(), m.category);
    });

    // Helper to infer category from dish name if id wasn't matched
    const inferCategory = (name: string): string => {
      const lower = name.toLowerCase();
      if (lower.includes('biryani') || lower.includes('curry') || lower.includes('paneer') || lower.includes('rice') || lower.includes('masala')) {
        return 'Main Course';
      }
      if (lower.includes('fry') || lower.includes('tikka') || lower.includes('soup') || lower.includes('crispy') || lower.includes('starter')) {
        return 'Starters';
      }
      if (lower.includes('naan') || lower.includes('roti') || lower.includes('paratha') || lower.includes('bread')) {
        return 'Breads';
      }
      if (lower.includes('coffee') || lower.includes('tea') || lower.includes('juice') || lower.includes('shake') || lower.includes('cooler') || lower.includes('soda')) {
        return 'Beverages';
      }
      if (lower.includes('jamun') || lower.includes('ice cream') || lower.includes('cake') || lower.includes('halwa') || lower.includes('dessert')) {
        return 'Desserts';
      }
      return 'Special Delights';
    };

    let totalRevenue = 0;

    orders.forEach((o) => {
      // Calculate from settled or active orders
      if (o.order_items && o.order_items.length > 0) {
        o.order_items.forEach((item) => {
          let category = 'Main Course';
          if (item.item_id && itemCategoryMap.has(item.item_id)) {
            category = itemCategoryMap.get(item.item_id)!;
          } else if (itemCategoryMap.has(item.item_name.toLowerCase().trim())) {
            category = itemCategoryMap.get(item.item_name.toLowerCase().trim())!;
          } else {
            category = inferCategory(item.item_name);
          }

          const amount = Number(item.total_price) || 0;
          catMap[category] = (catMap[category] || 0) + amount;
          totalRevenue += amount;
        });
      }
    });

    if (totalRevenue === 0) {
      return [];
    }

    // Convert to percentage breakdown
    const result = Object.entries(catMap)
      .filter(([_, revenue]) => revenue > 0)
      .map(([name, revenue]) => ({
        name,
        revenue: Math.round(revenue),
        value: Math.round((revenue / totalRevenue) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return result;
  }, [orders, menuItems]);

  if (!mounted) {
    return (
      <div className="h-64 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-400 font-semibold">Loading Analytics Charts...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Revenue & Sales Trend (8 Columns) */}
      <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600">
              Revenue Analytics
            </span>
            <h3 className="text-base font-black text-slate-900">7-Day Sales Trend</h3>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
            Last 7 Days
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
              <Tooltip
                formatter={(value: any) => [`₹${value}`, 'Collections']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#ea580c"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Real Category Distribution Donut Chart (4 Columns) */}
      <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600">
            Real Category Share
          </span>
          <h3 className="text-base font-black text-slate-900">Sales by Category</h3>
        </div>

        {categoryData.length === 0 ? (
          <div className="my-auto py-10 text-center text-slate-400">
            <span className="text-3xl">📊</span>
            <p className="text-xs font-semibold mt-2">No category sales recorded yet</p>
            <p className="text-[10px] text-slate-400">Settled orders will generate live category shares</p>
          </div>
        ) : (
          <>
            <div className="h-56 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, _, props) => [
                      `${val}% (₹${(props.payload as any).revenue})`,
                      'Revenue Share',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
              {categoryData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-slate-600 font-semibold pr-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
