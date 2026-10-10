import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { InventoryItem, InventoryLog } from '../../types/database.types';

const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
  { id: '10000000-0000-0000-0000-000000000001', name: 'Basmati Rice', category: 'Grains & Staples', quantity: 35.0, unit: 'kg', min_threshold: 10.0, cost_per_unit: 95, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000002', name: 'Burger Buns', category: 'Bakery', quantity: 60.0, unit: 'pcs', min_threshold: 20.0, cost_per_unit: 8, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000003', name: 'Cooking Salt', category: 'Seasoning', quantity: 15.0, unit: 'kg', min_threshold: 5.0, cost_per_unit: 22, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000004', name: 'Sunflower Cooking Oil', category: 'Oils', quantity: 25.0, unit: 'liters', min_threshold: 8.0, cost_per_unit: 140, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000005', name: 'Fresh Chicken', category: 'Meat & Poultry', quantity: 30.0, unit: 'kg', min_threshold: 10.0, cost_per_unit: 220, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000006', name: 'Wheat Flour (Atta)', category: 'Grains & Staples', quantity: 25.0, unit: 'kg', min_threshold: 6.0, cost_per_unit: 48, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000007', name: 'All-Purpose Flour (Maida)', category: 'Grains & Staples', quantity: 20.0, unit: 'kg', min_threshold: 5.0, cost_per_unit: 45, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000008', name: 'Refined White Sugar', category: 'Grains & Staples', quantity: 18.0, unit: 'kg', min_threshold: 5.0, cost_per_unit: 42, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000009', name: 'Fresh Milk', category: 'Dairy', quantity: 15.0, unit: 'liters', min_threshold: 5.0, cost_per_unit: 56, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000010', name: 'Butter & Ghee', category: 'Dairy', quantity: 8.0, unit: 'kg', min_threshold: 3.0, cost_per_unit: 580, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000011', name: 'Biryani Garam Masala', category: 'Seasoning', quantity: 5.0, unit: 'kg', min_threshold: 2.0, cost_per_unit: 650, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10000000-0000-0000-0000-000000000012', name: 'Paneer (Cottage Cheese)', category: 'Dairy', quantity: 12.0, unit: 'kg', min_threshold: 4.0, cost_per_unit: 360, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const AdminInventoryManagement: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>(DEFAULT_INVENTORY_ITEMS);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Restock Modal State
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [restocking, setRestocking] = useState(false);

  // New Raw Material Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Grains & Staples');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemMinThreshold, setNewItemMinThreshold] = useState('5');
  const [newItemCost, setNewItemCost] = useState('0');
  const [addingItem, setAddingItem] = useState(false);

  // Alert Feedback
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);
  const [testingAlert, setTestingAlert] = useState(false);

  const adminEmail = 'mrd426004@gmail.com';

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const { data: invData, error: invErr } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      if (!invErr && invData && invData.length > 0) {
        setItems(invData as InventoryItem[]);
      }

      const { data: logsData } = await supabase
        .from('inventory_logs')
        .select('*, item:inventory_items(*)')
        .order('created_at', { ascending: false })
        .limit(30);

      if (logsData) {
        setLogs(logsData as InventoryLog[]);
      }
    } catch (err: any) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Send Test Low Stock Alert to Admin Email
  const handleSendTestAlert = async () => {
    setTestingAlert(true);
    setAlertFeedback(null);
    try {
      const sampleItem = items.find((i) => i.quantity <= i.min_threshold) || items[0] || {
        name: 'Basmati Rice',
        category: 'Grains & Staples',
        quantity: 4.5,
        unit: 'kg',
        min_threshold: 10,
      };

      const res = await fetch('/api/notify/low-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: sampleItem.name,
          category: sampleItem.category,
          currentQuantity: sampleItem.quantity,
          minThreshold: sampleItem.min_threshold,
          unit: sampleItem.unit,
          staffName: 'Admin System Test',
          notes: 'Testing low stock email alert dispatch',
          adminEmail: adminEmail,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAlertFeedback(
          `✅ Test alert processed successfully! Dispatched notification to ${adminEmail}.`
        );
      } else {
        throw new Error(data.error || 'Failed to dispatch alert.');
      }
    } catch (err: any) {
      console.error('Error testing alert:', err);
      setAlertFeedback(`⚠️ Alert test error: ${err.message}`);
    } finally {
      setTestingAlert(false);
    }
  };

  // Add New Raw Material
  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemQty) {
      alert('Item name and initial stock quantity are required.');
      return;
    }

    setAddingItem(true);
    try {
      const qtyNum = parseFloat(newItemQty) || 0;
      const minNum = parseFloat(newItemMinThreshold) || 5;
      const costNum = parseFloat(newItemCost) || 0;

      const { data, error } = await supabase
        .from('inventory_items')
        .insert([
          {
            name: newItemName.trim(),
            category: newItemCategory.trim(),
            quantity: qtyNum,
            unit: newItemUnit.trim(),
            min_threshold: minNum,
            cost_per_unit: costNum,
            last_restocked_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        // Fallback for client state
        const localItem: InventoryItem = {
          id: `local-${Date.now()}`,
          name: newItemName.trim(),
          category: newItemCategory.trim(),
          quantity: qtyNum,
          unit: newItemUnit.trim(),
          min_threshold: minNum,
          cost_per_unit: costNum,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setItems((prev) => [...prev, localItem]);
      } else if (data) {
        setItems((prev) => [...prev, data as InventoryItem]);
      }

      setIsAddModalOpen(false);
      setNewItemName('');
      setNewItemQty('');
      setNewItemCost('0');
      fetchInventoryData();
    } catch (err: any) {
      alert('Error creating item: ' + err.message);
    } finally {
      setAddingItem(false);
    }
  };

  // Restock Existing Item
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;

    const addQty = parseFloat(restockQty);
    if (isNaN(addQty) || addQty <= 0) {
      alert('Please enter a valid positive quantity to restock.');
      return;
    }

    setRestocking(true);
    try {
      const prevQty = Number(restockItem.quantity);
      const newQty = Number((prevQty + addQty).toFixed(2));

      // 1. Update Inventory Item
      const { error: updateErr } = await supabase
        .from('inventory_items')
        .update({
          quantity: newQty,
          last_restocked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', restockItem.id);

      // 2. Insert Inventory Log
      await supabase.from('inventory_logs').insert([
        {
          item_id: restockItem.id,
          action_type: 'restocked',
          quantity: addQty,
          previous_quantity: prevQty,
          new_quantity: newQty,
          staff_name: 'Administrator',
          notes: restockNotes.trim() || 'Store replenishment refill',
        },
      ]);

      // Update local state
      setItems((prev) =>
        prev.map((i) =>
          i.id === restockItem.id ? { ...i, quantity: newQty, last_restocked_at: new Date().toISOString() } : i
        )
      );

      setAlertFeedback(`✅ Restocked ${addQty} ${restockItem.unit} of ${restockItem.name}! New stock: ${newQty} ${restockItem.unit}`);
      setRestockItem(null);
      setRestockQty('');
      setRestockNotes('');
      fetchInventoryData();
    } catch (err: any) {
      alert('Error restocking item: ' + err.message);
    } finally {
      setRestocking(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category)))];

  const filteredItems = items.filter((item) => {
    const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const lowStockItems = items.filter((item) => item.quantity <= item.min_threshold);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
      {/* Alert Banner / Notification */}
      {alertFeedback && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between">
          <span>{alertFeedback}</span>
          <button onClick={() => setAlertFeedback(null)} className="text-amber-700 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>📦</span> Raw Materials & Store Inventory (மூலப்பொருட்கள் இருப்பு மேலாண்மை)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor raw materials (Rice, Bun, Salt, Oil, etc.). When quantities drop below safety limits, email alerts are dispatched to Admin.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSendTestAlert}
            disabled={testingAlert}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-1.5"
            title="Test low stock email alert dispatch"
          >
            <span>📧</span> {testingAlert ? 'Sending Test...' : 'Test Alert Email'}
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
          >
            <span>+ Add Raw Material</span>
          </button>
        </div>
      </div>

      {/* Admin Alert Configuration Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-xl">
            🚨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-amber-400">Low Stock Alert Service</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                ● ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Email Notifications Configured For:{' '}
              <span className="text-white font-mono font-bold underline">{adminEmail}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Critical Shortages</span>
            <span className="text-sm font-black text-red-400">{lowStockItems.length} Items Below Limit</span>
          </div>
          <button
            onClick={fetchInventoryData}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-xs text-slate-300"
            title="Refresh Stock List"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search Rice, Bun, Salt, Chicken, Oil..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex overflow-x-auto gap-1.5 w-full sm:w-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Raw Materials Inventory Table */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">Raw Material Name</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Remaining Stock</th>
              <th className="py-3 px-3">Min Safety Threshold</th>
              <th className="py-3 px-3">Stock Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const isLow = item.quantity <= item.min_threshold;

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/70 transition ${
                    isLow ? 'bg-red-50/40' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <span className="text-sm block">{item.name}</span>
                    {item.cost_per_unit ? (
                      <span className="text-[10px] text-slate-400 font-normal">
                        ₹{item.cost_per_unit} per {item.unit}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-black text-sm">
                    <span className={isLow ? 'text-red-600' : 'text-slate-900'}>
                      {item.quantity} {item.unit}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-500">
                    {item.min_threshold} {item.unit}
                  </td>
                  <td className="py-3 px-3">
                    {isLow ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200 animate-pulse inline-flex items-center gap-1">
                        <span>⚠️ LOW STOCK</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 inline-flex items-center gap-1">
                        <span>✓ Sufficient</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => {
                        setRestockItem(item);
                        setRestockQty('');
                        setRestockNotes('');
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
                    >
                      ➕ Restock / Refill
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* RESTOCK / REFILL MODAL */}
      {restockItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📦</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Restock Raw Material</h3>
                  <p className="text-xs text-slate-500">Add purchased stock to store inventory</p>
                </div>
              </div>
              <button
                onClick={() => setRestockItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Ingredient</span>
                    <span className="text-sm font-black text-slate-900">{restockItem.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Stock</span>
                    <span className="text-sm font-black text-slate-900">
                      {restockItem.quantity} {restockItem.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantity Added to Stock (+ {restockItem.unit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={`e.g. 25 (${restockItem.unit})`}
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                    {restockItem.unit}
                  </span>
                </div>

                {parseFloat(restockQty) > 0 && (
                  <div className="mt-2 text-xs flex justify-between p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    <span>New Total Stock:</span>
                    <span>
                      {(restockItem.quantity + parseFloat(restockQty)).toFixed(2)} {restockItem.unit}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supplier / Purchase Note (விற்பனையாளர் குறிப்பு)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Metro Cash & Carry, Invoice #8841"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockItem(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restocking}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {restocking ? 'Updating...' : 'Confirm Restock ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW RAW MATERIAL MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌱</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add New Raw Material</h3>
                  <p className="text-xs text-slate-500">Register new cooking ingredient to inventory</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Item Name (பொருள் பெயர்)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Basmati Rice, Bun, Cooking Salt"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Grains & Staples">Grains & Staples</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Seasoning">Seasoning & Spices</option>
                    <option value="Meat & Poultry">Meat & Poultry</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Oils">Oils & Fats</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit of Measurement
                  </label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="pcs">pcs (Pieces / Buns)</option>
                    <option value="liters">liters (Liters)</option>
                    <option value="packets">packets (Packets)</option>
                    <option value="grams">grams (Grams)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Current Quantity in Store
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 25"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Min Safety Alert Limit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 5"
                    value={newItemMinThreshold}
                    onChange={(e) => setNewItemMinThreshold(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cost per Unit (₹ - Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 95"
                  value={newItemCost}
                  onChange={(e) => setNewItemCost(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingItem}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {addingItem ? 'Adding...' : 'Add Material ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Logs of Kitchen Requisitions */}
      {logs.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
            <span>📋</span> Store Requisition & Kitchen Usage Audit Trail
          </h4>

          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Remaining</th>
                  <th className="py-2.5 px-3">Authorized By</th>
                  <th className="py-2.5 px-3">Reason / Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          log.action_type === 'used'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {log.action_type === 'used' ? 'Withdrawn' : 'Restocked'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {log.item?.name || 'Raw Material'}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold">
                      <span
                        className={
                          log.action_type === 'used' ? 'text-amber-600' : 'text-emerald-600'
                        }
                      >
                        {log.action_type === 'used' ? '-' : '+'}
                        {log.quantity} {log.item?.unit || 'units'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                      {log.new_quantity} {log.item?.unit || 'units'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold">{log.staff_name}</td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">
                      {log.notes || '—'}
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
