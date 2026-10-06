import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Offer, MenuItem } from '../../types/database.types';

interface OffersManagementProps {
  offers: Offer[];
  menuItems: MenuItem[];
  onOfferAdded: (newOffer: Offer) => void;
  onOfferUpdated: (updatedOffer: Offer) => void;
  onOfferDeleted: (offerId: string) => void;
}

export const OffersManagement: React.FC<OffersManagementProps> = ({
  offers,
  menuItems,
  onOfferAdded,
  onOfferUpdated,
  onOfferDeleted,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('20');
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Preset Poster Inspirations
  const samplePosters = [
    { label: 'Biryani Special', url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1000&q=80' },
    { label: 'Cool Beverages', url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=1000&q=80' },
    { label: 'Dessert Treats', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1000&q=80' },
    { label: 'Crispy Starters', url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1000&q=80' },
  ];

  // Handle Local File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPoster(true);
    try {
      // 1. Try Supabase Storage first if bucket 'offer-posters' exists
      const fileName = `offer_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('offer-posters')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('offer-posters')
          .getPublicUrl(fileName);
        setPosterUrl(publicUrlData.publicUrl);
      } else {
        // Fallback: Read file as Data URL / Base64 for instant zero-config preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPosterUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn('Fallback to local file reader:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPosterUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPoster(false);
    }
  };

  // Submit New Offer
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedItemId) {
      alert('Please enter a title and select a menu dish.');
      return;
    }

    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      alert('Please enter a valid discount amount.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        title: title.trim(),
        item_id: selectedItemId,
        discount_details: {
          type: discountType,
          value: value,
        },
        poster_url: posterUrl.trim() || samplePosters[0].url,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('offers')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      onOfferAdded(data as Offer);
      setMessage('🎉 Offer launched! It is now visible on the Customer QR Menu.');
      setTitle('');
      setSelectedItemId('');
      setPosterUrl('');
      setDiscountValue('20');
    } catch (err: any) {
      console.error('Error creating offer:', err);
      alert('Failed to create offer: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Existing Offer
  const handleToggleOffer = async (offer: Offer) => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .update({ is_active: !offer.is_active })
        .eq('id', offer.id)
        .select()
        .single();

      if (error) throw error;
      onOfferUpdated(data as Offer);
    } catch (err: any) {
      alert('Failed to toggle offer: ' + err.message);
    }
  };

  // Delete Offer
  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to remove this offer?')) return;
    try {
      const { error } = await supabase.from('offers').delete().eq('id', offerId);
      if (error) throw error;
      onOfferDeleted(offerId);
    } catch (err: any) {
      alert('Failed to delete offer: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Create Offer Form Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="border-b pb-4 border-slate-100 mb-5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600">
            Promotions & Marketing
          </span>
          <h3 className="text-lg font-black text-slate-900">Create New Customer Offer</h3>
          <p className="text-xs text-slate-500">
            New offers appear in the top carousel on the Customer QR Menu and automatically calculate discounts at checkout.
          </p>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="font-bold text-slate-500">
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleCreateOffer} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Offer Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Offer Title / Headline *
              </label>
              <input
                type="text"
                placeholder="e.g. Weekend Biryani Feast - 20% OFF"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            {/* Linked Menu Item */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Link to Menu Item *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="">-- Select Dish to Discount --</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category}) - ₹{item.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Discount Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-orange-50/60 rounded-2xl border border-orange-200/60">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Discount Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    discountType === 'percentage'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    discountType === 'fixed'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Flat Amount (₹)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Discount Value *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  required
                  placeholder={discountType === 'percentage' ? '20' : '50'}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                  {discountType === 'percentage' ? '%' : '₹'}
                </span>
              </div>
            </div>

            <div className="flex items-center">
              <p className="text-xs text-slate-600">
                💡 Customers will get{' '}
                <strong className="text-orange-600 font-extrabold">
                  {discountType === 'percentage' ? `${discountValue}% OFF` : `₹${discountValue} OFF`}
                </strong>{' '}
                when ordering this deal!
              </p>
            </div>
          </div>

          {/* Poster Upload / URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Offer Poster Image
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* File upload input */}
              <div className="border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50 flex flex-col items-center justify-center">
                <span className="text-2xl mb-1">🖼️</span>
                <span className="text-xs font-bold text-slate-700">Upload Poster File</span>
                <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, or WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="mt-2 text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                />
                {uploadingPoster && (
                  <span className="text-[10px] text-orange-600 font-bold mt-1">Processing image...</span>
                )}
              </div>

              {/* Paste URL or Presets */}
              <div className="space-y-2">
                <input
                  type="url"
                  placeholder="Or paste image URL (https://...)"
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />

                <span className="text-[10px] text-slate-400 block font-semibold">
                  Or pick a culinary preset:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {samplePosters.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPosterUrl(preset.url)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-800 text-[10px] font-bold transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {posterUrl && (
                  <div className="h-16 w-32 rounded-xl overflow-hidden border border-slate-200 mt-1">
                    <img
                      src={posterUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2"
            >
              {submitting ? 'Launching Offer...' : 'Save & Publish Offer 🚀'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Active Offers Grid */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-base font-black text-slate-900 mb-4">
          Current Active Offers ({offers.length})
        </h3>

        {offers.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <p className="text-xs text-slate-500 font-semibold">No offers currently active.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((offer) => {
              const linkedItem = menuItems.find((m) => m.id === offer.item_id);
              return (
                <div
                  key={offer.id}
                  className={`rounded-2xl border overflow-hidden p-3.5 flex flex-col justify-between transition ${
                    offer.is_active ? 'border-orange-200 bg-white' : 'border-slate-200 bg-slate-50/50 opacity-60'
                  }`}
                >
                  <div>
                    {/* Poster */}
                    <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-100 relative mb-3">
                      {offer.poster_url ? (
                        <img
                          src={offer.poster_url}
                          alt={offer.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🔥
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        {offer.discount_details?.type === 'percentage'
                          ? `${offer.discount_details.value}% OFF`
                          : `₹${offer.discount_details?.value} OFF`}
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{offer.title}</h4>
                    {linkedItem && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Item: <strong className="text-slate-800">{linkedItem.name}</strong>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleOffer(offer)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                        offer.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {offer.is_active ? 'Active' : 'Inactive'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteOffer(offer.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-bold hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
