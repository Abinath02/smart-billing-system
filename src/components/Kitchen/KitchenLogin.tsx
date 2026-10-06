import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Profile } from '../../types/database.types';

interface KitchenLoginProps {
  onLoginSuccess: (profile: Profile) => void;
}

export const KitchenLogin: React.FC<KitchenLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Register Kitchen Staff
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName.trim() || 'Kitchen Chef',
              role: 'kitchen',
            },
          },
        });

        if (signUpErr) throw signUpErr;

        if (signUpData.user) {
          // Verify or fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', signUpData.user.id)
            .single();

          onLoginSuccess(
            profileData || {
              id: signUpData.user.id,
              email: signUpData.user.email!,
              full_name: fullName,
              role: 'kitchen',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          );
        }
      } else {
        // Sign In
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInErr) throw signInErr;

        if (signInData.user) {
          // Check role from profiles
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', signInData.user.id)
            .single();

          if (profileErr || !profile) {
            // Fallback profile if record is populating
            onLoginSuccess({
              id: signInData.user.id,
              email: signInData.user.email!,
              full_name: 'Kitchen Chef',
              role: 'kitchen',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            return;
          }

          if (profile.role !== 'kitchen' && profile.role !== 'admin') {
            await supabase.auth.signOut();
            throw new Error('Access denied. Only Kitchen Staff and Admins are permitted.');
          }

          onLoginSuccess(profile as Profile);
        }
      }
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
          <div className="w-16 h-16 rounded-2xl bg-orange-600/20 text-orange-500 border border-orange-500/30 flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
            👨‍🍳
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Kitchen Display System (KDS)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSignUp ? 'Register Kitchen Staff Account' : 'Authorized Kitchen Staff Sign-in'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-semibold rounded-xl">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Chef Name
              </label>
              <input
                type="text"
                placeholder="Chef Ramesh"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Kitchen Email
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
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Create Kitchen Account' : 'Enter Kitchen Dashboard ➔'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
          >
            {isSignUp
              ? 'Already have an account? Sign In'
              : 'Need a new kitchen staff login? Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};
