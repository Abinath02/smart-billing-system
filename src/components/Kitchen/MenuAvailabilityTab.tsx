import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { MenuItem } from '../../types/database.types';

interface MenuAvailabilityTabProps {
  menuItems: MenuItem[];
  onItemUpdated: (updatedItem: MenuItem) => void;
}

export const MenuAvailabilityTab: React.FC<MenuAvailabilityTabProps> = ({
  menuItems,
  onItemUpdated,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(menuItems.map((m) => m.category)))];

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCat === 'All' || item.category === selectedCat;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleToggleAvailability = async (item: MenuItem) => {
    const newStatus = !item.is_available;
    setUpdatingId(item.id);

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({ is_available: newStatus })
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;
      onItemUpdated(data as MenuItem);
    } catch (err: any) {
      console.error('Error toggling menu availability:', err);
      alert('Failed to update item availability: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3.5 top-2.5 text-gray-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search dish name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex overflow-x-auto gap-1.5 w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                selectedCat === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredItems.map((item) => {
          const isUpdating = updatingId === item.id;
          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all duration-200 bg-white flex items-center justify-between gap-3 shadow-sm ${
                item.is_available
                  ? 'border-gray-200 hover:border-orange-300'
                  : 'border-red-200 bg-red-50/30 opacity-75'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">
                      🍲
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    {item.category}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900 truncate">{item.name}</h4>
                  <p className="text-xs font-extrabold text-orange-600">Rs. {item.price.toFixed(2)}</p>
                </div>
              </div>

              {/* Stock Toggle Switch */}
              <div className="flex flex-col items-end flex-shrink-0">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleToggleAvailability(item)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    item.is_available ? 'bg-green-500' : 'bg-red-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      item.is_available ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span
                  className={`text-[10px] font-bold mt-1 tracking-wider uppercase ${
                    item.is_available ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {isUpdating ? '...' : item.is_available ? 'Available' : 'Hidden'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
