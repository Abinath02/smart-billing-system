import React, { useState, useEffect } from 'react';

export interface RestaurantTable {
  id: string;
  name: string;
  zone?: string;
  capacity?: number;
  isCustom?: boolean;
}

const DEFAULT_TABLES: RestaurantTable[] = [
  { id: 'T-01', name: 'Table T-01', zone: 'Main Dining Hall', capacity: 4 },
  { id: 'T-02', name: 'Table T-02', zone: 'Main Dining Hall', capacity: 4 },
  { id: 'T-03', name: 'Table T-03', zone: 'Main Dining Hall', capacity: 2 },
  { id: 'T-04', name: 'Table T-04', zone: 'Main Dining Hall', capacity: 6 },
  { id: 'T-05', name: 'Table T-05', zone: 'Family Section', capacity: 6 },
  { id: 'T-06', name: 'Table T-06', zone: 'Family Section', capacity: 4 },
  { id: 'T-07', name: 'Table T-07', zone: 'Family Section', capacity: 4 },
  { id: 'T-08', name: 'Table T-08', zone: 'Window View', capacity: 2 },
  { id: 'T-09', name: 'Table T-09', zone: 'Window View', capacity: 4 },
  { id: 'T-10', name: 'Table T-10', zone: 'Window View', capacity: 4 },
  { id: 'T-11', name: 'Table T-11', zone: 'Terrace Garden', capacity: 6 },
  { id: 'T-12', name: 'Table T-12', zone: 'Terrace Garden', capacity: 8 },
  { id: 'VIP-1', name: 'VIP Lounge 1', zone: 'Private AC Lounge', capacity: 8 },
  { id: 'VIP-2', name: 'VIP Lounge 2', zone: 'Private AC Lounge', capacity: 10 },
  { id: 'Garden-1', name: 'Garden Table 1', zone: 'Outdoor Lawn', capacity: 4 },
  { id: 'Garden-2', name: 'Garden Table 2', zone: 'Outdoor Lawn', capacity: 4 },
];

export const TableManagementTab: React.FC = () => {
  const [tables, setTables] = useState<RestaurantTable[]>(DEFAULT_TABLES);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTableId, setNewTableId] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [newTableZone, setNewTableZone] = useState('Main Dining Hall');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [printTable, setPrintTable] = useState<RestaurantTable | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('smart_billing_tables');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTables(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load custom tables from storage:', e);
    }
  }, []);

  // Save to localStorage when tables change
  const saveTables = (updated: RestaurantTable[]) => {
    setTables(updated);
    try {
      localStorage.setItem('smart_billing_tables', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save tables to storage:', e);
    }
  };

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newTableId.trim().toUpperCase();
    if (!cleanId) {
      alert('Please enter a Table ID (e.g. T-13 or VIP-3).');
      return;
    }

    if (tables.some((t) => t.id.toUpperCase() === cleanId)) {
      alert(`Table with ID "${cleanId}" already exists.`);
      return;
    }

    const newTable: RestaurantTable = {
      id: cleanId,
      name: newTableName.trim() || `Table ${cleanId}`,
      zone: newTableZone,
      capacity: parseInt(newTableCapacity) || 4,
      isCustom: true,
    };

    const updated = [...tables, newTable];
    saveTables(updated);
    setIsAddModalOpen(false);
    setNewTableId('');
    setNewTableName('');
    setNewTableCapacity('4');
  };

  const handleDeleteTable = (tableId: string) => {
    if (!confirm(`Are you sure you want to remove Table "${tableId}"?`)) return;
    const updated = tables.filter((t) => t.id !== tableId);
    saveTables(updated);
  };

  const copyTableLink = (tableId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/?table=${encodeURIComponent(tableId)}`;
    navigator.clipboard.writeText(url);
    setCopiedId(tableId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const zones = ['All', ...Array.from(new Set(tables.map((t) => t.zone || 'Other')))];

  const filteredTables = tables.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.zone && t.zone.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesZone = zoneFilter === 'All' || t.zone === zoneFilter;
    return matchesSearch && matchesZone;
  });

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>🏷️</span> Restaurant Tables & Dine-In QR Cards (மேசைகள் & QR குறியீடுகள்)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your restaurant tables, generate instant scannable QR cards, and download or print table tents.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <span>🖨️</span> Print All Table Tents
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
          >
            <span>+ Add New Table</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search table (T-01, VIP, Lawn)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex overflow-x-auto gap-1.5 w-full sm:w-auto scrollbar-none pb-1">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => setZoneFilter(zone)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                zoneFilter === zone
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {/* Tables & QR Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredTables.map((tbl) => {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'https://smart-billing-system-blond.vercel.app';
          const tableUrl = `${origin}/?table=${encodeURIComponent(tbl.id)}`;
          const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=2&data=${encodeURIComponent(
            tableUrl
          )}`;

          return (
            <div
              key={tbl.id}
              className="p-5 rounded-3xl border-2 border-slate-200 bg-white flex flex-col items-center text-center shadow-sm hover:border-orange-500 transition-all group relative"
            >
              {tbl.isCustom && (
                <button
                  onClick={() => handleDeleteTable(tbl.id)}
                  title="Remove this custom table"
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              )}

              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">
                SMART RESTAURANT
              </span>
              <h4 className="text-xl font-black text-slate-900 mt-0.5">{tbl.name}</h4>
              <span className="text-[10px] font-semibold text-slate-500">
                {tbl.zone || 'Dining Area'} • {tbl.capacity ? `${tbl.capacity} Seats` : 'Standard'}
              </span>

              {/* Scannable Visual QR Code Image */}
              <div className="w-36 h-36 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center my-3 group-hover:scale-105 transition-transform">
                <img
                  src={qrCodeImgUrl}
                  alt={`QR Code for ${tbl.name}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>

              <p className="text-[11px] font-bold text-slate-600">
                Scan with Phone Camera to Order
              </p>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mt-1 font-semibold flex items-center gap-1">
                <span>🔒</span> Table ID: <strong className="font-mono">{tbl.id}</strong>
              </span>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-col gap-2 w-full pt-2 border-t border-slate-100">
                <div className="flex gap-1.5 w-full">
                  <button
                    onClick={() => copyTableLink(tbl.id)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    {copiedId === tbl.id ? '✓ Copied!' : 'Copy Link'}
                  </button>
                  <a
                    href={qrCodeImgUrl}
                    download={`QR_${tbl.id}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold rounded-xl transition"
                    title="Download QR Image"
                  >
                    ⬇️ QR
                  </a>
                </div>

                <a
                  href={tableUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  Open Live Menu ➔
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-2">🍽️</p>
          <p className="text-sm font-bold">No tables found matching your search.</p>
        </div>
      )}

      {/* MODAL: Add New Table */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>➕</span> Add New Restaurant Table & Generate QR
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Table ID / Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. T-13 or VIP-3 or Rooftop-1"
                  value={newTableId}
                  onChange={(e) => setNewTableId(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  This ID will be embedded directly inside the QR code URL (?table=...)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Table Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Table T-13 or Balcony VIP"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Section / Zone
                  </label>
                  <select
                    value={newTableZone}
                    onChange={(e) => setNewTableZone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Main Dining Hall">Main Dining Hall</option>
                    <option value="Family Section">Family Section</option>
                    <option value="Window View">Window View</option>
                    <option value="Terrace Garden">Terrace Garden</option>
                    <option value="Private AC Lounge">Private AC Lounge</option>
                    <option value="Outdoor Lawn">Outdoor Lawn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95"
                >
                  Create & Generate QR ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
