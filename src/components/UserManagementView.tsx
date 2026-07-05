import React, { useState, useEffect } from 'react';
import { getSupabaseClient, getSupabaseConfig, api } from '../supabaseClient';
import { Profile, UserRole, Department, CareCenter, SatelliteChurch } from '../types';
import { 
  Users, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Mail, 
  UserPlus, 
  Lock, 
  RefreshCw, 
  X, 
  Eye, 
  Ban, 
  Check, 
  Clock, 
  Award,
  Building,
  Briefcase
} from 'lucide-react';

interface UserManagementViewProps {
  activeProfile: Profile;
  departments: Department[];
  careCenters: CareCenter[];
  satelliteChurches: SatelliteChurch[];
  onRefresh: () => void;
}

export default function UserManagementView({
  activeProfile,
  departments,
  careCenters,
  satelliteChurches,
  onRefresh
}: UserManagementViewProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [errorCount, setErrorCount] = useState<string | null>(null);

  // Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('DccApapaSecure2026!');
  const [role, setRole] = useState<UserRole>('Department Head');
  const [assignedUnitId, setAssignedUnitId] = useState('');
  const [status, setStatus] = useState<'Active' | 'Suspended' | 'Pending'>('Active');
  
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch all profiles using API
  useEffect(() => {
    const loadProfiles = async () => {
      setLoading(true);
      setErrorCount(null);
      try {
        const fetched = await api.getProfiles(activeProfile);
        setProfiles(fetched || []);
      } catch (err: any) {
        console.warn('[USER_MGMT] Failed loading profiles:', err);
        setErrorCount(err?.message || 'Permission restriction querying profiles registry.');
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };
    loadProfiles();
  }, [refreshTrigger, activeProfile]);

  // Handle role selection change in form to pre-populate or reset unit choices
  useEffect(() => {
    if (role === 'Department Head' && departments.length > 0) {
      setAssignedUnitId(departments[0].id);
    } else if (role === 'Care Pastor' && careCenters.length > 0) {
      setAssignedUnitId(careCenters[0].id);
    } else if (role === 'Satellite Church Admin' && satelliteChurches.length > 0) {
      setAssignedUnitId(satelliteChurches[0].id);
    } else {
      setAssignedUnitId('');
    }
  }, [role, departments, careCenters, satelliteChurches]);

  // Create User Workflow (Requirements 2, 3, 4)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setFormError('Please fill in all required fields (Full name, Email and Password).');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const supabase = getSupabaseClient();
      const config = getSupabaseConfig();

      if (config.isConfigured && supabase) {
        // Create transient Supabase client to execute signUp without disturbing the Super Admin's active session
        const { createClient } = await import('@supabase/supabase-js');
        const transientClient = createClient(config.url, config.key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        // Register user via transient client
        const { data: signUpData, error: signUpErr } = await transientClient.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName.trim()
            }
          }
        });

        if (signUpErr) {
          const errMsg = signUpErr.message || '';
          if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists')) {
            // Find existing profile in profiles schema
            const { data: existingProf, error: findProfErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', email.trim().toLowerCase())
              .maybeSingle();

            if (existingProf) {
              setFormError(`User already registered: A profile under '${email.trim().toLowerCase()}' already exists with role: '${existingProf.role}'. You can manage their status, role or branch directly in the users list below.`);
              setFormLoading(false);
              return;
            } else {
              setFormError(`User already registered: This email address is registered within Supabase Auth, but no active database Profile exists for them yet. When they log in with their credentials, a Profile will automatically be established for them, or you can verify their email address structure.`);
              setFormLoading(false);
              return;
            }
          }
          throw new Error(`Supabase Auth creation failed: ${signUpErr.message}`);
        }

        const authUser = signUpData?.user;
        if (!authUser) {
          throw new Error('Supabase Auth failed to return a valid registered instance.');
        }

        // Build the corresponding Profile
        const newProfile: Profile = {
          id: authUser.id,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role: role,
          created_at: new Date().toISOString(),
          status: status
        };

        if (role === 'Department Head') {
          newProfile.department_id = assignedUnitId;
        } else if (role === 'Care Pastor') {
          newProfile.care_center_id = assignedUnitId;
        } else if (role === 'Satellite Church Admin') {
          newProfile.satellite_church_id = assignedUnitId;
        }

        // Write to Live database
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert(newProfile);

        if (insertErr) {
          throw new Error(`Profile record insert failed: ${insertErr.message}`);
        }

        setFormSuccess(`User accounts registered successfully! Auth UUID generated, Profile structured, assigned role of '${role}' to '${fullName}'. Login is immediately authorized.`);
      } else {
        throw new Error("Unable to connect to the church database.");
      }

      // Reset form on success
      setFullName('');
      setEmail('');
      setPassword('DccApapaSecure2026!');
      setRefreshTrigger(prev => prev + 1);
      onRefresh(); // Trigger global refresh
    } catch (err: any) {
      console.error('[USER_MGMT] Error registering account:', err);
      const rawMsg = err?.message || String(err);
      const isNetworkErr = rawMsg.toLowerCase().includes('failed to fetch') || 
                           rawMsg.toLowerCase().includes('fetch') || 
                           rawMsg.toLowerCase().includes('network') || 
                           rawMsg.toLowerCase().includes('cors');
      if (isNetworkErr) {
        setFormError("Unable to connect to the church database.");
      } else {
        setFormError(rawMsg || 'Access policy blocked creation of church user profile.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Modify user status: Active, Suspended, Pending
  const handleStatusChange = async (profile: Profile, newStatus: 'Active' | 'Suspended' | 'Pending') => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Unable to connect to the church database.");
      
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      // Update local state
      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, status: newStatus } : p));
      
      onRefresh();
    } catch (err: any) {
      alert(`Error updating profile status: ${err.message || err}`);
    }
  };

  // Helper unit resolution
  const renderUnitName = (p: Profile) => {
    if (p.role === 'Department Head' && p.department_id) {
      const dept = departments.find(d => d.id === p.department_id);
      return dept ? `Dept: ${dept.department_name}` : `Dept Code: ${p.department_id}`;
    }
    if (p.role === 'Care Pastor' && p.care_center_id) {
      const center = careCenters.find(c => c.id === p.care_center_id);
      return center ? `CMD: ${center.cmd_name}` : `CMD Code: ${p.care_center_id}`;
    }
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(p.role) && p.satellite_church_id) {
      const sat = satelliteChurches.find(s => s.id === p.satellite_church_id);
      return sat ? `Satellite: ${sat.church_name}` : `Satellite Code: ${p.satellite_church_id}`;
    }
    return <span className="text-slate-450 italic">Full Communion Church</span>;
  };

  // Status color pill
  const renderStatusBadge = (statusVal?: string) => {
    const val = statusVal || 'Active';
    
    if (val === 'Active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-lg bg-emerald-900/60 text-emerald-300 border border-emerald-800">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      );
    }
    if (val === 'Suspended') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800 animate-pulse">
          <Ban className="w-3 h-3" />
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6" id="user-accounts-control-panel">
      
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Users className="w-48 h-48 text-indigo-400" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold rounded text-[9.5px] uppercase tracking-wider font-mono">
                System Registry
              </span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight mt-1">
              User Accounts & Auth Roles
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-2xl">
              Church administrator accounts directory. Authenticate new leaders, assign units (Satellite Churches, Care Centers, and Departments), edit status restrictions, and test workspace interactions instantly.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setRefreshTrigger(p => p + 1);
              }}
              className="px-3.5 py-2 hover:bg-slate-850 text-slate-300 border border-slate-700 bg-slate-900 duration-150 transition-all text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Sync DB
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg transition-all duration-150 text-xs font-bold text-white rounded-xl flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {showCreateForm ? 'Close Assistant' : 'Create Admin Worker'}
            </button>
          </div>
        </div>
      </div>

      {/* Admin User Creation Assistant Form */}
      {showCreateForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-slide-in" id="admin-user-create-form">
          <div className="p-4 bg-slate-900 border-b border-slate-850 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-wider font-mono">Worker Auth & Profile Provisioner</span>
            </div>
            <button 
              onClick={() => setShowCreateForm(false)}
              className="text-slate-450 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            <form onSubmit={handleCreateUser} className="space-y-4">
              
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div>{formError}</div>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-xs font-medium flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <div>{formSuccess}</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Full name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Pastor John George"
                    className="mt-1 w-full text-slate-800 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-medium focus:ring-1 focus:ring-slate-900 outline-hidden"
                  />
                </div>

                {/* Email address */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. jgeorge@dominioncity.org"
                    className="mt-1 w-full text-slate-800 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-medium focus:ring-1 focus:ring-slate-900 outline-hidden"
                  />
                </div>

                {/* Temporary Password */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                    Password (Immediate Login)
                  </label>
                  <div className="relative mt-1">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter Temporary Password"
                      className="w-full text-slate-800 bg-slate-50 border border-slate-200 pl-9 pr-3.5 py-2 rounded-lg text-xs font-medium focus:ring-1 focus:ring-slate-900 font-mono outline-hidden"
                    />
                  </div>
                </div>

                {/* App Role */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                    Assigned Role
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="mt-1 w-full text-slate-800 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold outline-hidden"
                  >
                    {activeProfile.role === 'Super Admin' && (
                      <>
                        <option value="Super Admin">Super Admin</option>
                        <option value="Admin">Admin</option>
                      </>
                    )}
                    <option value="Department Head">Department Head</option>
                    <option value="Care Pastor">Care Pastor</option>
                    <option value="Satellite Church Admin">Satellite Church Admin</option>
                    <option value="Senior Pastor">Senior Pastor</option>
                    <option value="Church Administrator">Church Administrator</option>
                    <option value="Member">Member</option>
                  </select>
                </div>

                {/* Assigned Unit (Conditional) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                    Assigned Church Unit
                  </label>
                  
                  {role === 'Department Head' && (
                    <select
                      value={assignedUnitId}
                      onChange={e => setAssignedUnitId(e.target.value)}
                      className="mt-1 w-full text-slate-800 bg-slate-50 border border-slate-200 px-3- py-2 rounded-lg text-xs font-bold outline-hidden"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.department_name}</option>
                      ))}
                    </select>
                  )}

                  {role === 'Care Pastor' && (
                    <select
                      value={assignedUnitId}
                      onChange={e => setAssignedUnitId(e.target.value)}
                      className="mt-1 w-full text-slate-800 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold outline-hidden"
                    >
                      {careCenters.map(c => (
                        <option key={c.id} value={c.id}>{c.cmd_name}</option>
                      ))}
                    </select>
                  )}

                  {role === 'Satellite Church Admin' && (
                    <select
                      value={assignedUnitId}
                      onChange={e => setAssignedUnitId(e.target.value)}
                      className="mt-1 w-full text-slate-800 bg-slate-50 border border-slate-200 px-3- py-2 rounded-lg text-xs font-bold outline-hidden"
                    >
                      {satelliteChurches.map(s => (
                        <option key={s.id} value={s.id}>{s.church_name}</option>
                      ))}
                    </select>
                  )}

                  {!['Department Head', 'Care Pastor', 'Satellite Church Admin'].includes(role) && (
                    <div className="mt-1.5 text-xs text-slate-450 italic py-1.5">
                      No specific unit restriction applies to this role.
                    </div>
                  )}
                </div>

                {/* Account Status */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="mt-1 w-full text-slate-800 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold outline-hidden"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {formLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Registering Auth User...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Provision User & Profile
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Error State */}
      {errorCount && (
        <div className="p-4 bg-slate-900 border border-amber-900/40 rounded-xl text-slate-300 animate-fade-in flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-white uppercase block mb-1">CORS Policy or Database Access Warning</span>
            {errorCount}. Unable to sync active database profiles from Supabase. Please verify your RLS permissions.
          </div>
        </div>
      )}

      {/* Summary Analytics Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-450 uppercase block font-bold">Total Accounts</span>
            <span className="text-2xl font-black text-slate-850 block mt-0.5">{profiles.length}</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>
        
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-450 uppercase block font-bold">Active Sessions</span>
            <span className="text-2xl font-black text-emerald-600 block mt-0.5">
              {profiles.filter(p => !p.status || p.status === 'Active').length}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between font-bold">
          <div>
            <span className="text-[10px] text-slate-450 uppercase block font-bold text-rose-500">Suspended / Pending</span>
            <span className="text-2xl font-black text-amber-600 block mt-0.5">
              {profiles.filter(p => p.status && p.status !== 'Active').length}
            </span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Profiles Accounts Directory */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-700 tracking-wider uppercase font-mono">
            Church Profile & Auth Management
          </span>
          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {profiles.length} Profiles
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-indigo-500" />
            Loading authentication profiles system indices...
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No profiles located in database directory. Create a new worker profile above to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase text-slate-450 font-mono tracking-wider">
                  <th className="p-4">Leader Name / Email</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Assigned Unit Membership</th>
                  <th className="p-4">User Status</th>
                  <th className="p-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {profiles.map((p) => {
                  const isSuperAdminUser = p.role === 'Super Admin';
                  const isAdminUser = p.role === 'Admin';
                  const canEditStatus = activeProfile.role === 'Super Admin'
                    ? (!isSuperAdminUser && p.id !== activeProfile.id)
                    : (!isSuperAdminUser && !isAdminUser);
                  
                  return (
                    <tr 
                      key={p.id} 
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          {p.full_name}
                          {p.id === activeProfile.id && (
                            <span className="text-[8px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded">
                              Current Login
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-350" />
                          {p.email}
                        </div>
                        <div className="text-[9px] text-slate-300 font-mono">
                          UUID: {p.id}
                        </div>
                      </td>

                      {/* App Role */}
                      <td className="p-4 font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          {p.role}
                        </span>
                      </td>

                      {/* assigned unit */}
                      <td className="p-4 font-mono font-bold text-slate-600">
                        {renderUnitName(p)}
                      </td>

                      {/* User status dropdown */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {renderStatusBadge(p.status)}
                          
                          {/* Allow Super Admins / Admins to toggle status */}
                          {canEditStatus && (
                            <select
                              value={p.status || 'Active'}
                              onChange={e => handleStatusChange(p, e.target.value as any)}
                              className="mt-1 text-[10px] bg-slate-50 border border-slate-200 hover:bg-slate-100 duration-150 py-0.5 rounded px-1 cursor-pointer font-bold outline-hidden"
                            >
                              <option value="Active">Active</option>
                              <option value="Pending">Pending</option>
                              <option value="Suspended">Suspended</option>
                            </select>
                          )}
                        </div>
                      </td>

                      {/* administrative simulation buttons */}
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {isSuperAdminUser || isAdminUser ? (
                            <span className="text-[10px] text-slate-400 italic font-mono p-1">
                              Protected Admin
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-mono font-semibold p-1">
                              Secured Profile Active
                            </span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
      
    </div>
  );
}
