import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { MenuItem } from '../../types/database.types';

interface MenuPriceManagementProps {
  menuItems: MenuItem[];
  onItemUpdated: (updatedItem: MenuItem) => void;
  onItemAdded?: (newItem: MenuItem) => void;
  onItemDeleted?: (deletedId: string) => void;
  onRefresh?: () => void;
}

const SAMPLE_RESTAURANT_MENU = [
  { name: 'Paneer Butter Masala', category: 'Main Course', price: 240.00, preparation_time_mins: 20, description: 'Rich creamy cottage cheese gravy in rich cashew tomato curry', image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Chicken Biryani Special', category: 'Main Course', price: 280.00, preparation_time_mins: 15, description: 'Aromatic basmati rice cooked with tender spiced chicken & boiled egg', image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Mutton Dum Biryani', category: 'Main Course', price: 360.00, preparation_time_mins: 20, description: 'Slow cooked tender mutton with fragrant seeraga samba / basmati rice', image_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Butter Chicken Masala', category: 'Main Course', price: 290.00, preparation_time_mins: 18, description: 'Tender tandoori chicken cooked in velvety tomato butter makhani gravy', image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Crispy Corn Pepper Fry', category: 'Starters', price: 160.00, preparation_time_mins: 10, description: 'Golden fried sweet corn tossed with herbs, scallions and black pepper', image_url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Chicken 65 Crispy', category: 'Starters', price: 220.00, preparation_time_mins: 12, description: 'Classic South Indian deep fried spicy chicken bites with curry leaves', image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Paneer Tikka Charcoal', category: 'Starters', price: 230.00, preparation_time_mins: 15, description: 'Smoky spiced cottage cheese cubes grilled with capsicum and onions', image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Butter Garlic Naan', category: 'Breads', price: 45.00, preparation_time_mins: 8, description: 'Soft leavened clay oven flatbread glazed with melted garlic butter', image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Tandoori Roti (Butter)', category: 'Breads', price: 30.00, preparation_time_mins: 6, description: 'Whole wheat bread crisp baked in traditional clay tandoor', image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Cold Coffee with Ice Cream', category: 'Beverages', price: 120.00, preparation_time_mins: 5, description: 'Thick blended coffee topped with premium vanilla ice cream & cocoa', image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Fresh Lime Soda (Sweet/Salt)', category: 'Beverages', price: 60.00, preparation_time_mins: 4, description: 'Refreshing carbonated drink infused with freshly squeezed lime', image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Gulab Jamun (2 pcs)', category: 'Desserts', price: 80.00, preparation_time_mins: 5, description: 'Warm milk solids dumplings soaked in cardamom rose syrup', image_url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=600&q=80', is_available: true },
  { name: 'Sizzling Chocolate Brownie', category: 'Desserts', price: 170.00, preparation_time_mins: 8, description: 'Hot fudgy walnut brownie with vanilla ice cream and hot chocolate sauce', image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80', is_available: true },
];

export const MenuPriceManagement: React.FC<MenuPriceManagementProps> = ({
  menuItems,
  onItemUpdated,
  onItemAdded,
  onItemDeleted,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editingPriceMap, setEditingPriceMap] = useState<{ [id: string]: string }>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Main Course');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemPrepTime, setNewItemPrepTime] = useState('15');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemImage, setNewItemImage] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [seedingMenu, setSeedingMenu] = useState(false);

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
        .update({ price: newPrice, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;

      onItemUpdated(data as MenuItem);
      setBanner({ type: 'success', message: `✅ Updated price for "${item.name}" to ₹${newPrice.toFixed(2)}` });

      setEditingPriceMap((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    } catch (err: any) {
      console.error('Failed to update price:', err);
      setBanner({ type: 'error', message: `Failed to update price: ${err.message}` });
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
      const priceVal = parseFloat(newItemPrice) || 0;
      const { data, error } = await supabase
        .from('menu_items')
        .insert([
          {
            name: newItemName.trim(),
            category: newItemCategory.trim(),
            price: priceVal,
            preparation_time_mins: parseInt(newItemPrepTime) || 15,
            description: newItemDesc.trim() || null,
            image_url: newItemImage.trim() || null,
            is_available: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (onItemAdded && data) onItemAdded(data as MenuItem);
      if (onRefresh) onRefresh();

      setBanner({ type: 'success', message: `✅ Added dish "${newItemName.trim()}" at ₹${priceVal.toFixed(2)}` });
      setIsAddModalOpen(false);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemDesc('');
      setNewItemImage('');
    } catch (err: any) {
      console.error('Error adding dish:', err);
      setBanner({ type: 'error', message: `Failed to add dish: ${err.message}` });
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteDish = async (dish: MenuItem) => {
    if (!confirm(`Are you sure you want to delete "${dish.name}" from the database?`)) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', dish.id);

      if (error) throw error;

      if (onItemDeleted) onItemDeleted(dish.id);
      if (onRefresh) onRefresh();
      setBanner({ type: 'success', message: `🗑️ Deleted "${dish.name}" from the menu database.` });
    } catch (err: any) {
      alert('Error deleting dish: ' + err.message);
    }
  };

  const handleSeedMenu = async () => {
    if (!confirm('Populate restaurant menu with full standard delicacies and prices?')) return;
    setSeedingMenu(true);
    try {
      const existingNames = new Set(menuItems.map((m) => m.name.toLowerCase()));
      const itemsToInsert = SAMPLE_RESTAURANT_MENU.filter(
        (m) => !existingNames.has(m.name.toLowerCase())
      );

      if (itemsToInsert.length === 0) {
        alert('All standard menu items are already present in the database!');
        return;
      }

      const { data, error } = await supabase
        .from('menu_items')
        .insert(itemsToInsert)
        .select();

      if (error) throw error;

      setBanner({ type: 'success', message: `🎉 Successfully seeded ${itemsToInsert.length} food items with proper prices into the database!` });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error seeding menu:', err);
      alert('Error seeding menu: ' + err.message);
    } finally {
      setSeedingMenu(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
      {/* Banner Notice */}
      {banner && (
        <div
          className={`mb-4 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold ${
            banner.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{banner.message}</span>
          <button onClick={() => setBanner(null)} className="ml-2 font-bold">✕</button>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>🍽️</span> Food Menu & Price Management (உணவு பட்டியல் & விலை)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add foods to the database with proper rates. Directly edit prices, toggle availability, or delete items.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSeedMenu}
            disabled={seedingMenu}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-1.5"
            title="Seed standard Indian & Continental dishes"
          >
            <span>🌱</span> {seedingMenu ? 'Seeding...' : 'Seed Full Menu'}
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
          >
            <span>+ Add New Food Item</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-5">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search dish name (Biryani, Paneer, Naan)..."
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
              <th className="py-3 px-4 text-center">Actions</th>
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
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
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
                        <span className="font-extrabold text-slate-900 block">{item.name}</span>
                        {item.description && (
                          <span className="text-[10px] text-slate-400 truncate max-w-xs block">
                            {item.description}
                          </span>
                        )}
                        {!item.is_available && (
                          <span className="text-[9px] font-extrabold text-red-500 uppercase">
                            (Unavailable)
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
                  <td className="py-3 px-3 font-black text-slate-900 text-sm">
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
                        className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isEdited ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 bg-slate-50'
                        }`}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
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
                        {isSaving ? 'Saving...' : 'Save Price'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDish(item)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete Dish"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add New Dish Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍲</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add New Dish to Menu</h3>
                  <p className="text-xs text-slate-500">Insert dish into restaurant database</p>
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
                  Dish Name (உணவு பெயர்)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chicken Dum Biryani"
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
                    Category (பிரிவு)
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Main Course">Main Course</option>
                    <option value="Starters">Starters</option>
                    <option value="Breads">Breads</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Price (₹ விலை)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="250.00"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Preparation Time (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="15"
                  value={newItemPrepTime}
                  onChange={(e) => setNewItemPrepTime(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Ingredients
                </label>
                <textarea
                  rows={2}
                  placeholder="Aromatic basmati rice cooked with whole spices and tender chicken..."
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={newItemImage}
                  onChange={(e) => setNewItemImage(e.target.value)}
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
                  {addingItem ? 'Adding Dish...' : 'Add Dish to Database ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
