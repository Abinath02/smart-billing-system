import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Order } from '../../types/database.types';
import { formatRs } from '../../utils/currency';
import {
  ChefIcon,
  CheckIcon,
  ClockIcon,
  UtensilsIcon,
  WaiterIcon,
  MailIcon,
} from '../common/Icons';

interface OrderSuccessModalProps {
  order: Order;
  isAppended?: boolean;
  onReset: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  isAppended = false,
  onReset,
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>(order.status);
  const [waiterId, setWaiterId] = useState<string | null>(order.waiter_id || null);
  const [waiterName, setWaiterName] = useState<string>(order.waiter?.name || '');

  // Subscribe to live status and waiter confirmation changes for this order
  useEffect(() => {
    const channel = supabase
      .channel(`order_status_${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        async (payload) => {
          if (payload.new) {
            const newOrder = payload.new as Order;
            if (newOrder.status) setCurrentStatus(newOrder.status);
            if (newOrder.waiter_id) {
              setWaiterId(newOrder.waiter_id);
              const { data: wData } = await supabase
                .from('waiters')
                .select('name')
                .eq('id', newOrder.waiter_id)
                .single();
              if (wData?.name) setWaiterName(wData.name);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id]);

  const getStatusBadge = () => {
    if (!waiterId && currentStatus === 'pending') {
      return {
        label: 'Awaiting Floor Server Confirmation',
        color: 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse',
        icon: <ClockIcon className="w-3.5 h-3.5 inline text-amber-600" />,
        subtext: `Our floor waiter will visit Table ${order.table_no} shortly to confirm your order before our chefs start cooking.`,
      };
    }
    if (waiterId && currentStatus === 'pending') {
      return {
        label: `Confirmed by ${waiterName || 'Server'} - Sent to Kitchen!`,
        color: 'bg-blue-100 text-blue-900 border-blue-300',
        icon: <ChefIcon className="w-3.5 h-3.5 inline text-blue-600" />,
        subtext: 'Your order was verified at your desk and sent to the kitchen.',
      };
    }

    switch (currentStatus) {
      case 'cooking':
        return {
          label: 'Chef is Preparing Your Food',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <ChefIcon className="w-3.5 h-3.5 inline text-blue-600 animate-pulse" />,
          subtext: 'Your food is now being freshly prepared in the kitchen.',
        };
      case 'ready':
        return {
          label: 'Ready to Serve!',
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: <UtensilsIcon className="w-3.5 h-3.5 inline text-green-600" />,
          subtext: `${waiterName || 'Your server'} is bringing your dishes to the table now!`,
        };
      case 'paid':
        return {
          label: 'Completed & Paid',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <CheckIcon className="w-3.5 h-3.5 inline text-emerald-600" />,
          subtext: 'Thank you for dining with us! Please visit again.',
        };
      default:
        return {
          label: currentStatus,
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: <ClockIcon className="w-3.5 h-3.5 inline text-gray-500" />,
          subtext: 'Order is being processed.',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden text-center p-6 sm:p-8 animate-scaleUp">
        {/* Animated Checkmark */}
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner ring-8 ring-green-50">
          <svg
            className="w-10 h-10 animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>

        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          {isAppended ? 'Round 2 Dishes Added!' : 'Order Placed!'}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {badge.subtext}
        </p>

        {/* Bill & Table Card */}
        <div className="mt-5 p-4 rounded-2xl bg-gray-50 border border-gray-200/80 text-left space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Bill Number:</span>
            <span className="font-extrabold text-orange-600 tracking-wider">
              {order.bill_no}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Table:</span>
            <span className="font-extrabold text-gray-900">{order.table_no}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Total Bill:</span>
            <span className="font-bold text-gray-900">{formatRs(order.total_amount)}</span>
          </div>

          {waiterName && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Assigned Server:</span>
              <span className="font-bold text-amber-700 inline-flex items-center gap-1">
                <WaiterIcon className="w-3.5 h-3.5 text-amber-600" />
                {waiterName}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Live Status:</span>
            <span
              className={`px-2.5 py-1 rounded-full font-bold text-[11px] border flex items-center gap-1.5 ${badge.color}`}
            >
              {badge.icon} <span>{badge.label}</span>
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs text-left flex items-start gap-2">
          <MailIcon className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <p>
            A digital copy of your bill will be dispatched to{' '}
            <strong className="font-semibold">{order.customer_email || 'your email'}</strong>.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onReset}
          className="mt-6 w-full py-3.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm tracking-wide transition shadow-lg active:scale-95"
        >
          Order More Items
        </button>
      </div>
    </div>
  );
};

export default OrderSuccessModal;
