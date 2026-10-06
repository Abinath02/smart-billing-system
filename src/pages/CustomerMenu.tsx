import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MenuItem, Offer, Order } from '../types/database.types';
import { CartItem } from '../types/cart.types';
import { OffersCarousel } from '../components/CustomerMenu/OffersCarousel';
import { MenuItemCard } from '../components/CustomerMenu/MenuItemCard';
import { CheckoutModal } from '../components/CustomerMenu/CheckoutModal';
import { OrderSuccessModal } from '../components/CustomerMenu/OrderSuccessModal';

export const CustomerMenuPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // 1. Fetch Menu Items and Active Offers from Supabase
  useEffect(() => {
    const fetchMenuAndOffers = async () => {
      setLoading(true);
      try {
        // Fetch only available menu items (or all and filter client side)
        const { data: itemsData, error: itemsError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .order('name');

        if (itemsError) throw itemsError;
        setMenuItems(itemsData || []);

        // Fetch active offers
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('*')
          .eq('is_active', true);

        if (offersError) throw offersError;
        setOffers(offersData || []);
      } catch (err) {
        console.error('Error fetching menu or offers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuAndOffers();
  }, []);

  // 2. Extract unique categories
  const categories = useMemo(() => {
    const list = Array.from(new Set(menuItems.map((item) => item.category)));
    return ['All', ...list];
  }, [menuItems]);

  // 3. Filter menu items by category and search
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Rule: if is_available is false, hide the item
      if (!item.is_available) return false;

      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // 4. Cart management functions
  const handleAddToCart = (item: MenuItem, offer?: Offer) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (ci) => ci.menuItem.id === item.id && ci.appliedOffer?.id === offer?.id
      );

      // Calculate unit price considering offer
      let unitPrice = item.price;
      if (offer?.discount_details) {
        if (offer.discount_details.type === 'percentage') {
          unitPrice = item.price * (1 - offer.discount_details.value / 100);
        } else if (offer.discount_details.type === 'fixed') {
          unitPrice = Math.max(0, item.price - offer.discount_details.value);
        }
      }

      if (existingIndex > -1) {
        const updated = [...prev];
        const current = updated[existingIndex];
        const newQty = current.quantity + 1;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          totalPrice: Number((newQty * unitPrice).toFixed(2)),
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            menuItem: item,
            quantity: 1,
            appliedOffer: offer || null,
            unitPrice: Number(unitPrice.toFixed(2)),
            totalPrice: Number(unitPrice.toFixed(2)),
          },
        ];
      }
    });
  };

  const handleRemoveFromCart = (item: MenuItem) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((ci) => ci.menuItem.id === item.id);
      if (existingIndex === -1) return prev;

      const current = prev[existingIndex];
      if (current.quantity > 1) {
        const updated = [...prev];
        const newQty = current.quantity - 1;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          totalPrice: Number((newQty * current.unitPrice).toFixed(2)),
        };
        return updated;
      } else {
        return prev.filter((_, idx) => idx !== existingIndex);
      }
    });
  };

  // 5. Total calculations
  const totalItemCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  const subtotal = cart.reduce(
    (acc, curr) => acc + curr.menuItem.price * curr.quantity,
    0
  );

  const discountedTotal = cart.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const discountAmount = Math.max(0, Number((subtotal - discountedTotal).toFixed(2)));

  const getItemQuantity = (itemId: string) => {
    const items = cart.filter((c) => c.menuItem.id === itemId);
    return items.reduce((acc, c) => acc + c.quantity, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-28">
      {/* Header Banner */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md text-xl">
              🍽️
            </div>
            <div>
              <h1 className="text-base font-extrabold text-gray-900 leading-tight">
                Spice Garden
              </h1>
              <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                Dine-in Smart Menu
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-gray-400 font-medium">Digital Ordering</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto px-4 pb-2.5">
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search dishes (Biryani, Paneer, Naan...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-800 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="max-w-md mx-auto flex overflow-x-auto space-x-2 px-4 py-2 scrollbar-none border-t border-gray-50">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto pt-4">
        {/* Offers Carousel */}
        {offers.length > 0 && (
          <OffersCarousel
            offers={offers}
            menuItems={menuItems}
            onAddOfferToCart={(offer, item) => handleAddToCart(item, offer)}
          />
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="px-4 space-y-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-28 bg-white rounded-2xl p-4 shadow-sm animate-pulse flex justify-between gap-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mt-4"></div>
                </div>
                <div className="w-24 h-20 bg-gray-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide">
                {selectedCategory === 'All' ? 'All Delicacies' : selectedCategory} (
                {filteredItems.length})
              </h2>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300">
                <span className="text-4xl">🍽️</span>
                <p className="text-sm font-bold text-gray-700 mt-2">No items found</p>
                <p className="text-xs text-gray-400 mt-0.5">Try searching with another keyword.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    quantityInCart={getItemQuantity(item.id)}
                    onAddToCart={handleAddToCart}
                    onRemoveFromCart={handleRemoveFromCart}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-40 px-4 max-w-md mx-auto animate-bounce-short">
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between text-white border border-white/20">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center font-extrabold text-sm">
                {totalItemCount}
              </div>
              <div>
                <p className="text-xs text-orange-100 font-medium">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in cart
                </p>
                <p className="text-base font-extrabold tracking-tight">
                  ₹{(discountedTotal + (discountedTotal * 0.05)).toFixed(2)}{' '}
                  <span className="text-[10px] font-normal text-orange-200">incl. GST</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-5 py-2.5 bg-white text-orange-600 rounded-xl font-extrabold text-xs tracking-wider uppercase shadow-md hover:bg-orange-50 active:scale-95 transition flex items-center gap-1.5"
            >
              <span>View Cart</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cart}
        subtotal={subtotal}
        discount={discountAmount}
        taxRate={0.05}
        onOrderSuccess={(order) => {
          setIsCheckoutOpen(false);
          setCart([]);
          setCompletedOrder(order);
        }}
      />

      {/* Order Success Modal */}
      {completedOrder && (
        <OrderSuccessModal
          order={completedOrder}
          onReset={() => setCompletedOrder(null)}
        />
      )}
    </div>
  );
};

export default CustomerMenuPage;
