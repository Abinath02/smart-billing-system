import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Profile, UserRole } from '../../types/database.types';

export const StaffManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');

  // Modal State for Creating Staff Account
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('kitchen');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch all staff profiles
  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles((data as Profile[]) || []);
    } catch (err: any) {
      console.error('Error fetching staff profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setCreating(true);

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newFullName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          role: newRole,
          phone: newPhone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create staff account.');
      }

      setSuccessMsg(`Account created successfully for ${newFullName} (${newRole.toUpperCase()})!`);
      // Reset form
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewPhone('');
      setIsCreateModalOpen(false);

      // Refresh list
      fetchProfiles();
    } catch (err: any) {
      console.error('Error in staff creation:', err);
      setErrorMsg(err.message || 'Failed to create staff user.');
    } finally {
      setCreating(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (profile: Profile) => {
    try {
      const newStatus = !profile.is_active;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, is_active: newStatus } : p))
      );
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesRole = roleFilter === 'All' || p.role === roleFilter;
    const matchesSearch =
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
      {/* Alert Notices */}
      {successMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold ml-2">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>👥</span> Staff & User Management (பணியாளர் கணக்குகள்)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin exclusive: Only administrators can create staff accounts for Kitchen, Cashier, or Admin portals.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
        >
          <span>+ Create Staff Account</span>
        </button>
      </div>

      {/* Security Rule Note */}
      <div className="mb-5 p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
        <span className="text-base">🔒</span>
        <span>
          <strong>Admin Policy:</strong> Public registration is strictly disabled. All Kitchen chefs, Cashier staff, and Manager logins must be provisioned here by the Administrator.
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-5">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search staff name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5 w-full sm:w-auto">
          {['All', 'kitchen', 'cashier', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
                roleFilter === role
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {role === 'All' ? 'All Staff' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-3">Role / Department</th>
              <th className="py-3 px-3">Contact</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Loading staff accounts...
                </td>
              </tr>
            ) : filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                  No staff accounts found. Click "+ Create Staff Account" above to add new staff.
                </td>
              </tr>
            ) : (
              filteredProfiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                        {p.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 block">{p.full_name}</span>
                        <span className="text-[11px] text-slate-500">{p.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                        p.role === 'admin'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : p.role === 'kitchen'
                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {p.role === 'admin' ? '👑 Admin' : p.role === 'kitchen' ? '👨‍🍳 Kitchen' : '💰 Cashier'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium">
                    {p.phone || '—'}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {p.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(p)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                        p.is_active
                          ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                          : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                      }`}
                    >
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE STAFF MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👤</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Provision New Staff Account</h3>
                  <p className="text-xs text-slate-500">Only Admin can create user logins</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name (பெயர்)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chef / Priya Cashier"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Login Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. chef.ramesh@spicegarden.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password (கடவுச்சொல் - Min 6 chars)
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Staff Role (பதவி)
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="kitchen">👨‍🍳 Kitchen Staff (KDS Order Cooking & Ingredients)</option>
                  <option value="cashier">💰 Cashier POS (Billing & Payments)</option>
                  <option value="admin">👑 Restaurant Administrator (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {creating ? 'Creating Account...' : 'Create Staff Account ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
