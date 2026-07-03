import React from 'react';
import { Terminal, Shield, CheckCircle, AlertOctagon } from 'lucide-react';
import { getSupabaseConfig } from '../supabaseClient';

interface DiagnosticsPanelProps {
  tableName: string;
  rowsInDb: number | string;
  rowsLoaded: number;
  lastQueryTime: string; // duration like '24ms' or timestamp
  lastError: string | null;
  currentUserRole: string;
  currentUserEmail: string;
}

export default function DiagnosticsPanel({
  tableName,
  rowsInDb,
  rowsLoaded,
  lastQueryTime,
  lastError,
  currentUserRole,
  currentUserEmail
}: DiagnosticsPanelProps) {
  if (currentUserRole !== 'Super Admin') {
    return null;
  }

  const { isConfigured } = getSupabaseConfig();

  // Detect RLS blocked / Permission denied errors specifically
  const isRlsBlock = lastError?.toLowerCase().includes('permission denied') || 
                      lastError?.toLowerCase().includes('policy') || 
                      lastError?.toLowerCase().includes('rls') ||
                      lastError?.toLowerCase().includes('42501') ||
                      lastError?.toLowerCase().includes('violates row-level security');

  const displayError = isRlsBlock ? 'RLS Policy Blocking Access' : lastError;

  return (
    <div className="bg-slate-900 border border-slate-950 rounded-xl p-5 text-white space-y-4 shadow-md font-sans mt-6" id={`diagnostics-${tableName}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-950 border border-indigo-800 rounded-lg">
            <Terminal className="w-5 h-5 text-indigo-400 shrink-0" />
          </div>
          <div>
            <span className="text-xs font-extrabold text-white block tracking-wider uppercase">Live Database Diagnostics Panel</span>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Automated RLS schema checker & query state auditor for {tableName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-300 font-medium">Connection:</span>
          <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-widest ${isConfigured ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
            {isConfigured ? 'Live Supabase' : 'Not Connected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-xs font-mono">
        {/* Row 1: Table Name */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-indigo-400 font-extrabold uppercase block tracking-wider">Table Name</span>
          <span className="font-bold text-indigo-200 block truncate" title={tableName}>
            {tableName}
          </span>
        </div>

        {/* Row 2: Rows in Database */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-indigo-400 font-extrabold uppercase block tracking-wider">Rows in DB</span>
          <span className="font-bold text-white block">
            {rowsInDb}
          </span>
        </div>

        {/* Row 3: Rows Loaded */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-indigo-400 font-extrabold uppercase block tracking-wider">Rows Loaded</span>
          <span className="font-bold text-emerald-400 block">
            {rowsLoaded}
          </span>
        </div>

        {/* Row 4: Last Query Time */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-indigo-400 font-extrabold uppercase block tracking-wider">Query Latency</span>
          <span className="font-bold text-yellow-400 block">
            {lastQueryTime}
          </span>
        </div>

        {/* Row 5: Current User Role */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-indigo-400 font-extrabold uppercase block tracking-wider">Worker Role</span>
          <span className="font-bold text-slate-200 block truncate" title={currentUserRole}>
            {currentUserRole}
          </span>
        </div>

        {/* Row 6: Current User Email */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-indigo-400 font-extrabold uppercase block tracking-wider">Worker Email</span>
          <span className="font-bold text-slate-300 block truncate text-[11px]" title={currentUserEmail}>
            {currentUserEmail}
          </span>
        </div>

        {/* Row 7: RLS & Policy Status / Last Error */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1 col-span-1 sm:col-span-2 md:col-span-1">
          <span className="text-[10px] text-indigo-400 font-extrabold uppercase block tracking-wider">Policy Checks</span>
          {displayError ? (
            <span className="text-rose-400 font-bold block text-[10px] leading-tight select-all truncate" title={displayError}>
              {displayError === 'RLS Policy Blocking Access' ? (
                <span className="flex items-center gap-1 text-rose-400">
                  <AlertOctagon className="w-3.5 h-3.5" /> Denied
                </span>
              ) : 'Denied'}
            </span>
          ) : (
            <span className="text-emerald-400 font-bold block text-[10px] leading-tight flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Permitted
            </span>
          )}
        </div>
      </div>

      {lastError && (
        <div className="bg-rose-950/30 border border-rose-900/50 p-3 rounded-lg flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider block font-semibold">Active Intercept Warning</span>
            <p className="text-[10px] text-white font-mono break-all leading-normal select-all">
              {displayError}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
