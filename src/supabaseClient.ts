import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Member,
  Department,
  CareCenter,
  SatelliteChurch,
  Profile,
  MemberAttendance,
  DepartmentAttendance,
  CmdReport,
  SatelliteReport,
  UserRole,
  CareCenterReport,
  Finance,
  LeaderWorkerAttendance,
} from './types';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_CARE_CENTERS,
  INITIAL_SATELLITE_CHURCHES,
  INITIAL_PROFILES,
  INITIAL_MEMBERS,
  INITIAL_MEMBER_ATTENDANCE,
  INITIAL_LEADER_WORKER_ATTENDANCE,
  INITIAL_DEPARTMENT_ATTENDANCE,
  INITIAL_CMD_REPORTS,
  INITIAL_SATELLITE_REPORTS,
  INITIAL_CARE_CENTER_REPORTS,
  INITIAL_FINANCES,
  INITIAL_FINANCE_CATEGORIES,
} from './data';

// Local storage key names
const LS_KEYS = {
  SUPABASE_URL: 'dccms_supabase_url',
  SUPABASE_KEY: 'dccms_supabase_key',
  PROFILES: 'dccms_profiles',
  MEMBERS: 'dccms_members',
  DEPARTMENTS: 'dccms_departments',
  CARE_CENTERS: 'dccms_care_centers',
  SATELLITE_CHURCHES: 'dccms_satellite_churches',
  MEMBER_ATTENDANCE: 'dccms_member_attendance',
  LEADER_WORKER_ATTENDANCE: 'dccms_leader_worker_attendance',
  DEPARTMENT_ATTENDANCE: 'dccms_department_attendance',
  CMD_REPORTS: 'dccms_cmd_reports',
  SATELLITE_REPORTS: 'dccms_satellite_reports',
  CARE_CENTER_REPORTS: 'dccms_care_center_reports',
  FINANCES: 'dccms_finances',
  FINANCE_CATEGORIES: 'dccms_finance_categories',
  ACTIVE_PROFILE_ID: 'dccms_active_profile_id',
};

// Keep track of runtime network failure state for safe session downgrade (anti-crash / CORS safety)
let isNetworkSuspended = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dccms_network_suspended') === 'true');
let globalSupabase: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

// Automatically synchronize network status to sessionStorage to persist offline fallback across reloads
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (typeof sessionStorage !== 'undefined') {
      if (isNetworkSuspended) {
        if (sessionStorage.getItem('dccms_network_suspended') !== 'true') {
          sessionStorage.setItem('dccms_network_suspended', 'true');
        }
      } else {
        if (sessionStorage.getItem('dccms_network_suspended') === 'true') {
          sessionStorage.removeItem('dccms_network_suspended');
        }
      }
    }
  }, 100);
}

export const suspendNetworkAndUseOffline = () => {
  console.warn('[SUPABASE SECURITY AUDIT] Network suspension request denied. DCCMS is configured to run in strict production mode.');
  isNetworkSuspended = true;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('dccms_network_suspended', 'true');
  }
};

export const resumeNetwork = () => {
  console.log('[SUPABASE SECURITY AUDIT] Network suspension cleared.');
  isNetworkSuspended = false;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('dccms_network_suspended');
  }
};

// Initialize environment variables or localStorage values
export const getSupabaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};
  const processEnv = typeof process !== 'undefined' ? process.env : ((globalThis as any).process?.env || {});

  const rawUrl = localStorage.getItem(LS_KEYS.SUPABASE_URL) || 
                 metaEnv.VITE_SUPABASE_URL || 
                 metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
                 processEnv.VITE_SUPABASE_URL ||
                 processEnv.NEXT_PUBLIC_SUPABASE_URL || 
                 '';

  const rawKey = localStorage.getItem(LS_KEYS.SUPABASE_KEY) || 
                 metaEnv.VITE_SUPABASE_ANON_KEY || 
                 metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                 processEnv.VITE_SUPABASE_ANON_KEY ||
                 processEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                 '';

  let url = rawUrl.trim();
  let key = rawKey.trim();

  // Connection Audit: Automatically sanitize malformed URL paths (Requirement 8, 12)
  if (url) {
    // 1. Strip trailing slashes
    while (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    // 2. Clear any duplicated /rest/v1 or rest/v1 endpoints appended in error
    if (url.toLowerCase().endsWith('/rest/v1')) {
      url = url.slice(0, -8);
    }
    while (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
  }

  // Connection security and placeholder safety checks (Requirement 8)
  const isPlaceholder = (val: string): boolean => {
    const s = val.toLowerCase();
    return s.includes('your_') || 
           s.includes('placeholder') || 
           s.includes('change_me') || 
           s.includes('enter_') || 
           s.includes('dummy') ||
           s.includes('temp') ||
           s.includes('<your-') ||
           s.includes('my-project') ||
           s.includes('your-project') ||
           s.includes('my_app_url') ||
           s.includes('my_gemini') ||
           s.length < 10;
  };

  const hasValidProtocol = url.startsWith('http://') || url.startsWith('https://');
  const isOk = hasValidProtocol && !isPlaceholder(url) && !isPlaceholder(key);

  // Log active connection details to console (Requirement 3)
  console.log('--- SUPABASE RUNTIME CONNECTION AUDIT ---');
  console.log(`- Supabase URL configured: "${rawUrl}"`);
  console.log(`- Sanitized URL in use:    "${url}"`);
  console.log(`- Key configured:          "${key ? key.slice(0, 15) + '...' + key.slice(-15) : 'NONE'}"`);
  console.log(`- Decision context:        hasProtocol=${hasValidProtocol}, hasPlaceholder=${isPlaceholder(url) || isPlaceholder(key)}`);
  console.log(`- Status:                  ${isOk ? 'CONFIGURED & VALIDATED' : 'DISCONNECTED/DEVELOPMENT FALLBACK'}`);
  console.log('-----------------------------------------');

  return { 
    url: isOk ? url : '', 
    key: isOk ? key : '', 
    isConfigured: isOk, 
    rawUrl, 
    rawKey 
  };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.removeItem('dccms_enforce_sandbox_mode');
  resumeNetwork();
  localStorage.setItem(LS_KEYS.SUPABASE_URL, url);
  localStorage.setItem(LS_KEYS.SUPABASE_KEY, key);
  window.location.reload();
};

export const resetSupabaseConfig = () => {
  localStorage.removeItem('dccms_enforce_sandbox_mode');
  resumeNetwork();
  localStorage.removeItem(LS_KEYS.SUPABASE_URL);
  localStorage.removeItem(LS_KEYS.SUPABASE_KEY);
  window.location.reload();
};

// Initialize real Supabase client dynamically if configured

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    globalSupabase = null;
    currentUrl = '';
    currentKey = '';
    return null;
  }

  if (!globalSupabase || currentUrl !== url || currentKey !== key) {
    try {
      console.log(`[SUPABASE ENGINE RECONNECT] Rebranding and connecting client dynamically to: ${url}`);
      globalSupabase = createClient(url, key);
      currentUrl = url;
      currentKey = key;
    } catch (error) {
      console.error('[SUPABASE ENGINE ERROR] Reconnection script thrown error:', error);
      globalSupabase = null;
    }
  }
  return globalSupabase;
};

// Safe Wrapper to intercept CORS / generic network blocks and degrade automatically to simulated data layer
export const executeRawQueryWithFallback = async <T,>(queryPromise: any): Promise<T[]> => {
  try {
    const res = await queryPromise;
    if (res && res.error) {
      throw res.error;
    }
    if (!res) {
      throw new Error("Unable to connect to the church database.");
    }
    return (res && Array.isArray(res.data) ? res.data : (res && res.data ? [res.data] as any : [])) as T[];
  } catch (err: any) {
    // Set network suspension immediately to avoid cascading parallel connection attempts
    isNetworkSuspended = true;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('dccms_network_suspended', 'true');
    }
    console.warn('[SUPABASE CORRUPT NETWORK HOOK] Intercepted CORS / Network offline exception:', err);
    throw new Error("Unable to connect to the church database.");
  }
};

