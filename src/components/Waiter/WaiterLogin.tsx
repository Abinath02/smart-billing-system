import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Waiter } from '../../types/database.types';

interface WaiterLoginProps {
  onLoginSuccess: (waiter: Waiter) => void;
}

export const WaiterLogin: React.FC<WaiterLoginProps> = ({ onLoginSuccess }) => {
  // Login Mode: 'credentials' (Admin Created Email/Password) vs 'code' (Floor Employee Code/Selection)
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

  // Fetch active waiters list for floor selector
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

  // Primary Login: Admin-Created Staff Credentials (Email + Password)
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

      // 2. Strict Role Verification from profiles table
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
        if (profileByEmail) profile = profileByEmail;
      }

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error(
          'No staff profile found for this account. Please ask the Restaurant Administrator to create your Waiter account in Admin > Staff Management.'
        );
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('Your account is currently deactivated. Please contact your restaurant Administrator.');
      }

      if (profile.role !== 'waiter' && profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error(`Access denied. Found role "${profile.role}", but Waiter or Admin floor access is required.`);
      }

      // 3. Resolve matching Waiter record in waiters table
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
          .limit(1);

        if (byName && byName.length > 0) {
          matchingWaiter = byName[0];
        } else {
          // Auto create synced waiter record with employee code
          const empCode = `W-${Math.floor(10 + Math.random() * 90)}`;
          const { data: createdW } = await supabase
            .from('waiters')
            .upsert({
              id: profile.id,
              name: profile.full_name,
              phone: profile.phone || null,
              emp_code: empCode,
              is_active: true,
            })
            .select()
            .single();

          if (createdW) matchingWaiter = createdW;
        }
      }

      const activeWaiterObj: Waiter = matchingWaiter || {
        id: profile.id,
        name: profile.full_name,
        phone: profile.phone || null,
        emp_code: 'W-01',
        is_active: true,
        created_at: profile.created_at,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('active_waiter', JSON.stringify(activeWaiterObj));
      }

      onLoginSuccess(activeWaiterObj);
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
            w.name.toLowerCase().includes(code.toLowerCase())
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
          throw new Error(`No active waiter found with code/phone "${empCodeInput}".`);
        }
      } else if (selectedWaiterId) {
        chosenWaiter = waiters.find((w) => w.id === selectedWaiterId);
      }

      if (!chosenWaiter) {
        throw new Error('Please select your waiter profile or enter your employee code.');
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
        {/* Glow decoration */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
            🤵
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Waiter Floor Service POS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Table Order Confirmation &amp; Dining Hall Serving
          </p>
        </div>

        {/* Tab Toggle: Admin-Created Credentials vs Fast Code */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl mb-5 border border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setLoginMode('credentials');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
              loginMode === 'credentials'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🔒 Staff Account Login
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('code');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
              loginMode === 'code'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Fast Shift PIN / Code
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-semibold rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* MODE 1: Admin-Created Email & Password Login */}
        {loginMode === 'credentials' ? (
          <form onSubmit={handleCredentialsAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Waiter Staff Email (Admin-Assigned)
              </label>
              <input
                type="email"
                placeholder="e.g. waiter.karthik@spicegarden.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Password (கடவுச்சொல்)
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
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Verifying Waiter Access...</span>
              ) : (
                <>
                  <span>Sign In &amp; Start Waiter Shift</span>
                  <span>➔</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* MODE 2: Floor Code / Quick Select */
          <form onSubmit={handleCodeAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Select Waiter Profile
              </label>
              {loadingWaiters ? (
                <div className="w-full h-11 bg-slate-800 rounded-xl animate-pulse" />
              ) : waiters.length === 0 ? (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300">
                  No waiters in database yet. Admin can create waiter accounts in Admin POS.
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
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500">
                OR Enter Employee Code
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Employee Code (e.g. W-01) or Mobile Number
              </label>
              <input
                type="text"
                placeholder="e.g. W-01 or 0771234567"
                value={empCodeInput}
                onChange={(e) => setEmpCodeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (waiters.length === 0 && !empCodeInput.trim())}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Opening Waiter Floor...</span>
              ) : (
                <>
                  <span>Start Floor Shift ➔</span>
                  <span>🚀</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Policy Notice */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            🔒 <strong>Admin Created Accounts:</strong> Waiter logins are provisioned by the <span className="text-amber-400 font-semibold">Restaurant Administrator</span> in the Admin Dashboard under <strong>Staff Management</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WaiterLogin;
