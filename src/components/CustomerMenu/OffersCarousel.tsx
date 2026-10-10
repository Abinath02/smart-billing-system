import React from 'react';
import { Offer, MenuItem } from '../../types/database.types';

interface OffersCarouselProps {
  offers: Offer[];
  menuItems: MenuItem[];
  onAddOfferToCart: (offer: Offer, item: MenuItem) => void;
}

export const OffersCarousel: React.FC<OffersCarouselProps> = ({
  offers,
  menuItems,
  onAddOfferToCart,
}) => {
  if (!offers || offers.length === 0) return null;

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between px-4 mb-2">
        <div className="flex items-center space-x-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <h2 className="text-base font-bold text-gray-900 tracking-wide uppercase">
            Today's Exclusive Offers
          </h2>
        </div>
        <span className="text-xs text-amber-600 font-semibold">Swipe to explore</span>
      </div>

      {/* Snap Carousel Container */}
      <div className="flex overflow-x-auto space-x-3.5 px-4 pb-3 scrollbar-none snap-x snap-mandatory">
        {offers.map((offer) => {
          const linkedItem = menuItems.find((m) => m.id === offer.item_id);
          const discountText =
            offer.discount_details?.type === 'percentage'
              ? `${offer.discount_details.value}% OFF`
              : `Rs. ${offer.discount_details?.value || 0} OFF`;

          return (
            <div
              key={offer.id}
              onClick={() => linkedItem && onAddOfferToCart(offer, linkedItem)}
              className="flex-shrink-0 w-[290px] sm:w-[320px] snap-center rounded-2xl overflow-hidden relative shadow-md bg-gradient-to-br from-amber-500 to-orange-600 text-white cursor-pointer transform transition-all active:scale-[0.98] hover:shadow-lg border border-amber-400/30"
            >
              {/* Offer Poster Image */}
              <div className="h-36 w-full relative overflow-hidden bg-black/20">
                {offer.poster_url ? (
                  <img
                    src={offer.poster_url}
                    alt={offer.title}
                    className="w-full h-full object-cover brightness-90 hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-700/60">
                    <span className="text-2xl font-bold tracking-wider">SPECIAL DEAL</span>
                  </div>
                )}
                {/* Discount Badge */}
                <div className="absolute top-2.5 right-2.5 bg-red-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-lg tracking-wider uppercase flex items-center gap-1">
                  <span>🔥</span> {discountText}
                </div>
              </div>

              {/* Offer Details */}
              <div className="p-3.5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm line-clamp-1 text-white">{offer.title}</h3>
                  {linkedItem && (
                    <p className="text-xs text-orange-100 mt-0.5 line-clamp-1">
                      Includes: <span className="font-semibold text-white">{linkedItem.name}</span>
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {linkedItem && (
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-sm font-extrabold text-white">
                        Rs.{' '}
                        {offer.discount_details?.type === 'percentage'
                          ? Math.round(
                              linkedItem.price * (1 - (offer.discount_details.value || 0) / 100)
                            )
                          : Math.max(0, linkedItem.price - (offer.discount_details?.value || 0))}
                      </span>
                      <span className="text-xs text-orange-200 line-through">
                        Rs. {linkedItem.price}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="ml-auto bg-white text-orange-600 hover:bg-orange-50 font-bold text-xs px-3 py-1.5 rounded-lg shadow transition active:scale-95 flex items-center gap-1"
                  >
                    <span>+</span> Add Deal
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