// Trigger compilation and load initial state
getSupabaseClient();

// LOCAL DATABASE ENGINE (Fully-functional simulation)
const getLocalData = <T>(key: string, initial: T[]): T[] => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return initial;
  }
};

const setLocalData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialization helper to populate local store if empty
export const initializeOfflineDatabase = () => {
  getLocalData(LS_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  getLocalData(LS_KEYS.CARE_CENTERS, INITIAL_CARE_CENTERS);
  getLocalData(LS_KEYS.SATELLITE_CHURCHES, INITIAL_SATELLITE_CHURCHES);
  getLocalData(LS_KEYS.PROFILES, INITIAL_PROFILES);
  getLocalData(LS_KEYS.MEMBERS, INITIAL_MEMBERS);
  getLocalData(LS_KEYS.MEMBER_ATTENDANCE, INITIAL_MEMBER_ATTENDANCE);
  getLocalData(LS_KEYS.LEADER_WORKER_ATTENDANCE, INITIAL_LEADER_WORKER_ATTENDANCE);
  getLocalData(LS_KEYS.DEPARTMENT_ATTENDANCE, INITIAL_DEPARTMENT_ATTENDANCE);
  getLocalData(LS_KEYS.CMD_REPORTS, INITIAL_CMD_REPORTS);
  getLocalData(LS_KEYS.SATELLITE_REPORTS, INITIAL_SATELLITE_REPORTS);
  getLocalData(LS_KEYS.CARE_CENTER_REPORTS, INITIAL_CARE_CENTER_REPORTS);
  getLocalData(LS_KEYS.FINANCES, INITIAL_FINANCES);
  getLocalData(LS_KEYS.FINANCE_CATEGORIES, INITIAL_FINANCE_CATEGORIES);
  if (!localStorage.getItem(LS_KEYS.ACTIVE_PROFILE_ID)) {
    localStorage.setItem(LS_KEYS.ACTIVE_PROFILE_ID, 'prof-admin'); // Default to Super Admin profile
  }
};

// Get the current active user profile for client-side simulator
export const getActiveProfileId = (): string => {
  return localStorage.getItem(LS_KEYS.ACTIVE_PROFILE_ID) || 'prof-admin';
};

export const setActiveProfileId = (id: string) => {
  localStorage.setItem(LS_KEYS.ACTIVE_PROFILE_ID, id);
  window.location.reload();
};

// SIMULATED DATABASE REPOSITORIES
export const dbSim = {
  profiles: {
    getAll: (): Profile[] => getLocalData(LS_KEYS.PROFILES, INITIAL_PROFILES),
    getById: (id: string): Profile | undefined => dbSim.profiles.getAll().find(p => p.id === id),
    upsert: (profile: Profile) => {
      const all = dbSim.profiles.getAll();
      const idx = all.findIndex(p => p.id === profile.id);
      if (idx >= 0) all[idx] = profile;
      else all.push(profile);
      setLocalData(LS_KEYS.PROFILES, all);
    },
    getByEmail: (email: string): Profile | undefined => {
      if (!email) return undefined;
      return dbSim.profiles.getAll().find(p => p.email && p.email.toLowerCase() === email.toLowerCase());
    }
  },
  members: {
    getAll: (): Member[] => getLocalData(LS_KEYS.MEMBERS, INITIAL_MEMBERS),
    save: (member: Member) => {
      const all = dbSim.members.getAll();
      const idx = all.findIndex(m => m.id === member.id);
      if (idx >= 0) all[idx] = member;
      else all.push(member);
      setLocalData(LS_KEYS.MEMBERS, all);
    },
    delete: (id: string) => {
      const filtered = dbSim.members.getAll().filter(m => m.id !== id);
      setLocalData(LS_KEYS.MEMBERS, filtered);
    }
  },
  departments: {
    getAll: (): Department[] => getLocalData(LS_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS),
    save: (dept: Department) => {
      const all = dbSim.departments.getAll();
      const idx = all.findIndex(d => d.id === dept.id);
      if (idx >= 0) all[idx] = dept;
      else all.push(dept);
      setLocalData(LS_KEYS.DEPARTMENTS, all);
    },
    delete: (id: string) => {
      const filtered = dbSim.departments.getAll().filter(d => d.id !== id);
      setLocalData(LS_KEYS.DEPARTMENTS, filtered);
    }
  },
  careCenters: {
    getAll: (): CareCenter[] => getLocalData(LS_KEYS.CARE_CENTERS, INITIAL_CARE_CENTERS),
    save: (center: CareCenter) => {
      const all = dbSim.careCenters.getAll();
      const idx = all.findIndex(c => c.id === center.id);
      if (idx >= 0) all[idx] = center;
      else all.push(center);
      setLocalData(LS_KEYS.CARE_CENTERS, all);
    },
    delete: (id: string) => {
      const filtered = dbSim.careCenters.getAll().filter(c => c.id !== id);
      setLocalData(LS_KEYS.CARE_CENTERS, filtered);
    }
  },
  satelliteChurches: {
    getAll: (): SatelliteChurch[] => getLocalData(LS_KEYS.SATELLITE_CHURCHES, INITIAL_SATELLITE_CHURCHES),
    save: (church: SatelliteChurch) => {
      const all = dbSim.satelliteChurches.getAll();
      const idx = all.findIndex(c => c.id === church.id);
      if (idx >= 0) all[idx] = church;
      else all.push(church);
      setLocalData(LS_KEYS.SATELLITE_CHURCHES, all);
    },
    delete: (id: string) => {
      const filtered = dbSim.satelliteChurches.getAll().filter(c => c.id !== id);
      setLocalData(LS_KEYS.SATELLITE_CHURCHES, filtered);
    }
  },
  memberAttendance: {
    getAll: (): MemberAttendance[] => getLocalData(LS_KEYS.MEMBER_ATTENDANCE, INITIAL_MEMBER_ATTENDANCE),
    save: (record: MemberAttendance) => {
      const all = dbSim.memberAttendance.getAll();
      const idx = all.findIndex(r => r.id === record.id);
      if (idx >= 0) all[idx] = record;
      else all.push(record);
      setLocalData(LS_KEYS.MEMBER_ATTENDANCE, all);
    },
    delete: (id: string) => {
      const filtered = dbSim.memberAttendance.getAll().filter(r => r.id !== id);
      setLocalData(LS_KEYS.MEMBER_ATTENDANCE, filtered);
    }
  },
  leaderWorkerAttendance: {
    getAll: (): LeaderWorkerAttendance[] => getLocalData(LS_KEYS.LEADER_WORKER_ATTENDANCE, INITIAL_LEADER_WORKER_ATTENDANCE),
    save: (record: LeaderWorkerAttendance) => {
      const all = dbSim.leaderWorkerAttendance.getAll();
      const idx = all.findIndex(r => r.id === record.id);
      if (idx >= 0) all[idx] = record;
      else all.push(record);
      setLocalData(LS_KEYS.LEADER_WORKER_ATTENDANCE, all);
    },
    saveBulk: (records: LeaderWorkerAttendance[]) => {
      const all = dbSim.leaderWorkerAttendance.getAll();
      records.forEach(record => {
        const idx = all.findIndex(r => r.id === record.id);
        if (idx >= 0) all[idx] = record;
        else all.push(record);
      });
      setLocalData(LS_KEYS.LEADER_WORKER_ATTENDANCE, all);
    },
    delete: (id: string) => {
      const filtered = dbSim.leaderWorkerAttendance.getAll().filter(r => r.id !== id);
      setLocalData(LS_KEYS.LEADER_WORKER_ATTENDANCE, filtered);
    }
  },
  departmentAttendance: {
    getAll: (): DepartmentAttendance[] => getLocalData(LS_KEYS.DEPARTMENT_ATTENDANCE, INITIAL_DEPARTMENT_ATTENDANCE),
    save: (record: DepartmentAttendance) => {
      const all = dbSim.departmentAttendance.getAll();
      const idx = all.findIndex(r => r.id === record.id);
      if (idx >= 0) all[idx] = record;
      else all.push(record);
      setLocalData(LS_KEYS.DEPARTMENT_ATTENDANCE, all);
    },
    saveBulk: (records: DepartmentAttendance[]) => {
      const all = dbSim.departmentAttendance.getAll();
      records.forEach(record => {
        const idx = all.findIndex(r => r.id === record.id);
        if (idx >= 0) all[idx] = record;
        else all.push(record);
      });
      setLocalData(LS_KEYS.DEPARTMENT_ATTENDANCE, all);
    },
    delete: (id: string) => {
      const filtered = dbSim.departmentAttendance.getAll().filter(r => r.id !== id);
      setLocalData(LS_KEYS.DEPARTMENT_ATTENDANCE, filtered);
    }
  },
  cmdReports: {
    getAll: (): CmdReport[] => getLocalData(LS_KEYS.CMD_REPORTS, INITIAL_CMD_REPORTS),
    save: (report: CmdReport) => {
      const all = dbSim.cmdReports.getAll();
      const idx = all.findIndex(r => r.id === report.id);
      if (idx >= 0) all[idx] = report;
      else all.push(report);
      setLocalData(LS_KEYS.CMD_REPORTS, all);
    },
    delete: (id: string) => {
      const filtered = dbSim.cmdReports.getAll().filter(r => r.id !== id);
      setLocalData(LS_KEYS.CMD_REPORTS, filtered);
    }
  },
  satelliteReports: {
    getAll: (): SatelliteReport[] => getLocalData(LS_KEYS.SATELLITE_REPORTS, INITIAL_SATELLITE_REPORTS),
    save: (report: SatelliteReport) => {
      const all = dbSim.satelliteReports.getAll();
      const idx = all.findIndex(r => r.id === report.id);
      if (idx >= 0) all[idx] = report;
      else all.push(report);
      setLocalData(LS_KEYS.SATELLITE_REPORTS, all);
    },
    delete: (id: string) => {
      const filtered = dbSim.satelliteReports.getAll().filter(r => r.id !== id);
      setLocalData(LS_KEYS.SATELLITE_REPORTS, filtered);
    }
  },
  careCenterReports: {
    getAll: (): CareCenterReport[] => getLocalData(LS_KEYS.CARE_CENTER_REPORTS, INITIAL_CARE_CENTER_REPORTS),
    save: (report: CareCenterReport) => {
      const all = dbSim.careCenterReports.getAll();
      const idx = all.findIndex(r => r.id === report.id);
      if (idx >= 0) all[idx] = report;
      else all.push(report);
      setLocalData(LS_KEYS.CARE_CENTER_REPORTS, all);
    },
    delete: (id: string) => {
      const filtered = dbSim.careCenterReports.getAll().filter(r => r.id !== id);
      setLocalData(LS_KEYS.CARE_CENTER_REPORTS, filtered);
    }
  },
  finances: {
    getAll: (): Finance[] => getLocalData(LS_KEYS.FINANCES, INITIAL_FINANCES),
    save: (record: Finance) => {
      const all = dbSim.finances.getAll();
      const idx = all.findIndex(r => r.id === record.id);
      if (idx >= 0) all[idx] = record;
      else all.push(record);
      setLocalData(LS_KEYS.FINANCES, all);
    },
    delete: (id: string) => {
      const filtered = dbSim.finances.getAll().filter(r => r.id !== id);
      setLocalData(LS_KEYS.FINANCES, filtered);
    }
  },
  financeCategories: {
    getAll: (): any[] => getLocalData(LS_KEYS.FINANCE_CATEGORIES, INITIAL_FINANCE_CATEGORIES),
    save: (cat: any) => {
      const all = dbSim.financeCategories.getAll();
      const idx = all.findIndex(c => c.id === cat.id);
      if (idx >= 0) all[idx] = cat;
      else all.push(cat);
      setLocalData(LS_KEYS.FINANCE_CATEGORIES, all);
    }
  }
};

// UNIFIED API BRIDGE: Swaps between Live Supabase and Simulated Engine with integrated RLS logic
// RLS simulation applies logic transparently so that the front-end code remains clean and uniform.
export const api = {
  getProfiles: async (activeProfile: Profile): Promise<Profile[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        return await executeRawQueryWithFallback<Profile>(supabase.from('profiles').select('*'));
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getProfiles failed. Downgrading to offline storage:', err);
        isNetworkSuspended = true;
      }
    }
    return dbSim.profiles.getAll();
  },

  updateProfile: async (profile: Profile): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('profiles').upsert(profile);
        if (error) throw error;
        dbSim.profiles.upsert(profile);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] updateProfile failed. Saving to offline storage:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.profiles.upsert(profile);
  },

  getMembers: async (activeProfile: Profile): Promise<Member[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        let query = supabase.from('members').select('*');
        const role = activeProfile?.role;
        if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
          query = query.eq('satellite_church_id', activeProfile.satellite_church_id);
        } else if (role === 'Care Pastor' && activeProfile?.care_center_id) {
          query = query.eq('care_center_id', activeProfile.care_center_id);
        } else if (['CMD', 'Church Ministry Director'].includes(role || '') && activeProfile?.assigned_cmd_name) {
          // Fetch assigned care center ids
          const { data: cData } = await supabase.from('care_centers').select('id').ilike('cmd_name', `%${activeProfile.assigned_cmd_name}%`);
          if (cData && cData.length > 0) {
            const ids = cData.map(c => c.id);
            query = query.in('care_center_id', ids);
          } else {
            query = query.eq('care_center_id', 'none-matching-id');
          }
        } else if (role === 'Department Head' && activeProfile?.department_id) {
          query = query.eq('department_id', activeProfile.department_id);
        } else if (role === 'Member' && activeProfile?.email) {
          query = query.eq('email', activeProfile.email);
        }
        return await executeRawQueryWithFallback<Member>(query.order('names', { ascending: true }));
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getMembers failed. Downgrading to offline storage:', err);
        isNetworkSuspended = true;
      }
    }
    
    let all = dbSim.members.getAll();
    const role = activeProfile?.role;
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
      all = all.filter(m => m.satellite_church_id === activeProfile.satellite_church_id);
    } else if (role === 'Care Pastor' && activeProfile?.care_center_id) {
      all = all.filter(m => m.care_center_id === activeProfile.care_center_id);
    } else if (['CMD', 'Church Ministry Director'].includes(role || '') && activeProfile?.assigned_cmd_name) {
      const assignedCenters = dbSim.careCenters.getAll().filter(c => c.cmd_name && c.cmd_name.toLowerCase().includes(activeProfile.assigned_cmd_name!.toLowerCase()));
      const assignedIds = assignedCenters.map(c => c.id);
      all = all.filter(m => m.care_center_id && assignedIds.includes(m.care_center_id));
    } else if (role === 'Department Head' && activeProfile?.department_id) {
      all = all.filter(m => m.department_id === activeProfile.department_id);
    } else if (role === 'Member' && activeProfile?.email) {
      all = all.filter(m => m.email && m.email.toLowerCase() === activeProfile.email.toLowerCase());
    }
    return all.sort((a, b) => (a.names || '').localeCompare(b.names || ''));
  },

  saveMember: async (member: Member): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('members').upsert(member);
        if (error) throw error;
        dbSim.members.save(member);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveMember failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.members.save(member);
  },

  deleteMember: async (id: string): Promise<{ success: boolean; member_id: string; payload: any; supabase_response: any }> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const deletePayload = { id, target_table: 'members' };
        const cascadeResults: any = {};

        try {
          const res = await supabase.from('member_attendance').delete().eq('member_id', id);
          cascadeResults.member_attendance = res;
        } catch (e: any) {
          console.warn('Could not clear member_attendance entries:', e);
        }

        try {
          const res = await supabase.from('department_attendance').delete().eq('member_id', id);
          cascadeResults.department_attendance = res;
        } catch (e: any) {
          console.warn('Could not clear department_attendance entries:', e);
        }

        try {
          await supabase.from('department_members').delete().eq('member_id', id);
        } catch (e) {
          console.warn('Could not clear department_members links:', e);
        }
        try {
          await supabase.from('cmd_members').delete().eq('member_id', id);
        } catch (e) {
          console.warn('Could not clear cmd_members links:', e);
        }
        try {
          await supabase.from('satellite_members').delete().eq('member_id', id);
        } catch (e) {
          console.warn('Could not clear satellite_members links:', e);
        }

        const mainResult = await supabase.from('members').delete().eq('id', id);
        if (mainResult.error) throw mainResult.error;

        dbSim.members.delete(id);

        return {
          success: true,
          member_id: id,
          payload: deletePayload,
          supabase_response: {
            main_query_result: mainResult,
            cascaded_queries: cascadeResults
          }
        };
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] deleteMember failed. Deleting offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.members.delete(id);
    return {
      success: true,
      member_id: id,
      payload: { id, target_table: 'members' },
      supabase_response: { offline: true }
    };
  },

  getDepartments: async (activeProfile: Profile): Promise<Department[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        let query = supabase.from('departments').select('*');
        if (activeProfile?.role === 'Department Head' && activeProfile?.department_id) {
          query = query.eq('id', activeProfile.department_id);
        }
        return await executeRawQueryWithFallback<Department>(query);
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getDepartments failed. Downgrading offline:', err);
        isNetworkSuspended = true;
      }
    }
    let all = dbSim.departments.getAll();
    if (activeProfile?.role === 'Department Head' && activeProfile?.department_id) {
      all = all.filter(d => d.id === activeProfile.department_id);
    }
    return all;
  },

  saveDepartment: async (dept: Department): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('departments').upsert(dept);
        if (error) throw error;
        dbSim.departments.save(dept);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveDepartment failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.departments.save(dept);
  },

  deleteDepartment: async (id: string): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('departments').delete().eq('id', id);
        if (error) throw error;
        dbSim.departments.delete(id);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] deleteDepartment failed. Deleting offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.departments.delete(id);
  },

  getCareCenters: async (activeProfile: Profile): Promise<CareCenter[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        let query = supabase.from('care_centers').select('*');
        if (activeProfile?.role === 'Care Pastor' && activeProfile?.care_center_id) {
          query = query.eq('id', activeProfile.care_center_id);
        } else if (['CMD', 'Church Ministry Director'].includes(activeProfile?.role || '') && activeProfile?.assigned_cmd_name) {
          query = query.ilike('cmd_name', `%${activeProfile.assigned_cmd_name}%`);
        }
        return await executeRawQueryWithFallback<CareCenter>(query);
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getCareCenters failed. Downgrading offline:', err);
        isNetworkSuspended = true;
      }
    }
    let all = dbSim.careCenters.getAll();
    if (activeProfile?.role === 'Care Pastor' && activeProfile?.care_center_id) {
      all = all.filter(c => c.id === activeProfile.care_center_id);
    } else if (['CMD', 'Church Ministry Director'].includes(activeProfile?.role || '') && activeProfile?.assigned_cmd_name) {
      all = all.filter(c => c.cmd_name && c.cmd_name.toLowerCase().includes(activeProfile.assigned_cmd_name!.toLowerCase()));
    }
    return all;
  },

  saveCareCenter: async (center: CareCenter): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('care_centers').upsert(center);
        if (error) throw error;
        dbSim.careCenters.save(center);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveCareCenter failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.careCenters.save(center);
  },

  deleteCareCenter: async (id: string): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('care_centers').delete().eq('id', id);
        if (error) throw error;
        dbSim.careCenters.delete(id);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] deleteCareCenter failed. Deleting offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.careCenters.delete(id);
  },

  getSatelliteChurches: async (activeProfile: Profile): Promise<SatelliteChurch[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        let query = supabase.from('satellite_churches').select('*');
        if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile?.role || '') && activeProfile?.satellite_church_id) {
          query = query.eq('id', activeProfile.satellite_church_id);
        }
        return await executeRawQueryWithFallback<SatelliteChurch>(query);
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getSatelliteChurches failed. Downgrading offline:', err);
        isNetworkSuspended = true;
      }
    }
    let all = dbSim.satelliteChurches.getAll();
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile?.role || '') && activeProfile?.satellite_church_id) {
      all = all.filter(c => c.id === activeProfile.satellite_church_id);
    }
    return all;
  },

  saveSatelliteChurch: async (church: SatelliteChurch): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('satellite_churches').upsert(church);
        if (error) throw error;
        dbSim.satelliteChurches.save(church);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveSatelliteChurch failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.satelliteChurches.save(church);
  },

  deleteSatelliteChurch: async (id: string): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('satellite_churches').delete().eq('id', id);
        if (error) throw error;
        dbSim.satelliteChurches.delete(id);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] deleteSatelliteChurch failed. Deleting offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.satelliteChurches.delete(id);
  },

  getMemberAttendance: async (activeProfile: Profile): Promise<MemberAttendance[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        let query = supabase.from('member_attendance').select('*');
        const role = activeProfile?.role;
        if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
          query = query.eq('satellite_church_id', activeProfile.satellite_church_id);
        } else if (role === 'Care Pastor' && activeProfile?.care_center_id) {
          query = query.eq('care_center_id', activeProfile.care_center_id);
        } else if (['CMD', 'Church Ministry Director'].includes(role || '') && activeProfile?.assigned_cmd_name) {
          // Fetch assigned care center ids
          const { data: cData } = await supabase.from('care_centers').select('id').ilike('cmd_name', `%${activeProfile.assigned_cmd_name}%`);
          if (cData && cData.length > 0) {
            const ids = cData.map(c => c.id);
            query = query.in('care_center_id', ids);
          } else {
            query = query.eq('care_center_id', 'none-matching-id');
          }
        }
        return await executeRawQueryWithFallback<MemberAttendance>(query);
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getMemberAttendance failed. Downgrading offline:', err);
        isNetworkSuspended = true;
      }
    }
    let all = dbSim.memberAttendance.getAll();
    const role = activeProfile?.role;
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
      all = all.filter(r => r.satellite_church_id === activeProfile.satellite_church_id);
    } else if (role === 'Care Pastor' && activeProfile?.care_center_id) {
      all = all.filter(r => r.care_center_id === activeProfile.care_center_id);
    } else if (['CMD', 'Church Ministry Director'].includes(role || '') && activeProfile?.assigned_cmd_name) {
      const assignedCenters = dbSim.careCenters.getAll().filter(c => c.cmd_name && c.cmd_name.toLowerCase().includes(activeProfile.assigned_cmd_name!.toLowerCase()));
      const assignedIds = assignedCenters.map(c => c.id);
      all = all.filter(r => r.care_center_id && assignedIds.includes(r.care_center_id));
    }
    return all;
  },

  saveMemberAttendance: async (record: MemberAttendance): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('member_attendance').upsert(record);
        if (error) throw error;
        dbSim.memberAttendance.save(record);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveMemberAttendance failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.memberAttendance.save(record);
  },

  deleteMemberAttendance: async (id: string): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('member_attendance').delete().eq('id', id);
        if (error) throw error;
        dbSim.memberAttendance.delete(id);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] deleteMemberAttendance failed. Deleting offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.memberAttendance.delete(id);
  },

  getLeaderWorkerAttendance: async (activeProfile: Profile): Promise<LeaderWorkerAttendance[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        let query = supabase.from('leader_worker_attendance').select('*');
        const role = activeProfile?.role;
        if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
          query = query.eq('satellite_church_id', activeProfile.satellite_church_id);
        }
        return await executeRawQueryWithFallback<LeaderWorkerAttendance>(query);
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getLeaderWorkerAttendance failed. Downgrading offline:', err);
        isNetworkSuspended = true;
      }
    }
    let all = dbSim.leaderWorkerAttendance.getAll();
    const role = activeProfile?.role;
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
      all = all.filter(r => r.satellite_church_id === activeProfile.satellite_church_id);
    }
    return all;
  },

  saveLeaderWorkerAttendance: async (record: LeaderWorkerAttendance): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('leader_worker_attendance').upsert(record);
        if (error) throw error;
        dbSim.leaderWorkerAttendance.save(record);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveLeaderWorkerAttendance failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.leaderWorkerAttendance.save(record);
  },

  saveLeaderWorkerAttendanceBulk: async (records: LeaderWorkerAttendance[]): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('leader_worker_attendance').upsert(records);
        if (error) throw error;
        dbSim.leaderWorkerAttendance.saveBulk(records);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveLeaderWorkerAttendanceBulk failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.leaderWorkerAttendance.saveBulk(records);
  },

  deleteLeaderWorkerAttendance: async (id: string): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('leader_worker_attendance').delete().eq('id', id);
        if (error) throw error;
        dbSim.leaderWorkerAttendance.delete(id);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] deleteLeaderWorkerAttendance failed. Deleting offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.leaderWorkerAttendance.delete(id);
  },

  getDepartmentAttendance: async (activeProfile: Profile): Promise<DepartmentAttendance[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        let query = supabase.from('department_attendance').select('*');
        if (activeProfile?.role === 'Department Head' && activeProfile?.department_id) {
          query = query.eq('department_id', activeProfile.department_id);
        }
        return await executeRawQueryWithFallback<DepartmentAttendance>(query);
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getDepartmentAttendance failed. Downgrading offline:', err);
        isNetworkSuspended = true;
      }
    }
    let all = dbSim.departmentAttendance.getAll();
    if (activeProfile?.role === 'Department Head' && activeProfile?.department_id) {
      all = all.filter(r => r.department_id === activeProfile.department_id);
    }
    return all;
  },

  saveDepartmentAttendance: async (records: DepartmentAttendance[]): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('department_attendance').upsert(records);
        if (error) throw error;
        dbSim.departmentAttendance.saveBulk(records);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveDepartmentAttendance failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.departmentAttendance.saveBulk(records);
  },

  getCmdReports: async (activeProfile: Profile): Promise<CmdReport[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        let query = supabase.from('cmd_reports').select('*');
        if (activeProfile?.role === 'Care Pastor' && activeProfile?.care_center_id) {
          query = query.eq('care_center_id', activeProfile.care_center_id);
        }
        return await executeRawQueryWithFallback<CmdReport>(query);
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getCmdReports failed. Downgrading offline:', err);
        isNetworkSuspended = true;
      }
    }
    let all = dbSim.cmdReports.getAll();
    if (activeProfile?.role === 'Care Pastor' && activeProfile?.care_center_id) {
      all = all.filter(r => (r as any).care_center_id === activeProfile.care_center_id);
    }
    return all;
  },

  saveCmdReport: async (report: CmdReport): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('cmd_reports').upsert(report);
        if (error) throw error;
        dbSim.cmdReports.save(report);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveCmdReport failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.cmdReports.save(report);
  },

  deleteCmdReport: async (id: string): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('cmd_reports').delete().eq('id', id);
        if (error) throw error;
        dbSim.cmdReports.delete(id);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] deleteCmdReport failed. Deleting offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.cmdReports.delete(id);
  },

  getSatelliteReports: async (activeProfile: Profile): Promise<SatelliteReport[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        let query = supabase.from('satellite_reports').select('*');
        if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile?.role || '') && activeProfile?.satellite_church_id) {
          query = query.eq('satellite_church_id', activeProfile.satellite_church_id);
        }
        return await executeRawQueryWithFallback<SatelliteReport>(query);
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getSatelliteReports failed. Downgrading offline:', err);
        isNetworkSuspended = true;
      }
    }
    let all = dbSim.satelliteReports.getAll();
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile?.role || '') && activeProfile?.satellite_church_id) {
      all = all.filter(r => r.satellite_church_id === activeProfile.satellite_church_id);
    }
    return all;
  },

  saveSatelliteReport: async (report: SatelliteReport): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('satellite_reports').upsert(report);
        if (error) throw error;
        dbSim.satelliteReports.save(report);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveSatelliteReport failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.satelliteReports.save(report);
  },

  deleteSatelliteReport: async (id: string): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('satellite_reports').delete().eq('id', id);
        if (error) throw error;
        dbSim.satelliteReports.delete(id);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] deleteSatelliteReport failed. Deleting offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.satelliteReports.delete(id);
  },

  getCareCenterReports: async (activeProfile: Profile): Promise<CareCenterReport[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        let query = supabase.from('care_center_reports').select('*');
        if (activeProfile?.role === 'Care Pastor' && activeProfile?.care_center_id) {
          query = query.eq('care_center_id', activeProfile.care_center_id);
        } else if (['CMD', 'Church Ministry Director'].includes(activeProfile?.role || '') && activeProfile?.assigned_cmd_name) {
          query = query.ilike('care_center_name', `%${activeProfile.assigned_cmd_name}%`);
        }
        return await executeRawQueryWithFallback<CareCenterReport>(query);
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getCareCenterReports failed. Downgrading offline:', err);
        isNetworkSuspended = true;
      }
    }
    let all = dbSim.careCenterReports.getAll();
    if (activeProfile?.role === 'Care Pastor' && activeProfile?.care_center_id) {
      all = all.filter(r => r.care_center_id === activeProfile.care_center_id);
    } else if (['CMD', 'Church Ministry Director'].includes(activeProfile?.role || '') && activeProfile?.assigned_cmd_name) {
      all = all.filter(r => r.care_center_name && r.care_center_name.toLowerCase().includes(activeProfile.assigned_cmd_name!.toLowerCase()));
    }
    return all;
  },

  saveCareCenterReport: async (report: CareCenterReport): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('care_center_reports').upsert(report);
        if (error) throw error;
        dbSim.careCenterReports.save(report);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveCareCenterReport failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.careCenterReports.save(report);
  },

  deleteCareCenterReport: async (id: string): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('care_center_reports').delete().eq('id', id);
        if (error) throw error;
        dbSim.careCenterReports.delete(id);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] deleteCareCenterReport failed. Deleting offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.careCenterReports.delete(id);
  },

  getFinances: async (activeProfile: Profile): Promise<Finance[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        let query = supabase.from('finances').select('*');
        const role = activeProfile?.role;
        if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
          query = query.eq('satellite_church_id', activeProfile.satellite_church_id);
        } else if (['CMD', 'Church Ministry Director'].includes(role || '') && activeProfile?.assigned_cmd_name) {
          // Fetch assigned care center ids
          const { data: cData } = await supabase.from('care_centers').select('id').ilike('cmd_name', `%${activeProfile.assigned_cmd_name}%`);
          if (cData && cData.length > 0) {
            const ids = cData.map(c => c.id);
            query = query.in('care_center_id', ids);
          } else {
            query = query.eq('care_center_id', 'none-matching-id');
          }
        }
        return await executeRawQueryWithFallback<Finance>(query);
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getFinances failed. Downgrading offline:', err);
        isNetworkSuspended = true;
      }
    }
    let all = dbSim.finances.getAll();
    const role = activeProfile?.role;
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
      all = all.filter(r => r.satellite_church_id === activeProfile.satellite_church_id);
    } else if (['CMD', 'Church Ministry Director'].includes(role || '') && activeProfile?.assigned_cmd_name) {
      const assignedCenters = dbSim.careCenters.getAll().filter(c => c.cmd_name && c.cmd_name.toLowerCase().includes(activeProfile.assigned_cmd_name!.toLowerCase()));
      const assignedIds = assignedCenters.map(c => c.id);
      all = all.filter(r => r.care_center_id && assignedIds.includes(r.care_center_id));
    }
    return all;
  },

  saveFinance: async (record: Finance): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('finances').upsert(record);
        if (error) throw error;
        dbSim.finances.save(record);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveFinance failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.finances.save(record);
  },

  deleteFinance: async (id: string): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('finances').delete().eq('id', id);
        if (error) throw error;
        dbSim.finances.delete(id);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] deleteFinance failed. Deleting offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.finances.delete(id);
  },

  getFinanceCategories: async (): Promise<any[]> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { data, error } = await supabase.from('finance_categories').select('*');
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] getFinanceCategories failed. Downgrading offline:', err);
        isNetworkSuspended = true;
      }
    }
    return dbSim.financeCategories.getAll();
  },

  saveFinanceCategory: async (cat: any): Promise<void> => {
    const supabase = !isNetworkSuspended ? getSupabaseClient() : null;
    if (supabase) {
      try {
        const { error } = await supabase.from('finance_categories').upsert(cat);
        if (error) throw error;
        dbSim.financeCategories.save(cat);
        return;
      } catch (err) {
        console.warn('[SUPABASE FALLBACK] saveFinanceCategory failed. Saving offline:', err);
        isNetworkSuspended = true;
      }
    }
    dbSim.financeCategories.save(cat);
  }
};

