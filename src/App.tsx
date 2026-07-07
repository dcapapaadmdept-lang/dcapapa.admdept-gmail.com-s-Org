import React, { useState, useEffect } from 'react';
import {
  api,
  getSupabaseConfig,
  getSupabaseClient,
  resetSupabaseConfig
} from './supabaseClient';
import {
  Profile,
  Member,
  Department,
  CareCenter,
  SatelliteChurch,
  MemberAttendance,
  DepartmentAttendance,
  CmdReport,
  SatelliteReport,
  CareCenterReport,
  StartupQueryTrace,
  UserRole
} from './types';
import MySatelliteChurchView from './components/MySatelliteChurchView';
import ProfileView from './components/ProfileView';
import DashboardView from './components/DashboardView';
import MemberManagementView from './components/MemberManagementView';
import AttendanceView from './components/AttendanceView';
import CmdReportsView from './components/CmdReportsView';
import SatelliteReportsView from './components/SatelliteReportsView';
import CareCenterReportsView from './components/CareCenterReportsView';
import SupabaseConfigPanel from './components/SupabaseConfigPanel';
import SupabaseHealthCheckView from './components/SupabaseHealthCheckView';
import UserManagementView from './components/UserManagementView';
import FinanceView from './components/FinanceView';
import LoginScreen from './components/LoginScreen';
import CmdDirectorPortal from './components/CmdDirectorPortal';
import DepartmentsView from './components/DepartmentsView';
import Logo from './components/Logo';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileSpreadsheet,
  Radio,
  Database,
  Building,
  Heart,
  Clock,
  LogOut,
  MapPin,
  Sparkles,
  ExternalLink,
  Layers,
  Coins,
  User,
  Shield,
  ShieldCheck,
  Menu,
  X,
  Bell
} from 'lucide-react';

const getTabFromPathname = (pathname: string): any => {
  const cleanPath = pathname.replace(/\/$/, '').toLowerCase();
  if (cleanPath.endsWith('/dashboard')) return 'dashboard';
  if (cleanPath.endsWith('/members')) return 'members';
  if (cleanPath.endsWith('/leaders')) return 'leaders';
  if (cleanPath.endsWith('/attendance')) return 'attendance';
  if (cleanPath.endsWith('/reports')) return 'sat_reports';
  if (cleanPath.endsWith('/finance')) return 'finance';
  if (cleanPath.endsWith('/my-satellite-church')) return 'my_church';
  if (cleanPath.endsWith('/profile')) return 'profile';
  if (cleanPath.endsWith('/cmd-reports')) return 'cmd_reports';
  if (cleanPath.endsWith('/care-center-reports')) return 'care_center_reports';
  if (cleanPath.endsWith('/users')) return 'users';
  if (cleanPath.endsWith('/supabase-settings')) return 'supabase_settings';
  if (cleanPath.endsWith('/supabase-health-check')) return 'supabase_health_check';
  if (cleanPath.endsWith('/notifications')) return 'notifications';
  if (cleanPath.endsWith('/departments')) return 'departments';
  return null;
};

const getPathnameFromTab = (tab: string): string => {
  switch (tab) {
    case 'dashboard': return '/dashboard';
    case 'members': return '/members';
    case 'leaders': return '/leaders';
    case 'attendance': return '/attendance';
    case 'sat_reports': return '/reports';
    case 'finance': return '/finance';
    case 'my_church': return '/my-satellite-church';
    case 'profile': return '/profile';
    case 'cmd_reports': return '/cmd-reports';
    case 'care_center_reports': return '/care-center-reports';
    case 'users': return '/users';
    case 'supabase_settings': return '/supabase-settings';
    case 'supabase_health_check': return '/supabase-health-check';
    case 'notifications': return '/notifications';
    case 'departments': return '/departments';
    default: return '/dashboard';
  }
};

