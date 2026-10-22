import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { Waiter } from '../../types/database.types';
import { WaiterIcon, LockIcon, AlertIcon, ArrowRightIcon, KeyIcon } from '../common/Icons';

interface WaiterLoginProps {
  onLoginSuccess: (waiter: Waiter) => void;
}

export const WaiterLogin: React.FC<WaiterLoginProps> = ({ onLoginSuccess }) => {
  // Login Mode: 'credentials' (Email/Password) vs 'code' (Floor Employee Code/Selection)
  const [loginMode, setLoginMode] = useState<'credentials' | 'code'>('credentials');

  // Credentials State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Code / Select State
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');
  const [empCodeInput, setEmpCodeInput] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingWaiters, setLoadingWaiters] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active waiters list strictly from database
  useEffect(() => {
    const fetchWaiters = async () => {
      setLoadingWaiters(true);
      try {
        const { data, error: fetchErr } = await supabase
          .from('waiters')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (!fetchErr && data) {
          setWaiters(data as Waiter[]);
          if (data.length > 0) {
            setSelectedWaiterId(data[0].id);
          }
        }
      } catch (err: any) {
        console.warn('Waiters list notice:', err);
      } finally {
        setLoadingWaiters(false);
      }
    };

    fetchWaiters();
  }, []);

  // Primary Login: Staff Credentials (Email + Password)
  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Authenticate with Supabase Auth
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (signInErr) throw signInErr;
      if (!signInData.user) {
        throw new Error('Authentication failed. No user record returned.');
      }

      // 2. Strict Role Verification from profiles table: ONLY 'waiter' role
      let { data: profile } = await supabase
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
        if (profileByEmail) profile = profileByEmail;
      }

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error(
          'No staff profile found for this account. Please ask the Restaurant Administrator to create your Waiter account.'
        );
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('Your account is currently inactive. Please contact the Administrator.');
      }

      if (profile.role !== 'waiter') {
        await supabase.auth.signOut();
        throw new Error(
          `Access restricted: Floor Waiter Portal is strictly for Waiter staff. Your account role is "${profile.role}". Please sign in at your designated portal.`
        );
      }

      // 3. Resolve matching Waiter record strictly from the database waiters table
      let { data: matchingWaiter } = await supabase
        .from('waiters')
        .select('*')
        .eq('id', profile.id)
        .single();

      if (!matchingWaiter) {
        // Look up by exact name or phone
        const { data: byName } = await supabase
          .from('waiters')
          .select('*')
          .eq('name', profile.full_name)
          .eq('is_active', true)
          .limit(1);

        if (byName && byName.length > 0) {
          matchingWaiter = byName[0];
        }
      }

      // If no valid record exists in database, deny access (no fake dummy fallback!)
      if (!matchingWaiter || matchingWaiter.is_active === false) {
        await supabase.auth.signOut();
        throw new Error(
          'No active waiter profile found in the database. Please ask the Restaurant Administrator to configure your waiter profile in Staff Management.'
        );
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('active_waiter', JSON.stringify(matchingWaiter));
      }

      onLoginSuccess(matchingWaiter);
    } catch (err: any) {
      console.error('Waiter credentials login error:', err);
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // Alternative Login: Quick Employee Code / Floor Profile Select
  const handleCodeAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let chosenWaiter: Waiter | undefined;

      if (empCodeInput.trim()) {
        const code = empCodeInput.trim().toUpperCase();
        chosenWaiter = waiters.find(
          (w) =>
            w.emp_code?.toUpperCase() === code ||
            w.phone === code ||
            w.name.toLowerCase() === code.toLowerCase()
        );

        if (!chosenWaiter) {
          const { data, error: dbErr } = await supabase
            .from('waiters')
            .select('*')
            .or(`emp_code.ilike.%${code}%,phone.eq.${code}`)
            .eq('is_active', true)
            .limit(1);

          if (!dbErr && data && data.length > 0) {
            chosenWaiter = data[0] as Waiter;
          }
        }

        if (!chosenWaiter) {
          throw new Error(`No active waiter found in database with code or phone "${empCodeInput}".`);
        }
      } else if (selectedWaiterId) {
        chosenWaiter = waiters.find((w) => w.id === selectedWaiterId && w.is_active);
      }

      if (!chosenWaiter) {
        throw new Error('Please select an active waiter profile or enter your employee code.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('active_waiter', JSON.stringify(chosenWaiter));
      }

      onLoginSuccess(chosenWaiter);
    } catch (err: any) {
      console.error('Waiter code login error:', err);
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white relative overflow-hidden">
        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <WaiterIcon className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Waiter Floor Service
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Table Order Confirmation &amp; Serving Terminal
          </p>
        </div>

        {/* Tab Toggle: Credentials vs Fast Code */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl mb-5 border border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setLoginMode('credentials');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              loginMode === 'credentials'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LockIcon className="w-3.5 h-3.5" />
            <span>Staff Account Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('code');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              loginMode === 'code'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyIcon className="w-3.5 h-3.5" />
            <span>Employee Code / PIN</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-semibold rounded-xl flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* MODE 1: Email & Password Login */}
        {loginMode === 'credentials' ? (
          <form onSubmit={handleCredentialsAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Waiter Email Address
              </label>
              <input
                type="email"
                placeholder="waiter@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying Waiter Credentials...</span>
              ) : (
                <>
                  <span>Sign In &amp; Start Shift</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* MODE 2: Floor Code / Quick Select */
          <form onSubmit={handleCodeAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Waiter Profile
              </label>
              {loadingWaiters ? (
                <div className="w-full h-11 bg-slate-800 rounded-xl animate-pulse" />
              ) : waiters.length === 0 ? (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300">
                  No active waiters found in the database. Please ask the Administrator to create waiter profiles.
                </div>
              ) : (
                <select
                  value={selectedWaiterId}
                  onChange={(e) => {
                    setSelectedWaiterId(e.target.value);
                    setEmpCodeInput('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                >
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.emp_code ? `(${w.emp_code})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Or Enter Code
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Employee Code or Phone
              </label>
              <input
                type="text"
                placeholder="e.g. W-01 or phone number"
                value={empCodeInput}
                onChange={(e) => setEmpCodeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (waiters.length === 0 && !empCodeInput.trim())}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Accessing Waiter Terminal...</span>
              ) : (
                <>
                  <span>Start Floor Shift</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Policy Notice */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <LockIcon className="w-3.5 h-3.5" />
            <span>Role-Restricted Access: Registered floor waiters only.</span>
          </div>

          <div className="pt-2 flex items-center justify-center gap-4 text-xs font-medium text-slate-400">
            <Link href="/admin" className="hover:text-amber-400 transition">
              Admin Portal
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/cashier" className="hover:text-amber-400 transition">
              Cashier POS
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/kitchen" className="hover:text-amber-400 transition">
              Kitchen KDS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaiterLogin;
