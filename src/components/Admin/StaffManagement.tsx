import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Profile, UserRole, Waiter } from '../../types/database.types';
import {
  UsersIcon,
  WaiterIcon,
  ShieldIcon,
  ChefIcon,
  CashIcon,
  LockIcon,
  KeyIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  CheckIcon,
  AlertIcon,
  ArrowRightIcon,
  CloseIcon,
  RefreshIcon,
} from '../common/Icons';

export const StaffManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'profiles' | 'waiters'>('profiles');

  // Staff Profiles State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');

  // Waiters Database State
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loadingWaiters, setLoadingWaiters] = useState(true);
  const [waiterSearch, setWaiterSearch] = useState('');

  // Modal State for Creating Staff Account
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('kitchen');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);

  // Modal State for Adding New Waiter directly
  const [isAddWaiterModalOpen, setIsAddWaiterModalOpen] = useState(false);
  const [waiterName, setWaiterName] = useState('');
  const [waiterPhone, setWaiterPhone] = useState('');
  const [waiterEmpCode, setWaiterEmpCode] = useState('');
  const [addingWaiter, setAddingWaiter] = useState(false);

  // Deleting State
  const [deletingWaiterId, setDeletingWaiterId] = useState<string | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  // Password Reset State
  interface ResetTarget {
    id: string;
    name: string;
    emailOrCode: string;
    role: string;
    type: 'profile' | 'waiter';
  }
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetModalError, setResetModalError] = useState<string | null>(null);

  // Feedback notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch all staff profiles
  const fetchProfiles = async () => {
    setLoadingProfiles(true);
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
      setLoadingProfiles(false);
    }
  };

  // Fetch all waiters from database
  const fetchWaiters = async () => {
    setLoadingWaiters(true);
    try {
      const { data, error } = await supabase
        .from('waiters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWaiters((data as Waiter[]) || []);
    } catch (err: any) {
      console.error('Error fetching waiters:', err);
    } finally {
      setLoadingWaiters(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchWaiters();
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

      setSuccessMsg(`Account created successfully for ${newFullName} (${newRole.toUpperCase()})`);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewPhone('');
      setIsCreateModalOpen(false);

      fetchProfiles();
      fetchWaiters();
    } catch (err: any) {
      console.error('Error in staff creation:', err);
      setErrorMsg(err.message || 'Failed to create staff user.');
    } finally {
      setCreating(false);
    }
  };

  // Add Waiter directly to waiters table
  const handleAddWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiterName.trim()) {
      setErrorMsg('Waiter name is required.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setAddingWaiter(true);

    try {
      const code = waiterEmpCode.trim().toUpperCase() || `W-${Math.floor(10 + Math.random() * 90)}`;
      const { data, error } = await supabase
        .from('waiters')
        .insert([
          {
            name: waiterName.trim(),
            phone: waiterPhone.trim() || null,
            emp_code: code,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setSuccessMsg(`Waiter ${waiterName.trim()} (${code}) added to database successfully.`);
      setWaiterName('');
      setWaiterPhone('');
      setWaiterEmpCode('');
      setIsAddWaiterModalOpen(false);
      fetchWaiters();
    } catch (err: any) {
      console.error('Error adding waiter:', err);
      setErrorMsg(err.message || 'Failed to add waiter.');
    } finally {
      setAddingWaiter(false);
    }
  };

  // Delete unwanted waiter from database
  const handleDeleteWaiter = async (waiter: Waiter) => {
    if (!confirm(`Are you sure you want to permanently remove waiter "${waiter.name}" from the database?`)) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setDeletingWaiterId(waiter.id);

    try {
      const { error } = await supabase
        .from('waiters')
        .delete()
        .eq('id', waiter.id);

      if (error) throw error;

      setSuccessMsg(`Waiter "${waiter.name}" removed from database.`);
      setWaiters((prev) => prev.filter((w) => w.id !== waiter.id));
    } catch (err: any) {
      console.error('Error deleting waiter:', err);
      setErrorMsg(err.message || 'Failed to delete waiter from database.');
    } finally {
      setDeletingWaiterId(null);
    }
  };

  // Delete Staff Profile (Admin Privilege)
  const handleDeleteProfile = async (profile: Profile) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the account for ${profile.full_name} (${profile.email})?\n\nThis will remove their portal access completely.`
    );
    if (!confirmed) return;

    setDeletingProfileId(profile.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          userType: 'profile',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete staff account.');
      }

      setSuccessMsg(data.message || `Account for "${profile.full_name}" permanently deleted.`);
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    } catch (err: any) {
      console.error('Error deleting staff account:', err);
      setErrorMsg(err.message || 'Failed to delete staff account.');
    } finally {
      setDeletingProfileId(null);
    }
  };

  // Toggle active status for staff profile
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

  // Toggle active status for waiter
  const handleToggleWaiterStatus = async (waiter: Waiter) => {
    try {
      const newStatus = !waiter.is_active;
      const { error } = await supabase
        .from('waiters')
        .update({ is_active: newStatus })
        .eq('id', waiter.id);

      if (error) throw error;
      setWaiters((prev) =>
        prev.map((w) => (w.id === waiter.id ? { ...w, is_active: newStatus } : w))
      );
    } catch (err: any) {
      alert('Error updating waiter status: ' + err.message);
    }
  };

  // Password / Login Code Reset Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetModalError(null);

    const minLen = resetTarget.type === 'waiter' ? 3 : 6;
    if (newResetPassword.length < minLen) {
      setResetModalError(`Password / Login code must be at least ${minLen} characters long.`);
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      setResetModalError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resetTarget.id,
          newPassword: newResetPassword,
          email: resetTarget.emailOrCode,
          targetType: resetTarget.type,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setSuccessMsg(data.message || 'Password updated successfully!');
      setResetTarget(null);
      setNewResetPassword('');
      setConfirmResetPassword('');
      if (resetTarget.type === 'waiter') fetchWaiters();
    } catch (err: any) {
      setResetModalError(err.message || 'Error updating password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesRole = roleFilter === 'All' || p.role === roleFilter;
    const matchesSearch =
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const filteredWaiters = waiters.filter((w) => {
    const term = waiterSearch.toLowerCase();
    return (
      w.name.toLowerCase().includes(term) ||
      (w.emp_code && w.emp_code.toLowerCase().includes(term)) ||
      (w.phone && w.phone.includes(term))
    );
  });

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
      {/* Alert Notices */}
      {successMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold ml-2">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-600 font-bold ml-2">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-amber-500" />
            <span>Staff &amp; Waiters Management</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authenticated portal accounts and dining floor waiters registered in the database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'profiles' ? (
            <button
              onClick={() => {
                setErrorMsg(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Staff Account</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setErrorMsg(null);
                setIsAddWaiterModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Floor Waiter</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs Toggle: User Accounts vs Floor Waiters */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-5">
        <button
          onClick={() => setActiveSubTab('profiles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'profiles'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          <span>Portal Accounts ({profiles.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('waiters')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'waiters'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <WaiterIcon className="w-4 h-4" />
          <span>Floor Waiters Database ({waiters.length})</span>
        </button>
      </div>

      {/* VIEW 1: PROFILES MANAGEMENT */}
      {activeSubTab === 'profiles' && (
        <div className="space-y-4">
          {/* Policy Note */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
            <LockIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span>
              <strong>Security Policy:</strong> Public registration is disabled. All Kitchen, Cashier, and Manager portal credentials must be provisioned here by the Administrator.
            </span>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <SearchIcon className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-1.5 w-full sm:w-auto">
              {['All', 'waiter', 'kitchen', 'cashier', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
                    roleFilter === role
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {role === 'All' ? 'All Roles' : role}
                </button>
              ))}
            </div>
          </div>

          {/* Staff Table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-3">Role / Portal</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingProfiles ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading staff accounts...
                    </td>
                  </tr>
                ) : filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                      No staff accounts found. Click "Create Staff Account" above to add new staff.
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
                            <span className="font-bold text-slate-900 block">{p.full_name}</span>
                            <span className="text-[11px] text-slate-500">{p.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            p.role === 'admin'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : p.role === 'kitchen'
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : p.role === 'waiter'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {p.role === 'admin' && <ShieldIcon className="w-3 h-3" />}
                          {p.role === 'kitchen' && <ChefIcon className="w-3 h-3" />}
                          {p.role === 'waiter' && <WaiterIcon className="w-3 h-3" />}
                          {p.role === 'cashier' && <CashIcon className="w-3 h-3" />}
                          <span>{p.role}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {p.phone || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setResetModalError(null);
                              setNewResetPassword('');
                              setConfirmResetPassword('');
                              setResetTarget({
                                id: p.id,
                                name: p.full_name,
                                emailOrCode: p.email,
                                role: p.role,
                                type: 'profile',
                              });
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition flex items-center gap-1"
                            title="Reset password for this staff member"
                          >
                            <KeyIcon className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reset Pass</span>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(p)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                              p.is_active
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {p.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(p)}
                            disabled={deletingProfileId === p.id}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition flex items-center gap-1 disabled:opacity-50"
                            title="Permanently delete staff account"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: WAITERS DATABASE MANAGEMENT (Add, Toggle, Delete Unwanted Waiters) */}
      {activeSubTab === 'waiters' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WaiterIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Floor waiters registered here can sign in to the Waiter Portal and be assigned to dining orders in Kitchen KDS. Unwanted or obsolete waiters can be deleted directly below.
              </span>
            </div>
            <button
              onClick={fetchWaiters}
              className="p-1.5 text-amber-800 hover:bg-amber-100 rounded-lg transition"
              title="Refresh Waiters"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <SearchIcon className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search waiter name, code, or phone..."
              value={waiterSearch}
              onChange={(e) => setWaiterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Waiters Table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Waiter Name</th>
                  <th className="py-3 px-3">Employee Code</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingWaiters ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading waiters from database...
                    </td>
                  </tr>
                ) : filteredWaiters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                      No waiters found in database. Click "Add Floor Waiter" to add one.
                    </td>
                  </tr>
                ) : (
                  filteredWaiters.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
                            {w.name?.charAt(0) || 'W'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{w.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {w.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-bold">
                          {w.emp_code || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {w.phone || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            w.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {w.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setResetModalError(null);
                              setNewResetPassword('');
                              setConfirmResetPassword('');
                              setResetTarget({
                                id: w.id,
                                name: w.name,
                                emailOrCode: w.emp_code || '',
                                role: 'Floor Waiter',
                                type: 'waiter',
                              });
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition flex items-center gap-1"
                            title="Update waiter login code"
                          >
                            <KeyIcon className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reset Code</span>
                          </button>
                          <button
                            onClick={() => handleToggleWaiterStatus(w)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition border ${
                              w.is_active
                                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {w.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteWaiter(w)}
                            disabled={deletingWaiterId === w.id}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition flex items-center gap-1 disabled:opacity-50"
                            title="Remove waiter from database"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE STAFF ACCOUNT */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create Staff Account</h3>
                  <p className="text-xs text-slate-500">Administrator managed portal credentials</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Login Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. staff.ramesh@restaurant.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password (Minimum 6 characters)
                </label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="waiter">Waiter (Floor Service &amp; Table Confirmation)</option>
                  <option value="kitchen">Kitchen Staff (Order Preparation &amp; KDS)</option>
                  <option value="cashier">Cashier (POS Counter &amp; Payment Settlement)</option>
                  <option value="admin">Administrator (Full System Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0771234567"
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
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {creating ? (
                    <span>Creating Account...</span>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD FLOOR WAITER DIRECTLY TO DATABASE */}
      {isAddWaiterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <WaiterIcon className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register Floor Waiter</h3>
                  <p className="text-xs text-slate-500">Adds an active waiter profile to database</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddWaiterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWaiter} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Waiter Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Raina"
                  value={waiterName}
                  onChange={(e) => setWaiterName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee Code (e.g. W-04)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if left empty"
                  value={waiterEmpCode}
                  onChange={(e) => setWaiterEmpCode(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0771234567"
                  value={waiterPhone}
                  onChange={(e) => setWaiterPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddWaiterModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingWaiter}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {addingWaiter ? (
                    <span>Saving Waiter...</span>
                  ) : (
                    <>
                      <span>Save Waiter</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 3: PASSWORD / PASSCODE RESET (Admin Can Change Passwords) */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <KeyIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {resetTarget.type === 'waiter' ? 'Update Waiter Passcode' : 'Reset User Password'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Admin Security Override for {resetTarget.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetTarget(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {resetModalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <AlertIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{resetModalError}</span>
              </div>
            )}

            <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Account Name:</span>
                <span className="font-bold text-slate-900">{resetTarget.name}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">
                  {resetTarget.type === 'waiter' ? 'Current Code:' : 'Email Address:'}
                </span>
                <span className="font-bold text-slate-700 font-mono">{resetTarget.emailOrCode}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">System Role:</span>
                <span className="font-bold text-amber-600 capitalize">{resetTarget.role}</span>
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {resetTarget.type === 'waiter' ? 'New Login Passcode (e.g. W-05) *' : 'New Password (min 6 characters) *'}
                </label>
                <input
                  type={resetTarget.type === 'waiter' ? 'text' : 'password'}
                  placeholder={resetTarget.type === 'waiter' ? 'Enter new passcode' : 'Enter new secure password'}
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={resetTarget.type === 'waiter' ? 'text' : 'password'}
                  placeholder="Re-type new password to confirm"
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {resettingPassword ? (
                    <span>Updating Password...</span>
                  ) : (
                    <>
                      <span>Save Password</span>
                      <CheckIcon className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
