import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { MenuItem } from '../../types/database.types';

interface MenuPriceManagementProps {
  menuItems: MenuItem[];
  onItemUpdated: (updatedItem: MenuItem) => void;
  onItemAdded?: (newItem: MenuItem) => void;
}

export const MenuPriceManagement: React.FC<MenuPriceManagementProps> = ({
  menuItems,
  onItemUpdated,
  onItemAdded,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editingPriceMap, setEditingPriceMap] = useState<{ [id: string]: string }>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // New Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Main Course');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemPrepTime, setNewItemPrepTime] = useState('15');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemImage, setNewItemImage] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  const categories = ['All', ...Array.from(new Set(menuItems.map((m) => m.category)))];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePriceChange = (id: string, value: string) => {
    setEditingPriceMap((prev) => ({ ...prev, [id]: value }));
  };

  const handleSavePrice = async (item: MenuItem) => {
    const newPriceStr = editingPriceMap[item.id];
    if (newPriceStr === undefined) return;

    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice < 0) {
      alert('Please enter a valid price.');
      return;
    }

    setSavingId(item.id);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({ price: newPrice })
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;

      onItemUpdated(data as MenuItem);
      // Clear edited state for this item
      setEditingPriceMap((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    } catch (err: any) {
      console.error('Failed to update price:', err);
      alert('Failed to update price: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) {
      alert('Name and price are required.');
      return;
    }

    setAddingItem(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert([
          {
            name: newItemName.trim(),
            category: newItemCategory.trim(),
            price: parseFloat(newItemPrice) || 0,
            preparation_time_mins: parseInt(newItemPrepTime) || 15,
            description: newItemDesc.trim() || null,
            image_url: newItemImage.trim() || null,
            is_available: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (onItemAdded) onItemAdded(data as MenuItem);
      setIsAddModalOpen(false);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemDesc('');
      setNewItemImage('');
    } catch (err: any) {
      console.error('Error adding dish:', err);
      alert('Failed to add dish: ' + err.message);
    } finally {
      setAddingItem(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-900">Menu & Price Management</h3>
          <p className="text-xs text-slate-500">
            Directly update menu rates, dish details, and pricing across the restaurant
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
        >
          <span>+ Add New Dish</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-5">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search dish name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex overflow-x-auto gap-1.5 w-full sm:w-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Table */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">Dish Name</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Prep Time</th>
              <th className="py-3 px-3">Current Price</th>
              <th className="py-3 px-4">Edit Price (₹)</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const editedValue = editingPriceMap[item.id];
              const isEdited = editedValue !== undefined && parseFloat(editedValue) !== item.price;
              const isSaving = savingId === item.id;

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm">
                            🍲
                          </div>
                        )}
                      </div>
                      <div>
                        <span>{item.name}</span>
                        {!item.is_available && (
                          <span className="block text-[9px] font-extrabold text-red-500 uppercase">
                            (Sold Out)
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">{item.preparation_time_mins} mins</td>
                  <td className="py-3 px-3 font-extrabold text-slate-900">
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="1"
                        value={editedValue !== undefined ? editedValue : item.price}
                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                        className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          isEdited ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 bg-slate-50'
                        }`}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      disabled={!isEdited || isSaving}
                      onClick={() => handleSavePrice(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        isEdited
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? 'Saving...' : 'Update'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add New Dish Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 mb-4">
              <h4 className="text-base font-bold text-slate-900">Add New Dish to Menu</h4>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dish Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Garlic Butter Prawns"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Breads">Breads</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="250.00"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Preparation Time (Minutes)
                </label>
                <input
                  type="number"
                  placeholder="15"
                  value={newItemPrepTime}
                  onChange={(e) => setNewItemPrepTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Image URL (Unsplash or CDN)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newItemImage}
                  onChange={(e) => setNewItemImage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Aromatic spices, fresh ingredients..."
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingItem}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95"
                >
                  {addingItem ? 'Adding...' : 'Add Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
