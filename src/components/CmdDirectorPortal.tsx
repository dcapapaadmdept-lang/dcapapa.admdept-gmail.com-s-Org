import React, { useState, useMemo } from 'react';
import { 
  Member, 
  CareCenter, 
  CareCenterReport, 
  MemberAttendance, 
  Profile, 
  Finance, 
  SatelliteChurch
} from '../types';
import {
  Users,
  Building,
  Radio,
  TrendingUp,
  Coins,
  Award,
  Heart,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin,
  ChevronRight,
  ArrowUpRight,
  BarChart3,
  PieChart as PieIcon,
  HelpCircle,
  FileCheck,
  AlertTriangle,
  Bell,
  SlidersHorizontal,
  ChevronDown,
  Lock,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart
} from 'recharts';

interface CmdDirectorPortalProps {
  activeProfile: Profile;
  activeTab: string;
  onNavigate: (tab: any) => void;
  members: Member[];
  careCenters: CareCenter[];
  careCenterReportsList: CareCenterReport[];
  memberAttendance: MemberAttendance[];
  satelliteChurches: SatelliteChurch[];
  onRefresh?: () => void;
}

export default function CmdDirectorPortal({
  activeProfile,
  activeTab,
  onNavigate,
  members,
  careCenters,
  careCenterReportsList,
  memberAttendance,
  satelliteChurches,
  onRefresh
}: CmdDirectorPortalProps) {

  const [notificationLog, setNotificationLog] = useState<{ id: string; title: string; desc: string; time: string; type: 'info' | 'alert' | 'success' }[]>([
    { id: '1', title: 'New Care Center Assignment', desc: 'You have been assigned as supervisor for Surulere Care Center.', time: '2 hours ago', type: 'info' },
    { id: '2', title: 'Report Overdue Alert', desc: 'Ajegunle Care Center has not submitted their Week 26 report.', time: '1 day ago', type: 'alert' },
    { id: '3', title: 'Attendance Drop Notice', desc: 'Apapa Central CMD attendance dropped by 18% this week.', time: '2 days ago', type: 'alert' },
    { id: '4', title: 'Goal Achieved', desc: 'Festac Care Center (CMD 3) achieved 100% of meeting goals!', time: '3 days ago', type: 'success' },
    { id: '5', title: 'Report Submitted', desc: 'Apapa Central CMD has submitted their Week 25 report.', time: '4 days ago', type: 'success' }
  ]);

  // Currency format
  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // --- SECURE DATA ISOLATION ENGINE ---
  // Every query is filtered by the authenticated CMD assigned_cmd_name.
  const assignedCMDName = activeProfile?.assigned_cmd_name || '';

  // Get only Care Centres supervised by this CMD
  const myCareCenters = useMemo(() => {
    if (!assignedCMDName) return [];
    return careCenters.filter(c => c.cmd_name && c.cmd_name.toLowerCase().includes(assignedCMDName.toLowerCase()));
  }, [careCenters, assignedCMDName]);

  const myCareCenterIds = useMemo(() => myCareCenters.map(c => c.id), [myCareCenters]);

  // Get only reports from supervised care centres
  const myReports = useMemo(() => {
    return careCenterReportsList.filter(r => {
      // Secure check: must match by care_center_id or care_center_name matching CMD's assignment
      const ccMatch = myCareCenterIds.includes(r.care_center_id);
      const nameMatch = r.care_center_name && r.care_center_name.toLowerCase().includes(assignedCMDName.toLowerCase());
      return ccMatch || nameMatch;
    });
  }, [careCenterReportsList, myCareCenterIds, assignedCMDName]);

  // Get only members under supervised care centres
  const myMembers = useMemo(() => {
    return members.filter(m => m.care_center_id && myCareCenterIds.includes(m.care_center_id));
  }, [members, myCareCenterIds]);

  // Get only attendance records from supervised care centres
  const myAttendance = useMemo(() => {
    return memberAttendance.filter(a => a.care_center_id && myCareCenterIds.includes(a.care_center_id));
  }, [memberAttendance, myCareCenterIds]);




  // --- CALCULATE SUMMARY STATISTICS ---
  const stats = useMemo(() => {
    const totalCC = myCareCenters.length;
    const totalMems = myMembers.length;
    const totalLeaders = myMembers.filter(m => m.person_type === 'Leader & Worker').length;

    // Report Submissions for current week (let's assume "Week 25" is current week for the simulation)
    const CURRENT_WEEK = 'Week 25';
    const submittedThisWeek = myReports.filter(r => r.report_week === CURRENT_WEEK);
    const submittedCount = submittedThisWeek.length;
    const yetToSubmitCount = Math.max(0, totalCC - submittedCount);

    // Weekly Attendance (sum from Week 25 reports, fallback to previous)
    const latestReports = myReports.filter(r => r.report_week === CURRENT_WEEK);
    const weeklyAttendance = latestReports.reduce((sum, r) => sum + (r.total_attendance || 0), 0);

    // Monthly Attendance (sum of Week 22 to Week 25)
    const monthlyReports = myReports.filter(r => ['Week 22', 'Week 23', 'Week 24', 'Week 25'].includes(r.report_week));
    const monthlyAttendance = monthlyReports.reduce((sum, r) => sum + (r.total_attendance || 0), 0);

    // Total Souls Won
    const totalSouls = myReports.reduce((sum, r) => sum + (r.soul_won || 0), 0);

    // Offerings
    const weeklyOffering = latestReports.reduce((sum, r) => sum + (r.total_offering || 0), 0);
    const monthlyOffering = monthlyReports.reduce((sum, r) => sum + (r.total_offering || 0), 0);

    // New Members (joined in last 30 days)
    const newMembersCount = myMembers.filter(m => {
      if (!m.join_date) return false;
      const date = new Date(m.join_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 60); // 60 days to match mock dates
      return date >= thirtyDaysAgo;
    }).length;

    // Follow-up Required (members with Inactive status)
    const followUpRequired = myMembers.filter(m => m.status === 'Inactive' || m.status === 'Pending').length;

    // Report Submission Rate
    const totalPossibleReports = totalCC * 4; // assume 4 weeks
    const actualReportsSubmitted = myReports.length;
    const submissionRate = totalPossibleReports > 0 
      ? Math.round((actualReportsSubmitted / totalPossibleReports) * 100) 
      : 100;

    return {
      totalCC,
      totalMems,
      totalLeaders,
      submittedCount,
      yetToSubmitCount,
      weeklyAttendance,
      monthlyAttendance,
      totalSouls,
      weeklyOffering,
      monthlyOffering,
      newMembersCount,
      followUpRequired,
      submissionRate
    };
  }, [myCareCenters, myMembers, myReports]);


  // --- ADVANCED FILTERS STATE ---
  const [filterWeek, setFilterWeek] = useState<string>('');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [filterCCName, setFilterCCName] = useState<string>('');
  const [filterPastor, setFilterPastor] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>(''); // 'Submitted' / 'Pending'
  const [filterMinAttendance, setFilterMinAttendance] = useState<string>('');
  const [filterMaxAttendance, setFilterMaxAttendance] = useState<string>('');
  const [filterMinOffering, setFilterMinOffering] = useState<string>('');
  const [filterMaxOffering, setFilterMaxOffering] = useState<string>('');
  const [filterGoalsMet, setFilterGoalsMet] = useState<string>(''); // 'Yes' / 'No'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<string>('meeting_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [selectedReport, setSelectedReport] = useState<CareCenterReport | null>(null);

  // Apply combined advanced filters
  const filteredReports = useMemo(() => {
    let result = [...myReports];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.care_center_name?.toLowerCase().includes(q) ||
        r.care_pastor?.toLowerCase().includes(q) ||
        r.submitted_by?.toLowerCase().includes(q) ||
        r.treasurer_name?.toLowerCase().includes(q) ||
        r.goals_next_meeting?.toLowerCase().includes(q)
      );
    }

    if (filterWeek) {
      result = result.filter(r => r.report_week === filterWeek);
    }

    if (filterDateStart) {
      result = result.filter(r => r.meeting_date >= filterDateStart);
    }
    if (filterDateEnd) {
      result = result.filter(r => r.meeting_date <= filterDateEnd);
    }

    if (filterCCName) {
      result = result.filter(r => r.care_center_name === filterCCName);
    }

    if (filterPastor) {
      result = result.filter(r => r.care_pastor?.toLowerCase().includes(filterPastor.toLowerCase()));
    }

    if (filterMinAttendance) {
      result = result.filter(r => (r.total_attendance || 0) >= parseInt(filterMinAttendance, 10));
    }
    if (filterMaxAttendance) {
      result = result.filter(r => (r.total_attendance || 0) <= parseInt(filterMaxAttendance, 10));
    }

    if (filterMinOffering) {
      result = result.filter(r => (r.total_offering || 0) >= parseFloat(filterMinOffering));
    }
    if (filterMaxOffering) {
      result = result.filter(r => (r.total_offering || 0) <= parseFloat(filterMaxOffering));
    }

    if (filterGoalsMet) {
      result = result.filter(r => r.goals_met === filterGoalsMet);
    }

    // Sort reports
    result.sort((a: any, b: any) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc' 
          ? valA - valB 
          : valB - valA;
      }
    });

    return result;
  }, [myReports, searchQuery, filterWeek, filterDateStart, filterDateEnd, filterCCName, filterPastor, filterMinAttendance, filterMaxAttendance, filterMinOffering, filterMaxOffering, filterGoalsMet, sortField, sortDirection]);

  // Reset all filters
  const resetFilters = () => {
    setFilterWeek('');
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterCCName('');
    setFilterPastor('');
    setFilterStatus('');
    setFilterMinAttendance('');
    setFilterMaxAttendance('');
    setFilterMinOffering('');
    setFilterMaxOffering('');
    setFilterGoalsMet('');
    setSearchQuery('');
  };


  // --- EXPORT TO EXCEL SIMULATION ---
  const handleExportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Report Week,Care Center Name,Pastor,Meeting Date,Male,Female,Children,Total Attendance,MVP,Souls Won,Offering (Cash),Offering (Transfer),Total Offering,Goals Met,Treasurer,Submitted By\n";
    
    filteredReports.forEach(r => {
      const row = [
        `"${r.report_week}"`,
        `"${r.care_center_name}"`,
        `"${r.care_pastor}"`,
        `"${r.meeting_date}"`,
        r.male,
        r.female,
        r.children,
        r.total_attendance,
        r.mvp_present,
        r.soul_won,
        r.offering_cash,
        r.offering_transfer,
        r.total_offering,
        `"${r.goals_met}"`,
        `"${r.treasurer_name}"`,
        `"${r.submitted_by}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CMD_Care_Center_Reports_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // --- EXPORT TO PDF & PRINT SIMULATION ---
  const handlePrint = () => {
    window.print();
  };


  // --- CHARTS & ANALYTICS DATA ---
  // Trend calculated weekly
  const weeklyTrendData = useMemo(() => {
    const weeks = ['Week 22', 'Week 23', 'Week 24', 'Week 25'];
    return weeks.map(wk => {
      const wkReports = myReports.filter(r => r.report_week === wk);
      const totalAttendance = wkReports.reduce((sum, r) => sum + (r.total_attendance || 0), 0);
      const totalOffering = wkReports.reduce((sum, r) => sum + (r.total_offering || 0), 0);
      const soulsWon = wkReports.reduce((sum, r) => sum + (r.soul_won || 0), 0);
      const newMems = wkReports.reduce((sum, r) => sum + (r.mvp_present || 0), 0);
      const male = wkReports.reduce((sum, r) => sum + (r.male || 0), 0);
      const female = wkReports.reduce((sum, r) => sum + (r.female || 0), 0);
      return {
        name: wk,
        Attendance: totalAttendance,
        Offering: totalOffering,
        'Souls Won': soulsWon,
        'New Members': newMems,
        Male: male,
        Female: female
      };
    });
  }, [myReports]);

  // Performance comparison per cell
  const cellPerformanceData = useMemo(() => {
    return myCareCenters.map(cc => {
      const ccReports = myReports.filter(r => r.care_center_id === cc.id);
      const avgAttendance = ccReports.length > 0 
        ? Math.round(ccReports.reduce((sum, r) => sum + (r.total_attendance || 0), 0) / ccReports.length)
        : 0;
      const totalOffering = ccReports.reduce((sum, r) => sum + (r.total_offering || 0), 0);
      const totalSouls = ccReports.reduce((sum, r) => sum + (r.soul_won || 0), 0);
      return {
        name: cc.cmd_name,
        'Avg Attendance': avgAttendance,
        'Total Offering': totalOffering,
        'Souls Won': totalSouls
      };
    });
  }, [myCareCenters, myReports]);


  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" id="cmd-workspace">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white rounded-2xl p-6 md:p-8 border border-emerald-800 shadow-lg relative overflow-hidden" id="cmd-header-banner">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <Building className="w-64 h-64" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/30">
              <Lock className="w-3.5 h-3.5" />
              Secure CMD Supervision Portal
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{assignedCMDName || 'Apapa Central CMD'} Directory</h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Supervisor Workspace for <span className="text-emerald-300 font-bold">{activeProfile.full_name}</span>. Displaying records and performance analytics bound exclusively to your authorized Care Centre jurisdiction.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className="flex items-center gap-1.5 bg-emerald-800/50 hover:bg-emerald-800 border border-emerald-700/50 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Data</span>
              </button>
            )}
            <div className="bg-emerald-950/60 border border-emerald-800/40 p-3 rounded-xl text-center">
              <span className="text-[9px] uppercase tracking-wider block text-slate-400 font-mono">Assigned Centers</span>
              <span className="text-xl font-black text-emerald-300">{myCareCenters.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6" id="cmd-dashboard-view">
          
          {/* 14 SUMMARY STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4" id="cmd-summary-cards">
            
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total Centers</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{stats.totalCC}</span>
                <Building className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[9px] text-emerald-600 font-bold block">100% Assigned</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total Members</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{stats.totalMems}</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[9px] text-slate-400 block">In jurisdiction</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Leaders & Workers</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{stats.totalLeaders}</span>
                <FileCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[9px] text-emerald-600 font-bold block">Active staff</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Submitted Reports</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-600">{stats.submittedCount}</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-[9px] text-slate-400 block">Current week (W25)</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">Overdue Reports</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-rose-600">{stats.yetToSubmitCount}</span>
                <XCircle className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-[9px] text-rose-500 font-mono font-bold block">Action required</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Weekly Attend.</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{stats.weeklyAttendance}</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[9px] text-emerald-600 font-bold block">Week 25 total</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Monthly Attend.</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{stats.monthlyAttendance}</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[9px] text-slate-400 block">Last 4 weeks sum</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total Souls Won</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{stats.totalSouls}</span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[9px] text-emerald-600 font-bold block">All-time harvest</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Weekly Offering</span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-emerald-700">{formatNaira(stats.weeklyOffering)}</span>
                <Coins className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[9px] text-emerald-600 font-bold block">Cash + Transfer (W25)</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Monthly Offering</span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-emerald-700">{formatNaira(stats.monthlyOffering)}</span>
                <Coins className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[9px] text-slate-400 block">Last 4 weeks cumulative</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">New Members</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{stats.newMembersCount}</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[9px] text-emerald-600 font-bold block">Recent 60 days</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Follow-up Req.</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-600">{stats.followUpRequired}</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-[9px] text-amber-600 font-bold block">Roster pending</span>
            </div>

            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Submission Rate</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{stats.submissionRate}%</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[9px] text-emerald-600 font-bold block">Monthly average</span>
            </div>

          </div>

          {/* QUICK ALERTS & NOTIFICATIONS CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Notifications Feed */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">CMD Live Notification Hub</h3>
                </div>
                <span className="text-[9px] bg-emerald-50 text-emerald-600 font-black px-2 py-0.5 rounded-md font-mono">
                  {notificationLog.length} Alerts
                </span>
              </div>
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {notificationLog.map(notif => (
                  <div key={notif.id} className="text-xs flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-emerald-500/20 transition-all">
                    {notif.type === 'alert' && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                    {notif.type === 'info' && <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />}
                    {notif.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-slate-900 block">{notif.title}</span>
                      <p className="text-slate-500 text-[11px] leading-relaxed">{notif.desc}</p>
                      <span className="text-[9px] text-slate-400 block font-mono">{notif.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance charts preview */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs lg:col-span-2 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Weekly Attendance Trend (Supervised Cells)</h3>
                </div>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyTrendData}>
                    <defs>
                      <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Attendance" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAtt)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* GRID OF COMPREHENSIVE CHARTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="cmd-analytics-charts">
            
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Monthly Attendance Trend</h4>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Attendance" stroke="#059669" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Offering Trend</h4>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="Offering" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Souls Won Trend</h4>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Souls Won" stroke="#8b5cf6" fill="#c084fc" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs lg:col-span-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Care Centre Performance Comparison</h4>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cellPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Avg Attendance" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Souls Won" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Male vs Female Attendance</h4>
              <div className="h-[240px] flex flex-col justify-between">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Male', value: weeklyTrendData.reduce((sum, d) => sum + d.Male, 0) },
                          { name: 'Female', value: weeklyTrendData.reduce((sum, d) => sum + d.Female, 0) }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#0284c7" />
                        <Cell fill="#ec4899" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-600 block"></span> Male</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-pink-500 block"></span> Female</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'care_centers' && (
        <div className="space-y-6" id="cmd-care-centers-directory">
          
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">My Supervised Care Centres</h3>
                <p className="text-[11px] text-slate-500">Directory list of care centers assigned exclusively to your administrative profile.</p>
              </div>
            </div>

            {/* DIRECTORY LISTING */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Care Centre Name</th>
                    <th className="py-3 px-4">Care Pastor</th>
                    <th className="py-3 px-4">Treasurer</th>
                    <th className="py-3 px-4">Meeting Address</th>
                    <th className="py-3 px-4 text-center">Assigned Members</th>
                    <th className="py-3 px-4 text-center">Avg Attendance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Last Report Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myCareCenters.map(cc => {
                    const centerMems = myMembers.filter(m => m.care_center_id === cc.id);
                    const centerReports = myReports.filter(r => r.care_center_id === cc.id);
                    const lastReport = centerReports.length > 0 ? centerReports[centerReports.length - 1] : null;
                    const avgAtt = centerReports.length > 0 
                      ? Math.round(centerReports.reduce((sum, r) => sum + (r.total_attendance || 0), 0) / centerReports.length)
                      : 0;
                    return (
                      <tr key={cc.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-black text-slate-900">{cc.cmd_name}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">{cc.care_pastor}</td>
                        <td className="py-3.5 px-4 text-slate-500">{cc.treasurer_name}</td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate">{cc.cmd_address}</td>
                        <td className="py-3.5 px-4 text-center font-bold font-mono text-emerald-600">{centerMems.length}</td>
                        <td className="py-3.5 px-4 text-center font-bold font-mono text-slate-700">{avgAtt || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-500/20 font-black px-2 py-0.5 rounded-full uppercase">
                            Active
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                          {lastReport ? `${lastReport.report_week} (${lastReport.meeting_date})` : 'No report yet'}
                        </td>
                      </tr>
                    );
                  })}
                  {myCareCenters.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium font-mono text-xs">
                        No assigned Care Centres found under your jurisdiction in system registry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'care_center_reports' && (
        <div className="space-y-6" id="cmd-care-center-reports-page">
          
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
            
            {/* Page Header and actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Supervised Care Center Reports Registry</h3>
                <p className="text-[11px] text-slate-500">View, search, and export reports submitted by all Care Centres under your direct supervision.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={handleExportToExcel}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export to Excel</span>
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Directory</span>
                </button>
              </div>
            </div>

            {/* ADVANCED MULTI-FILTERS EXPANDABLE CONTAINER */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4 mb-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Advanced Jurisdiction Filters</span>
                </div>
                <button 
                  onClick={resetFilters}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer hover:underline"
                >
                  Reset All Filters
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                
                {/* Filter Report Week */}
                <div className="space-y-1 flex flex-col">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Report Week</label>
                  <select 
                    value={filterWeek}
                    onChange={(e) => setFilterWeek(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">All Weeks</option>
                    <option value="Week 22">Week 22</option>
                    <option value="Week 23">Week 23</option>
                    <option value="Week 24">Week 24</option>
                    <option value="Week 25">Week 25</option>
                  </select>
                </div>

                {/* Date range start */}
                <div className="space-y-1 flex flex-col">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                  <input 
                    type="date"
                    value={filterDateStart}
                    onChange={(e) => setFilterDateStart(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] focus:outline-none"
                  />
                </div>

                {/* Date range end */}
                <div className="space-y-1 flex flex-col">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                  <input 
                    type="date"
                    value={filterDateEnd}
                    onChange={(e) => setFilterDateEnd(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] focus:outline-none"
                  />
                </div>

                {/* Filter Care Centre */}
                <div className="space-y-1 flex flex-col">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Care Centre</label>
                  <select 
                    value={filterCCName}
                    onChange={(e) => setFilterCCName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">All Assigned Centers</option>
                    {myCareCenters.map(c => (
                      <option key={c.id} value={c.cmd_name}>{c.cmd_name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Care Pastor */}
                <div className="space-y-1 flex flex-col">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Care Pastor</label>
                  <input 
                    type="text"
                    placeholder="Search Care Pastor..."
                    value={filterPastor}
                    onChange={(e) => setFilterPastor(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] focus:outline-none"
                  />
                </div>

                {/* Filter Attendance min */}
                <div className="space-y-1 flex flex-col">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Min Attendance</label>
                  <input 
                    type="number"
                    placeholder="e.g. 10"
                    value={filterMinAttendance}
                    onChange={(e) => setFilterMinAttendance(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] focus:outline-none"
                  />
                </div>

                {/* Filter Attendance max */}
                <div className="space-y-1 flex flex-col">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Max Attendance</label>
                  <input 
                    type="number"
                    placeholder="e.g. 50"
                    value={filterMaxAttendance}
                    onChange={(e) => setFilterMaxAttendance(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] focus:outline-none"
                  />
                </div>

                {/* Filter Offering min */}
                <div className="space-y-1 flex flex-col">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Min Offering (₦)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 1000"
                    value={filterMinOffering}
                    onChange={(e) => setFilterMinOffering(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] focus:outline-none"
                  />
                </div>

                {/* Filter Goals Met */}
                <div className="space-y-1 flex flex-col">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Goals Met</label>
                  <select 
                    value={filterGoalsMet}
                    onChange={(e) => setFilterGoalsMet(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Any State</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Partially">Partially</option>
                  </select>
                </div>

                {/* Search Bar */}
                <div className="space-y-1 flex flex-col">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">General Keyword</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-7 pr-2 text-[11px] focus:outline-none"
                    />
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                  </div>
                </div>

              </div>
            </div>

            {/* SORTING CONTROLS */}
            <div className="flex items-center justify-between pb-3 text-[11px] text-slate-500 font-bold border-b border-slate-100 mb-4">
              <span>Displaying {filteredReports.length} reports</span>
              <div className="flex items-center gap-1">
                <span>Sort by:</span>
                <select 
                  value={sortField} 
                  onChange={(e) => setSortField(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[10px] rounded px-1.5 py-0.5 focus:outline-none font-bold"
                >
                  <option value="meeting_date">Meeting Date</option>
                  <option value="total_attendance">Total Attendance</option>
                  <option value="total_offering">Total Offering</option>
                  <option value="report_week">Report Week</option>
                </select>
                <button 
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-0.5 rounded cursor-pointer"
                >
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </button>
              </div>
            </div>

            {/* REPORTS TABLE */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Report Week</th>
                    <th className="py-3 px-4">Care Centre Name</th>
                    <th className="py-3 px-4">Meeting Date</th>
                    <th className="py-3 px-4 text-center">Male</th>
                    <th className="py-3 px-4 text-center">Female</th>
                    <th className="py-3 px-4 text-center">Children</th>
                    <th className="py-3 px-4 text-center font-black text-slate-800">Total Att.</th>
                    <th className="py-3 px-4 text-center">Souls Won</th>
                    <th className="py-3 px-4 text-right">Cash</th>
                    <th className="py-3 px-4 text-right">Transfer</th>
                    <th className="py-3 px-4 text-right font-black text-emerald-700">Total Offering</th>
                    <th className="py-3 px-4 text-center">Goals Met</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold font-mono text-slate-700">{r.report_week}</td>
                      <td className="py-3 px-4 font-black text-slate-900">{r.care_center_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{r.meeting_date}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{r.male}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{r.female}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{r.children}</td>
                      <td className="py-3 px-4 text-center font-black font-mono text-slate-900">{r.total_attendance}</td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-purple-600">{r.soul_won}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">{formatNaira(r.offering_cash)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">{formatNaira(r.offering_transfer)}</td>
                      <td className="py-3 px-4 text-right font-black font-mono text-emerald-600">{formatNaira(r.total_offering)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                          r.goals_met === 'Yes' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-500/10' 
                            : r.goals_met === 'Partially'
                            ? 'bg-amber-50 text-amber-600 border border-amber-500/10'
                            : 'bg-rose-50 text-rose-600 border border-rose-500/10'
                        }`}>
                          {r.goals_met}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => setSelectedReport(r)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold px-2 py-1 rounded cursor-pointer transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-400 font-medium font-mono">
                        No reports matched the combined advanced filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* DETAIL MODAL OVERLAY */}
          {selectedReport && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-100 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-emerald-900 p-5 text-white flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-800 text-emerald-300 px-2 py-0.5 rounded">
                      {selectedReport.report_week} Report
                    </span>
                    <h3 className="text-base font-black">{selectedReport.care_center_name} Details</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedReport(null)}
                    className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="p-6 space-y-5 text-xs text-slate-600 max-h-[480px] overflow-y-auto">
                  
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Care Pastor</span>
                      <span className="font-extrabold text-slate-900 text-xs">{selectedReport.care_pastor}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Treasurer</span>
                      <span className="font-extrabold text-slate-900 text-xs">{selectedReport.treasurer_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Meeting Date</span>
                      <span className="font-bold text-slate-900 text-xs">{selectedReport.meeting_date}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Submitted By</span>
                      <span className="font-bold text-slate-900 text-xs">{selectedReport.submitted_by}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px]">Attendance Breakdown</h4>
                    <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-mono">Male</span>
                        <span className="text-sm font-black text-slate-900">{selectedReport.male}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-mono">Female</span>
                        <span className="text-sm font-black text-slate-900">{selectedReport.female}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-mono">Children</span>
                        <span className="text-sm font-black text-slate-900">{selectedReport.children}</span>
                      </div>
                      <div className="border-l border-slate-200">
                        <span className="text-slate-400 block font-mono">Total</span>
                        <span className="text-sm font-black text-emerald-600">{selectedReport.total_attendance}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px]">Financial Summary</h4>
                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-mono">Cash</span>
                        <span className="font-bold text-slate-900">{formatNaira(selectedReport.offering_cash)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-mono">Transfer</span>
                        <span className="font-bold text-slate-900">{formatNaira(selectedReport.offering_transfer)}</span>
                      </div>
                      <div className="border-l border-slate-200">
                        <span className="text-slate-400 block font-mono">Total Offering</span>
                        <span className="font-black text-emerald-600">{formatNaira(selectedReport.total_offering)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">MVPs Present</span>
                      <span className="font-black text-slate-900 text-xs">{selectedReport.mvp_present} first timers</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Souls Won</span>
                      <span className="font-black text-purple-600 text-xs">{selectedReport.soul_won} souls won</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Goals Set for Next Week</span>
                    <p className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-slate-700 italic leading-relaxed text-xs">
                      "{selectedReport.goals_next_meeting || 'No explicit goals documented for next meeting.'}"
                    </p>
                  </div>

                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[9.5px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    🔒 CMD Security Isolation Active
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        alert("Print operation initiated.");
                        window.print();
                      }}
                      className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Report
                    </button>
                    <button 
                      onClick={() => setSelectedReport(null)}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      Close Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-6" id="cmd-members-view">
          
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Jurisdiction Members Directory</h3>
                <p className="text-[11px] text-slate-500">Roster of registered members belonging to cells under your supervision.</p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-bold">
                {myMembers.length} Members Supervised
              </span>
            </div>

            {/* MEMBERS LIST */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Member ID</th>
                    <th className="py-3 px-4">Names</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Mobile Number</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Home Address</th>
                    <th className="py-3 px-4">Care Centre</th>
                    <th className="py-3 px-4">Join Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {myMembers.map(m => {
                    const cell = myCareCenters.find(c => c.id === m.care_center_id);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">{m.member_id}</td>
                        <td className="py-3 px-4 font-black text-slate-900">{m.names}</td>
                        <td className="py-3 px-4 font-medium">{m.gender}</td>
                        <td className="py-3 px-4 font-mono">{m.phone_number || 'N/A'}</td>
                        <td className="py-3 px-4 font-mono max-w-[150px] truncate">{m.email || 'N/A'}</td>
                        <td className="py-3 px-4 max-w-[180px] truncate">{m.address || 'N/A'}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{cell ? cell.cmd_name : 'N/A'}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{m.join_date || 'N/A'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                            m.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-500/10' 
                              : m.status === 'Pending'
                              ? 'bg-amber-50 text-amber-600 border border-amber-500/10'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {myMembers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-medium font-mono">
                        No members assigned to your supervised Care Centres.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6" id="cmd-attendance-view">
          
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Supervised Cells Attendance Roll</h3>
                <p className="text-[11px] text-slate-500">Attendance check-ins for all Care Centres under your direct supervision.</p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-bold">
                {myAttendance.length} Attendance Check-ins
              </span>
            </div>

            {/* ATTENDANCE ROLL */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Attendee Name</th>
                    <th className="py-3 px-4">Service Name / Meeting</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Check-in Time</th>
                    <th className="py-3 px-4 text-center">Service Type</th>
                    <th className="py-3 px-4">Care Centre</th>
                    <th className="py-3 px-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {myAttendance.map(att => {
                    const mName = att.member_name || members.find(m => m.id === att.member_id)?.names || 'Unknown';
                    const cell = myCareCenters.find(c => c.id === att.care_center_id);
                    return (
                      <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-black text-slate-900">{mName}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">{att.service_name || 'Cell Meeting'}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{att.attendance_date}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-700">{att.check_in_time || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-bold uppercase font-mono">
                            {att.attendance_type || 'Cell Meeting'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-950">{cell ? cell.cmd_name : 'Apapa Cell'}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{att.created_by || 'Care Admin'}</td>
                      </tr>
                    );
                  })}
                  {myAttendance.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium font-mono">
                        No attendance roll items logged under your supervised cells.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6" id="cmd-analytics-view">
          
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Advanced Performance Charts Suite</h3>
                <p className="text-[11px] text-slate-500">Consolidated analytics reports and charts compiled exclusively from live supervised database nodes.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-4">Weekly Attendance Curve</h4>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Attendance" stroke="#10b981" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-4">Financial Receipts Progress</h4>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="Offering" stroke="#3b82f6" fill="#93c5fd" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-4">Cell Comparison: Average Attendance</h4>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cellPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="Avg Attendance" fill="#047857" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-4">Top Performing Care Centres (Souls Won)</h4>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cellPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="Souls Won" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-6" id="cmd-profile-view">
          
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs max-w-2xl mx-auto">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 mb-6">
              CMD Director Profile Accounts
            </h3>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-800 border border-emerald-500/30 text-white flex items-center justify-center font-black text-lg shadow-md uppercase">
                {activeProfile.full_name ? activeProfile.full_name.split(' ').map(n=>n[0]).slice(0,2).join('') : 'DC'}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900">{activeProfile.full_name}</h4>
                <span className="inline-block text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-500/20 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  {activeProfile.role}
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block font-mono">Email Address</span>
                  <span className="font-extrabold text-slate-900">{activeProfile.email}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block font-mono">Profile Status</span>
                  <span className="font-extrabold text-emerald-600">Active</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block font-mono">Assigned CMD Name</span>
                  <span className="font-extrabold text-slate-900">{assignedCMDName || 'Apapa Central CMD'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block font-mono">Assigned Satellite Branch</span>
                  <span className="font-extrabold text-slate-900">Dominion City Surulere Satellite</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200/50 rounded-xl space-y-2">
                <h5 className="font-extrabold text-emerald-950 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Supervisor Role Permissions
                </h5>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  As a Church Ministry Director, you are granted full analytical and directory access for your assigned Care Centres. You do not have permission to modify system registries, change database configurations, manage global accounts, or view telemetry/diagnostics logs.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
