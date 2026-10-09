import React, { useState, useEffect } from 'react';
import { Order } from '../../types/database.types';

interface OrderCardProps {
  order: Order;
  onMarkAsCooked: (order: Order) => void;
  onStartCooking?: (orderId: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onMarkAsCooked,
  onStartCooking,
}) => {
  // Live ticker state (ticks every second)
  const [secondsElapsed, setSecondsElapsed] = useState<number>(() => {
    const startMs = new Date(order.created_at).getTime();
    return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const startMs = new Date(order.created_at).getTime();
      setSecondsElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  }, [order.created_at]);

  // SLA Target Prep Time: 15 minutes (900 seconds)
  const targetSeconds = 15 * 60;
  const isOverdue = secondsElapsed > targetSeconds;
  const remainingSeconds = Math.max(0, targetSeconds - secondsElapsed);

  // Time formatters
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}m ${remSecs.toString().padStart(2, '0')}s`;
  };

  const overdueSecs = secondsElapsed - targetSeconds;
  const progressPercent = Math.min(100, Math.round((secondsElapsed / targetSeconds) * 100));

  return (
    <div
      className={`rounded-3xl bg-white p-5 shadow-sm border-2 transition-all flex flex-col justify-between ${
        isOverdue
          ? 'border-red-400 ring-2 ring-red-100'
          : order.status === 'cooking'
          ? 'border-blue-400'
          : 'border-orange-200'
      }`}
    >
      <div>
        {/* Top Header: Table Number & Bill Number */}
        <div className="flex items-start justify-between border-b pb-3.5 border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                Table {order.table_no}
              </span>
              {isOverdue && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse">
                  ⚠️ SLA Overdue (+{formatTime(overdueSecs)})
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 font-mono font-medium">
              {order.bill_no}
            </span>
          </div>

          <div className="text-right">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                order.status === 'cooking'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.status === 'cooking' ? '🔥 Cooking' : '⏳ New Order'}
            </span>
            <p className="text-[11px] text-gray-500 font-bold mt-1 font-mono">
              ⏱️ {formatTime(secondsElapsed)} elapsed
            </p>
          </div>
        </div>

        {/* Live Preparation SLA Countdown Bar */}
        <div className="mt-3 p-2.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-gray-500">Target Kitchen SLA (15 mins)</span>
            <span className={isOverdue ? 'text-red-600 font-black' : 'text-blue-700 font-black'}>
              {isOverdue ? `Overdue by +${formatTime(overdueSecs)}` : `${formatTime(remainingSeconds)} left`}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className={`h-full transition-all duration-1000 ${
                isOverdue ? 'bg-red-500 animate-pulse' : progressPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Customer / Waiter Note if present */}
        {order.notes && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-1.5">
            <span>📝</span>
            <p className="line-clamp-2">
              <strong>Chef Note:</strong> {order.notes}
            </p>
          </div>
        )}

        {/* Food Items List */}
        <div className="mt-4 space-y-2.5">
          <h5 className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
            Items to Cook ({order.order_items?.length || 0})
          </h5>

          <div className="space-y-2">
            {order.order_items && order.order_items.length > 0 ? (
              order.order_items.map((item) => {
                const isRound2 = item.special_instructions?.includes('Round 2') || item.special_instructions?.includes('Add-on');
                return (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between text-xs py-1.5 px-2.5 rounded-xl border ${
                      isRound2 ? 'bg-amber-50/60 border-amber-300' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="w-5 h-5 rounded-md bg-orange-600 text-white font-extrabold flex items-center justify-center text-[11px] flex-shrink-0">
                        {item.quantity}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-800 text-sm">
                            {item.item_name}
                          </span>
                          {isRound2 && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                              ✨ New Add-on (Round 2)
                            </span>
                          )}
                        </div>
                        {item.special_instructions && (
                          <p className="text-[10px] text-orange-700 font-medium mt-0.5">
                            ⭐ {item.special_instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 italic">No food items found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Card Action Controls */}
      <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center gap-2">
        {order.status === 'pending' && onStartCooking && (
          <button
            type="button"
            onClick={() => onStartCooking(order.id)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition active:scale-95"
          >
            Start Prep 🔥
          </button>
        )}

        <button
          type="button"
          onClick={() => onMarkAsCooked(order)}
          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-extrabold text-xs tracking-wide shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
        >
          <span>Mark as Cooked</span>
          <span>🍽️</span>
        </button>
      </div>
    </div>
  );
};

export default OrderCard;