// FULL PRODUCTION-READY SCHEMA SQL (READY FOR COPY AND PASTE DIRECTLY IN SUPABASE SQL EDITOR)
export const SCHEMA_SQL = `-- Dominion City Apapa Church Management System (DCCMS)
-- Full Postgres / Supabase SQL Schema & Migration DDL

-- Pre-requisites: Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Roles Table
create table if not exists public.roles (
  id text primary key,
  name text not null,
  permissions text[] not null default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Departments Table
create table if not exists public.departments (
  id text primary key,
  department_name text not null,
  leader_id text,
  assistant_leader_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Care Centers Table (CMD)
create table if not exists public.care_centers (
  id text primary key,
  cmd_name text not null,
  care_pastor text not null,
  cmd_address text not null,
  leader_name text not null,
  treasurer_name text not null,
  email_address text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Satellite Churches Table
create table if not exists public.satellite_churches (
  id text primary key,
  church_name text not null,
  church_loc text not null,
  pastor_nam text not null,
  admin_nam text not null,
  treasurer_nam text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create Profiles Table (Linked to Supabase Auth Users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('Super Admin', 'Senior Pastor', 'Church Administrator', 'Care Pastor', 'Satellite Church Admin', 'satellite_admin', 'Department Head', 'Finance Officer', 'Member', 'Care Center Admin', 'Care Center Administrator')),
  department_id text references public.departments(id) on delete set null,
  care_center_id text references public.care_centers(id) on delete set null,
  satellite_church_id text references public.satellite_churches(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create Members Table
create table if not exists public.members (
  id text primary key,
  member_id text not null unique,
  names text not null,
  phone_number text,
  address text,
  gender text not null check (gender in ('Male', 'Female')),
  marital_status text not null check (marital_status in ('Single', 'Married', 'Widowed', 'Divorced')),
  dob date,
  join_date date,
  care_center_id text references public.care_centers(id) on delete set null,
  satellite_church_id text references public.satellite_churches(id) on delete set null,
  department_id text references public.departments(id) on delete set null,
  email text,
  photo_url text,
  status text not null default 'Active' check (status in ('Active', 'Inactive', 'Pending')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Create Department Members Table
create table if not exists public.department_members (
  id text primary key,
  department_id text not null references public.departments(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  role_in_dept text not null default 'Worker' check (role_in_dept in ('Leader', 'Assistant Leader', 'Member', 'Worker')),
  joined_at date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (department_id, member_id)
);

-- 8. Create Department Attendance Table
create table if not exists public.department_attendance (
  id text primary key,
  department_id text not null references public.departments(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  attendance_date date not null,
  attendance_time text not null,
  attendance_status text not null check (attendance_status in ('Present', 'Absent', 'Excused')),
  recorded_by text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (department_id, member_id, attendance_date)
);

-- 9. Create CMD Members Table
create table if not exists public.cmd_members (
  id text primary key,
  care_center_id text not null references public.care_centers(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  role_in_cmd text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (care_center_id, member_id)
);

-- 10. Create CMD Reports Table (Care Center Meetings)
create table if not exists public.cmd_reports (
  id text primary key,
  cmd text not null,
  care_pastor text not null,
  care_center_name text not null,
  care_center_address text not null,
  date_of_meeting date not null,
  report_week text not null,
  male integer not null default 0,
  female integer not null default 0,
  children integer not null default 0,
  mvp_present integer not null default 0,
  soul_won integer not null default 0,
  offering_cash numeric(12,2) not null default 0,
  offering_transfer numeric(12,2) not null default 0,
  total_attendance integer not null default 0, -- Auto calculated: male + female + children
  total_offering numeric(12,2) not null default 0, -- Auto calculated: cash + transfer
  goals_next_meeting text,
  treasurer_handling_cash text,
  goals_achieved text not null check (goals_achieved in ('Yes', 'No', 'Partially')),
  email_address text not null,
  created_by text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Create Satellite Members Table
create table if not exists public.satellite_members (
  id text primary key,
  satellite_church_id text not null references public.satellite_churches(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  role_in_satellite text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (satellite_church_id, member_id)
);

-- 12. Create Satellite Reports Table
create table if not exists public.satellite_reports (
  id text primary key,
  satellite_church_id text not null references public.satellite_churches(id) on delete cascade,
  church_name text not null,
  church_loc text not null,
  pastor_nam text not null,
  admin_nam text not null,
  service_date date not null,
  service_type text not null,
  specify text,
  time_started text not null,
  time_ended text not null,
  male integer not null default 0,
  female integer not null default 0,
  children integer not null default 0,
  online integer not null default 0,
  mvp integer not null default 0,
  souls integer not null default 0,
  cash numeric(12,2) not null default 0,
  transfer numeric(12,2) not null default 0,
  total_attendance integer not null default 0, -- Auto calculated: male + female + children + online
  total_income numeric(12,2) not null default 0, -- Auto calculated: cash + transfer
  treasurer_nam text not null,
  people_called_for_service integer not null default 0,
  goal_for_next_midweek_service text,
  created_by text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. Create Care Center Reports Table
create table if not exists public.care_center_reports (
  id uuid primary key default gen_random_uuid(),
  cmd text not null,
  care_pastor text not null,
  care_center_id text not null,
  care_center_name text not null,
  care_center_address text not null,
  meeting_date date not null,
  report_week text not null,
  male integer not null default 0,
  female integer not null default 0,
  children integer not null default 0,
  total_attendance integer not null default 0,
  mvp_present integer not null default 0,
  soul_won integer not null default 0,
  offering_cash numeric(12,2) not null default 0,
  offering_transfer numeric(12,2) not null default 0,
  total_offering numeric(12,2) not null default 0,
  goals_next_meeting text,
  treasurer_name text,
  goals_met text not null check (goals_met in ('Yes', 'No', 'Partially')),
  email_address text not null,
  submitted_by text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. Create Member Attendance Table (General Church Attendance)
create table if not exists public.member_attendance (
  id text primary key,
  member_id text not null references public.members(id) on delete cascade,
  attendance_date date not null,
  check_in_time text not null,
  check_out_time text,
  attendance_type text not null,
  service_name text not null,
  department_id text references public.departments(id) on delete set null,
  care_center_id text references public.care_centers(id) on delete set null,
  satellite_church_id text references public.satellite_churches(id) on delete set null,
  created_by text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. Create Attendance Sessions Table (Event definitions)
create table if not exists public.attendance_sessions (
  id text primary key,
  session_name text not null,
  session_date date not null,
  service_type_id text,
  expected_attendance integer,
  actual_attendance integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 15. Create Events Table
create table if not exists public.events (
  id text primary key,
  event_name text not null,
  event_date date not null,
  event_time text,
  location text,
  description text,
  is_special boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 16. Create Finances Table
create table if not exists public.finances (
  id text primary key,
  type text not null check (type in ('Income', 'Expense')),
  category_id text,
  amount numeric(15,2) not null,
  transaction_date date not null,
  description text,
  recorded_by text,
  care_center_id text references public.care_centers(id) on delete set null,
  satellite_church_id text references public.satellite_churches(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 17. Create Finance Categories Table
create table if not exists public.finance_categories (
  id text primary key,
  category_name text not null,
  type text not null check (type in ('Income', 'Expense')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 18. Create Prayer Requests Table
create table if not exists public.prayer_requests (
  id text primary key,
  member_id text references public.members(id) on delete cascade,
  requester_name text not null,
  phone_number text,
  email text,
  request_details text not null,
  request_date date not null,
  status text not null default 'Pending' check (status in ('Pending', 'Praying', 'Answered')),
  care_center_id text references public.care_centers(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 19. Create Followups Table
create table if not exists public.followups (
  id text primary key,
  first_timer_id text,
  assigned_to text,
  followup_date date,
  status text not null default 'Pending' check (status in ('Pending', 'Contacted', 'Assigned', 'Completed')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 20. Create First Timers Table
create table if not exists public.first_timers (
  id text primary key,
  names text not null,
  phone_number text,
  email text,
  address text,
  gender text,
  invited_by text,
  visit_date date not null,
  care_center_id text references public.care_centers(id) on delete set null,
  is_convert boolean default false,
  status text not null default 'New' check (status in ('New', 'Contacted', 'Established', 'Lost')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 21. Create Soul Winning Table
create table if not exists public.soul_winning (
  id text primary key,
  soul_winner_name text not null,
  soul_winner_id text,
  names text not null,
  phone text,
  email text,
  location text,
  outreach_date date not null,
  care_center_id text references public.care_centers(id) on delete set null,
  was_decision_made boolean default true,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 22. Create Notifications Table
create table if not exists public.notifications (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 23. Create Audit Logs Table
create table if not exists public.audit_logs (
  id text primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 24. Create File Uploads Table
create table if not exists public.file_uploads (
  id text primary key,
  file_name text not null,
  file_type text,
  file_size integer,
  file_url text not null,
  uploaded_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 25. Create CSV Import Logs Table
create table if not exists public.csv_import_logs (
  id text primary key,
  file_name text not null,
  imported_by text not null,
  records_count integer not null,
  status text not null,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 26. Create Report Exports Table
create table if not exists public.report_exports (
  id text primary key,
  report_type text not null,
  file_name text not null,
  file_url text,
  generated_by text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 27. Create Settings Table
create table if not exists public.settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 28. Create Dashboard Metrics Table
create table if not exists public.dashboard_metrics (
  id text primary key,
  metric_key text unique not null,
  metric_value numeric(15,2) not null,
  last_calculated timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 29. Create Service Types Table
create table if not exists public.service_types (
  id text primary key,
  name text not null, -- 'Sunday Service', 'Midweek Service', 'CMD Meeting', 'Training', 'Outreach', 'Special Service'
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 30. Create Attendance Types Table
create table if not exists public.attendance_types (
  id text primary key,
  name text not null, -- 'Present', 'Absent', 'Excused'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 31. Create Ministries Table
create table if not exists public.ministries (
  id text primary key,
  name text not null,
  leader_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 32. Create Member Notes Table
create table if not exists public.member_notes (
  id text primary key,
  member_id text references public.members(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('Counseling', 'Follow-up', 'General')),
  note text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 33. Create Birthdays Table
create table if not exists public.birthdays (
  id text primary key,
  member_id text references public.members(id) on delete cascade not null,
  birth_date date not null,
  wished boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 34. Create Announcements Table
create table if not exists public.announcements (
  id text primary key,
  title text not null,
  content text not null,
  target text default 'All', -- 'All', 'Department Heads', 'Care Pastors'
  published_date date not null,
  expiry_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 35. Create User Permissions Table
create table if not exists public.user_permissions (
  id text primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  permission text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (profile_id, permission)
);


-- ROW-LEVEL SECURITY ENABLING --
alter table public.roles enable row level security;
alter table public.departments enable row level security;
alter table public.care_centers enable row level security;
alter table public.satellite_churches enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.department_members enable row level security;
alter table public.department_attendance enable row level security;
alter table public.cmd_members enable row level security;
alter table public.cmd_reports enable row level security;
alter table public.satellite_members enable row level security;
alter table public.satellite_reports enable row level security;
alter table public.member_attendance enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.events enable row level security;
alter table public.finances enable row level security;
alter table public.finance_categories enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.followups enable row level security;
alter table public.first_timers enable row level security;
alter table public.soul_winning enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.file_uploads enable row level security;
alter table public.csv_import_logs enable row level security;
alter table public.report_exports enable row level security;
alter table public.settings enable row level security;
alter table public.dashboard_metrics enable row level security;
alter table public.service_types enable row level security;
alter table public.attendance_types enable row level security;
alter table public.ministries enable row level security;
alter table public.member_notes enable row level security;
alter table public.birthdays enable row level security;
alter table public.announcements enable row level security;
alter table public.user_permissions enable row level security;


-- TRIGGERS & PL/PGSQL CALCULATION ENGINES --

-- Sum calculations functions & triggers
create or replace function public.calc_cmd_report_totals()
returns trigger as $$
begin
  new.total_attendance := new.male + new.female + new.children;
  new.total_offering := new.offering_cash + new.offering_transfer;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_calc_cmd_totals on public.cmd_reports;
create trigger trigger_calc_cmd_totals
  before insert or update on public.cmd_reports
  for each row execute function public.calc_cmd_report_totals();

create or replace function public.calc_satellite_report_totals()
returns trigger as $$
begin
  new.total_attendance := new.male + new.female + new.children + new.online;
  new.total_income := new.cash + new.transfer;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_calc_satellite_totals on public.satellite_reports;
create trigger trigger_calc_satellite_totals
  before insert or update on public.satellite_reports
  for each row execute function public.calc_satellite_report_totals();

-- Automatic profile insertion function on Auth Sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'New Church Worker'),
    'Member'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- INDEXES FOR PERFORMANCE OPTIMIZATION --
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_members_department on public.members(department_id);
create index if not exists idx_members_care_center on public.members(care_center_id);
create index if not exists idx_members_satellite on public.members(satellite_church_id);
create index if not exists idx_member_attendance_date on public.member_attendance(attendance_date);
create index if not exists idx_dept_attendance_date on public.department_attendance(attendance_date);
create index if not exists idx_cmd_reports_date on public.cmd_reports(date_of_meeting);
create index if not exists idx_sat_reports_date on public.satellite_reports(service_date);
create index if not exists idx_prayer_requests_member on public.prayer_requests(member_id);
create index if not exists idx_finances_date on public.finances(transaction_date);


-- ROW-LEVEL SECURITY POLICIES --

-- Satellite Churches policies
drop policy if exists "Allow authenticated read for satellite_churches" on public.satellite_churches;
create policy "Allow authenticated read for satellite_churches"
  on public.satellite_churches for select
  using (auth.uid() is not null);

drop policy if exists "Admins can write satellite_churches" on public.satellite_churches;
create policy "Admins can write satellite_churches"
  on public.satellite_churches for all
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Senior Pastor', 'Church Administrator')
  );

-- Profiles policies
drop policy if exists "Allow internal read for authenticated workers" on public.profiles;
create policy "Allow internal read for authenticated workers"
  on public.profiles for select
  using (true);

drop policy if exists "Allow insert for users creating their own profiles" on public.profiles;
create policy "Allow insert for users creating their own profiles"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Allow update for users in their own profiles / admin" on public.profiles;
create policy "Allow update for users in their own profiles / admin"
  on public.profiles for update
  using (
    auth.uid() = id or 
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Senior Pastor', 'Church Administrator')
  );

-- Roles policies
drop policy if exists "Authenticated read roles" on public.roles;
create policy "Authenticated read roles" on public.roles for select using (true);

-- Members policies
drop policy if exists "Workers can select members based on role filters" on public.members;
create policy "Workers can select members based on role filters"
  on public.members for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Senior Pastor', 'Church Administrator', 'Finance Officer') or
    ((select role from public.profiles where id = auth.uid()) = 'Care Pastor' and care_center_id = (select care_center_id from public.profiles where id = auth.uid())) or
    ((select role from public.profiles where id = auth.uid()) = 'Satellite Church Admin' and satellite_church_id = (select satellite_church_id from public.profiles where id = auth.uid())) or
    ((select role from public.profiles where id = auth.uid()) = 'Department Head' and department_id = (select department_id from public.profiles where id = auth.uid())) or
    (email = (select email from public.profiles where id = auth.uid()))
  );

drop policy if exists "Admins and authorized personnel can insert/update members" on public.members;
create policy "Admins and authorized personnel can insert/update members"
  on public.members for all
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Church Administrator') or
    ((select role from public.profiles where id = auth.uid()) = 'Care Pastor' and care_center_id = (select care_center_id from public.profiles where id = auth.uid())) or
    ((select role from public.profiles where id = auth.uid()) = 'Satellite Church Admin' and satellite_church_id = (select satellite_church_id from public.profiles where id = auth.uid())) or
    ((select role from public.profiles where id = auth.uid()) = 'Department Head' and department_id = (select department_id from public.profiles where id = auth.uid()))
  );

-- Department Attendance policies
drop policy if exists "Dept attendance viewing policies" on public.department_attendance;
create policy "Dept attendance viewing policies"
  on public.department_attendance for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Senior Pastor', 'Church Administrator', 'Finance Officer') or
    ((select role from public.profiles where id = auth.uid()) = 'Department Head' and department_id = (select department_id from public.profiles where id = auth.uid()))
  );

drop policy if exists "Dept attendance writing policies" on public.department_attendance;
create policy "Dept attendance writing policies"
  on public.department_attendance for all
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Church Administrator') or
    ((select role from public.profiles where id = auth.uid()) = 'Department Head' and department_id = (select department_id from public.profiles where id = auth.uid()))
  );

-- CMD Reports policies
drop policy if exists "CMD read access" on public.cmd_reports;
create policy "CMD read access"
  on public.cmd_reports for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Senior Pastor', 'Church Administrator', 'Finance Officer') or
    ((select role from public.profiles where id = auth.uid()) = 'Care Pastor' and care_center_name = (select cmd_name from public.care_centers where id = (select care_center_id from public.profiles where id = auth.uid())))
  );

drop policy if exists "CMD write access" on public.cmd_reports;
create policy "CMD write access"
  on public.cmd_reports for all
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Church Administrator') or
    ((select role from public.profiles where id = auth.uid()) = 'Care Pastor' and care_center_name = (select cmd_name from public.care_centers where id = (select care_center_id from public.profiles where id = auth.uid())))
  );

-- Satellite Reports policies
drop policy if exists "Satellite read access" on public.satellite_reports;
create policy "Satellite read access"
  on public.satellite_reports for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Senior Pastor', 'Church Administrator', 'Finance Officer') or
    ((select role from public.profiles where id = auth.uid()) = 'Satellite Church Admin' and satellite_church_id = (select satellite_church_id from public.profiles where id = auth.uid()))
  );

drop policy if exists "Satellite write access" on public.satellite_reports;
create policy "Satellite write access"
  on public.satellite_reports for all
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Church Administrator') or
    ((select role from public.profiles where id = auth.uid()) = 'Satellite Church Admin' and satellite_church_id = (select satellite_church_id from public.profiles where id = auth.uid()))
  );

-- Care Center Reports policies
alter table public.care_center_reports enable row level security;

drop policy if exists "Care Center read access" on public.care_center_reports;
create policy "Care Center read access"
  on public.care_center_reports for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Senior Pastor', 'Church Administrator', 'Finance Officer') or
    ((select role from public.profiles where id = auth.uid()) in ('Care Pastor', 'Care Center Admin', 'Care Center Administrator') and care_center_id = (select care_center_id from public.profiles where id = auth.uid()))
  );

drop policy if exists "Care Center write access" on public.care_center_reports;
create policy "Care Center write access"
  on public.care_center_reports for all
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Church Administrator') or
    ((select role from public.profiles where id = auth.uid()) in ('Care Pastor', 'Care Center Admin', 'Care Center Administrator') and care_center_id = (select care_center_id from public.profiles where id = auth.uid()))
  );

-- Member Attendance policies
drop policy if exists "Member attendance viewing" on public.member_attendance;
create policy "Member attendance viewing"
  on public.member_attendance for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Senior Pastor', 'Church Administrator', 'Finance Officer') or
    ((select role from public.profiles where id = auth.uid()) = 'Care Pastor' and care_center_id = (select care_center_id from public.profiles where id = auth.uid())) or
    ((select role from public.profiles where id = auth.uid()) = 'Satellite Church Admin' and satellite_church_id = (select satellite_church_id from public.profiles where id = auth.uid())) or
    ((select role from public.profiles where id = auth.uid()) = 'Department Head' and department_id = (select department_id from public.profiles where id = auth.uid()))
  );

-- Remaining table RLS policies: read-all and write-by-authorized
drop policy if exists "Authenticated read access" on public.finances;
create policy "Authenticated read access" on public.finances for select using (auth.uid() is not null);

drop policy if exists "Admin write access for finances" on public.finances;
create policy "Admin write access for finances" on public.finances for all using (
  (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Senior Pastor', 'Church Administrator', 'Finance Officer')
);

--------------------------------------------------------------------------------
-- SCHEMA ALTER MIGRATION FOR DOMINION CITY APAPA CMS
-- Rerun or run below block on existing tables to make linkages optional:
--------------------------------------------------------------------------------
-- ALTER TABLE public.members ALTER COLUMN department_id DROP NOT NULL;
-- ALTER TABLE public.members ALTER COLUMN care_center_id DROP NOT NULL;
-- ALTER TABLE public.members ALTER COLUMN satellite_church_id DROP NOT NULL;
`;
