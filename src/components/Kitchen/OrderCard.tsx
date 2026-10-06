import React from 'react';
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
  // Format elapsed time
  const getElapsedMinutes = (createdAt: string) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(elapsedMs / (1000 * 60));
  };

  const elapsedMins = getElapsedMinutes(order.created_at);
  const isUrgent = elapsedMins >= 15;

  return (
    <div
      className={`rounded-3xl bg-white p-5 shadow-sm border-2 transition-all flex flex-col justify-between ${
        isUrgent
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
              {isUrgent && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse">
                  Urgent
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
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              {elapsedMins <= 0 ? 'Just now' : `${elapsedMins}m ago`}
            </p>
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
              order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between text-xs py-1 px-2 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="w-5 h-5 rounded-md bg-orange-600 text-white font-extrabold flex items-center justify-center text-[11px]">
                      {item.quantity}
                    </span>
                    <div>
                      <span className="font-bold text-gray-800 text-sm">
                        {item.item_name}
                      </span>
                      {item.special_instructions && (
                        <p className="text-[10px] text-orange-700 font-medium mt-0.5">
                          ⭐ {item.special_instructions}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
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
