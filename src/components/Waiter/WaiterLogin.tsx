import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Waiter } from '../../types/database.types';

interface WaiterLoginProps {
  onLoginSuccess: (waiter: Waiter) => void;
}

export const WaiterLogin: React.FC<WaiterLoginProps> = ({ onLoginSuccess }) => {
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');
  const [empCodeInput, setEmpCodeInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingWaiters, setLoadingWaiters] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Email / Password alternative login state
  const [loginMode, setLoginMode] = useState<'quick' | 'email'>('quick');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Fetch active waiters from database
  useEffect(() => {
    const fetchWaiters = async () => {
      setLoadingWaiters(true);
      try {
        const { data, error: fetchErr } = await supabase
          .from('waiters')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (fetchErr) throw fetchErr;
        setWaiters((data as Waiter[]) || []);
        if (data && data.length > 0) {
          setSelectedWaiterId(data[0].id);
        }
      } catch (err: any) {
        console.error('Error loading waiters list:', err);
        setError('Could not load staff list. Check your database connection.');
      } finally {
        setLoadingWaiters(false);
      }
    };

    fetchWaiters();
  }, []);

  // Quick Waiter Login (by profile selection or employee code)
  const handleQuickLogin = async (e: React.FormEvent) => {
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
          // Check database directly in case new
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
          throw new Error(`No active waiter found matching "${empCodeInput}".`);
        }
      } else if (selectedWaiterId) {
        chosenWaiter = waiters.find((w) => w.id === selectedWaiterId);
      }

      if (!chosenWaiter) {
        throw new Error('Please select your waiter profile or enter your employee code.');
      }

      // Persist active waiter session
      if (typeof window !== 'undefined') {
        localStorage.setItem('active_waiter', JSON.stringify(chosenWaiter));
      }

      onLoginSuccess(chosenWaiter);
    } catch (err: any) {
      console.error('Waiter login error:', err);
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // Supabase Email / Password Login
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInErr) throw signInErr;

      // Match user with a waiter entry or create session
      let matchingWaiter = waiters.find(
        (w) => w.name.toLowerCase() === (signInData.user?.user_metadata?.full_name || '').toLowerCase()
      );

      if (!matchingWaiter) {
        // Fallback waiter profile
        matchingWaiter = {
          id: signInData.user.id,
          name: signInData.user.user_metadata?.full_name || signInData.user.email?.split('@')[0] || 'Staff Waiter',
          phone: signInData.user.phone || null,
          emp_code: 'STAFF',
          is_active: true,
          created_at: new Date().toISOString(),
        };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('active_waiter', JSON.stringify(matchingWaiter));
      }

      onLoginSuccess(matchingWaiter);
    } catch (err: any) {
      console.error('Email login error:', err);
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
            🤵
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Waiter Floor POS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Table Order Confirmation &amp; Serving Service
          </p>
        </div>

        {/* Tab Toggle: Quick Code Login vs Supabase Email */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl mb-5 border border-slate-700/50">
          <button
            type="button"
            onClick={() => {
              setLoginMode('quick');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
              loginMode === 'quick'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Quick Shift Login
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('email');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
              loginMode === 'email'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📧 Email Login
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-semibold rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loginMode === 'quick' ? (
          <form onSubmit={handleQuickLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Select Your Name / Profile
              </label>
              {loadingWaiters ? (
                <div className="w-full h-11 bg-slate-800 rounded-xl animate-pulse" />
              ) : waiters.length === 0 ? (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300">
                  No active waiters found. Please add a waiter in Kitchen or Admin POS.
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
                Employee Code / Phone Number
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
                <span>Starting Shift...</span>
              ) : (
                <>
                  <span>Start Floor Shift ➔</span>
                  <span>🚀</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Staff Email
              </label>
              <input
                type="email"
                placeholder="waiter@spicegarden.com"
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
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Open Waiter POS ➔'}
            </button>
          </form>
        )}

        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            🔔 <strong>Workflow:</strong> When customers place orders via table QR, you will visit the table, verify items with guests, and approve them to dispatch to the kitchen chefs.
          </p>
        </div>
      </div>
    </div>
  );
};
