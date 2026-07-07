import React, { useState } from 'react';
import { Profile } from '../types';
import { User, Mail, Shield, Smartphone, Heart, Bookmark, Database, Check, AlertCircle, MapPin } from 'lucide-react';
import { api, getSupabaseConfig } from '../supabaseClient';

interface ProfileViewProps {
  activeProfile: Profile;
  onRefresh: () => void;
}

export default function ProfileView({ activeProfile, onRefresh }: ProfileViewProps) {
  const [fullName, setFullName] = useState(activeProfile.full_name || '');
  const [phone, setPhone] = useState(activeProfile.status || 'Active'); // If phone was mapped incorrectly we can use it or fallback
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  let isConfigured = false;
  try {
    isConfigured = getSupabaseConfig().isConfigured;
  } catch (err) {}

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const updatedProfile: Profile = {
        ...activeProfile,
        full_name: fullName.trim()
      };

      await api.updateProfile(updatedProfile);
      setSuccess('Profile successfully synchronized in church registry!');
      onRefresh();
    } catch (err: any) {
      console.error('[PROFILE] Update failed:', err);
      setError(err?.message || 'Access policy block: Profile update violates row policies.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="personal-profile-portal" className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Upper overview */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-600 border-4 border-slate-900/10 text-white flex items-center justify-center font-black text-2xl sm:text-3xl uppercase shadow-md shrink-0">
          {activeProfile.full_name ? activeProfile.full_name.charAt(0) : 'P'}
        </div>
        <div className="text-center sm:text-left space-y-1 overflow-hidden w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
            <h1 className="text-xl font-black text-slate-900 tracking-tight block truncate">
              {activeProfile.full_name || 'Worker Profile'}
            </h1>
            <span className="inline-block self-center bg-blue-50 text-blue-750 border border-blue-105 px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono tracking-wider shrink-0">
              {activeProfile.role}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono flex items-center justify-center sm:justify-start gap-1">
            <Mail className="w-3.5 h-3.5" />
            {activeProfile.email}
          </p>
          <p className="text-[10px] text-slate-300 font-mono truncate">
            UUID: {activeProfile.id}
          </p>
        </div>
      </div>

      {/* Grid containing secure details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Profile updater */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-50 pb-2">
            <h3 className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider">Update Personal Records</h3>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4 text-xs font-medium">
            
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-emerald-800">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold">{success}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="p-fullname" className="block text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">
                Leader Full Name
              </label>
              <input
                id="p-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Michael Nwosu"
                className="mt-1 block w-full p-2.5 bg-slate-50 border border-slate-250 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">
                Assigned Unit Role
              </label>
              <input
                type="text"
                disabled
                value={activeProfile.role}
                className="mt-1 block w-full p-2.5 bg-slate-100 border border-slate-250 rounded-lg text-slate-500 cursor-not-allowed font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-1 italic leading-tight">
                * Unit scopes and ledger profiles must be altered by a Super Admin.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 font-bold uppercase text-white rounded-lg text-center duration-150 transition-colors shadow-xs hover:shadow-md cursor-pointer disabled:bg-slate-300"
            >
              {loading ? 'Synchronizing with Database...' : 'Save Profile Changes'}
            </button>

          </form>
        </div>

        {/* Security / scope policy box */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider">Active Scope Isolation</h3>
            </div>

            <div className="space-y-3 font-medium">
              
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <Bookmark className="w-4 h-4 text-indigo-505 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">Scope Role:</span>
                  <span className="text-[11px] text-slate-500">{activeProfile.role} status checks in force.</span>
                </div>
              </div>

              {activeProfile.satellite_church_id && (
                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <MapPin className="w-4 h-4 text-rose-505 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Assigned Satellite Church ID:</span>
                    <span className="text-[11px] font-mono text-slate-550 block font-bold mt-0.5">{activeProfile.satellite_church_id}</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <Database className="w-4 h-4 text-emerald-505 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">Database Handshake:</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black uppercase tracking-wider inline-block mt-1 ${isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {isConfigured ? 'Live Supabase Connection' : 'Simulated Registry Mode'}
                  </span>
                </div>
              </div>

            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-indigo-600" /> Security: RLS Enforced
            </span>
            <span>v1.2 Secure Ledger</span>
          </div>

        </div>

      </div>

    </div>
  );
}
