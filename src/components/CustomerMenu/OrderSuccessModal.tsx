import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Order } from '../../types/database.types';

interface OrderSuccessModalProps {
  order: Order;
  onReset: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ order, onReset }) => {
  const [currentStatus, setCurrentStatus] = useState<string>(order.status);

  // Subscribe to live status changes for this specific order
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
        (payload) => {
          if (payload.new && (payload.new as Order).status) {
            setCurrentStatus((payload.new as Order).status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Order Sent to Kitchen',
          color: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: '⏳',
        };
      case 'cooking':
        return {
          label: 'Chef is Preparing Your Food',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: '👨‍🍳',
        };
      case 'ready':
        return {
          label: 'Ready to Serve!',
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: '🍽️',
        };
      case 'paid':
        return {
          label: 'Completed & Paid',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: '✅',
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: '📋',
        };
    }
  };

  const badge = getStatusBadge(currentStatus);

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

        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Order Placed!</h2>
        <p className="text-xs text-gray-500 mt-1">
          Your order has been sent to our kitchen team.
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
            <span className="font-bold text-gray-900">₹{order.total_amount.toFixed(2)}</span>
          </div>

          <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Live Kitchen Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border flex items-center gap-1 ${badge.color}`}
            >
              <span>{badge.icon}</span> {badge.label}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs text-left flex items-start gap-2">
          <span className="text-base">📧</span>
          <p>
            A digital copy of your bill will be dispatched to{' '}
            <strong className="font-semibold">{order.customer_email}</strong>.
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
