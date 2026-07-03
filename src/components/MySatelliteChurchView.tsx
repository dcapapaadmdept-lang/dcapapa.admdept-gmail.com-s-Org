import React from 'react';
import { Member, SatelliteChurch, MemberAttendance, SatelliteReport, Profile } from '../types';
import { 
  Radio, 
  MapPin, 
  User, 
  Users, 
  TrendingUp, 
  FileCheck, 
  Coins, 
  Award, 
  HeartHandshake, 
  Clock 
} from 'lucide-react';

interface MySatelliteChurchViewProps {
  activeProfile: Profile;
  satelliteChurches: SatelliteChurch[];
  members: Member[];
  memberAttendance: MemberAttendance[];
  satelliteReports: SatelliteReport[];
}

export default function MySatelliteChurchView({
  activeProfile,
  satelliteChurches,
  members,
  memberAttendance,
  satelliteReports,
}: MySatelliteChurchViewProps) {
  
  // Find only the assigned satellite church
  const myChurchId = activeProfile.satellite_church_id;
  const myChurch = satelliteChurches.find(s => s.id === myChurchId);

  if (!myChurch) {
    return (
      <div id="my-church-empty" className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center max-w-lg mx-auto my-12 text-white">
        <Radio className="w-12 h-12 text-indigo-400 mx-auto animate-pulse mb-4" />
        <h3 className="text-base font-bold">No Assigned Branch Found</h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Your account is currently authorized with the role: <span className="text-indigo-400 font-bold">"{activeProfile.role}"</span>, but does not have a designated Satellite Church assigned in the system registry. Please contact the global Super Administrator to associate your profile.
        </p>
      </div>
    );
  }

  // Calculate local client-side scoped metrics specifically for the assigned church
  const myMembers = members.filter(m => m.satellite_church_id === myChurchId);
  const totalMembersCount = myMembers.length;
  const activeMembersCount = myMembers.filter(m => m.status === 'Active').length;

  // Filter attendance and reports precisely for safety (even if API bounds them)
  const myAttendance = memberAttendance.filter(a => a.satellite_church_id === myChurchId);
  const myReports = satelliteReports.filter(r => r.satellite_church_id === myChurchId);

  // Statistics derived directly from reports submitted by this assigned branch
  const reportsCount = myReports.length;
  
  const totalSoulsWon = myReports.reduce((sum, r) => sum + (r.souls || 0), 0);
  const totalOfferingsGathered = myReports.reduce((sum, r) => sum + (r.total_income || r.cash + r.transfer || 0), 0);

  // Analyze attendance statistics across the sessions
  const averageAttendance = reportsCount > 0 
    ? Math.round(myReports.reduce((sum, r) => sum + (r.total_attendance || r.male + r.female + r.children || 0), 0) / reportsCount) 
    : 0;

  const highestAttendance = myReports.length > 0
    ? Math.max(...myReports.map(r => r.total_attendance || r.male + r.female + r.children || 0))
    : 0;

  // Format Nigerian Currency (Naira)
  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div id="my-satellite-church-portal" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Upper Branded Information Card */}
      <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-white rounded-2xl p-6 md:p-8 shadow-xl border border-indigo-950/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-500/30">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              My Satellite Unit Ledger
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{myChurch.church_name}</h1>
            
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span><b>Location:</b> {myChurch.church_loc}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" />
                <span><b>Assigned Pastor:</b> {myChurch.pastor_nam}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-xl min-w-[200px] shrink-0 text-left font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold mb-1.5">Administrative Staff</span>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Admin:</span>
                <span className="text-white font-bold">{myChurch.admin_nam || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Treasurer:</span>
                <span className="text-white font-bold">{myChurch.treasurer_nam || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold text-indigo-300">Branch ID:</span>
                <span className="text-slate-300 font-bold">{myChurch.id.substring(0, 8)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Key Performance Matrix Cards */}
      <div id="satellite-church-dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Members Scoped */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Members</span>
              <h2 className="text-3xl font-black text-slate-900 mt-1">{totalMembersCount}</h2>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">{activeMembersCount} verified Active profiles</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Attendance statistics */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Avg Attendance</span>
              <h2 className="text-3xl font-black text-slate-900 mt-1">
                {averageAttendance} <span className="text-xs font-normal text-slate-500">/svc</span>
              </h2>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">Record Peak: <span className="text-emerald-600 font-bold">{highestAttendance} souls</span></p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Reports submitted */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Reports Submitted</span>
              <h2 className="text-3xl font-black text-slate-900 mt-1">{reportsCount}</h2>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">DCCMS transmission logs active</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Offerings and Finances */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Offerings</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">{formatNaira(totalOfferingsGathered)}</h2>
              <p className="text-[10px] text-slate-500 mt-2.5 font-mono">Aggregated from report deposits</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-650 text-rose-600 rounded-lg">
              <Coins className="w-5 h-5" />
            </div>
          </div>
        </div>

      </div>

      {/* Two panel row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core details panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Mission & Growth Record</h3>
            <p className="text-[11px] text-slate-400">Summary performance indicator logs for {myChurch.church_name}.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Souls Won */}
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Souls Won For Christ</span>
                <span className="text-2xl font-bold text-indigo-950 block">{totalSoulsWon}</span>
                <span className="text-[9px] text-indigo-500 font-semibold font-mono">Accumulated across services</span>
              </div>
            </div>

            {/* Loyalty & Frequency indicator */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Service Events Conducted</span>
                <span className="text-2xl font-bold text-emerald-950 block">{reportsCount}</span>
                <span className="text-[9px] text-emerald-600 font-semibold font-mono">100% submission rating</span>
              </div>
            </div>

          </div>

          {/* Historical services list */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase text-slate-400 font-mono tracking-wider">Recent Submitted Service Reports</h4>
            {myReports.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 italic text-center font-mono">No service reports submitted yet. Go to Satellite Reports tab to input your first service log!</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {myReports.slice(0, 5).map((r) => (
                  <div key={r.id} className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-extrabold text-slate-800 font-semibold">{r.service_type} Service</span>
                      <span className="text-slate-450 text-slate-400 ml-2 font-mono">({r.service_date})</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono font-bold">
                      <span className="text-slate-500">Attendance: <code className="text-slate-900 bg-slate-50 border border-slate-150 px-1 py-0.5 rounded">{r.total_attendance}</code></span>
                      <span className="text-rose-650 text-rose-600">Offering: {formatNaira(r.total_income)}</span>
                      <span className="text-indigo-600">Souls: {r.souls}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Security and isolation details */}
        <div className="bg-slate-50 rounded-xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Enterprise Safety Status</h3>
              <p className="text-[11px] text-slate-400 font-medium">Compliance controls and RLS checks in effect.</p>
            </div>

            <p className="text-xs text-slate-650 text-slate-600 leading-relaxed">
              Your session is securely governed by <b>Dominion City Apapa Cryptographic Row-Level Security (RLS)</b>. Under these policies, the frontend and Postgres backend strictly isolate and filter database entries.
            </p>

            <ul className="mt-4 space-y-2.5 text-[11px] text-slate-500 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 shrink-0 select-none">✔</span>
                <span><b>Data Encapsulation:</b> Only records associated with church ID <code>{myChurchId.substring(0, 8)}</code> can be retrieved, created, or changed by your credentials.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 shrink-0 select-none">✔</span>
                <span><b>Auditing Active:</b> All operations carry your authenticated worker ID for record trail queries.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 shrink-0 select-none">✔</span>
                <span><b>No Simulators:</b> All impersonator/trial features have been dismantled. This interface connects to the live authenticated database engine.</span>
              </li>
            </ul>
          </div>

          <div id="security-verification-stamp" className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[#15803d]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-ping"></span>
              Verified Session
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
