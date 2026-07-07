import React, { useState, useEffect } from 'react';
import { getSupabaseConfig, getSupabaseClient, saveSupabaseConfig, resetSupabaseConfig } from '../supabaseClient';
import { Profile, StartupQueryTrace } from '../types';
import {
  Heart,
  ShieldCheck,
  Activity,
  Database,
  AlertCircle,
  CheckCircle,
  Play,
  RefreshCw,
  Server,
  Users,
  KeyRound,
  AlertOctagon,
  HelpCircle,
  CornerRightDown,
  Wrench,
  Search,
  Globe,
  Trash2
} from 'lucide-react';

interface TablesStatus {
  name: string;
  count: number | null;
  status: 'online' | 'restricted' | 'missing' | 'checking';
  error: string | null;
}

interface SupabaseHealthCheckViewProps {
  activeProfile: Profile;
  onRefreshAll: () => void;
  startupTraces: StartupQueryTrace[];
}

export default function SupabaseHealthCheckView({ activeProfile, onRefreshAll, startupTraces }: SupabaseHealthCheckViewProps) {
  if (!activeProfile) {
    return (
      <div className="bg-slate-950 p-6 rounded-lg text-slate-400 font-mono text-center text-xs border border-slate-800">
        &gt; Connection pending. Resolving active authorization profile context...
      </div>
    );
  }

  if (activeProfile.role !== 'Super Admin') {
    return null;
  }

  const [dbConfig, setDbConfig] = useState(() => {
    try {
      return getSupabaseConfig();
    } catch (e: any) {
      return {
        url: '',
        key: '',
        isConfigured: false,
        rawUrl: '',
        rawKey: '',
        error: e?.message || String(e)
      };
    }
  });
  const [membersCount, setMembersCount] = useState<number | null>(null);
  const [membersTestError, setMembersTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [tablesList, setTablesList] = useState<TablesStatus[]>([
    { name: 'members', count: null, status: 'checking', error: null },
    { name: 'profiles', count: null, status: 'checking', error: null },
    { name: 'departments', count: null, status: 'checking', error: null },
    { name: 'care_centers', count: null, status: 'checking', error: null },
    { name: 'satellite_churches', count: null, status: 'checking', error: null },
    { name: 'member_attendance', count: null, status: 'checking', error: null },
    { name: 'cmd_reports', count: null, status: 'checking', error: null }
  ]);
  const [activeTestQuery, setActiveTestQuery] = useState('SELECT COUNT(*) FROM members');
  const [fixAppliedState, setFixAppliedState] = useState<string | null>(null);

  // Input states for quick inline correction
  const [customUrl, setCustomUrl] = useState(dbConfig.rawUrl || '');
  const [customKey, setCustomKey] = useState(dbConfig.rawKey || '');

  // Extract project ref from URL (e.g. https://xyz.supabase.co -> xyz)
  const getProjectRef = (rawUrlUrl: string) => {
    try {
      const parsed = new URL(rawUrlUrl);
      const hosts = parsed.hostname.split('.');
      if (hosts.length > 0) return hosts[0];
    } catch {
      // Clean prefix manually if URL is partially malformed
      const match = rawUrlUrl.match(/https?:\/\/([^.]+)/);
      if (match && match[1]) return match[1];
    }
    return 'Unknown Project Ref';
  };

  const projectRef = dbConfig.url ? getProjectRef(dbConfig.url) : 'N/A';

  // JWT Payload Decoder Helper
  const decodeJwt = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  // --- DEEP VERIFICATION STATE DRIVERS ---
  const [isVerifyingDeepCon, setIsVerifyingDeepCon] = useState(false);
  const [deepVerifyError, setDeepVerifyError] = useState<string | null>(null);
  const [deepVerifySuccess, setDeepVerifySuccess] = useState<boolean | null>(null);
  
  const [limit5Rows, setLimit5Rows] = useState<any[]>([]);
  const [limit5Err, setLimit5Err] = useState<string | null>(null);
  const [limit5Status, setLimit5Status] = useState<number | string | null>(null);
  
  const [exactCount, setExactCount] = useState<number | null>(null);
  const [exactCountErr, setExactCountErr] = useState<string | null>(null);
  const [exactCountStatus, setExactCountStatus] = useState<number | string | null>(null);
  
  const [authUserInfo, setAuthUserInfo] = useState<{ id: string | null; email: string | null; role: string | null } | null>(null);
  const [activeUrlLog, setActiveUrlLog] = useState<string>('');
  const [keyTypeLog, setKeyTypeLog] = useState<'anon' | 'service_role' | 'unknown' | 'none'>('none');
  const [keyRoleValue, setKeyRoleValue] = useState<string | null>(null);
  const [rlsStatusFeedback, setRlsStatusFeedback] = useState<string>('Unknown');
  const [diagnosticsReasoning, setDiagnosticsReasoning] = useState<string>('');
  const [profileExistsStatus, setProfileExistsStatus] = useState<boolean | null>(null);

  const runDeepVerification = async () => {
    setIsVerifyingDeepCon(true);
    setDeepVerifyError(null);
    setLimit5Rows([]);
    setLimit5Err(null);
    setLimit5Status(null);
    setExactCount(null);
    setExactCountErr(null);
    setExactCountStatus(null);
    setProfileExistsStatus(null);
    
    console.log('=============== STARTING SUPABASE CONNECTION DEEP VERIFICATION ===============');

    const client = getSupabaseClient();
    const config = getSupabaseConfig();
    setActiveUrlLog(config.url || 'Not set');

    // 1. Detect Anon/Service Role Key
    let keyType: 'anon' | 'service_role' | 'unknown' | 'none' = 'none';
    let keyRole: string | null = null;
    if (config.key) {
      try {
        const payload = decodeJwt(config.key);
        if (payload) {
          keyRole = payload.role || null;
          if (payload.role === 'anon') {
            keyType = 'anon';
          } else if (payload.role === 'service_role') {
            keyType = 'service_role';
          } else {
            keyType = 'unknown';
          }
        } else {
          keyType = 'unknown';
        }
      } catch (e) {
        keyType = 'unknown';
      }
    }
    setKeyTypeLog(keyType);
    setKeyRoleValue(keyRole);
    console.log(`📡 URL used: ${config.url}`);
    console.log(`🥋 Key Type used: ${keyType} (role claim: ${keyRole || 'none'})`);

    if (!client) {
      setDeepVerifyError('Supabase is not configured.');
      setIsVerifyingDeepCon(false);
      setDeepVerifySuccess(false);
      return;
    }

    try {
      // 2. Fetch authenticated user sessions
      let authId: string | null = null;
      let authEmail: string | null = null;
      let authRole: string | null = null;

      try {
        const { data: { user }, error: authErr } = await client.auth.getUser();
        if (authErr) {
          console.error('[DEEP VERIFICATION] getUser error:', authErr);
        }
        if (user) {
          authId = user.id;
          authEmail = user.email || null;
          authRole = activeProfile?.role || 'Member';
          console.log('[DEEP VERIFICATION] Logged Authenticated User:', { id: authId, email: authEmail, role: authRole });
        }
      } catch (ae) {
        console.error('[DEEP VERIFICATION] Auth user exception:', ae);
      }
      setAuthUserInfo({ id: authId, email: authEmail, role: authRole });

      // 3. Execute: supabase.from('members').select('names').limit(5)
      console.log('[DEEP VERIFICATION] Querying 1: limit 5 names...');
      const { data: rows5, error: err5, status: stat5 } = await client
        .from('members')
        .select('names')
        .limit(5);

      setLimit5Status(stat5);
      if (err5) {
        console.error('[DEEP VERIFICATION] Query 1 Error:', err5);
        setLimit5Err(err5.message || JSON.stringify(err5));
      } else {
        console.log('[DEEP VERIFICATION] Query 1 Success:', rows5);
        setLimit5Rows(rows5 || []);
      }

      // 4. Execute: supabase.from('members').select('*', { count: 'exact', head: true })
      console.log('[DEEP VERIFICATION] Query 2: Exact Count (head: true)...');
      const { count: exactCountVal, error: countErr, status: countStat } = await client
        .from('members')
        .select('*', { count: 'exact', head: true });

      setExactCountStatus(countStat);
      if (countErr) {
        console.error('[DEEP VERIFICATION] Query 2 Error:', countErr);
        setExactCountErr(countErr.message || JSON.stringify(countErr));
      } else {
        console.log('[DEEP VERIFICATION] Query 2 Success count:', exactCountVal);
        setExactCount(exactCountVal);
      }

      // 5. Verify RLS
      console.log('[DEEP VERIFICATION] Evaluating RLS policy states...');
      
      // Let's check if profiles table row exists for this authenticated user
      let profileRowExistsInDB = false;
      let profileRowInDB: any = null;
      if (authId) {
        const { data: pData } = await client
          .from('profiles')
          .select('*')
          .eq('id', authId)
          .maybeSingle();
        if (pData) {
          profileRowExistsInDB = true;
          profileRowInDB = pData;
        }
      }
      setProfileExistsStatus(profileRowExistsInDB);

      // Diagnose discrepancies
      const countIsZero = exactCountVal === 0 || exactCountVal === null;

      let diagnosticsText = '';
      let rlsFeedback = '';

      if (!profileRowExistsInDB && authId) {
        rlsFeedback = '⚠️ MISCONFIGURED (MISSING PROFILE ROW)';
        diagnosticsText = `The authenticated email "${authEmail}" does not have an active matching row in the public "profiles" table. Currently, the RLS policy on the "members" table utilizes subqueries like "(select role from public.profiles where id = auth.uid())" to check permission constraints. Since this subquery evaluates to empty (NULL) due to the missing profile row, all SELECT queries return 0 records even if the live table has 3,564 records.`;
      } else if (profileRowExistsInDB && countIsZero) {
        rlsFeedback = `🔒 RESTRICTED BY RLS (Active Role: ${profileRowInDB?.role || 'None'})`;
        diagnosticsText = `A profile row exists with role "${profileRowInDB?.role || 'Member'}", but Row-Level Security on public.members denies or restricts select rights for this role. Only Super Admin, Senior Pastor, Church Administrator, and authorized operational staff can access the directory rows.`;
      } else if (exactCountVal !== null && exactCountVal > 0) {
        rlsFeedback = '✅ PROPERLY CONFIGURED & ACTIVE';
        diagnosticsText = `Verification successful. RLS allows read transactions, matching the expected multi-record database scope directory.`;
      } else {
        rlsFeedback = '⚠️ CONNECTION OR CONFIGURATION GAP';
        diagnosticsText = `Unable to establish handshakes. Verify if the key configured is the standard Client Anon Key and that the database schemas are deployed in default public namespace schemes.`;
      }

      setRlsStatusFeedback(rlsFeedback);
      setDiagnosticsReasoning(diagnosticsText);
      setDeepVerifySuccess(true);

    } catch (gErr: any) {
      console.error('[DEEP VERIFICATION EXCEPTION]', gErr);
      setDeepVerifyError(gErr?.message || JSON.stringify(gErr));
      setDeepVerifySuccess(false);
    } finally {
      setIsVerifyingDeepCon(false);
      console.log('=============== COMPLETED SUPABASE CONNECTION DEEP VERIFICATION ===============');
    }
  };

  const handleCreateAdminProfile = async () => {
    setIsRunningTest(true);
    const client = getSupabaseClient();
    if (!client || !authUserInfo?.id) {
      alert("Unable to create profile: Client or Authenticated User session is missing.");
      setIsRunningTest(false);
      return;
    }
    
    try {
      const { error } = await client
        .from('profiles')
        .upsert({
          id: authUserInfo.id,
          email: authUserInfo.email || 'dcapapa.admdept@gmail.com',
          full_name: 'Admin Auditor',
          role: 'Super Admin',
          created_at: new Date().toISOString()
        });
        
      if (error) {
        alert(`Profile creation failed: ${error.message}`);
      } else {
        alert(`Success! Profile row inserted as Super Admin. Re-running diagnostics...`);
        await runDeepVerification();
        await runConnectionDiagnostics();
        onRefreshAll(); // Reload global state
      }
    } catch (err: any) {
      alert(`Exception during insertion: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsRunningTest(false);
    }
  };

  const runConnectionDiagnostics = async () => {
    setIsRunningTest(true);
    setMembersTestError(null);
    setTestSuccess(null);

    const client = getSupabaseClient();
    if (!client) {
      setMembersTestError('Supabase is not configured yet. Fallback local simulated databases active.');
      setTestSuccess(false);
      setIsRunningTest(false);
      // Set all tables status to simulated fallback
      setTablesList(prev => prev.map(t => ({ ...t, status: 'restricted', count: 0, error: 'Offline simulator mode' })));
      return;
    }

    // Run connection test: SELECT COUNT(*) FROM members (Requirement 10)
    try {
      console.log('[DIAGNOSTIC CRON] Triggering SELECT COUNT(*) FROM members live audit transaction...');
      const { count, error, data } = await client
        .from('members')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw error;
      }
      
      setMembersCount(count);
      setTestSuccess(true);
      setMembersTestError(null);
    } catch (err: any) {
      console.error('[DIAGNOSTIC ERROR] SELECT count(*) from members failed:', err);
      setMembersTestError(err?.message || err?.details || JSON.stringify(err) || 'CORS or Table Schema Mismatch');
      setTestSuccess(false);
    }

    // Ping check all individual tables to construct the verification matrix
    const updatedTables: TablesStatus[] = [];
    for (const table of tablesList) {
      try {
        const { count, error } = await client
          .from(table.name)
          .select('*', { count: 'exact', head: true });

        if (error) {
          // If error is code 42P01 (relation does not exist), table is missing
          const statusVal = error.code === '42P01' || error.message?.includes('does not exist') ? 'missing' : 'restricted';
          updatedTables.push({
            name: table.name,
            count: null,
            status: statusVal,
            error: `${error.message || 'Access restricted'}`
          });
        } else {
          updatedTables.push({
            name: table.name,
            count: count ?? 0,
            status: 'online',
            error: null
          });
        }
      } catch (err: any) {
        updatedTables.push({
          name: table.name,
          count: null,
          status: 'restricted',
          error: err?.message || 'CORS network block'
        });
      }
    }
    setTablesList(updatedTables);
    setIsRunningTest(false);
  };

  useEffect(() => {
    runConnectionDiagnostics();
    runDeepVerification();
  }, [dbConfig]);

  // Handle inline reconnection parameters fix (Requirement 12)
  const handleFixAndReconnect = (e: React.FormEvent) => {
    e.preventDefault();
    let sanitizedUrl = customUrl.trim();
    let sanitizedKey = customKey.trim();

    if (!sanitizedUrl || !sanitizedKey) {
      alert('Please output correct URL and anon auth keys first.');
      return;
    }

    // Log the fixing action
    console.log('[AUDIT HANDSHAKE CORRECTION] Raw parameters to fix:', {
      url: sanitizedUrl,
      key: sanitizedKey
    });

    // Cleanup routines
    while (sanitizedUrl.endsWith('/')) {
      sanitizedUrl = sanitizedUrl.slice(0, -1);
    }
    if (sanitizedUrl.toLowerCase().endsWith('/rest/v1')) {
      sanitizedUrl = sanitizedUrl.slice(0, -8);
    }
    while (sanitizedUrl.endsWith('/')) {
      sanitizedUrl = sanitizedUrl.slice(0, -1);
    }

    saveSupabaseConfig(sanitizedUrl, sanitizedKey);
    setDbConfig(getSupabaseConfig());
    setFixAppliedState(`Successfully sanitized and re-configured! App reconnecting directly to ${sanitizedUrl}`);
    setTimeout(() => {
      setFixAppliedState(null);
      // Trigger universal reload
      onRefreshAll();
    }, 2000);
  };

  const handleApplyAutoCleanEnv = () => {
    // If the configured raw values are already in the database config, let's clean them automatically!
    if (!dbConfig.isConfigured) {
      alert('No credentials configured yet to auto-sanitize.');
      return;
    }

    let cleanUrl = dbConfig.rawUrl || '';
    let cleanKey = dbConfig.rawKey || '';

    // Strip trailing slashes and duplicates
    while (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    if (cleanUrl.toLowerCase().endsWith('/rest/v1')) {
      cleanUrl = cleanUrl.slice(0, -8);
    }
    while (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    saveSupabaseConfig(cleanUrl, cleanKey);
    setDbConfig(getSupabaseConfig());
    setCustomUrl(cleanUrl);
    setCustomKey(cleanKey);
    setFixAppliedState('Auto-reconnected! Malformed paths such as appended /rest/v1 have been striped.');
    setTimeout(() => {
      setFixAppliedState(null);
      onRefreshAll();
    }, 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Core Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-450 rounded-lg shrink-0">
            <Heart className={`w-6 h-6 text-indigo-400 ${testSuccess ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider font-mono">
              Live Cloud Connection Health Check
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Comprehensive transaction audits & schema diagnostic panels for DCCMS Apapa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDbConfig(getSupabaseConfig());
              runConnectionDiagnostics();
            }}
            disabled={isRunningTest}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-white bg-slate-800 hover:bg-slate-750 transition border border-slate-700/80 rounded"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningTest ? 'animate-spin' : ''}`} />
            RE-RUN DIAGNOSTICS
          </button>

          <span className={`px-3 py-1 rounded text-[10px] font-mono font-black tracking-widest ${
            testSuccess === true
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : testSuccess === false
              ? 'bg-rose-500/10 text-rose-450 text-rose-400 border border-rose-500/25'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {testSuccess === true ? '● SYSTEM HEALTHY' : testSuccess === false ? '● CONNECTION ERROR' : '● RETRIEVING DIAGNOSTICS'}
          </span>
        </div>
      </div>

      {/* Connection Fixed Visual Toast Alert if active */}
      {fixAppliedState && (
        <div className="bg-emerald-900/40 border border-emerald-500/30 text-emerald-200 p-4 rounded-xl text-xs flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{fixAppliedState}</span>
        </div>
      )}

      {/* DEEP CONNECTION VERIFICATION PANEL (Meets All User Request Criteria 1-10) */}
      <div className="bg-[#0f172a] text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider font-mono">
                Supabase Connection Deep Verification
              </h2>
              <p className="text-[10.5px] text-slate-400/95 mt-0.5 font-sans font-medium">
                Comprehensive RLS policies checklist, exact counting aggregations, and limit queries
              </p>
            </div>
          </div>
          <button
            onClick={runDeepVerification}
            disabled={isVerifyingDeepCon}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10.1px] font-black text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/30 transition rounded font-mono uppercase tracking-widest cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingDeepCon ? 'animate-spin' : ''}`} />
            Re-run Deep Tests
          </button>
        </div>

        {isVerifyingDeepCon ? (
          <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-850/60 flex flex-col items-center justify-center space-y-2 font-mono">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent animate-spin rounded-full" />
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">Executing deep verification transactions...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Stats Overview Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Exact Count KPI */}
              <div className="bg-slate-900/70 p-4 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-slate-500 font-black block uppercase tracking-widest">Query 2: exact head count (*)</span>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-3xl font-black font-mono text-white">
                    {exactCount !== null ? exactCount : '0'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">rows (head count)</span>
                </div>
                <div className="text-[9.5px] font-mono text-slate-400 pt-1 border-t border-slate-850/50 flex justify-between items-center">
                  <span>Expected: <strong className="text-indigo-400 font-bold">3,564</strong></span>
                  <span className={exactCount === 3564 ? "text-emerald-400 bg-emerald-500/10 px-1 rounded font-bold" : "text-amber-400 bg-amber-500/10 px-1 rounded font-bold"}>
                    {exactCount === 3564 ? "MATCH" : "MISMATCH"}
                  </span>
                </div>
                {exactCountErr && (
                  <span className="text-[9.5px] text-rose-450 text-rose-400 font-mono block mt-1">Err: {exactCountErr}</span>
                )}
              </div>

              {/* Limit 5 returned row status */}
              <div className="bg-slate-900/70 p-4 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-slate-500 font-black block uppercase tracking-widest">Query 1: limit 5 names</span>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-3xl font-black font-mono text-white">
                    {limit5Rows.length}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">rows returned</span>
                </div>
                <div className="text-[9.5px] font-mono text-slate-400 pt-1 border-t border-slate-850/50 flex justify-between items-center">
                  <span>HTTP Status payload code:</span>
                  <span className="text-indigo-300 font-bold text-[10px] bg-slate-800/50 px-1.5 py-0.5 rounded">
                    {limit5Status !== null ? limit5Status : '400 / Offline'}
                  </span>
                </div>
                {limit5Err && (
                  <span className="text-[9.5px] text-rose-455 text-rose-400 font-mono block mt-1">Err: {limit5Err}</span>
                )}
              </div>

              {/* RLS Safety Policy Status Badge */}
              <div className="bg-slate-900/70 p-4 border border-slate-800/80 rounded-xl space-y-1 lg:col-span-1 md:col-span-2">
                <span className="text-[10px] font-mono text-slate-500 font-black block uppercase tracking-widest">Row-Level Safety (RLS) Status</span>
                <div className="pt-2">
                  <span className={`inline-block text-[10px] font-mono font-black py-1 px-2.5 rounded ${
                    exactCount === 3564
                      ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/25'
                      : 'bg-rose-500/10 text-rose-455 text-rose-450 border border-rose-500/25'
                  }`}>
                    {rlsStatusFeedback}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 font-mono pt-1.5 flex justify-between items-center">
                  <span>Profiles entry status in database:</span>
                  <span className={`font-bold ${profileExistsStatus ? "text-emerald-400" : "text-rose-400 animate-pulse"}`}>
                    {profileExistsStatus === true ? '✔ FOUND IN DB' : profileExistsStatus === false ? '❌ MISSING IN DB' : 'UNCHECKED'}
                  </span>
                </div>
              </div>

            </div>

            {/* List 5 Names rows (Requirement 1 & 2) */}
            <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl space-y-2 font-mono text-xs">
              <span className="text-[10px] text-indigo-400/90 font-black tracking-wider uppercase block">Limit 5 returned member names</span>
              {limit5Rows.length === 0 ? (
                <div className="p-4 rounded bg-slate-900/80 border border-slate-850/60 text-slate-400 italic text-center text-[11px] font-medium">
                  Query returned 0 rows. (Row Level Security or missing profile row restricts SELECT privileges)
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1.5">
                  {limit5Rows.map((m, idx) => (
                    <div key={idx} className="bg-slate-900/95 p-3 rounded-lg border border-slate-800 flex items-center gap-2">
                      <span className="text-[10.5px] font-black text-indigo-400 bg-indigo-500/10 w-5 h-5 rounded-full flex items-center justify-center text-center">{idx + 1}</span>
                      <span className="font-semibold text-slate-200 text-[10.5px] truncate" title={m.names}>{m.names || 'Anonymous'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Diagnostics details tab (Requirement 11) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs font-mono">
              
              {/* Query pipeline specifications logs (Requirements 5,6,7) */}
              <div className="lg:col-span-5 bg-slate-900/75 p-5 border border-slate-800/80 rounded-xl space-y-3.5">
                <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase block border-b border-slate-800 pb-1.5 select-none text-left">
                  Verification Audit Parameters Log
                </span>
                
                <div className="space-y-3 text-left">
                  {/* Endpoint URL accessed */}
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Connected Supabase url target (Requirement 6)</span>
                    <span className="text-[10.5px] text-slate-200 block break-all font-semibold font-mono selection:bg-indigo-950">{activeUrlLog}</span>
                  </div>

                  {/* Auth User identity */}
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Logged authenticated user (Requirement 5)</span>
                    {authUserInfo?.id ? (
                      <div className="space-y-0.5 mt-0.5 bg-slate-950 p-2.5 rounded border border-slate-850">
                        <p className="text-[10px] text-slate-400 font-semibold leading-normal"><span className="text-slate-500 font-medium">ID:</span> <code className="text-indigo-300 font-medium font-mono font-bold select-all">{authUserInfo.id}</code></p>
                        <p className="text-[10.5px] text-slate-200 font-semibold"><span className="text-slate-500 font-medium font-sans">Email:</span> <code className="font-bold select-all font-mono">{authUserInfo.email}</code></p>
                        <p className="text-[10px] text-slate-400 font-semibold font-sans mt-0.5"><span className="text-slate-500 font-medium">Role contexts:</span> <span className="bg-amber-500/10 text-amber-400 font-mono font-black uppercase text-[8.5px] tracking-widest leading-none px-1.5 py-0.5 rounded">{authUserInfo.role}</span></p>
                      </div>
                    ) : (
                      <span className="text-orange-400 font-bold block mt-0.5">&gt; No active auth session (Executing under public anonymous profile claims)</span>
                    )}
                  </div>

                  {/* Auth Key tier */}
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Active Auth Key type & permissions tier (Requirement 7)</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-block px-2 py-0.5 font-bold tracking-widest uppercase text-[9px] rounded font-mono ${
                        keyTypeLog === 'anon'
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                          : keyTypeLog === 'service_role'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 animate-pulse'
                          : 'bg-slate-700 text-slate-350'
                      }`}>
                        {keyTypeLog === 'anon' ? 'ANONYMOUS CLIENT KEY (standard browser)' : keyTypeLog === 'service_role' ? 'SUPABASE OVERRIDING SERVICE KEY (bypass)' : 'OFFLINE MODE'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting analysis details & automatic recovery triggers (Requirement 10) */}
              <div className="lg:col-span-7 bg-slate-900/75 p-5 border border-slate-800/80 rounded-xl space-y-3 flex flex-col justify-between text-left">
                <div>
                  <span className="text-[10px] text-rose-455 text-rose-400 font-black tracking-wider uppercase block border-b border-slate-800 pb-1.5 select-none">
                    Connection Discrepancy Diagnostics (Requirement 10)
                  </span>
                  
                  <div className="mt-3.5 space-y-2.5 font-sans leading-relaxed text-slate-300 font-medium font-sans">
                    <p className="font-extrabold text-slate-200">
                      Why does directory query return 0 records when the live database holds 3,564?
                    </p>
                    <p className="text-[11px] text-slate-450 text-slate-400 leading-normal font-sans font-semibold">
                      {diagnosticsReasoning || 'Establishing query check diagnostics. Run verification diagnostics first.'}
                    </p>
                  </div>
                </div>

                {/* If discrepancy triggers help layout, show the quick creator button */}
                {authUserInfo?.id && !profileExistsStatus && (
                  <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-3.5 mt-2">
                    <span className="text-[10px] text-amber-500 block uppercase font-mono tracking-widest font-black text-left">
                      🎯 ONE-CLICK SECURITY RESOLUTION (DATABASE COHERENCE REPAIR)
                    </span>
                    <p className="text-[10.5px] font-sans text-slate-400 leading-relaxed font-semibold">
                      Your profile row does not exist in the public "profiles" schema. Click the button below to dynamically insert a custom Admin profile row into your live database. RLS will immediately detect this row and authorize members access!
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateAdminProfile}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg uppercase tracking-wider text-[10px] font-mono cursor-pointer transition shadow-xl"
                    >
                      Insert Missing Profile Row & Fix Dashboard Count Now
                    </button>
                  </div>
                )}

                {/* SQL statement reference for manual deployment (Requirement 10) */}
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-850 mt-4 space-y-1">
                  <span className="text-[8.5px] text-slate-500 font-bold tracking-widest font-mono uppercase block">Raw Postgres DDL migration script fixing profiles</span>
                  <code className="text-[9px] text-[#818cf8] font-mono leading-normal block break-all whitespace-pre selection:bg-indigo-900 font-semibold select-all">
{`INSERT INTO public.profiles (id, email, full_name, role, created_at)
VALUES (
  '${authUserInfo?.id || 'YOUR_AUTH_USER_ID_SHOWN_LEFT'}',
  'dcapapa.admdept@gmail.com',
  'Admin Auditor',
  'Super Admin',
  NOW()
) ON CONFLICT (id) DO UPDATE SET role = 'Super Admin';`}
                  </code>
                </div>

              </div>

            </div>
          </div>
        )}
      </div>

      {/* Main Connection Properties Cards (Requirement 11 points) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Settings Audit */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4 lg:col-span-2">
          <span className="text-xs font-extrabold text-slate-900 block flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Server className="w-4.5 h-4.5 text-blue-600" /> Active Endpoint Configuration
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Connected Project URL */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Connected Project URL (Requirement 11)</span>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 font-mono text-[10.5px] text-slate-800 break-all select-all font-semibold">
                {dbConfig.url || 'Not Set'}
              </div>
            </div>

            {/* Project ID / Reference */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Project Reference ID</span>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 font-mono text-[10.5px] text-slate-800 break-all font-semibold uppercase">
                {projectRef}
              </div>
            </div>

            {/* Target Database Schema */}
            <div className="space-y-1 col-span-1 sm:col-span-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Connected Schema</span>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="font-mono text-indigo-600 text-[10.5px]">postgrest.public</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Default REST Layer</span>
              </div>
            </div>

            {/* Authenticated Application User context */}
            <div className="space-y-1 col-span-1 sm:col-span-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Authenticated Profile / Role (Requirement 11)</span>
              <div className="bg-slate-50 p-3 rounded border border-slate-100 flex items-start justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-slate-800 block">{activeProfile.full_name || 'Admin Auditor'}</span>
                  <p className="text-[10.5px] text-slate-400 font-semibold">{activeProfile.email || 'dcapapa.admdept@gmail.com'}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-amber-50 text-amber-800 font-black px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">
                    {activeProfile.role}
                  </span>
                  <span className="block text-[8.5px] font-mono text-slate-400 mt-1 uppercase font-bold">active role scope</span>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Connection Warnings / Auto Fixer Advice */}
          {dbConfig.rawUrl && dbConfig.rawUrl.toLowerCase().includes('/rest/v1') && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs text-rose-950 space-y-2">
              <span className="font-black text-rose-900 block flex items-center gap-1.5 uppercase tracking-widest font-mono text-[10px]">
                <AlertOctagon className="w-4 h-4 text-rose-600 animate-bounce" /> Corrective Action Needed
              </span>
              <p className="font-semibold text-rose-800">
                The configured URL contains <code className="bg-rose-100 px-1 rounded text-rose-900">/rest/v1</code> at the end. This will trigger the <code className="bg-rose-100 px-1 text-rose-900 font-bold">"Invalid path specified in request URL"</code> error.
              </p>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleApplyAutoCleanEnv}
                  className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-3 rounded text-[10.5px] uppercase font-mono"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Auto-Sanitize URL Now
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Members Count KPI Widget (Requirement 11 & 10) */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-900 shadow-md text-white flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-black block">Live Members Record Count</span>
            <span className="text-slate-400 text-[11px] block leading-snug">
              Result from live query on the active public database table
            </span>
          </div>

          <div className="py-2">
            {isRunningTest ? (
              <div className="flex items-baseline gap-2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full" />
                <span className="text-xs text-slate-450 font-mono">Querying...</span>
              </div>
            ) : testSuccess === true ? (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black font-mono tracking-tight text-white">
                  {membersCount !== null ? membersCount : '0'}
                </span>
                <span className="text-xs font-mono text-slate-400 font-bold uppercase">Members (Row Count)</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="text-xl font-bold font-mono text-rose-400">UNAVAILABLE</span>
                <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                  Connection offline or RLS blocking anonymous read transactions.
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-850 space-y-1">
            <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">Query Protocol (Requirement 1)</span>
            <code className="text-[9.5px] font-mono text-indigo-300 break-all leading-normal block">
              supabase.from('members').select('*')
            </code>
          </div>
        </div>

      </div>

      {/* SQL TRANSACTION PLAYGROUND PANEL (Requirement 10) */}
      <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-xs space-y-4">
        <div className="border-b border-slate-50 pb-2">
          <span className="text-xs font-extrabold text-slate-900 block flex items-center gap-1.5">
            <Activity className="w-4.5 h-4.5 text-indigo-600" /> Database Connection Test (Requirement 10)
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">Simulate and trace a raw aggregation execution sequence directly against your live database endpoints.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Query Settings Input */}
          <div className="space-y-3.5 lg:col-span-1">
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 block">Command Statement</label>
              <input
                type="text"
                readOnly
                value={activeTestQuery}
                className="w-full bg-slate-50 p-2 border border-slate-200 text-xs rounded-lg font-mono text-indigo-800 font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 block flex items-center gap-1">
                Target Endpoint Trace
              </label>
              <div className="bg-slate-950 p-2.5 rounded font-mono text-[9px] text-slate-300 space-y-1 overflow-x-auto">
                <p className="text-yellow-400">GET {dbConfig.url ? `${dbConfig.url}/rest/v1/members?select=id` : 'N/A'}</p>
                <p className="text-slate-500">// Content-Type: application/json</p>
              </div>
            </div>

            <button
              onClick={runConnectionDiagnostics}
              disabled={isRunningTest}
              className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 font-mono font-bold text-xs text-white uppercase tracking-widest flex items-center justify-center gap-2 rounded-lg cursor-pointer transition shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              Run Query Transaction
            </button>
          </div>

          {/* Test Results Output Screen */}
          <div className="lg:col-span-2 bg-slate-900 rounded-xl p-4.5 text-white flex flex-col justify-between space-y-3 font-mono">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">CONSOLE PIPELINE TRANSACTION RECEPTOR</span>
                <span className={`h-2.5 w-2.5 rounded-full ${testSuccess === true ? 'bg-emerald-500 animate-pulse' : testSuccess === false ? 'bg-rose-500' : 'bg-slate-600'}`} />
              </div>

              {/* Console Logs */}
              <div className="text-[10px] mt-3 space-y-1 overflow-y-auto max-h-48 selection:bg-indigo-900 select-all leading-relaxed font-semibold">
                <p className="text-slate-500">[{new Date().toISOString()}] Initializing audit pipeline request...</p>
                <p className="text-slate-300">&gt; Looking up dynamic profile constraints: "{activeProfile.role}"</p>
                {dbConfig.isConfigured ? (
                  <>
                    <p className="text-indigo-400">&gt; Dialing real API server: {dbConfig.url}</p>
                    <p className="text-indigo-300">&gt; Target transaction query payload: SELECT COUNT(*) FROM members;</p>
                    {isRunningTest ? (
                      <p className="text-amber-400 animate-pulse">&gt; Transmitting payload packet over secure channel...</p>
                    ) : testSuccess === true ? (
                      <>
                        <p className="text-emerald-400 font-bold">&gt; RESPONSE RECEIVED (200 OK)</p>
                        <p className="text-slate-300">&gt; Returned row count payload: {membersCount}</p>
                        <p className="text-slate-400">&gt; Live connection successfully verified. Client pipeline active.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-rose-400 font-bold">&gt; TRANSMISSION FAULT (ERROR CONNECTION FAILED)</p>
                        <p className="text-rose-350 text-rose-300 font-semibold">&gt; Details: {membersTestError || 'Unknown handshake server timeout or invalid domain resolution'}</p>
                        <p className="text-slate-400">&gt; Advice: Strip trailing slashes or /rest/v1 suffixes from the URL config. Run RLS validation policies script.</p>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-rose-500">&gt; Supabase Database is not configured.</p>
                    <p className="text-slate-450 text-slate-400">&gt; Please verify and set the environment URL and Anon Key.</p>
                  </>
                )}
              </div>
            </div>

            <div className="text-[8.5px] text-slate-500 pt-2 border-t border-slate-800 flex items-center justify-between">
              <span>Status: {testSuccess === true ? 'Healthy' : 'Fault Trace Active'}</span>
              <span>Lagos Church Administration Core v1.2</span>
            </div>
          </div>
        </div>
      </div>

      {/* STARTUP TRACE AUDIT LOGGER TABLE (Requirement 1 & 2) */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-slate-900 block flex items-center gap-1.5">
              <Activity className="w-4.5 h-4.5 text-indigo-500" /> Startup Query Performance Audit Trace (Requirements 1, 2, 3)
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Trace diagnostic details of every database request dispatched during initialization with active timeout safety.</p>
          </div>
          <span className="text-[9.5px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold uppercase">Time Limit: 10.0s</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-extrabold text-[10px] font-mono border-b border-slate-100 select-none uppercase tracking-wider">
                <th className="p-3">Query Name</th>
                <th className="p-3">Target Table</th>
                <th className="p-3">Execution Time</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Error / Diagnostics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {startupTraces.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400 font-medium italic">
                    No startup query logs generated yet. Trigger Re-run Diagnostics to trace live parameters.
                  </td>
                </tr>
              ) : (
                startupTraces.map((trace) => (
                  <tr key={trace.queryName} className="hover:bg-slate-50/50 transition">
                    <td className="p-3 font-semibold text-slate-800">{trace.queryName}</td>
                    <td className="p-3"><code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-mono">{trace.tableName}</code></td>
                    <td className="p-3 font-mono text-[11px] text-slate-600 font-semibold">
                      {trace.durationMs !== null ? `${trace.durationMs}ms` : '--'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest ${
                        trace.status === 'SUCCESS' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : trace.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                          : trace.status === 'TIMEOUT'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {trace.status}
                      </span>
                    </td>
                    <td className="p-3 text-[10px] font-mono text-slate-500 max-w-sm truncate select-all" title={trace.errorMessage || ''}>
                      {trace.errorMessage || <span className="text-emerald-500 font-bold">✔ No errors</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED TABLES INTEGRITY CHECK MATRIX (Requirement 5) */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
        <span className="text-xs font-extrabold text-slate-900 block flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Database className="w-4.5 h-4.5 text-blue-600" /> Discovered Table Statistics & RLS Scrutiny
        </span>

        <p className="text-[11px] text-slate-500 leading-normal">
          The table below demonstrates the live scanning of the database to guarantee that all ECCLESIASTICAL schema models exist and can pass query transaction audits for the current active user role context.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tablesList.map((tab) => (
            <div key={tab.name} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5 select-none relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-1.5">
                <span className="font-mono text-xs font-bold text-slate-900 truncate">
                  {tab.name}
                </span>

                <span className={`h-2.5 w-2.5 rounded-full ${
                  tab.status === 'online'
                    ? 'bg-emerald-500'
                    : tab.status === 'restricted'
                    ? 'bg-amber-400'
                    : tab.status === 'missing'
                    ? 'bg-rose-500'
                    : 'bg-slate-300 animate-pulse'
                }`} />
              </div>

              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400 font-semibold">Row count:</span>
                <span className="font-mono font-bold text-slate-800">
                  {tab.status === 'online' ? tab.count : 'Unavailable'}
                </span>
              </div>

              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-slate-400 font-semibold font-sans">Policy State</span>
                <span className={`font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                  tab.status === 'online'
                    ? 'bg-emerald-50/80 text-emerald-800'
                    : tab.status === 'restricted'
                    ? 'bg-amber-50/80 text-amber-800'
                    : 'bg-rose-50/80 text-rose-800'
                }`}>
                  {tab.status === 'online'
                    ? 'RLS ALLOWING SELECT'
                    : tab.status === 'restricted'
                    ? 'RLS DENY / RESTRICT'
                    : 'TABLE DOES NOT EXIST'}
                </span>
              </div>

              {tab.error && (
                <div className="bg-slate-100 p-1.5 rounded text-[8.5px] font-mono text-slate-500 line-clamp-2 leading-relaxed border border-slate-200/50">
                  Ref: {tab.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* QUICK ENVIRONMENT OVERRIDE & DISCOVERY PANEL (Requirement 12) */}
      <div className="bg-white p-5 rounded-xl border border-rose-100 hover:border-indigo-150 transition-colors shadow-xs space-y-4">
        
        <div className="border-b border-slate-50 pb-2">
          <span className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
            <Wrench className="w-4.5 h-4.5 text-rose-500" /> Manual Credentials Correction & Re-test (Requirement 12)
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">Use the credential inputs below to instantly clean and reconfigure malformed environment endpoint variables.</p>
        </div>

        <form onSubmit={handleFixAndReconnect} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-700 block">Supabase Project URL</label>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://yourprojectid.supabase.co"
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <span className="text-[9px] text-slate-400 block font-semibold leading-normal">
                Avoid appending <code className="font-semibold text-rose-600 bg-rose-50 px-1 rounded">/rest/v1</code> or trailing slashes. Our sanitization routine corrects these automatically but keeping them clean prevents connection gaps!
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-700 block">Supabase Anon Key</label>
              <textarea
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX..."
                rows={3}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
              />
            </div>

          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-semibold">
            <button
              type="button"
              onClick={handleApplyAutoCleanEnv}
              className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg font-mono font-bold uppercase text-[10px] cursor-pointer flex items-center gap-1"
            >
              <Wrench className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              Auto-fix active credentials
            </button>

            <div className="flex gap-2">
              {dbConfig.isConfigured && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to disconnect and clear Supabase credentials?')) {
                      resetSupabaseConfig();
                      setDbConfig(getSupabaseConfig());
                      setCustomUrl('');
                      setCustomKey('');
                      onRefreshAll();
                    }
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-mono text-[10px] font-bold uppercase cursor-pointer"
                >
                  Disconnect From Cloud
                </button>
              )}

              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 rounded-lg font-mono text-[10px] font-black uppercase tracking-wider cursor-pointer"
              >
                APPLY & RECONNECT
              </button>
            </div>
          </div>
        </form>

      </div>

    </div>
  );
}
