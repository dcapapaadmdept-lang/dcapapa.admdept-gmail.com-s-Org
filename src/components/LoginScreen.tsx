import React, { useState, useEffect } from 'react';
import { getSupabaseClient, getSupabaseConfig } from '../supabaseClient';
import { Profile } from '../types';
import { Shield, Sparkles, Mail, Lock, Check, AlertCircle, ArrowRight, Database, User, Phone, MapPin } from 'lucide-react';
import Logo from './Logo';

interface LoginScreenProps {
  onAuthSuccess: (user: any, profile: Profile) => void;
  resolveProfile: (user: any) => Promise<Profile>;
  initialError?: string | null;
  onRetryBootstrap?: () => void;
}

export default function LoginScreen({ onAuthSuccess, resolveProfile, initialError, onRetryBootstrap }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  // Satellite Admin Self-Registration fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [signUpAsSatelliteAdmin, setSignUpAsSatelliteAdmin] = useState(true);
  const [churches, setChurches] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const loadChurches = async () => {
      const supabase = getSupabaseClient();
      let list: any[] = [];
      if (supabase) {
        try {
          const { data, error } = await supabase.from('satellite_churches').select('id, church_name');
          if (!error && data) {
            list = data;
          } else {
            console.warn('[AUTH] Error querying satellite churches from Supabase.', error);
          }
        } catch (err) {
          console.warn('[AUTH] Failed to fetch satellite churches from Supabase.', err);
        }
      }
      if (active) {
        setChurches(list);
        if (list.length > 0) {
          setSelectedChurchId(list[0].id);
        }
      }
    };
    loadChurches();
    return () => { active = false; };
  }, []);

  let isConfigured = false;
  let url = '';
  let configError: string | null = null;
  try {
    const config = getSupabaseConfig();
    isConfigured = config.isConfigured;
    url = config.url;
  } catch (err: any) {
    isConfigured = false;
    configError = err?.message || String(err);
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password fields.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Database connection is unconfigured. Please configure your live Supabase credentials.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Sign Up Flow
        const signUpOptions: any = {
          email,
          password
        };

        if (signUpAsSatelliteAdmin) {
          signUpOptions.options = {
            data: {
              full_name: fullName.trim() || email.split('@')[0],
              phone_number: phoneNumber.trim(),
              role: 'satellite_admin',
              satellite_church_id: selectedChurchId
            }
          };
        }

        const { data, error: signUpErr } = await supabase.auth.signUp(signUpOptions);

        if (signUpErr) throw signUpErr;

        if (data.user) {
          // Manually write the profile row with selected attributes
          const chosenRole = signUpAsSatelliteAdmin ? 'satellite_admin' : 'Member';
          const tempProfile: Profile = {
            id: data.user.id,
            email: email.trim(),
            full_name: fullName.trim() || email.trim().split('@')[0],
            role: chosenRole as any,
            satellite_church_id: signUpAsSatelliteAdmin ? selectedChurchId : undefined,
            status: 'Active',
            created_at: new Date().toISOString()
          };

          try {
            const { error: insErr } = await supabase.from('profiles').insert(tempProfile);
            if (insErr) throw insErr;
          } catch (insertPrfErr) {
            console.warn('[AUTH] Direct profile insertion completed/attempted:', insertPrfErr);
          }

          if (data.session) {
            // Logged in immediately after sign up (default Supabase settings)
            const profile = await resolveProfile(data.user);
            
            // Check status immediately (Requirement 4)
            if (profile.status && profile.status !== 'Active') {
              throw new Error(`Your account status is currently '${profile.status}'. Only Active users can log in.`);
            }

            setSuccess('Account created successfully! Auto-logging in...');
            setTimeout(() => {
              onAuthSuccess(data.user, profile);
            }, 1000);
          } else {
            // Attempt to immediately log the user in in the background, 
            // verifying if email confirmation is disabled by inspecting if a signIn succeeds.
            try {
              const { data: directData, error: signInBypassErr } = await supabase.auth.signInWithPassword({
                email,
                password
              });

              if (!signInBypassErr && directData?.user) {
                const profile = await resolveProfile(directData.user);
                
                if (profile.status && profile.status !== 'Active') {
                  throw new Error(`Your account status is currently '${profile.status}'. Only Active users can log in.`);
                }

                setSuccess('Account created successfully! Access Authorized.');
                setTimeout(() => {
                  onAuthSuccess(directData.user, profile);
                }, 1000);
                return;
              }
            } catch (bgErr) {
              console.warn('[AUTH] Background check failed (email confirmation likely required).');
            }

            setSuccess('Registration successful! Please check your email for a confirmation link.');
            setLoading(false);
          }
        } else {
          throw new Error('Registration failed. Please try again.');
        }
      } else {
        // Sign In Flow
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInErr) throw signInErr;

        if (data.user) {
          const profile = await resolveProfile(data.user);
          
          // Verify user status field (Requirement 4)
          if (profile.status && profile.status !== 'Active') {
            throw new Error(`Your account status is currently '${profile.status}'. Only Active users can access this system. Please contact the administrator.`);
          }

          setSuccess('Secure Handshake Succeeded. Access Authorized.');
          setTimeout(() => {
            onAuthSuccess(data.user, profile);
          }, 800);
        } else {
          throw new Error('Invalid user credentials returned.');
        }
      }
    } catch (err: any) {
      console.warn('[AUTH ERROR] Exception caught on Supabase auth process:', err);
      const rawMsg = err?.message || err?.details || String(err);
      
      let customError = rawMsg;
      if (rawMsg.toLowerCase().includes('email not confirmed') || 
          rawMsg.toLowerCase().includes('email_not_confirmed') ||
          rawMsg.toLowerCase().includes('email confirmation required') ||
          rawMsg.toLowerCase().includes('email link expired') ||
          rawMsg.toLowerCase().includes('has not been verified')) {
        customError = "Your account has not been verified. Please contact the Church Administrator.";
      }
      
      setError(customError);
    } finally {
      if (!success) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" id="supabase-auth-gate">
      {/* Absolute Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-radial-gradient from-blue-900/15 via-slate-900/0 to-slate-900/0 pointer-events-none z-0" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Logo/Branding */}
        <div className="flex justify-center">
          <Logo width={160} height={160} className="mx-auto" />
        </div>
        <h2 className="mt-4 text-center text-2xl font-black text-white tracking-tight uppercase">
          DOMINION CITY APAPA
        </h2>
        <p className="mt-1 text-center text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">
          Church Management System (DCCMS)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-800/85 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          
          {/* Connection Status Subtitle in Gate */}
          <div className="mb-6 p-3 bg-slate-900/90 border border-slate-700 rounded-lg flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1.5 min-w-0">
              <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-slate-300 truncate">
                {isConfigured ? `Connected to active Supabase URL` : 'Database Connection Pending'}
              </span>
            </div>
            <span className={`px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${isConfigured ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-800' : 'bg-rose-950/60 text-rose-300 border border-rose-800'}`}>
              {isConfigured ? 'Live' : 'Pending'}
            </span>
          </div>

          <form className="space-y-5" onSubmit={handleAuth}>
            
            {/* Error alerts */}
            {(configError || error) && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-lg flex flex-col gap-2 text-rose-300 text-xs text-left" id="auth-error-banner">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="font-semibold">{configError || error}</div>
                </div>

                {/* If it's a Profiles RLS error, offer immediate developer assistance & SQL fix */}
                {(error.toLowerCase().includes('row-level security') || error.toLowerCase().includes('violates row-level security policy') || error.toLowerCase().includes('profiles')) && (
                  <div className="mt-2 p-3 bg-slate-900/95 border border-rose-900/50 rounded-lg text-slate-300" id="rls-helper-panel">
                    <p className="font-bold text-[11px] text-amber-400 uppercase tracking-wide font-mono flex items-center gap-1">
                      <span>⚠️ SUPABASE POLICY UPDATE REQUIRED</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Your Supabase connection is successful, but your PostgreSQL database RLS rules currently block write operations on the <code className="bg-slate-800 px-1 py-0.5 rounded text-rose-400 font-mono">profiles</code> table for newly registered authenticated accounts.
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      Please copy the SQL command below and run it in your **Supabase SQL Editor** to instantly allow user registration:
                    </p>
                    <div className="mt-2 bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[9px] text-emerald-400 overflow-x-auto relative group">
                      <pre className="whitespace-pre">{`-- 1. Enable Row Creation policy for Users
DROP POLICY IF EXISTS "Allow insert for users creating their own profiles" ON public.profiles;
CREATE POLICY "Allow insert for users creating their own profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Allow Active Selects
DROP POLICY IF EXISTS "Allow internal read for authenticated workers" ON public.profiles;
CREATE POLICY "Allow internal read for authenticated workers"
  ON public.profiles FOR SELECT
  USING (true);`}</pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`-- 1. Enable Row Creation policy for Users
DROP POLICY IF EXISTS "Allow insert for users creating their own profiles" ON public.profiles;
CREATE POLICY "Allow insert for users creating their own profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Allow Active Selects
DROP POLICY IF EXISTS "Allow internal read for authenticated workers" ON public.profiles;
CREATE POLICY "Allow internal read for authenticated workers"
  ON public.profiles FOR SELECT
  USING (true);`);
                          alert('SQL copied successfully to your clipboard! Paste and run this in your Supabase SQL Editor.');
                        }}
                        className="absolute right-2 top-2 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-750 text-[8px] font-bold tracking-tight text-slate-300 rounded hover:text-white transition-all cursor-pointer border border-slate-700"
                      >
                        Copy SQL
                      </button>
                    </div>
                  </div>
                )}

                {/* If it's an "Email not confirmed" or verification error, offer immediate instructions */}
                {(error.toLowerCase().includes('email not confirmed') || 
                  error.toLowerCase().includes('has not been verified') ||
                  error.toLowerCase().includes('not confirmed') ||
                  error.toLowerCase().includes('email_not_confirmed')) && (
                  <div className="mt-2 p-3 bg-slate-900/95 border border-rose-900/50 rounded-lg text-slate-300" id="email-not-confirmed-helper-panel">
                    <p className="font-bold text-[11px] text-amber-400 uppercase tracking-wide font-mono flex items-center gap-1">
                      <span>⚠️ SUPABASE EMAIL CONFIRMATION IS ACTIVE</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Your Supabase Cloud Auth service is configured to require email validation. Users must click a verification link sent to their inbox before they are allowed to sign in.
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      <b>How to disable this requirement:</b>
                    </p>
                    <ul className="list-disc pl-4 mt-1 text-[10px] text-slate-400 space-y-1 font-mono">
                      <li>Go to your <b>Supabase Dashboard</b> → <b>Authentication</b> → <b>Providers</b> → <b>Email</b>.</li>
                      <li>Turn OFF the toggle switch for <b>"Confirm email"</b>, then save.</li>
                    </ul>
                  </div>
                )}

                {/* If it's a "Failed to fetch" or connection/network error, offer assistance */}
                {(error.toLowerCase().includes('failed to fetch') || error.toLowerCase().includes('network') || error.toLowerCase().includes('cors') || error.toLowerCase().includes('fetch')) && (
                  <div className="mt-2 p-3 bg-slate-900/95 border border-amber-900/50 rounded-lg text-slate-300 animate-fade-in" id="network-fetch-helper-panel">
                    <p className="font-bold text-[11px] text-amber-400 uppercase tracking-wide font-mono flex items-center gap-1">
                      <span>⚠️ SUPABASE SERVER UNREACHABLE</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      We encountered a network error (<code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300 font-mono">Failed to fetch</code>) while trying to reach your Supabase Cloud instance.
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      This can occur if:
                    </p>
                    <ul className="list-disc pl-4 mt-1 text-[10px] text-slate-400 space-y-0.5 font-mono">
                      <li>Your Supabase URL or Anon key is incorrect.</li>
                      <li>Your domain/origin is blocked by Supabase CORS settings.</li>
                      <li>Your internet service has blocked the connection (firewall/DNS).</li>
                    </ul>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onRetryBootstrap) {
                            onRetryBootstrap();
                          } else {
                            window.location.reload();
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider rounded transition-all cursor-pointer shadow flex items-center gap-1"
                      >
                        <span>🔄 Retry Connection</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success alerts */}
            {success && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-lg flex items-start gap-2 text-emerald-300 text-xs animate-pulse">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="font-extrabold">{success}</div>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-4 p-4 bg-slate-900/60 border border-slate-700/60 rounded-xl" id="signup-options-container">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest font-mono">
                    Account Configuration
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={signUpAsSatelliteAdmin}
                      onChange={(e) => setSignUpAsSatelliteAdmin(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    <span className="ml-2 text-[10px] font-bold font-mono text-indigo-300 uppercase">Satellite Admin</span>
                  </label>
                </div>

                <div>
                  <label htmlFor="auth-fullname-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Full Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <input
                      id="auth-fullname-input"
                      type="text"
                      required={isSignUp}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Michael Ojo"
                      className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-phone-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Phone Number
                  </label>
                  <div className="mt-1 relative rounded-md shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <input
                      id="auth-phone-input"
                      type="tel"
                      required={isSignUp}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+234 803 123 4567"
                      className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {signUpAsSatelliteAdmin && (
                  <div className="animate-fade-in" id="church-selector-input-group">
                    <label htmlFor="auth-church-select" className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>Assigned Satellite Church</span>
                    </label>
                    <div className="mt-1 relative rounded-md shadow-xs">
                      <select
                        id="auth-church-select"
                        required={signUpAsSatelliteAdmin}
                        value={selectedChurchId}
                        onChange={(e) => setSelectedChurchId(e.target.value)}
                        className="block w-full pl-3 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold accent-slate-950"
                      >
                        {churches.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.church_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 italic font-mono leading-tight">
                      * Restricts database views and updates purely to this branch ledger upon login approval.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label htmlFor="auth-email-input" className="block text-xs font-bold text-slate-300 uppercase tracking-wide font-mono">
                Email Address
              </label>
              <div className="mt-1.5 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="auth-email-input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pastor@dominioncity.org"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password-input" className="block text-xs font-bold text-slate-300 uppercase tracking-wide font-mono">
                  Password
                </label>
              </div>
              <div className="mt-1.5 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="auth-password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white text-[10px] font-bold font-mono uppercase"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-1.5 py-3 px-4 border border-transparent rounded-lg text-xs font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors cursor-pointer shadow-md disabled:bg-slate-700 disabled:cursor-not-allowed"
                id="auth-submit-btn"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{isSignUp ? 'Create DCCMS Account' : 'Authorized Sign-In'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            {/* Switching Sign In / Sign Up Mode */}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="text-[11px] font-bold text-slate-300 hover:text-white underline cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account or profile? Sign Up"}
            </button>
          </div>



        </div>
      </div>
    </div>
  );
}
