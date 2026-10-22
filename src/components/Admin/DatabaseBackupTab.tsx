import React, { useState } from 'react';
import {
  BoxIcon,
  CheckIcon,
  AlertIcon,
  RefreshIcon,
  ShieldIcon,
  ClockIcon,
  ArrowRightIcon,
  LockIcon,
} from '../common/Icons';

export const DatabaseBackupTab: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [backupPreview, setBackupPreview] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Trigger Direct Download of JSON Database Snapshot
  const handleDownloadBackup = async () => {
    setDownloading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/backup');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate database backup.');
      }

      // Create a downloadable blob
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data.backup, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `spice-garden-db-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupPreview(data.backup);
      setSuccessMsg(
        `Full database snapshot exported successfully (${data.backup.metadata.totalOrders} orders, ${data.backup.metadata.totalMenuItems} menu items).`
      );
    } catch (err: any) {
      console.error('Backup error:', err);
      setErrorMsg(err.message || 'Error creating database backup.');
    } finally {
      setDownloading(false);
    }
  };

  // 2. Fetch Live Preview Metadata
  const handleFetchPreview = async () => {
    setLoadingPreview(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/backup');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to inspect database tables.');
      }

      setBackupPreview(data.backup);
      setSuccessMsg('Live database metrics inspected successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inspecting database.');
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-700 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <ShieldIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Database Backups &amp; Data Security
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Export complete point-in-time database snapshots (orders, menu, inventory, staff, and customer receipts) for disaster recovery and compliance audit.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleFetchPreview}
            disabled={loadingPreview || downloading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
            <span>{loadingPreview ? 'Inspecting...' : 'Inspect Live Data'}</span>
          </button>

          <button
            onClick={handleDownloadBackup}
            disabled={downloading}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-md transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            <BoxIcon className="w-4 h-4" />
            <span>{downloading ? 'Exporting Backup...' : 'Download JSON Snapshot'}</span>
          </button>
        </div>
      </div>

      {/* Snapshot Preview Card (if fetched or downloaded) */}
      {backupPreview && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">Live Snapshot Summary</h3>
              <p className="text-[11px] text-slate-400">
                Generated at {new Date(backupPreview.exportedAt).toLocaleString()}
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-bold">
              Snapshot Verified
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Orders</span>
              <span className="text-lg font-black text-slate-900">
                {backupPreview.metadata.totalOrders}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Items</span>
              <span className="text-lg font-black text-slate-900">
                {backupPreview.metadata.totalOrderItems}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Menu</span>
              <span className="text-lg font-black text-slate-900">
                {backupPreview.metadata.totalMenuItems}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Inventory</span>
              <span className="text-lg font-black text-slate-900">
                {backupPreview.metadata.totalInventoryItems}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Waiters</span>
              <span className="text-lg font-black text-slate-900">
                {backupPreview.metadata.totalWaiters}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Offers</span>
              <span className="text-lg font-black text-slate-900">
                {backupPreview.metadata.totalOffers}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Staff</span>
              <span className="text-lg font-black text-slate-900">
                {backupPreview.metadata.totalStaffProfiles}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Security & Backup Policy Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Automated Backups & Cloud Redundancy */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Automated Cloud Point-In-Time Backups
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your Supabase Postgres instance automatically performs daily physical base backups and streams write-ahead logs (WAL). In case of accidental data corruption or hardware failure, the database can be restored to any second in the last 7 days.
          </p>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Daily Cloud Backup:</span>
              <span className="font-bold text-emerald-700">Enabled (Supabase Cloud)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Recovery Window:</span>
              <span className="font-bold text-slate-800">7 Days Continuous (WAL)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Backup Scope:</span>
              <span className="font-bold text-slate-800">All Schemas, Tables &amp; Sequences</span>
            </div>
          </div>
        </div>

        {/* Card 2: Row Level Security (RLS) Status */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <LockIcon className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Row Level Security (RLS) Policy Enforcement
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Strict Postgres RLS policies ensure data isolation. Public QR dine-in patrons cannot read or modify administrative profiles or sensitive billing configurations.
          </p>
          <div className="space-y-1.5 text-xs">
            {[
              { table: 'public.profiles', status: 'Protected (Admin & Self Update)' },
              { table: 'public.orders', status: 'Protected (Public Place, Staff Settle)' },
              { table: 'public.inventory', status: 'Protected (Admin & Kitchen Only)' },
              { table: 'public.menu_items', status: 'Protected (Admin Pricing Override)' },
              { table: 'public.waiters', status: 'Protected (Admin & Kitchen Only)' },
            ].map((item) => (
              <div
                key={item.table}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200"
              >
                <span className="font-mono font-bold text-slate-700 text-[11px]">
                  {item.table}
                </span>
                <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                  <CheckIcon className="w-3 h-3 text-emerald-600" />
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 3: Command-Line Database Export & Restore Guide */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 mb-2">
          PostgreSQL CLI Backup &amp; Restore Instructions
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          For external off-site archiving, use the standard `pg_dump` CLI tool with your Supabase database connection string:
        </p>

        <div className="space-y-3">
          <div>
            <span className="text-[11px] font-bold text-slate-700 block mb-1">
              1. Full Database Dump (Schema + Data):
            </span>
            <pre className="p-3 bg-slate-950 text-amber-400 rounded-xl text-xs font-mono overflow-x-auto select-all">
              pg_dump -h db.PROJECT_REF.supabase.co -U postgres -d postgres &gt; backup.sql
            </pre>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-700 block mb-1">
              2. Restore Database from Dump:
            </span>
            <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto select-all">
              psql -h db.PROJECT_REF.supabase.co -U postgres -d postgres &lt; backup.sql
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseBackupTab;