const isTabAuthorized = (tab: string, role: string): boolean => {
  if (role === 'Super Admin') {
    return true;
  }
  if (role === 'Admin') {
    return ['dashboard', 'members', 'leaders', 'attendance', 'sat_reports', 'cmd_reports', 'care_center_reports', 'finance', 'users', 'profile', 'my_church', 'notifications', 'departments'].includes(tab);
  }
  if (['CMD', 'Church Ministry Director'].includes(role)) {
    return ['dashboard', 'care_centers', 'care_center_reports', 'members', 'attendance', 'profile'].includes(tab);
  }
  const isSatAdmin = ['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role);
  if (isSatAdmin) {
    return ['dashboard', 'members', 'leaders', 'attendance', 'sat_reports', 'finance', 'my_church', 'profile'].includes(tab);
  }
  const isCareCenterAdmin = ['Care Center Admin', 'Care Center Administrator', 'Care Pastor'].includes(role);
  if (isCareCenterAdmin) {
    return ['dashboard', 'members', 'attendance', 'care_center_reports', 'profile'].includes(tab);
  }
  const isDeptAdmin = ['Department Head', 'Department Admin', 'Department Administrator'].includes(role);
  if (isDeptAdmin) {
    return ['dashboard', 'leaders', 'attendance', 'cmd_reports', 'profile', 'departments'].includes(tab);
  }
  const isMember = ['Member'].includes(role) || !role;
  if (isMember) {
    return ['profile', 'attendance', 'sat_reports', 'notifications'].includes(tab);
  }
  return false;
};

export default function App() {
  // 1. App Tab Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'leaders' | 'attendance' | 'cmd_reports' | 'sat_reports' | 'supabase_settings' | 'supabase_health_check' | 'care_center_reports' | 'users' | 'finance' | 'my_church' | 'profile' | 'notifications' | 'departments'>(() => {
    const path = window.location.pathname;
    const tabFromPath = getTabFromPathname(path);
    if (tabFromPath) return tabFromPath;

    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const validPages = ['dashboard', 'members', 'leaders', 'attendance', 'cmd_reports', 'sat_reports', 'supabase_settings', 'supabase_health_check', 'care_center_reports', 'users', 'finance', 'my_church', 'profile', 'notifications', 'departments'];
    if (page && validPages.includes(page)) {
      return page as any;
    }
    return 'dashboard';
  });

  // Listen for browser back/forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const tabFromPath = getTabFromPathname(window.location.pathname);
      if (tabFromPath) {
        setActiveTab(tabFromPath);
      } else {
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page');
        const validPages = ['dashboard', 'members', 'leaders', 'attendance', 'cmd_reports', 'sat_reports', 'supabase_settings', 'supabase_health_check', 'care_center_reports', 'users', 'finance', 'my_church', 'profile', 'notifications'];
        if (page && validPages.includes(page)) {
          setActiveTab(page as any);
        } else {
          setActiveTab('dashboard');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Synchronize activeTab state to URL pathname to support deep linking and proper route page behavior
  useEffect(() => {
    const targetPath = getPathnameFromTab(activeTab);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [activeTab]);

  // 1.5 Secure Authentication gate state
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);
  const [showAuthGate, setShowAuthGate] = useState<boolean>(false);

  // 1.8 Mobile Navigation Drawer open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1.7 Impersonation state (completely disabled in compliance with security guidelines)

  // 2. Active Logged-In Profile
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  // 3. Database States
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [careCenters, setCareCenters] = useState<CareCenter[]>([]);
  const [satelliteChurches, setSatelliteChurches] = useState<SatelliteChurch[]>([]);
  const [memberAttendance, setMemberAttendance] = useState<MemberAttendance[]>([]);
  const [departmentAttendance, setDepartmentAttendance] = useState<DepartmentAttendance[]>([]);
  const [cmdReports, setCmdReports] = useState<CmdReport[]>([]);
  const [satelliteReports, setSatelliteReports] = useState<SatelliteReport[]>([]);
  const [careCenterReportsList, setCareCenterReportsList] = useState<CareCenterReport[]>([]);

  // 3.5 Real-Time Diagnostic States (Requirements 1, 2, 3, 4, 8, 9 & 10)
  const [membersQueryError, setMembersQueryError] = useState<string | null>(null);
  const [satelliteChurchesQueryError, setSatelliteChurchesQueryError] = useState<string | null>(null);
  const [totalSupabaseRecords, setTotalSupabaseRecords] = useState<number | null>(null);
  const [lastExecutedQuery, setLastExecutedQuery] = useState<string>('');
  const [startupTraces, setStartupTraces] = useState<StartupQueryTrace[]>([]);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [profileCreationWarning, setProfileCreationWarning] = useState<string | null>(null);

  // 4. Loading State
  const [loading, setLoading] = useState(true);

  // Helper to run query with 10s timeout, recording execution trace & errors (Requirements 1, 2, 3)
  const executeWithTrace = async <T,>(
    queryName: string,
    tableName: string,
    promiseFn: () => Promise<T>,
    timeoutMs = 10000
  ): Promise<T> => {
    const startTime = performance.now();
    
    // Set pending status in traces
    setStartupTraces(prev => {
      const idx = prev.findIndex(t => t.queryName === queryName);
      const newTrace: StartupQueryTrace = {
        queryName,
        tableName,
        durationMs: null,
        status: 'PENDING',
        errorMessage: null
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newTrace;
        return copy;
      }
      return [...prev, newTrace];
    });

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: Query '${queryName}' on table '${tableName}' failed to resolve within ${timeoutMs / 1000}s`)), timeoutMs)
      );
      const data = await Promise.race([promiseFn(), timeoutPromise]);
      const duration = Math.round(performance.now() - startTime);

      setStartupTraces(prev =>
        prev.map(t => t.queryName === queryName ? { ...t, status: 'SUCCESS', durationMs: duration } : t)
      );
      return data;
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      const isTimeout = err?.message?.toLowerCase().includes('timeout');
      const errMsg = err?.message || err?.details || JSON.stringify(err) || 'CORS network block or database connection refused';

      setStartupTraces(prev =>
        prev.map(t => t.queryName === queryName ? {
          ...t,
          status: isTimeout ? 'TIMEOUT' : 'FAILED',
          durationMs: duration,
          errorMessage: errMsg
        } : t)
      );

      throw err;
    }
  };

  // Synchronize dynamic databases with exact traces and 10s timeout boundaries (Requirements 1, 3, 5, 8)
  const syncDatabaseTables = async (profile: Profile) => {
    if (!profile) {
      throw new Error("Active administrative profile is not defined. Cannot scan live database tables.");
    }
    const executedQuery = `supabase.from('members').select('*').order('names', { ascending: true })`;
    setLastExecutedQuery(executedQuery);

    try {
      console.log(`[STARTUP AUDIT ENGINE] Triggering parallelized secure query sequence...`);
      
      const fetchTable = async <T,>(
        queryName: string,
        tableName: string,
        apiCall: () => Promise<T>,
        fallbackSelector: () => T
      ): Promise<T> => {
        try {
          const res = await executeWithTrace(queryName, tableName, apiCall, 10000);
          if (tableName === 'satellite_churches') {
            setSatelliteChurchesQueryError(null);
          }
          return res;
        } catch (err: any) {
          console.warn(`[SYNC TABLE FALLBACK] Table '${tableName}' query '${queryName}' failed/timed out.`);
          const errMsg = err?.message || err?.details || JSON.stringify(err) || 'CORS network block or database connection refused';
          
          if (errMsg.toLowerCase().includes('failed to fetch') || errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network')) {
            console.warn('[SYNC] Connection to Supabase is offline/unreachable.');
          }

          if (tableName === 'members') {
            setMembersQueryError(errMsg);
          }
          if (tableName === 'satellite_churches') {
            setSatelliteChurchesQueryError(errMsg);
          }
          return fallbackSelector();
        }
      };

      const [
        mems,
        depts,
        centers,
        sats,
        mAttendance,
        dAttendance,
        cReports,
        sReports,
        ccReports
      ] = await Promise.all([
        fetchTable('Load Members Directory', 'members', () => api.getMembers(profile), () => []),
        fetchTable('Load Church Departments', 'departments', () => api.getDepartments(profile), () => []),
        fetchTable('Load CMD Care Centers', 'care_centers', () => api.getCareCenters(profile), () => []),
        fetchTable('Load Satellite Branches', 'satellite_churches', () => api.getSatelliteChurches(profile), () => []),
        fetchTable('Load Member Attendance Roll', 'member_attendance', () => api.getMemberAttendance(profile), () => []),
        fetchTable('Load Dept Attendance Matrix', 'department_attendance', () => api.getDepartmentAttendance(profile), () => []),
        fetchTable('Load CMD Cell Reports', 'cmd_reports', () => api.getCmdReports(profile), () => []),
        fetchTable('Load Satellite Reports Log', 'satellite_reports', () => api.getSatelliteReports(profile), () => []),
        fetchTable('Load Care Center Reports Log', 'care_center_reports', () => api.getCareCenterReports(profile), () => [])
      ]);

      // Measure total count
      let totalCount: number | null = null;
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const res = await executeWithTrace<any>(
            'Fetch Total Row Count',
            'members',
            async () => {
              const queryRes = await supabase.from('members').select('*', { count: 'exact', head: true });
              return queryRes;
            },
            10000
          );
          if (res && !res.error && res.count !== null) {
            totalCount = res.count;
          }
        }
      } catch (err: any) {
        console.warn('[AUDIO WARNING] Silence total count probe failure:', err);
      }

      setMembers(mems);
      if (totalCount !== null) {
        setTotalSupabaseRecords(totalCount);
      } else {
        setTotalSupabaseRecords(mems.length);
      }
      setDepartments(depts);
      setCareCenters(centers);
      setSatelliteChurches(sats);
      setMemberAttendance(mAttendance);
      setDepartmentAttendance(dAttendance);
      setCmdReports(cReports);
      setSatelliteReports(sReports);
      setCareCenterReportsList(ccReports);

      const conf = getSupabaseConfig();
      printSystemInteractionAudit(
        conf.isConfigured,
        conf.url,
        profile?.email || 'Unknown',
        profile?.role || 'No Role',
        mems.length,
        null
      );
    } catch (err: any) {
      console.warn('[SYNC SYSTEM GRACE FAILED] Error caught inside sync router:', err);
      const errMsg = err?.message || err?.details || JSON.stringify(err) || 'CORS network block or database connection refused';
      setStartupError(`Database sync failed: ${errMsg}`);
      
      setMembers([]);
      setTotalSupabaseRecords(0);
      setDepartments([]);
      setCareCenters([]);
      setSatelliteChurches([]);
      setMemberAttendance([]);
      setDepartmentAttendance([]);
      setCmdReports([]);
      setSatelliteReports([]);
      setCareCenterReportsList([]);
      throw err;
    }
  };

  // Resolve or create profile for authenticated user (Requirements 1, 2, 3, 4, 5, 6)
  const resolveOrCreateUserProfile = async (user: any): Promise<Profile> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client is not initialized.");
    }

    // 2. Query profiles where id = auth.user.id with retry loop for auth trigger latency
    let existingProfile: Profile | null = null;
    let lastQueryErr: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[AUTH] Querying profiles (Attempt ${attempt}/3) where id = auth.user.id:`, user.id);
      try {
        const { data, error: qErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (qErr) {
          lastQueryErr = qErr;
          console.warn(`[AUTH] Attempt ${attempt} query error:`, qErr);
          const msg = qErr?.message || '';
          if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
            throw qErr;
          }
        } else if (data) {
          existingProfile = data as Profile;
          break;
        }
      } catch (queryEx: any) {
        lastQueryErr = queryEx;
        console.warn(`[AUTH] Attempt ${attempt} query threw exception:`, queryEx);
        const errMsg = queryEx?.message || String(queryEx);
        if (errMsg.toLowerCase().includes('failed to fetch') || errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('fetch')) {
          throw queryEx;
        }
      }

      if (attempt < 3) {
        console.log('[AUTH] Profile not found yet. Retrying in 400ms to allow db trigger creation...');
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }

    if (existingProfile) {
      console.log('[AUTH] Matching profile record located:', existingProfile);
      return existingProfile;
    }

    if (lastQueryErr) {
      console.error('[AUTH] Failed looking up profile during all retry attempts:', lastQueryErr);
    }

    // 3. If no profile record exists: Automatically create one
    console.log('[AUTH] No profile record exists. Automatically creating one...');

    // Fields:
    // * id = auth.user.id
    // * email = auth.user.email
    // * full_name = auth.user.email
    // * role = 'Super Admin' ('super_admin') for first user, otherwise 'Member' ('member')
    
    let isFirstUser = false;
    try {
      const { data: allProfs, error: countErr } = await supabase
        .from('profiles')
        .select('id');
      if (!countErr && (!allProfs || allProfs.length === 0)) {
        isFirstUser = true;
      }
    } catch (err) {
      console.warn('[AUTH] Error scanning first user status - defaulting to false:', err);
    }

    const metaFullName = user.user_metadata?.full_name || '';
    const metaRole = user.user_metadata?.role;
    const metaSatellite = user.user_metadata?.satellite_church_id;

    const mappedRole: UserRole = isFirstUser ? 'Super Admin' : (metaRole || 'Member') as any;

    const newProfile: Profile = {
      id: user.id,
      email: user.email || '',
      full_name: metaFullName || user.email || '',
      role: mappedRole,
      satellite_church_id: metaSatellite || undefined,
      created_at: new Date().toISOString(),
      status: 'Active'
    };

    console.log('[AUTH] Attempting to insert auto-created profile:', newProfile);
    try {
      const { error: insertErr } = await supabase
        .from('profiles')
        .insert(newProfile);

      if (insertErr) {
        console.error('[AUTH] Auto-profile creation failed in Supabase:', insertErr);
        setProfileCreationWarning(`Supabase Profiles table Row-Level Security: new row violates policy. Loaded temporary local session of role '${mappedRole}' for '${user.email}'. Please run the provided SQL schema updates in the "Supabase & SQL DDL" panel to authorize profiles insertion.`);
      }
    } catch (insertEx: any) {
      console.error('[AUTH] Auto-profile insertion threw exception:', insertEx);
      setProfileCreationWarning(`Network error or security block attempting to write profile row: '${insertEx?.message || 'Failed to fetch'}'`);
    }

    return newProfile;
  };

  // Safe manual sign out
  const handleSignOut = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('dccms_offline_profile_id');
        sessionStorage.removeItem('dccms_network_suspended');
      }
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[AUTH] Error during sign out:', err);
    } finally {
      setAuthenticatedUser(null);
      setActiveProfile(null);
      setShowAuthGate(true);
      setLoading(false);
    }
  };

  const printSystemInteractionAudit = (
    isConnected: boolean,
    projectUrl: string,
    authEmail: string | null,
    role: string | null,
    recordsCount: number,
    errors: string | null
  ) => {
    console.log('=============== SYSTEM INTERACTION AUDIT LOG (Requirements 11 & 12) ===============');
    console.log(`📡 Connected Project Url : ${projectUrl || 'Not Configured'}`);
    console.log(`🔐 Authenticated User    : ${authEmail || 'Anonymous / Guest'}`);
    console.log(`🥋 User Role Context     : ${role || 'No Active Role Assigned'}`);
    console.log(`📊 Loaded Members Count   : ${recordsCount}`);
    console.log(`⚠️ Active Query Faults    : ${errors || 'None (All systems nominal)'}`);
    console.log(`🎮 Connected Database    : ${isConnected ? 'LIVE (Real Supabase Instance)' : 'DISCONNECTED'}`);
    console.log('====================================================================================');
  };

  // Init client databases and seed files securely with single try-catch safeguard (Requirements 4, 10 & 11)
  useEffect(() => {
    const bootstrapApplication = async () => {
      setLoading(true);
      setStartupError(null);
      setMembersQueryError(null);

      try {
        const configInfo = getSupabaseConfig();
        const { isConfigured } = configInfo;
        const supabase = getSupabaseClient();

        // No offline session restoration anymore - strict live mode only

        if (isConfigured && supabase) {
          // 1. Load authenticated user first (Requirement 3)
          console.log('[BOOTSTRAP] Step 1: Querying active Supabase Auth user session...');
          
          let authUser: any = null;
          try {
            const { data: { user }, error: authUserErr } = await supabase.auth.getUser();
            if (authUserErr) {
              console.warn('[BOOTSTRAP] No user session found or token expired:', authUserErr);
            } else {
              authUser = user;
            }
          } catch (authGateErr: any) {
            console.warn('[BOOTSTRAP] Auth state lookup exception thrown:', authGateErr);
            throw authGateErr;
          }

          if (!authUser) {
            // No authenticated user exists, redirect to login (set gate true, loading false)
            console.log('[BOOTSTRAP] No active session. Redirecting to auth gate.');
            setAuthenticatedUser(null);
            setShowAuthGate(true);
            setLoading(false);
            printSystemInteractionAudit(isConfigured, configInfo.url, null, null, 0, 'No active session (Redirected to login)');
            return;
          }

          // User exists!
          console.log('[BOOTSTRAP] Step 1 Securely Authenticated:', authUser.email);
          setAuthenticatedUser(authUser);
          setShowAuthGate(false);

          // 2. Then load profile record (Requirement 4)
          console.log('[BOOTSTRAP] Step 2: Resolving profile record details...');
          const userProfile = await resolveOrCreateUserProfile(authUser);
          
          if (userProfile) {
            console.log('[BOOTSTRAP] Step 2 Profile loaded successfully. Role:', userProfile.role);
            
            // Check status immediately during start check
            if (userProfile.status && userProfile.status !== 'Active') {
              console.warn('[BOOTSTRAP] Profile loaded but state is non-Active:', userProfile.status);
              setStartupError(`Access Restricted: Your account has been designated as '${userProfile.status}'. Only Active workers can access the portal.`);
              setAuthenticatedUser(null);
              setActiveProfile(null);
              setShowAuthGate(true);
              setLoading(false);
              try {
                await supabase.auth.signOut();
              } catch (ign) {}
              return;
            }

            setActiveProfile(userProfile);
          } else {
            console.warn('[BOOTSTRAP WARNING] Profile loaded as undefined.');
            throw new Error("Unable to locate active profile for this session.");
          }

          // 3. Then execute syncing of database tables (Requirement 5)
          console.log('[BOOTSTRAP] Step 3: Synchronizing members collection from database...');
          await syncDatabaseTables(userProfile);

        } else {
          throw new Error("Unable to connect to the church database.");
        }

      } catch (err: any) {
        console.warn('[CRITICAL SCHEMATIC BOOT ALERT] Secure database initialization aborted:', err);
        const specificErrMsg = err?.message || "Unable to connect to the church database.";
        setStartupError(specificErrMsg);
        setMembersQueryError(specificErrMsg);
        setAuthenticatedUser(null);
        setShowAuthGate(true);
      } finally {
        // Unconditionally terminate startup spinner to prevent infinite loading screens (Requirements 4, 10 & 11)
        setLoading(false);
      }
    };

    bootstrapApplication();
  }, []);

  // Fetch / Refresh data from API Bridge (applying role RLS filters in real-time)
  const refreshDatabase = async () => {
    const profileToUse = activeProfile;
    if (!profileToUse) return;
    setMembersQueryError(null);
    setStartupError(null);

    try {
      await syncDatabaseTables(profileToUse);
    } catch (err: any) {
      console.error('[MANUAL REFRESH DIAL FAILURE] Error reloading:', err);
      const errMsg = err?.message || err?.details || JSON.stringify(err) || 'Database access restricted by Row-Level Security Rules';
      setMembersQueryError(errMsg);
    }
  };

  // Trigger table loads as profiles or tabs change
  useEffect(() => {
    if (activeProfile && !loading) {
      refreshDatabase();
    }
  }, [activeProfile, activeTab]);

  // Support Supabase real-time subscriptions to all specified tables (Requirement: Supabase Live Data Synchronization Repair)
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    console.log('Subscribing to real-time changes on all public tables...');
    const tablesToSync = [
      'members',
      'departments',
      'care_centers',
      'satellite_churches',
      'member_attendance',
      'department_attendance',
      'care_center_reports',
      'satellite_reports',
      'cmd_reports',
      'finances',
      'finance_categories',
      'profiles',
      'finance_accounts',
      'finance_transactions'
    ];

    let channel = supabase.channel('public-realtime-all-tables-sync');

    tablesToSync.forEach((tableName) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        (payload) => {
          console.log(`[REALTIME DB CHANGED] Event on Table '${tableName}':`, payload);
          // Auto-refresh when records change on any specified table
          refreshDatabase();
        }
      );
    });

    channel.subscribe((status) => {
      console.log('Real-time database subscription status:', status);
    });

    return () => {
      console.log('Cleaning up real-time all-table subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [activeProfile]);

  // Redirect unauthorized default tab visits to permitted homepages
  useEffect(() => {
    if (activeProfile) {
      const isAuth = isTabAuthorized(activeTab, activeProfile.role);
      if (!isAuth) {
        if (activeTab === 'dashboard') {
          const defaultTab = ['Member'].includes(activeProfile.role) ? 'profile' : 'dashboard';
          if (defaultTab !== 'dashboard') {
            setActiveTab(defaultTab);
          }
        }
      }
    }
  }, [activeProfile, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" id="loading-church-registries-shield">
        <div className="text-center space-y-4">
          <Logo width={120} height={120} className="mx-auto animate-pulse" />
          <div className="w-8 h-8 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">Dominion City Apapa DCCMS</p>
          <p className="text-[11px] text-slate-400 font-semibold">Loading secure church registries & setting RLS policies...</p>
        </div>
      </div>
    );
  }

  if (showAuthGate && !authenticatedUser) {
    return (
      <LoginScreen
        resolveProfile={resolveOrCreateUserProfile}
        onAuthSuccess={(user, profile) => {
          setAuthenticatedUser(user);
          setActiveProfile(profile);
          setShowAuthGate(false);
          refreshDatabase();
        }}
      />
    );
  }

  // Double check profile exists (fallback inside active profile)
  const safeActiveProfile = activeProfile || {
    id: 'prof-admin',
    email: 'dcapapa.admdept@gmail.com',
    full_name: 'Admin Auditor',
    role: 'Super Admin' as UserRole,
    created_at: ''
  };

  // Permission Checks for Navigation tabs visibility
  const showCmdTab = ['Super Admin', 'Admin', 'Senior Pastor', 'Church Administrator', 'Care Pastor', 'Finance Officer'].includes(safeActiveProfile.role);
  const showSatTab = ['Super Admin', 'Admin', 'Senior Pastor', 'Church Administrator', 'Satellite Church Admin', 'satellite_admin', 'Satellite Admin', 'Finance Officer'].includes(safeActiveProfile.role);
  const showCareCenterTab = ['Super Admin', 'Admin', 'Senior Pastor', 'Church Administrator', 'Care Pastor', 'Care Center Admin', 'Care Center Administrator', 'Finance Officer'].includes(safeActiveProfile.role);
  const showFinanceTab = ['Super Admin', 'Admin', 'Senior Pastor', 'Church Administrator', 'Satellite Church Admin', 'satellite_admin', 'Satellite Admin', 'Finance Officer'].includes(safeActiveProfile.role);

  const renderSidebarContent = (isMobile = false) => {
    const handleTabClick = (tab: any) => {
      setActiveTab(tab);
      if (isMobile) {
        setMobileMenuOpen(false);
      }
    };

    const role = safeActiveProfile.role;
    const isSuperAdmin = role === 'Super Admin';
    const isAdmin = role === 'Admin';
    const isSatAdmin = ['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role);
    const isCareCenterAdmin = ['Care Center Admin', 'Care Center Administrator', 'Care Pastor'].includes(role);
    const isDeptAdmin = ['Department Head', 'Department Admin', 'Department Administrator'].includes(role);
    const isMember = ['Member'].includes(role) || (!isSuperAdmin && !isAdmin && !isSatAdmin && !isCareCenterAdmin && !isDeptAdmin);

    const getAssignedUnitName = (userRole: string) => {
      if (['Super Admin', 'Admin'].includes(userRole)) {
        return 'Dominion City Apapa Head Church';
      }
      if (['CMD', 'Church Ministry Director'].includes(userRole)) {
        return safeActiveProfile.assigned_cmd_name || 'Apapa Central CMD';
      }
      const isSat = ['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(userRole);
      if (isSat) {
        const s = satelliteChurches.find(sc => sc.id === safeActiveProfile.satellite_church_id);
        return s ? s.church_name : 'Assigned Satellite Church';
      }
      const isCC = ['Care Center Admin', 'Care Center Administrator', 'Care Pastor'].includes(userRole);
      if (isCC) {
        const c = careCenters.find(cc => cc.id === safeActiveProfile.care_center_id);
        return c ? c.cmd_name : 'Assigned Care Center';
      }
      const isDept = ['Department Head', 'Department Admin', 'Department Administrator'].includes(userRole);
      if (isDept) {
        const d = departments.find(dp => dp.id === safeActiveProfile.department_id);
        return d ? d.department_name : 'Assigned Department';
      }
      return 'Congregant';
    };

    const getNavigationForRole = (userRole: string) => {
      const items: any[] = [];
      const isSuper = userRole === 'Super Admin';
      const isAdm = userRole === 'Admin';
      const isCMD = ['CMD', 'Church Ministry Director'].includes(userRole);
      const isSat = ['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(userRole);
      const isCC = ['Care Center Admin', 'Care Center Administrator', 'Care Pastor'].includes(userRole);
      const isDept = ['Department Head', 'Department Admin', 'Department Administrator'].includes(userRole);

      if (isSuper) {
        items.push(
          { id: 'dashboard', label: 'Church Dashboard', icon: LayoutDashboard, tab: 'dashboard' },
          { id: 'members', label: 'Members Directory', icon: Users, tab: 'members', badge: members.filter(m => m.person_type === 'Member' || !m.person_type).length },
          { id: 'leaders', label: 'Leaders & Workers Directory', icon: ShieldCheck, tab: 'leaders', badge: members.filter(m => m.person_type === 'Leader & Worker').length },
          { id: 'attendance', label: 'Attendance Register', icon: CalendarCheck, tab: 'attendance' },
          { id: 'cmd_reports', label: 'CMD Cell Reports', icon: FileSpreadsheet, tab: 'cmd_reports', badge: cmdReports.length },
          { id: 'departments', label: 'Departments Registry', icon: Building, tab: 'departments', badge: departments.length },
          { id: 'sat_reports', label: 'Satellite Branches', icon: Radio, tab: 'sat_reports', badge: satelliteReports.length },
          { id: 'finance', label: 'Finance Ledger', icon: Coins, tab: 'finance' },
          { id: 'care_center_reports', label: 'Care Center Reports', icon: Heart, tab: 'care_center_reports', badge: careCenterReportsList.length },
          { id: 'users', label: 'User Accounts & Roles', icon: Users, tab: 'users' },
          { id: 'supabase_settings', label: 'Supabase & SQL DDL', icon: Database, tab: 'supabase_settings' },
          { id: 'supabase_health_check', label: 'Supabase Health Check', icon: Heart, tab: 'supabase_health_check' },
          { id: 'my_church', label: 'My Satellite Church', icon: Building, tab: 'my_church' },
          { id: 'profile', label: 'Profile', icon: User, tab: 'profile' }
        );
      } else if (isAdm) {
        items.push(
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tab: 'dashboard' },
          { id: 'members', label: 'Members', icon: Users, tab: 'members' },
          { id: 'leaders', label: 'Leaders & Workers', icon: ShieldCheck, tab: 'leaders' },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck, tab: 'attendance' },
          { id: 'sat_reports', label: 'Reports', icon: Radio, tab: 'sat_reports' },
          { id: 'finance', label: 'Finance', icon: Coins, tab: 'finance' },
          { id: 'care_center_reports', label: 'Care Centers', icon: Heart, tab: 'care_center_reports' },
          { id: 'my_church', label: 'Satellite Churches', icon: Building, tab: 'my_church' },
          { id: 'cmd_reports', label: 'CMD Cell Reports', icon: FileSpreadsheet, tab: 'cmd_reports' },
          { id: 'departments', label: 'Departments', icon: Building, tab: 'departments' },
          { id: 'profile', label: 'Profile', icon: User, tab: 'profile' }
        );
      } else if (isCMD) {
        items.push(
          { id: 'dashboard', label: 'CMD Dashboard', icon: LayoutDashboard, tab: 'dashboard' },
          { id: 'care_centers', label: 'Care Centres', icon: Building, tab: 'care_centers' },
          { id: 'care_center_reports', label: 'Cell Reports', icon: FileSpreadsheet, tab: 'care_center_reports' },
          { id: 'members', label: 'Cell Members', icon: Users, tab: 'members' },
          { id: 'attendance', label: 'Cell Attendance', icon: CalendarCheck, tab: 'attendance' },
          { id: 'profile', label: 'My Profile', icon: User, tab: 'profile' }
        );
      } else if (isSat) {
        items.push(
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tab: 'dashboard' },
          { id: 'members', label: 'Members', icon: Users, tab: 'members' },
          { id: 'leaders', label: 'Leaders & Workers', icon: ShieldCheck, tab: 'leaders' },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck, tab: 'attendance' },
          { id: 'sat_reports', label: 'Reports', icon: Radio, tab: 'sat_reports' },
          { id: 'finance', label: 'Finance', icon: Coins, tab: 'finance' },
          { id: 'my_church', label: 'My Satellite Church', icon: Building, tab: 'my_church' },
          { id: 'profile', label: 'Profile', icon: User, tab: 'profile' }
        );
      } else if (isCC) {
        items.push(
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tab: 'dashboard' },
          { id: 'members', label: 'Members', icon: Users, tab: 'members' },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck, tab: 'attendance' },
          { id: 'care_center_reports', label: 'Reports', icon: Radio, tab: 'care_center_reports' },
          { id: 'profile', label: 'Profile', icon: User, tab: 'profile' }
        );
      } else if (isDept) {
        items.push(
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tab: 'dashboard' },
          { id: 'leaders', label: 'Leaders & Workers', icon: ShieldCheck, tab: 'leaders' },
          { id: 'attendance', label: 'Department Attendance', icon: CalendarCheck, tab: 'attendance' },
          { id: 'cmd_reports', label: 'Reports', icon: FileSpreadsheet, tab: 'cmd_reports' },
          { id: 'departments', label: 'Departments', icon: Building, tab: 'departments' },
          { id: 'profile', label: 'Profile', icon: User, tab: 'profile' }
        );
      } else {
        // Member
        items.push(
          { id: 'profile', label: 'My Profile', icon: User, tab: 'profile' },
          { id: 'attendance', label: 'My Attendance', icon: CalendarCheck, tab: 'attendance' },
          { id: 'sat_reports', label: 'My Reports', icon: Radio, tab: 'sat_reports' },
          { id: 'notifications', label: 'Notifications', icon: Bell, tab: 'notifications' }
        );
      }
      return items;
    };

    const outerContainerClass = isMobile
      ? "flex flex-col space-y-5 h-full"
      : "bg-[#0f172a] rounded-xl border border-slate-800 p-4 shadow-md space-y-5";

    return (
      <div className={outerContainerClass}>
        {/* Sidebar Header Brand Logo */}
        <div className="bg-[#1e293b]/40 p-4 rounded-xl border border-slate-800/60 text-center flex flex-col items-center">
          <Logo width={80} height={80} className="mx-auto" />
          <h2 className="mt-3 font-black text-white text-xs tracking-wider uppercase font-sans">
            DOMINION CITY APAPA
          </h2>
          <p className="text-[9px] text-slate-400 font-bold font-mono uppercase tracking-widest mt-1">
            Church Management System
          </p>
        </div>

        {/* Profile Summary Widget */}
        <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-800 text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-full bg-emerald-600 border border-emerald-400 text-white flex items-center justify-center font-black text-sm mx-auto shadow-md uppercase">
            {safeActiveProfile.full_name ? safeActiveProfile.full_name.split(' ').map(n=>n[0]).slice(0, 2).join('') : 'DC'}
          </div>

          <span className="font-extrabold text-white text-sm tracking-tight block mt-3 truncate">
            {safeActiveProfile.full_name}
          </span>
          <span className="text-[10px] text-slate-400 truncate block font-mono mt-0.5">{safeActiveProfile.email}</span>

          {/* Role badge and Assigned Unit */}
          <div className="mt-3 space-y-1">
            <span className="inline-block text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {safeActiveProfile.role}
            </span>
            <span className="block text-[9.5px] text-slate-400 font-medium tracking-tight truncate px-1">
              🏢 {getAssignedUnitName(safeActiveProfile.role)}
            </span>
          </div>
        </div>

        {/* Navigation Lists */}
        <div className="space-y-1.5" id={`${isMobile ? 'mobile-' : ''}sidebar-navigations`}>
          {getNavigationForRole(role).map(item => {
            const IconComponent = item.icon;
            const isTabActive = activeTab === item.tab;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.tab)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComponent className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isTabActive ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Generalized Sign Out for everyone */}
          {authenticatedUser && (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-rose-400 hover:text-white hover:bg-rose-950/30 transition-colors cursor-pointer mt-2"
              id={`${isMobile ? 'mobile-' : ''}header-signout-btn`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          )}
        </div>

        {/* Quick stats shortcuts - ONLY visible for Super Admin */}
        {isSuperAdmin && !isMobile && (
          <div className="p-3 bg-[#1e293b]/50 border border-slate-800 rounded-lg text-[10px] text-slate-400 space-y-1.5 mt-auto" id="church-stats-widget">
            <span className="font-bold text-slate-400 uppercase tracking-wider block font-mono">DCC Apapa stats</span>
            <div className="flex justify-between font-bold">
              <span>Care CMD Cells:</span>
              <span className="text-slate-300">{careCenters.length} cells</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Satellite branches:</span>
              <span className="text-slate-300">{satelliteChurches.length} branches</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="applet-viewport">
      
      {/* Top Main Navigation Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Branding details */}
            <div className="flex items-center gap-2.5">
              <Logo width={50} height={50} className="shrink-0" />
              <div>
                <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight block uppercase">DOMINION CITY APAPA</span>
                <span className="text-[10px] text-slate-400 font-bold block uppercase -mt-0.5 tracking-wider font-mono">Church Management System</span>
              </div>
            </div>

            {/* System Node Details */}
            <div className="flex items-center gap-3">
              <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-300" />
                Lagos Time: 14:46 UTC+1
              </span>

              {/* Mobile Hamburger Menu Button */}
              {!showAuthGate && authenticatedUser && (
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none cursor-pointer"
                  aria-label="Toggle navigation menu"
                  id="mobile-hamburger-btn"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Structural Body View split */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        
        {/* Sidebar navigations panel - DESKTOP ONLY */}
        <aside className="hidden lg:block lg:w-64 shrink-0 self-start">
          {renderSidebarContent(false)}
        </aside>

        {/* Mobile Navigation Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" id="mobile-sidebar-overlay">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out" 
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Slide-out Panel */}
            <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-[#0f172a] shadow-2xl flex flex-col overflow-y-auto transition-transform duration-300 ease-in-out">
              {/* Header inside drawer */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Logo width={60} height={60} className="shrink-0" />
                  <div>
                    <span className="font-black text-white text-xs tracking-tight block uppercase">DOMINION CITY APAPA</span>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider font-mono">DCCMS</span>
                  </div>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  id="mobile-close-sidebar-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Sidebar Content */}
              <div className="p-4 flex-1">
                {renderSidebarContent(true)}
              </div>
            </div>
          </div>
        )}

        {/* Primary render pane */}
        <main className="flex-1 bg-white lg:bg-transparent rounded-2xl p-0 lg:p-0 min-w-0">
          
          {/* Profile RLS Policy Warning Banner */}
          {profileCreationWarning && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 shadow-xs animate-fade-in" id="profile-creation-warning-banner">
              <div className="flex items-start gap-3">
                <div className="p-1 px-2 bg-amber-600 text-white rounded text-[10px] font-black uppercase tracking-wider font-mono shrink-0">
                  ⚠️ db rls notice
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-amber-900 tracking-tight">PostgreSQL Profiles Insertion Suspended</h3>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                    {profileCreationWarning}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('supabase_settings')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold font-mono transition-colors cursor-pointer"
                >
                  View SQL DDL Config & Copy Schema
                </button>
                <button
                  onClick={() => setProfileCreationWarning(null)}
                  className="px-3 py-1 bg-white hover:bg-slate-50 border border-amber-200 text-amber-800 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer"
                >
                  Acknowledge & Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Emergency Startup Fault Banner (Requirements 4, 9, 11) */}
          {(startupError || membersQueryError) && (
            safeActiveProfile.role === 'Super Admin' ? (
              <div className="mb-6 p-5 bg-rose-50 border border-rose-100 rounded-xl space-y-4 shadow-xs" id="emergency-startup-fault-panel">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-500 text-white rounded-lg font-black shrink-0 animate-pulse text-xs">
                    🚨 DIAGNOSTIC FAULT DETECTED
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-rose-900 tracking-tight">Database Connection Interrupted</h3>
                    <p className="text-xs text-rose-700 leading-relaxed max-w-2xl font-medium">
                      The DCCMS secure registries encountered a query exception or network timeout.
                    </p>
                  </div>
                </div>
                
                <div className="p-3 bg-rose-950/5 border border-rose-200 rounded-lg text-xs font-mono text-rose-800 break-words font-semibold leading-relaxed">
                  <span className="font-bold underline text-rose-900">Current Exception Details:</span><br />
                  {startupError || membersQueryError}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={() => {
                      const checkTab = 'supabase_health_check';
                      setActiveTab(checkTab);
                    }}
                    className="px-3.5 py-1.5 text-[11px] bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-md shadow-xs transition-colors cursor-pointer"
                  >
                    Inspect Supabase Health Check
                  </button>
                  <button
                    onClick={refreshDatabase}
                    className="px-3.5 py-1.5 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-md shadow-xs transition-colors cursor-pointer"
                  >
                    Retry Startup Sync Sequence
                  </button>
                  <button
                    onClick={() => {
                      setStartupError(null);
                      setMembersQueryError(null);
                    }}
                    className="px-3.5 py-1.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-extrabold rounded-md shadow-xs transition-colors cursor-pointer"
                  >
                    Acknowledge & Hide Banner
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-5 bg-amber-50 border border-amber-100 rounded-xl space-y-3 shadow-xs" id="friendly-error-panel">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-amber-500 text-white rounded-lg shrink-0 text-xs">
                    ⚠️ Notice
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-amber-900 tracking-tight">Temporary Connection Disturbance</h3>
                    <p className="text-xs text-amber-700 leading-relaxed max-w-2xl">
                      We are experiencing a temporary network issue connecting to the database registries. Please wait a moment and try again.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={refreshDatabase}
                    className="px-3.5 py-1.5 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md shadow-xs transition-colors cursor-pointer"
                  >
                    Refresh Connection
                  </button>
                  <button
                    onClick={() => {
                      setStartupError(null);
                      setMembersQueryError(null);
                    }}
                    className="px-3.5 py-1.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 font-bold rounded-md shadow-xs transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )
          )}
          
          {!isTabAuthorized(activeTab, safeActiveProfile.role) ? (
            <div className="bg-white rounded-2xl border border-slate-150 p-8 shadow-sm max-w-lg mx-auto text-center space-y-6 my-12" id="forbidden-access-denied-panel">
              <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-500 text-2xl font-black">
                🔒
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">403 - Access Denied</h1>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  You do not have permission to access this page.
                </p>
                <p className="text-xs text-slate-400">
                  Requested page: <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">/{getPathnameFromTab(activeTab).replace('/', '')}</span><br />
                  Assigned Role Scope: <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{safeActiveProfile.role}</span>
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => {
                    const defaultTab = ['Member'].includes(safeActiveProfile.role) ? 'profile' : 'dashboard';
                    setActiveTab(defaultTab);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  Return to {['Member'].includes(safeActiveProfile.role) ? 'My Profile' : 'Dashboard'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {['CMD', 'Church Ministry Director'].includes(safeActiveProfile.role) ? (
                <CmdDirectorPortal
                  activeProfile={safeActiveProfile}
                  activeTab={activeTab}
                  onNavigate={setActiveTab}
                  members={members}
                  careCenters={careCenters}
                  careCenterReportsList={careCenterReportsList}
                  memberAttendance={memberAttendance}
                  satelliteChurches={satelliteChurches}
                  onRefresh={refreshDatabase}
                />
              ) : (
                <>
                  {activeTab === 'dashboard' && (
                <DashboardView
                  activeProfile={safeActiveProfile}
                  members={members}
                  departments={departments}
                  careCenters={careCenters}
                  satelliteChurches={satelliteChurches}
                  memberAttendance={memberAttendance}
                  departmentAttendance={departmentAttendance}
                  cmdReports={cmdReports}
                  satelliteReports={satelliteReports}
                  careCenterReportsList={careCenterReportsList}
                  membersQueryError={membersQueryError}
                  totalSupabaseRecords={totalSupabaseRecords}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'members' && (
                <MemberManagementView
                  activeProfile={safeActiveProfile}
                  members={members}
                  departments={departments}
                  careCenters={careCenters}
                  satelliteChurches={satelliteChurches}
                  onRefresh={refreshDatabase}
                  membersQueryError={membersQueryError}
                  totalSupabaseRecords={totalSupabaseRecords}
                  lastExecutedQuery={lastExecutedQuery}
                  mode="Member"
                />
              )}

              {activeTab === 'leaders' && (
                <MemberManagementView
                  activeProfile={safeActiveProfile}
                  members={members}
                  departments={departments}
                  careCenters={careCenters}
                  satelliteChurches={satelliteChurches}
                  onRefresh={refreshDatabase}
                  membersQueryError={membersQueryError}
                  totalSupabaseRecords={totalSupabaseRecords}
                  lastExecutedQuery={lastExecutedQuery}
                  mode="Leader & Worker"
                />
              )}

              {activeTab === 'attendance' && (
                <AttendanceView
                  activeProfile={safeActiveProfile}
                  members={members}
                  departments={departments}
                  careCenters={careCenters}
                  satelliteChurches={satelliteChurches}
                  memberAttendance={memberAttendance}
                  departmentAttendance={departmentAttendance}
                  onRefresh={refreshDatabase}
                />
              )}

              {activeTab === 'cmd_reports' && showCmdTab && (
                <CmdReportsView
                  activeProfile={safeActiveProfile}
                  careCenters={careCenters}
                  cmdReports={cmdReports}
                  careCenterReportsList={careCenterReportsList}
                  onRefresh={refreshDatabase}
                />
              )}

              {activeTab === 'sat_reports' && showSatTab && (
                <SatelliteReportsView
                  activeProfile={safeActiveProfile}
                  satelliteChurches={satelliteChurches}
                  satelliteReports={satelliteReports}
                  onRefresh={refreshDatabase}
                  satelliteChurchesQueryError={satelliteChurchesQueryError}
                />
              )}

              {activeTab === 'finance' && showFinanceTab && (
                <FinanceView
                  activeProfile={safeActiveProfile}
                  satelliteChurches={satelliteChurches}
                  careCenters={careCenters}
                  onRefresh={refreshDatabase}
                />
              )}

              {activeTab === 'care_center_reports' && showCareCenterTab && (
                <CareCenterReportsView
                  activeProfile={safeActiveProfile}
                  careCenters={careCenters}
                  careCenterReportsList={careCenterReportsList}
                  onRefresh={refreshDatabase}
                />
              )}

              {activeTab === 'departments' && (
                <DepartmentsView
                  activeProfile={safeActiveProfile}
                  departments={departments}
                  members={members}
                  onRefresh={refreshDatabase}
                />
              )}

              {activeTab === 'users' && activeProfile && (activeProfile.role === 'Super Admin' || activeProfile.role === 'Admin') && (
                <UserManagementView
                  activeProfile={safeActiveProfile}
                  departments={departments}
                  careCenters={careCenters}
                  satelliteChurches={satelliteChurches}
                  onRefresh={refreshDatabase}
                />
              )}

              {activeTab === 'my_church' && (
                <MySatelliteChurchView
                  activeProfile={safeActiveProfile}
                  satelliteChurches={satelliteChurches}
                  members={members}
                  memberAttendance={memberAttendance}
                  satelliteReports={satelliteReports}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  activeProfile={safeActiveProfile}
                  onRefresh={refreshDatabase}
                />
              )}

              {activeTab === 'supabase_settings' && safeActiveProfile.role === 'Super Admin' && (
                <SupabaseConfigPanel activeProfile={safeActiveProfile} />
              )}

              {activeTab === 'supabase_health_check' && safeActiveProfile.role === 'Super Admin' && (
                <SupabaseHealthCheckView
                  activeProfile={safeActiveProfile}
                  onRefreshAll={refreshDatabase}
                  startupTraces={startupTraces}
                />
              )}

              {activeTab === 'notifications' && (
                <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm max-w-4xl mx-auto space-y-6" id="notifications-panel">
                  <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-indigo-600" />
                        My Notifications & Alerts
                      </h1>
                      <p className="text-xs text-slate-400 mt-1">Stay up to date with DCC Apapa notices, briefings, and updates</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded">
                      All Caught Up
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100/30 flex gap-4 items-start">
                      <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-slate-900">Welcome to Dominion City Apapa CMS Portal</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Your worker/member profile is active. You can now use the workspace to log your attendance, review profile information, and stay synchronized with administrative announcements.
                        </p>
                        <span className="text-[9px] font-mono font-medium text-slate-400 block pt-1">Today • System Broadcast</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex gap-4 items-start">
                      <div className="p-2 bg-slate-200 text-slate-600 rounded-lg shrink-0">
                        <CalendarCheck className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-slate-800">Attendance Database Active</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Sunday service attendance trackers have been updated. Ensure your group head verifies your attendance record.
                        </p>
                        <span className="text-[9px] font-mono font-medium text-slate-400 block pt-1">Yesterday • Support Team</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </>
          )}

        </main>

      </div>

      {/* Global Page Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-7 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Left */}
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white">Dominion City Apapa</span>
              <span className="text-slate-600">|</span>
              <span>© {new Date().getFullYear()} All Rights Reserved.</span>
            </div>

            {/* Middle */}
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Lagos, Nigeria
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-slate-300">
                <Clock className="w-3.5 h-3.5" />
                System Time: 14:46 UTC+1
              </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-indigo-400 font-bold tracking-wider uppercase font-mono">production ready</span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-bold tracking-wider uppercase font-mono">fully connected</span>
            </div>

          </div>
        </div>
      </footer>

    </div>
  );
}
