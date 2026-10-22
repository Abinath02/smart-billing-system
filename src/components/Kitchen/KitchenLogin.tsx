import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { Profile } from '../../types/database.types';
import { ChefIcon, LockIcon, AlertIcon, ArrowRightIcon, EyeIcon, EyeOffIcon } from '../common/Icons';

interface KitchenLoginProps {
  onLoginSuccess: (profile: Profile) => void;
}

export const KitchenLogin: React.FC<KitchenLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid kitchen staff email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // 1. Authenticate with Supabase
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (signInErr) throw signInErr;

      if (!signInData.user) {
        throw new Error('Authentication failed. No user record returned.');
      }

      // 2. Strict Role Verification from profiles table: ONLY 'kitchen' role
      let { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signInData.user.id)
        .single();

      if (!profile && signInData.user.email) {
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', signInData.user.email.toLowerCase())
          .single();
        if (profileByEmail) {
          profile = profileByEmail;
          profileErr = null;
        }
      }

      if (profileErr || !profile) {
        console.error('Kitchen profile lookup failed:', profileErr);
        await supabase.auth.signOut();
        throw new Error(
          'No staff profile found for this account. Only accounts registered by the Restaurant Administrator can sign in.'
        );
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('Your kitchen account is currently inactive. Please contact Administrator.');
      }

      if (profile.role !== 'kitchen') {
        await supabase.auth.signOut();
        throw new Error(
          `Access restricted: Kitchen Display is strictly for Kitchen staff. Your account role is "${profile.role}". Please sign in at your designated portal.`
        );
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('active_kitchen_profile', JSON.stringify(profile));
      }

      onLoginSuccess(profile as Profile);
    } catch (err: any) {
      console.error('Kitchen auth error:', err);
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-white">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ChefIcon className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Kitchen Display System
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Order Preparation &amp; Inventory Station
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-semibold rounded-xl flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Kitchen Staff Email
            </label>
            <input
              type="email"
              placeholder="kitchen@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Kitchen Station</span>
                <ArrowRightIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800 text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <LockIcon className="w-3.5 h-3.5" />
            <span>Role-Restricted Access: Kitchen staff accounts only.</span>
          </div>

          <div className="pt-2 flex items-center justify-center gap-4 text-xs font-medium text-slate-400">
            <Link href="/admin" className="hover:text-orange-400 transition">
              Admin Portal
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/cashier" className="hover:text-orange-400 transition">
              Cashier POS
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/waiter" className="hover:text-orange-400 transition">
              Waiter Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenLogin;
