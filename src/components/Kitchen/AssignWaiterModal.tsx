import React, { useState } from 'react';
import { Waiter, Order } from '../../types/database.types';

interface AssignWaiterModalProps {
  isOpen: boolean;
  order: Order | null;
  waiters: Waiter[];
  onClose: () => void;
  onAssign: (orderId: string, waiterId: string) => Promise<void>;
  onOpenAddWaiter: () => void;
}

export const AssignWaiterModal: React.FC<AssignWaiterModalProps> = ({
  isOpen,
  order,
  waiters,
  onClose,
  onAssign,
  onOpenAddWaiter,
}) => {
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleConfirm = async () => {
    if (!selectedWaiterId) {
      setError('Please select a waiter to deliver this order.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onAssign(order.id, selectedWaiterId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign waiter.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-gray-100">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600">
              Kitchen Dispatch
            </span>
            <h3 className="text-lg font-black text-gray-900">
              Assign Waiter & Mark Ready
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Order Details Brief */}
        <div className="my-4 p-3.5 bg-orange-50 border border-orange-200/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-orange-700 font-semibold">Table No</span>
            <p className="text-xl font-black text-orange-950">{order.table_no}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-orange-700 font-semibold">Bill No</span>
            <p className="text-sm font-bold text-orange-950 font-mono">{order.bill_no}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        {/* Waiter Selection Form */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-gray-700">
                Select Delivering Waiter
              </label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddWaiter();
                }}
                className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
              >
                <span>+</span> Add New Waiter
              </button>
            </div>

            <select
              value={selectedWaiterId}
              onChange={(e) => setSelectedWaiterId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">-- Choose Waiter --</option>
              {waiters
                .filter((w) => w.is_active)
                .map((waiter) => (
                  <option key={waiter.id} value={waiter.id}>
                    {waiter.name} {waiter.emp_code ? `(${waiter.emp_code})` : ''}
                  </option>
                ))}
            </select>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">
            💡 This will mark the order as <strong className="text-green-600">Ready</strong> and dispatch it to the dining hall.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-lg transition active:scale-95 flex items-center gap-1.5"
          >
            {submitting ? 'Updating...' : 'Confirm & Mark Ready 🍽️'}
          </button>
        </div>
      </div>
    </div>
  );
};
