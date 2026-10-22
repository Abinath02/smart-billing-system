import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Offer, MenuItem } from '../../types/database.types';
import { formatRs } from '../../utils/currency';
import { TagIcon, PercentIcon, ClockIcon, RefreshIcon } from '../common/Icons';

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
  const [durationPreset, setDurationPreset] = useState<string>('24h');
  const [customEndDateTime, setCustomEndDateTime] = useState<string>('');
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

  // Submit New Offer with Expiry Timer
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

    // Compute End Date
    let endDate: string | null = null;
    const now = Date.now();
    if (durationPreset === '1h') endDate = new Date(now + 1 * 3600 * 1000).toISOString();
    else if (durationPreset === '3h') endDate = new Date(now + 3 * 3600 * 1000).toISOString();
    else if (durationPreset === '6h') endDate = new Date(now + 6 * 3600 * 1000).toISOString();
    else if (durationPreset === '12h') endDate = new Date(now + 12 * 3600 * 1000).toISOString();
    else if (durationPreset === '24h') endDate = new Date(now + 24 * 3600 * 1000).toISOString();
    else if (durationPreset === '48h') endDate = new Date(now + 48 * 3600 * 1000).toISOString();
    else if (durationPreset === '7d') endDate = new Date(now + 7 * 24 * 3600 * 1000).toISOString();
    else if (durationPreset === 'custom' && customEndDateTime) {
      endDate = new Date(customEndDateTime).toISOString();
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
        start_date: new Date().toISOString(),
        end_date: endDate,
      };

      const { data, error } = await supabase
        .from('offers')
        .insert([payload])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        onOfferAdded(data[0] as Offer);
      }
      setMessage('Offer launched! It is now live on the Customer QR Menu with countdown timer.');
      setTitle('');
      setSelectedItemId('');
      setPosterUrl('');
      setDiscountValue('20');
      setDurationPreset('24h');
      setCustomEndDateTime('');
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
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        onOfferUpdated(data[0] as Offer);
      }
    } catch (err: any) {
      alert('Failed to toggle offer: ' + err.message);
    }
  };

  // Extend / Renew Offer by 24 hours
  const handleExtendOffer = async (offer: Offer, hours = 24) => {
    try {
      const newEndDate = new Date(Date.now() + hours * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('offers')
        .update({ end_date: newEndDate, is_active: true })
        .eq('id', offer.id)
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        onOfferUpdated(data[0] as Offer);
      }
      alert(`Extended "${offer.title}" by ${hours} hours!`);
    } catch (err: any) {
      alert('Failed to extend offer: ' + err.message);
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

  // Helper to format remaining time
  const getRemainingTimeText = (endDateStr?: string | null) => {
    if (!endDateStr) return null;
    const diff = new Date(endDateStr).getTime() - Date.now();
    if (diff <= 0) return { expired: true, text: 'Expired' };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return { expired: false, text: `${days}d ${hours % 24}h left` };
    }
    return { expired: false, text: `${hours}h ${mins}m left` };
  };

  return (
    <div className="space-y-6">
      {/* 1. Create Promotion Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600">
              Flash Deals & Promotions
            </span>
            <h3 className="text-lg font-black text-slate-900">Create New Timed Offer</h3>
          </div>
          <ClockIcon className="w-5 h-5 text-orange-600" />
        </div>

        {message && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-emerald-950 font-black">✕</button>
          </div>
        )}

        <form onSubmit={handleCreateOffer} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Offer Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Offer Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Flash Lunch Deal - Flat 20% OFF"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            {/* Target Menu Dish */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Apply to Dish *
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
                    {item.name} ({item.category}) - {formatRs(item.price)}
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
                  Flat Amount (Rs.)
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
                  {discountType === 'percentage' ? '%' : 'Rs.'}
                </span>
              </div>
            </div>

            <div className="flex items-center">
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <PercentIcon className="w-3.5 h-3.5 text-orange-600" />
                <span>
                  Customers will get{' '}
                  <strong className="text-orange-600 font-extrabold">
                    {discountType === 'percentage' ? `${discountValue}% OFF` : `Rs. ${discountValue} OFF`}
                  </strong>{' '}
                  when ordering this deal!
                </span>
              </p>
            </div>
          </div>

          {/* Expiration Timer Selector (Auto-Disappear Feature) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5 text-slate-700" />
                  Offer Duration & Expiry Timer
                </label>
                <p className="text-[11px] text-slate-500">
                  Offer shows a live countdown on the customer menu and automatically disappears when time runs out.
                </p>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                Auto-Disappear
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: '1h', label: '1 Hour' },
                { id: '3h', label: '3 Hours' },
                { id: '6h', label: '6 Hours' },
                { id: '12h', label: '12 Hours' },
                { id: '24h', label: '24 Hours (1 Day)' },
                { id: '48h', label: '2 Days' },
                { id: '7d', label: '7 Days' },
                { id: 'custom', label: 'Custom Date/Time' },
                { id: 'none', label: 'No Expiry' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDurationPreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    durationPreset === preset.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {durationPreset === 'custom' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Choose Expiration Date & Time:
                </label>
                <input
                  type="datetime-local"
                  value={customEndDateTime}
                  onChange={(e) => setCustomEndDateTime(e.target.value)}
                  required
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Poster Upload / URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Offer Poster Image
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* File upload input */}
              <div className="border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50 flex flex-col items-center justify-center">
                <TagIcon className="w-6 h-6 text-slate-400 mb-1" />
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
              {submitting ? 'Launching Offer...' : 'Save & Publish Offer'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Active Offers Grid */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-base font-black text-slate-900 mb-4">
          Current Offers ({offers.length})
        </h3>

        {offers.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <p className="text-xs text-slate-500 font-semibold">No offers currently active.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((offer) => {
              const linkedItem = menuItems.find((m) => m.id === offer.item_id);
              const timerInfo = getRemainingTimeText(offer.end_date);

              return (
                <div
                  key={offer.id}
                  className={`rounded-2xl border overflow-hidden p-3.5 flex flex-col justify-between transition ${
                    offer.is_active && (!timerInfo || !timerInfo.expired)
                      ? 'border-orange-200 bg-white'
                      : 'border-slate-200 bg-slate-50/70 opacity-75'
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
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <TagIcon className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        {offer.discount_details?.type === 'percentage'
                          ? `${offer.discount_details.value}% OFF`
                          : `Rs. ${offer.discount_details?.value} OFF`}
                      </div>

                      {/* Expiry Badge */}
                      {timerInfo && (
                        <div className={`absolute bottom-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 ${
                          timerInfo.expired ? 'bg-red-700 text-white' : 'bg-slate-900/80 backdrop-blur-sm text-amber-300'
                        }`}>
                          <ClockIcon className="w-3 h-3" /> {timerInfo.text}
                        </div>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{offer.title}</h4>
                    {linkedItem && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Item: <strong className="text-slate-800">{linkedItem.name}</strong> ({formatRs(linkedItem.price)})
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    {timerInfo?.expired && (
                      <button
                        type="button"
                        onClick={() => handleExtendOffer(offer, 24)}
                        className="w-full py-1 text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <RefreshIcon className="w-3 h-3" /> Extend +24 Hours
                      </button>
                    )}

                    <div className="flex items-center justify-between">
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
