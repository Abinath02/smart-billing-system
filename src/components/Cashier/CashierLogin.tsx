import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Profile } from '../../types/database.types';

interface CashierLoginProps {
  onLoginSuccess: (profile: Profile) => void;
}

export const CashierLogin: React.FC<CashierLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Authenticate with Supabase
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (signInErr) throw signInErr;

      if (!signInData.user) {
        throw new Error('Authentication failed. No user record returned.');
      }

      // 2. Strict Role Verification from profiles table
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signInData.user.id)
        .single();

      if (profileErr || !profile) {
        await supabase.auth.signOut();
        throw new Error('No staff profile found. Only accounts registered by the Restaurant Admin can access POS.');
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error('Your cashier account is currently inactive. Please contact Admin.');
      }

      if (profile.role !== 'cashier' && profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Access denied. Only Cashier and Admin staff can access POS billing.');
      }

      onLoginSuccess(profile as Profile);
    } catch (err: any) {
      console.error('Cashier auth error:', err);
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-white">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
            💰
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Cashier POS Counter
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authorized Cashier Sign-in Required
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-semibold rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Cashier Staff Email
            </label>
            <input
              type="email"
              placeholder="cashier@spicegarden.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Open Cashier Till ➔'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            🔒 <strong>Notice:</strong> Staff accounts are strictly provisioned by the <span className="text-amber-400 font-semibold">Restaurant Administrator</span>. Contact Admin for POS login credentials.
          </p>
        </div>
      </div>
    </div>
  );
};
