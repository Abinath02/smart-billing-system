import React from 'react';
import { MenuItem } from '../../types/database.types';

interface MenuItemCardProps {
  item: MenuItem;
  quantityInCart: number;
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (item: MenuItem) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  quantityInCart,
  onAddToCart,
  onRemoveFromCart,
}) => {
  // If is_available is false, hide the item
  if (!item.is_available) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start justify-between gap-3.5 transition-all hover:shadow-md">
      {/* Left Details */}
      <div className="flex-1 flex flex-col justify-between self-stretch">
        <div>
          {/* Category & Prep Time */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
              {item.category}
            </span>
            {item.preparation_time_mins && (
              <span className="text-[11px] text-gray-500 font-medium flex items-center gap-0.5">
                ⏱️ {item.preparation_time_mins} mins
              </span>
            )}
          </div>

          {/* Item Name */}
          <h3 className="text-base font-bold text-gray-900 leading-snug">{item.name}</h3>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="mt-3">
          <span className="text-base font-extrabold text-gray-900">₹{item.price.toFixed(2)}</span>
        </div>
      </div>

      {/* Right Image & Add Controls */}
      <div className="relative flex flex-col items-center flex-shrink-0 w-28">
        <div className="w-28 h-24 rounded-xl overflow-hidden bg-gray-100 shadow-inner">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl bg-amber-50">
              🍲
            </div>
          )}
        </div>

        {/* Stepper / Add Button Container */}
        <div className="absolute -bottom-2.5 shadow-md rounded-lg overflow-hidden bg-white border border-orange-500/20">
          {quantityInCart === 0 ? (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="px-5 py-1 text-xs font-bold text-orange-600 hover:bg-orange-50 transition active:scale-95 flex items-center gap-1 uppercase tracking-wider"
            >
              <span>ADD</span>
              <span className="text-sm font-extrabold">+</span>
            </button>
          ) : (
            <div className="flex items-center bg-orange-600 text-white font-bold text-xs">
              <button
                type="button"
                onClick={() => onRemoveFromCart(item)}
                className="px-2.5 py-1 hover:bg-orange-700 active:scale-90 transition text-sm font-extrabold"
              >
                −
              </button>
              <span className="px-2 font-extrabold min-w-[20px] text-center">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                className="px-2.5 py-1 hover:bg-orange-700 active:scale-90 transition text-sm font-extrabold"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
