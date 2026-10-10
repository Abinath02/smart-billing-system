import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { InventoryItem, InventoryLog, Profile } from '../../types/database.types';

interface KitchenInventoryTabProps {
  inventoryItems: InventoryItem[];
  inventoryLogs: InventoryLog[];
  onRefresh: () => void;
  currentUser: Profile | null;
}

export const KitchenInventoryTab: React.FC<KitchenInventoryTabProps> = ({
  inventoryItems,
  inventoryLogs,
  onRefresh,
  currentUser,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Requisition Modal State
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantityToUse, setQuantityToUse] = useState<string>('');
  const [requisitionNotes, setRequisitionNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [alertBanner, setAlertBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const categories = ['All', ...Array.from(new Set(inventoryItems.map((item) => item.category)))];

  const filteredItems = inventoryItems.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setQuantityToUse('');
    setRequisitionNotes('');
    setAlertBanner(null);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setQuantityToUse('');
    setRequisitionNotes('');
  };

  // Submit Store Usage / Requisition
  const handleDeductUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const useQty = parseFloat(quantityToUse);
    if (isNaN(useQty) || useQty <= 0) {
      alert('Please enter a valid positive quantity.');
      return;
    }

    if (useQty > selectedItem.quantity) {
      alert(`Cannot withdraw more than available stock (${selectedItem.quantity} ${selectedItem.unit}).`);
      return;
    }

    setSubmitting(true);
    try {
      const prevQty = Number(selectedItem.quantity);
      const newQty = Number((prevQty - useQty).toFixed(2));
      const staffName = currentUser?.full_name || 'Kitchen Staff';

      // 1. Update Inventory Item in Supabase
      const { error: updateErr } = await supabase
        .from('inventory_items')
        .update({
          quantity: newQty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedItem.id);

      if (updateErr) throw updateErr;

      // 2. Insert into Inventory Logs table
      const { error: logErr } = await supabase
        .from('inventory_logs')
        .insert([
          {
            item_id: selectedItem.id,
            action_type: 'used',
            quantity: useQty,
            previous_quantity: prevQty,
            new_quantity: newQty,
            staff_name: staffName,
            notes: requisitionNotes.trim() || 'Daily kitchen cooking preparation',
          },
        ]);

      if (logErr) {
        console.warn('Logging error (log recorded locally):', logErr);
      }

      // 3. Check Low Stock Trigger (if newQty <= min_threshold)
      if (newQty <= selectedItem.min_threshold) {
        try {
          // Trigger email alert to admin email: mrd426004@gmail.com
          const res = await fetch('/api/notify/low-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemName: selectedItem.name,
              category: selectedItem.category,
              currentQuantity: newQty,
              minThreshold: selectedItem.min_threshold,
              unit: selectedItem.unit,
              staffName: staffName,
              notes: requisitionNotes.trim() || 'Taken from store for kitchen preparation',
              adminEmail: 'mrd426004@gmail.com',
            }),
          });
          const alertResult = await res.json();

          setAlertBanner({
            type: 'warning',
            message: `🚨 LOW STOCK TRIGGERED: ${selectedItem.name} has dropped to ${newQty} ${selectedItem.unit}! Alert email automatically dispatched to Admin (mrd426004@gmail.com).`,
          });
        } catch (alertErr) {
          console.error('Failed to dispatch low stock alert:', alertErr);
        }
      } else {
        setAlertBanner({
          type: 'success',
          message: `✅ Successfully recorded withdrawal of ${useQty} ${selectedItem.unit} of ${selectedItem.name}. Remaining: ${newQty} ${selectedItem.unit}.`,
        });
      }

      // Refresh parent inventory list
      onRefresh();
      handleCloseModal();
    } catch (err: any) {
      console.error('Error recording store usage:', err);
      alert('Error updating stock: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {alertBanner && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold border transition animate-fade-in ${
            alertBanner.type === 'warning'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : alertBanner.type === 'error'
              ? 'bg-red-500/20 text-red-300 border-red-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">
              {alertBanner.type === 'warning' ? '⚠️' : '✅'}
            </span>
            <span>{alertBanner.message}</span>
          </div>
          <button
            onClick={() => setAlertBanner(null)}
            className="text-white/60 hover:text-white ml-3 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Info & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>📦</span> Kitchen Store & Raw Materials (மூலப்பொருட்கள் இருப்பு)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View stock quantities left in store. Select items taken for cooking today to update inventory and alert Admin if low.
          </p>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Items</span>
            <span className="text-sm font-black text-white">{inventoryItems.length}</span>
          </div>

          <div className="bg-red-950/60 border border-red-800/80 px-3.5 py-1.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-red-400 block">Low Stock Alert</span>
            <span className="text-sm font-black text-red-400">
              {inventoryItems.filter((i) => i.quantity <= i.min_threshold).length} Items
            </span>
          </div>

          <button
            onClick={onRefresh}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            title="Refresh Stock List"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search Rice, Bun, Salt, Oil..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Items Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map((item) => {
          const isLow = item.quantity <= item.min_threshold;
          const percentage = Math.min(100, Math.round((item.quantity / (item.min_threshold * 2.5)) * 100));

          return (
            <div
              key={item.id}
              className={`rounded-2xl p-4 border transition flex flex-col justify-between ${
                isLow
                  ? 'bg-red-950/20 border-red-800/80 shadow-red-950/20 shadow-lg'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Top Row: Category and Low Stock Indicator */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                    {item.category}
                  </span>
                  {isLow ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-red-600/30 text-red-300 border border-red-500/40 animate-pulse">
                      ⚠️ LOW STOCK
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600/20 text-emerald-300">
                      ✓ Normal
                    </span>
                  )}
                </div>

                {/* Item Name */}
                <h3 className="text-base font-extrabold text-white mb-1 tracking-tight">
                  {item.name}
                </h3>

                {/* Remaining Quantity */}
                <div className="my-3">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-2xl font-black ${
                        isLow ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {item.quantity}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{item.unit} left</span>
                  </div>

                  {/* Stock level progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLow ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                    <span>Min Safety Limit: {item.min_threshold} {item.unit}</span>
                    <span>{percentage}% full</span>
                  </div>
                </div>
              </div>

              {/* Action Button: Use / Select for Cooking */}
              <button
                onClick={() => handleOpenModal(item)}
                className={`w-full mt-3 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md ${
                  isLow
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white'
                }`}
              >
                <span>📤</span>
                <span>Issue from Store (பயன்படுத்து)</span>
              </button>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl text-slate-400">
          <span className="text-4xl block mb-2">📦</span>
          <p className="text-sm font-bold text-white">No raw material items found</p>
          <p className="text-xs text-slate-500 mt-1">Try searching another ingredient keyword or check category filter.</p>
        </div>
      )}

      {/* Store Requisition Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white animate-scale-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍳</span>
                <div>
                  <h3 className="text-base font-black text-white">Record Kitchen Store Usage</h3>
                  <p className="text-xs text-slate-400">Store-to-Kitchen ingredient withdrawal</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeductUsage} className="space-y-4">
              {/* Selected Item Summary */}
              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Raw Material</span>
                    <span className="text-sm font-black text-white">{selectedItem.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Available in Store</span>
                    <span className="text-sm font-black text-emerald-400">
                      {selectedItem.quantity} {selectedItem.unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Taken Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Quantity Taken for Kitchen (இன்று எடுத்த அளவு)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedItem.quantity}
                    placeholder={`e.g. 5 (${selectedItem.unit})`}
                    value={quantityToUse}
                    onChange={(e) => setQuantityToUse(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                    {selectedItem.unit}
                  </span>
                </div>

                {/* Live Preview of remaining stock */}
                {parseFloat(quantityToUse) > 0 && (
                  <div className="mt-2 text-xs flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700">
                    <span className="text-slate-400">Remaining after deduction:</span>
                    <span
                      className={`font-black ${
                        selectedItem.quantity - parseFloat(quantityToUse) <= selectedItem.min_threshold
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {(selectedItem.quantity - parseFloat(quantityToUse)).toFixed(2)} {selectedItem.unit}
                      {selectedItem.quantity - parseFloat(quantityToUse) <= selectedItem.min_threshold && (
                        <span className="text-[10px] ml-1 text-red-400 font-bold">(Will alert Admin!)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Requisition Notes / Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Purpose / Notes (காரணம் / குறிப்பு)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lunch Biryani & Fried Rice prep"
                  value={requisitionNotes}
                  onChange={(e) => setRequisitionNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Admin Alert Email Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
                ⚠️ If remaining stock drops below <strong>{selectedItem.min_threshold} {selectedItem.unit}</strong>, an automatic replenishment alert email will be dispatched directly to Admin at <span className="underline font-bold">mrd426004@gmail.com</span>.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Confirm & Deduct Stock ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent Store Requisitions / Logs */}
      {inventoryLogs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl mt-8">
          <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
            <span>📋</span> Today's Store Withdrawal Activity Log (பயன்பாட்டு விபரம்)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-xl">Time</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">Quantity Deducted</th>
                  <th className="py-2.5 px-3">Remaining Stock</th>
                  <th className="py-2.5 px-3">Used By</th>
                  <th className="py-2.5 px-3 rounded-r-xl">Purpose / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {inventoryLogs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="text-slate-300 hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {log.item?.name || 'Raw Material'}
                    </td>
                    <td className="py-2.5 px-3 font-black text-amber-400">
                      -{log.quantity} {log.item?.unit || 'units'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-400">
                      {log.new_quantity} {log.item?.unit || 'units'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{log.staff_name}</td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">
                      {log.notes || 'Kitchen usage'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
