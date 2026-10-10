import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Profile } from '../../types/database.types';

interface AdminLoginProps {
  onLoginSuccess: (profile: Profile) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInErr) throw signInErr;

      if (signInData.user) {
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
          console.error('Admin profile lookup failed:', profileErr);
          await supabase.auth.signOut();
          throw new Error(
            profileErr?.message ||
            'No administrator profile found in database. Administrator privileges required.'
          );
        }

        if (profile.role !== 'admin') {
          await supabase.auth.signOut();
          throw new Error(`Access denied. Found role "${profile.role}", but Administrator role is required.`);
        }

        if (profile.is_active === false) {
          await supabase.auth.signOut();
          throw new Error('Administrator account is currently inactive.');
        }

        onLoginSuccess(profile as Profile);
      }
    } catch (err: any) {
      console.error('Admin authentication error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-white">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
            👑
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Admin Management Portal
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authorized Executive Access Only
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
              Admin Email
            </label>
            <input
              type="email"
              placeholder="admin@smartbilling.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying...' : 'Unlock Admin Portal ➔'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            🔒 Protected System: Staff accounts must be provisioned by Master Admin.
          </p>
        </div>
      </div>
    </div>
  );
};
