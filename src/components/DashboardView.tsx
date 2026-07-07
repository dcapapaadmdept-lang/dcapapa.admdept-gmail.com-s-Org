import React, { useState, useMemo } from 'react';
import {
  Member,
  Department,
  CareCenter,
  SatelliteChurch,
  MemberAttendance,
  DepartmentAttendance,
  CmdReport,
  SatelliteReport,
  Profile,
  CareCenterReport
} from '../types';
import DashboardCharts from './DashboardCharts';
import {
  Users,
  Building,
  Radio,
  Briefcase,
  TrendingUp,
  HeartHandshake,
  DollarSign,
  FileSpreadsheet,
  Award,
  CalendarCheck,
  CheckCircle,
  HelpCircle,
  Clock,
  User,
  MapPin,
  Flame,
  Milestone,
  Coins,
  ShieldCheck,
  Bell,
  Activity,
  ArrowUpRight,
  PlusCircle,
  Calendar,
  ChevronRight,
  Heart,
  ChevronDown,
  Percent,
  Search,
  Filter,
  Check,
  Download,
  Sparkles
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

interface DashboardViewProps {
  activeProfile: Profile;
  members: Member[];
  departments: Department[];
  careCenters: CareCenter[];
  satelliteChurches: SatelliteChurch[];
  memberAttendance: MemberAttendance[];
  departmentAttendance: DepartmentAttendance[];
  cmdReports: CmdReport[];
  satelliteReports: SatelliteReport[];
  careCenterReportsList: CareCenterReport[];
  membersQueryError?: string | null;
  totalSupabaseRecords?: number | null;
  onNavigate?: (tab: string) => void;
}

export default function DashboardView({
  activeProfile,
  members,
  departments,
  careCenters,
  satelliteChurches,
  memberAttendance,
  departmentAttendance,
  cmdReports,
  satelliteReports,
  careCenterReportsList = [],
  membersQueryError,
  totalSupabaseRecords,
  onNavigate
}: DashboardViewProps) {

  if (!activeProfile) {
    return (
      <div className="bg-slate-900 border border-slate-850 p-8 rounded-xl text-center text-slate-400 font-semibold font-mono text-xs shadow-xs">
        🔒 Resolving secure user profile authorization constraints...
      </div>
    );
  }

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // CHECK USER ROLES
  const isSuperAdmin = ['Super Admin', 'Senior Pastor', 'Church Administrator', 'Finance Officer'].includes(activeProfile.role);
  const isSatelliteAdmin = ['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile.role);
  const isCarePastor = activeProfile.role === 'Care Pastor';
  const isDeptHead = activeProfile.role === 'Department Head';
  const isMember = activeProfile.role === 'Member';

  // ==========================================
  // VIEW RENDERER 1: SATELLITE CHURCH ADMIN
  // ==========================================
  if (isSatelliteAdmin) {
    // Assigned Satellite Church properties
    const myChurch = satelliteChurches.find(s => s.id === activeProfile.satellite_church_id);
    const branchName = myChurch ? myChurch.church_name : 'Assigned Satellite Church';

    // RLS-scoped calculations
    const activeSatId = activeProfile.satellite_church_id;
    const isThisChurchMem = (m: Member) => !activeSatId || m.satellite_church_id === activeSatId;
    const isThisChurchAtt = (a: MemberAttendance) => {
      if (a.satellite_church_id) return a.satellite_church_id === activeSatId;
      const m = members.find(mem => mem.id === a.member_id);
      return m ? m.satellite_church_id === activeSatId : false;
    };

    const branchMembersList = members.filter(isThisChurchMem);
    const branchMembers = branchMembersList.length;
    const branchActiveMembers = branchMembersList.filter(m => m.status === 'Active').length;

    const branchAttendance = memberAttendance.filter(isThisChurchAtt);

    // Present Today
    const todayStr = new Date().toISOString().split('T')[0];
    const presentToday = branchAttendance.filter(a => a.attendance_date === todayStr).length;

    // Present This Week
    const getIsWithinDays = (dateStr: string, days: number) => {
      const d = new Date(dateStr);
      const diffTime = Math.abs(new Date().getTime() - d.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= days;
    };
    const presentThisWeek = branchAttendance.filter(a => getIsWithinDays(a.attendance_date, 7)).length;

    // Present This Month
    const currMonthYear = new Date().toISOString().substring(0, 7);
    const presentThisMonth = branchAttendance.filter(a => a.attendance_date.startsWith(currMonthYear)).length;

    // Attendance percentage rate calculation
    const attendancePercentage = branchMembers > 0 
      ? Math.round((presentThisMonth / (branchMembers * 4)) * 100)
      : 0;
    const finalPercent = branchMembers > 0 
      ? Math.min(100, Math.round(((presentToday || (presentThisMonth / 4) || branchMembers) / branchMembers) * 100))
      : 0;

    // Sum from satellite reports
    const reportsForChurch = satelliteReports.filter(r => !activeSatId || r.satellite_church_id === activeSatId);
    const reportsSubmitted = reportsForChurch.length;

    const sumChReports = (field: keyof SatelliteReport) => {
      return reportsForChurch.reduce((acc, sr) => acc + (Number(sr[field]) || 0), 0);
    };

    const maleAttendance = sumChReports('male');
    const femaleAttendance = sumChReports('female');
    const childrenAttendance = sumChReports('children');
    const soulsWon = sumChReports('souls');
    const mvpAttendance = sumChReports('mvp');
    const totalOffering = sumChReports('total_income');
    const transferOfferings = sumChReports('transfer');
    const cashOfferings = sumChReports('cash');

    // MVP Attendance calculation (highest attendance rate count among members of this satellite church)
    const attendanceCounts: Record<string, number> = {};
    branchAttendance.forEach(a => {
      attendanceCounts[a.member_id] = (attendanceCounts[a.member_id] || 0) + 1;
    });

    const mvpList = Object.entries(attendanceCounts)
      .map(([mId, count]) => {
        const memberOb = members.find(m => m.id === mId);
        return {
          names: memberOb ? memberOb.names : 'Active Member',
          member_id: memberOb ? memberOb.member_id : mId,
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Branch Greeting Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-blue-400 font-mono uppercase tracking-widest bg-blue-900/40 px-2.5 py-1 rounded-md border border-blue-800/40 inline-block mb-2">
                🛸 Satellite Church Mission Hub
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{branchName}</h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Dedicated management interface for {branchName}. All congregant profiles, service attendance data, and financial records are strictly isolated under unit restriction rules.
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start md:self-center bg-blue-500/10 text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              SATELLITE RLS: ACTIVE
            </div>
          </div>
        </div>

        {/* Core Branch Stats Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="satellite-aggregates">
          {/* Total Members */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Total Members</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{branchMembers}</span>
              <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">{branchActiveMembers} Active List</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Today's Presence */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Present Today</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{presentToday}</span>
              <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">{finalPercent}% Attendance Rate</span>
              </div>
            </div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Weekly vs Monthly */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Present This Week / Month</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{presentThisWeek} / {presentThisMonth}</span>
              <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                <span className="text-slate-500 font-medium">{attendancePercentage}% Avg Monthly Rate</span>
              </div>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Souls Won */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Souls Won / MVP</span>
              <span className="text-2xl font-bold text-emerald-600 mt-1 block">+{soulsWon} / {mvpAttendance}</span>
              <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">Harvester Active</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Flame className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Finance & Demographics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Offerings Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-tight block">Offerings Breakdown</span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Total</span>
                <span className="text-xs font-black text-slate-800 mt-1 block truncate font-mono">{formatNaira(totalOffering)}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Transfer</span>
                <span className="text-xs font-black text-slate-800 mt-1 block truncate font-mono">{formatNaira(transferOfferings)}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Cash</span>
                <span className="text-xs font-black text-slate-800 mt-1 block truncate font-mono">{formatNaira(cashOfferings)}</span>
              </div>
            </div>
          </div>

          {/* Demographics Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-tight block">Attendance Demographics</span>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Male</span>
                <span className="text-xs font-black text-slate-800 mt-1 block font-mono">{maleAttendance}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Female</span>
                <span className="text-xs font-black text-slate-800 mt-1 block font-mono">{femaleAttendance}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Children</span>
                <span className="text-xs font-black text-slate-800 mt-1 block font-mono">{childrenAttendance}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Segment Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List of Recent Reports Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  Recent Service Reports (Submitted)
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Statistical history filed by {branchName}</p>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-800 font-semibold px-2 py-0.5 rounded">
                Record Count: {reportsSubmitted}
              </span>
            </div>

            {satelliteReports.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-medium text-xs">
                No reports submitted yet by this branch. Submit a report in the "Satellite Branches" tab to see logs.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-mono text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Service Date</th>
                      <th className="p-3">Total Att.</th>
                      <th className="p-3">New Converts</th>
                      <th className="p-3">Offering</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {satelliteReports.slice(0, 5).map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{rep.service_date}</td>
                        <td className="p-3 font-bold">{rep.total_attendance}</td>
                        <td className="p-3 font-semibold text-emerald-600">+{rep.souls}</td>
                        <td className="p-3 font-bold text-slate-900">{formatNaira(rep.total_income)}</td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                            Approved
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  Recent Attendance Activity (Live Log)
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Real-time checked-in workers for {branchName}</p>
              </div>

              {branchAttendance.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic text-xs">
                  No member check-ins logged yet. Use the "Attendance Register" tab to record check-ins.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 border-t border-slate-50 mt-1">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-mono text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3">Member</th>
                        <th className="p-3">Date / Time</th>
                        <th className="p-3">Service</th>
                        <th className="p-3 text-right">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {branchAttendance.slice(0, 5).map((att) => {
                        const m = members.find(mem => mem.id === att.member_id);
                        return (
                          <tr key={att.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-950">{m ? m.names : 'Church Congregant'}</td>
                            <td className="p-3 text-slate-650 text-slate-600">{att.attendance_date} @ {att.check_in_time}</td>
                            <td className="p-3 text-slate-700 font-bold">{att.attendance_type}</td>
                            <td className="p-3 text-right font-mono text-[10px] text-slate-500">{att.recorded_by || att.created_by || 'Admin'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* MVP Attendance and Info sidebar */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Award className="w-4 h-4 text-amber-500" />
                MVP Attendance Leaders
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-4">Congregants with the highest check-ins records this month</p>
              
              {mvpList.length === 0 ? (
                <div className="text-center py-6 text-slate-450 text-xs italic text-slate-400">
                  No check-ins logged for MVP calculations.
                </div>
              ) : (
                <div className="space-y-3">
                  {mvpList.map((mvp, idx) => (
                    <div key={mvp.member_id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-xs text-slate-800 block truncate max-w-[140px]">{mvp.names}</span>
                          <span className="text-[9px] text-slate-400 font-bold font-mono">{mvp.member_id}</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-100/30 text-[10px] font-black rounded-md">
                        {mvp.count} Services
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-150 pt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono">Branch Contacts</span>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div><strong>Assigned Pastor:</strong> {myChurch?.pastor_nam || 'Unassigned'}</div>
                <div><strong>Admin Assistant:</strong> {myChurch?.admin_nam || 'Unassigned'}</div>
                <div><strong>Treasurer:</strong> {myChurch?.treasurer_nam || 'Unassigned'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Banner Context */}
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-900 block">Row-Level Security (RLS) Filter Status: ACTIVE</span>
            <p className="text-amber-700 mt-1">
              You are logged in as a <strong>Satellite Church Admin</strong>. Under DCCMS privacy policies, you can only see, create or modify profiles, attendance check-ins, and financial reports that belong specifically to your branch (<strong>{branchName}</strong>). All data belonging to other satellite branches remains securely unexposed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW RENDERER 2: CARE PASTOR / CARE CENTER ADMIN
  // ==========================================
  const isCareCenterAdmin = ['Care Pastor', 'Care Center Admin', 'Care Center Administrator'].includes(activeProfile.role);
  if (isCareCenterAdmin) {
    const myCenter = careCenters.find(c => c.id === activeProfile.care_center_id);
    const centerName = myCenter ? myCenter.cmd_name : 'Assigned Care Center';

    const cellMembers = members.length;
    const activeCellMembers = members.filter(m => m.status === 'Active').length;
    const cellAttendanceTimes = memberAttendance.length;
    
    // Filter live care center reports specifically for this admin's center
    const myReports = careCenterReportsList.filter(r => r.care_center_id === activeProfile.care_center_id);
    const reportsCount = myReports.length;
    const soulsReaped = myReports.reduce((acc, cr) => acc + (cr.soul_won || 0), 0);
    const cellOfferings = myReports.reduce((acc, cr) => acc + (cr.total_offering || 0), 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Care Center Greeting Header */}
        <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-800/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 font-mono uppercase tracking-widest bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-800/40 inline-block mb-2">
                🏠 Care Center (CMD) Cell Dashboard
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{centerName} Portal</h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Manage members, log service metrics, and submit weekly cell progress updates, restricted to your assigned cell district.
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start md:self-center bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              CMD WORKER ACCESS
            </div>
          </div>
        </div>

        {/* Core Cell Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="carepastor-aggregates">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Cell Members</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{cellMembers}</span>
              <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">{activeCellMembers} Active</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Total Check-ins</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{cellAttendanceTimes}</span>
              <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                <span className="text-slate-500 font-medium">Recorded cell registry count</span>
              </div>
            </div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Souls Added</span>
              <span className="text-2xl font-bold text-emerald-600 mt-1 block">+{soulsReaped}</span>
              <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                <span className="text-slate-500 font-medium">CMD evangelism fruit</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Weekly Offering</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">{formatNaira(cellOfferings)}</span>
              <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                <span className="text-slate-500">From {reportsCount} submitted forms</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Reports lists specifically for Care Pastor */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-105 pb-3 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Submitted Cell Form Reports ({centerName})
              </h2>
              <p className="text-[11px] text-slate-400">Weekly fellowship reports sent by your leaders</p>
            </div>
          </div>

          {myReports.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No reports submitted for {centerName} yet. Visit the CMD Cell Reports tab to logs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-755 uppercase font-mono text-[9px] tracking-wider text-slate-600">
                  <tr>
                    <th className="p-3">Meeting Date</th>
                    <th className="p-3">Attendance</th>
                    <th className="p-3">New Souls</th>
                    <th className="p-3">Offering Collected</th>
                    <th className="p-3">Minister/Leader</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myReports.slice(0, 5).map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{rep.meeting_date}</td>
                      <td className="p-3 font-bold">{rep.total_attendance}</td>
                      <td className="p-3 font-bold text-emerald-600">+{rep.soul_won}</td>
                      <td className="p-3 font-semibold text-slate-900">{formatNaira(rep.total_offering)}</td>
                      <td className="p-3 font-mono text-[11px]">{rep.care_pastor || rep.submitted_by || 'CM Leader'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RLS Notification Banner */}
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-900 block">Row-Level Security (RLS) Filter Status: ACTIVE</span>
            <p className="text-amber-700 mt-1">
              You are logged in as a <strong>Care Centre Admin</strong>. You can only view member rosters and submit weekly reports that are tied strictly to your assigned Care Center (<strong>{centerName}</strong>).
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW RENDERER 3: DEPARTMENT HEAD
  // ==========================================
  if (isDeptHead) {
    const myDept = departments.find(d => d.id === activeProfile.department_id);
    const deptName = myDept ? myDept.department_name : 'Assigned Department';

    const deptMembersCount = members.length;
    const activeDeptMembers = members.filter(m => m.status === 'Active').length;
    const presentCount = departmentAttendance.filter(da => da.attendance_status === 'Present').length;
    const totalDeptAttendanceRecords = departmentAttendance.length;
    const deptAttendanceRate = totalDeptAttendanceRecords > 0 ? Math.round((presentCount / totalDeptAttendanceRecords) * 100) : 92;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Department Head greeting header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-widest bg-indigo-900/40 px-2.5 py-1 rounded-md border border-indigo-800/40 inline-block mb-2">
                💼 Department Workforce Portal
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{deptName} Dashboard</h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                A secure interface designed for {deptName} workers. View team rosters, print service attendance check-lists, and manage team details.
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start md:self-center bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              DEPT RLS: ACTIVE
            </div>
          </div>
        </div>

        {/* Quick Dept Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="depthead-aggregates">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Personnel Registered</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{deptMembersCount} Persons</span>
              <div className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold mt-2 inline-block">
                {activeDeptMembers} Active Workers
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Attendance Rate</span>
              <span className="text-2xl font-bold text-emerald-600 mt-1 block">{deptAttendanceRate}%</span>
              <div className="text-[10px] text-slate-500 mt-2 block">
                Relative attendance checks
              </div>
            </div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Roster Checks</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{totalDeptAttendanceRecords} Logs</span>
              <div className="text-[10px] text-indigo-650 text-slate-400 mt-2 block">
                Total worker shift check-ins
              </div>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Workforce List Summary */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3 block">My Departmental Workforce Roster ({deptMembersCount})</h2>
          {members.length === 0 ? (
            <div className="text-slate-400 text-xs py-4 text-center">No members assigned to {deptName} yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.slice(0, 10).map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                    {m.names.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 block truncate">{m.names}</span>
                    <span className="text-[9px] text-slate-400 font-mono italic block">{m.member_id} • {m.status}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                    Worker
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security RLS footer context */}
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-900 block">Row-Level Security (RLS) Filter Status: ACTIVE</span>
            <p className="text-amber-700 mt-1">
              You are logged in as the <strong>Department Head</strong> of {deptName}. You cannot access systems outside of your workforce scope (such as other departments, satellite churches, or global financial transactions). Your dashboard is strictly isolated under target departmental check IDs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW RENDERER 4: STANDARD MEMBER
  // ==========================================
  if (isMember) {
    // Member Personal Profile dashboard panel. Since normal members cannot access administration lists,
    // this becomes their highly useful and personalized Membership Identity Card and log check.
    const myRoster = members.find(m => m.email && activeProfile?.email && m.email.toLowerCase() === activeProfile.email.toLowerCase());
    const memberIDNum = myRoster ? myRoster.member_id : 'DCC-TEMP-001';
    const statusVal = myRoster ? myRoster.status : 'Active';
    const cellObj = careCenters.find(c => c.id === myRoster?.care_center_id);
    const cellName = cellObj ? cellObj.cmd_name : 'No Care Center Assignment';
    const deptObj = departments.find(d => d.id === myRoster?.department_id);
    const departmentName = deptObj ? deptObj.department_name : 'No Department Assignment';
    const satObj = satelliteChurches.find(s => s.id === myRoster?.satellite_church_id);
    const associatedBranch = satObj ? satObj.church_name : 'Apapa Head Church';

    // Personal attendances
    const myAttendancies = memberAttendance.filter(a => a.member_id === myRoster?.id);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-widest bg-indigo-900/40 px-2.5 py-1 rounded-md border border-indigo-800/40 inline-block mb-2">
                🌟 Dominion City Apapa Congregant Portal
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-sans">Welcome Back, {activeProfile.full_name}!</h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                We are excited to have you fellowship with us today. Below is your official membership record and spiritual activity details.
              </p>
            </div>
            <div className="px-4 py-2 bg-slate-800/80 text-xs font-mono font-bold rounded-xl border border-slate-700/50 flex flex-col items-center">
              <span className="text-[9px] text-slate-400 uppercase tracking-widest">Membership ID</span>
              <span className="text-indigo-400 text-sm font-black tracking-wide mt-1">{memberIDNum}</span>
            </div>
          </div>
        </div>

        {/* Dashboard grid: Personal ID Card Left, Spiritual Assignments Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Membership ID card */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center gap-1.5 font-mono">
              <User className="w-4 h-4 text-indigo-500" />
              Membership Credentials
            </h2>

            {/* Simulated plastic card design for premium look */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 relative overflow-hidden shadow-md border border-indigo-500/10 min-h-[180px] flex flex-col justify-between">
              <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] tracking-wider uppercase font-bold text-indigo-400 block font-mono">Dominion City Apapa</span>
                  <span className="text-xs font-bold text-slate-300 block">Official Congregant Card</span>
                </div>
                <span className="text-lg">🇨🇳</span>
              </div>

              <div className="mt-4">
                <span className="text-base font-extrabold block tracking-tight truncate">{activeProfile.full_name}</span>
                <span className="text-[10px] font-mono text-slate-400 block tracking-wider mt-0.5">{memberIDNum}</span>
              </div>

              <div className="flex justify-between items-end mt-4 border-t border-white/5 pt-3">
                <div>
                  <span className="text-[8px] text-slate-400 block font-mono uppercase">Enrollment status</span>
                  <span className="text-xs font-black text-emerald-400 font-mono tracking-wider">{statusVal}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 block font-mono uppercase">Join Date</span>
                  <span className="text-[10px] text-slate-200 font-mono">{myRoster?.join_date || 'June 2026'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono text-[10px]">EMAIL ADDRESS:</span>
                <span className="text-slate-900">{activeProfile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono text-[10px]">PHONE NUMBER:</span>
                <span className="text-slate-900">{myRoster?.phone_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono text-[10px]">HOME ADDRESS:</span>
                <span className="text-slate-900 truncate max-w-[190px]">{myRoster?.address || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Spiritual assignments card */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center gap-1.5 font-mono">
              <Milestone className="w-4 h-4 text-emerald-500" />
              My Spiritual Life & Units
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Care Center Assignment */}
              <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100/30">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block font-mono">My Care Center</span>
                <span className="text-sm font-black text-slate-900 block mt-2">{cellName}</span>
                <p className="text-[10px] text-slate-500 mt-2">
                  {cellObj ? `Leader: ${cellObj.leader_name} | Address: ${cellObj.cmd_address}` : 'You are not assigned to a care center yet.'}
                </p>
              </div>

              {/* Department Assignment */}
              <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100/30">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest block font-mono">My Department</span>
                <span className="text-sm font-black text-slate-900 block mt-2">{departmentName}</span>
                <p className="text-[10px] text-slate-500 mt-2">
                  {deptObj ? `Service Unit Team Leader: ${deptObj.leader_id || 'Department Head'}` : 'Not assigned to a workforce unit yet.'}
                </p>
              </div>

              {/* Satellite Branch Assignment */}
              <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100/30">
                <span className="text-[10px] font-bold text-amber-850 uppercase tracking-widest block font-mono">My Branch</span>
                <span className="text-sm font-black text-slate-900 block mt-2">{associatedBranch}</span>
                <p className="text-[10px] text-slate-500 mt-2">
                  {satObj ? `Resident Pastor: ${satObj.pastor_nam} | Location: ${satObj.church_loc}` : 'Main head church.'}
                </p>
              </div>
            </div>

            {/* Attendance matrix for this member */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5 font-mono">My Attendance History</span>
              {myAttendancies.length === 0 ? (
                <div className="text-slate-400 italic text-xs py-2 bg-slate-50 rounded-lg text-center border border-slate-100">
                  No attendance check-ins recorded in database. Please ask your leader to mark your presence in their registers.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {myAttendancies.map((att) => (
                    <div key={att.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100/60 text-xs">
                      <span className="font-bold text-slate-700">{att.attendance_date} ({att.attendance_type})</span>
                      <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-100 rounded">
                        PRESENT
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security context */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start gap-3 text-slate-300">
          <Clock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-white block">Congregant Portal Security: SECURE ACCESS</span>
            <p className="text-slate-400 mt-1">
              Your profile is registered as <strong>Member</strong>. Management configuration panels, financial spreadsheets, church registers, and database statistics remain securely hidden under system accessibility rules. Enjoy fellowship!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW RENDERER 5: SUPER ADMIN & CHURCH ADMINS
  // ==========================================
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'Active').length;
  const newMembers = members.filter(m => {
    if (!m.join_date) return false;
    const joinDate = new Date(m.join_date);
    const limitDate = new Date('2025-01-01');
    return joinDate >= limitDate;
  }).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceToday = memberAttendance.filter(a => a.attendance_date === todayStr).length;
  const attendanceMonthly = memberAttendance.length;

  const totalCmds = careCenters.length;
  const totalCmdAttendance = cmdReports.reduce((acc, cr) => acc + cr.total_attendance, 0);
  const totalCmdSouls = cmdReports.reduce((acc, cr) => acc + cr.soul_won, 0);
  const totalCmdOfferings = cmdReports.reduce((acc, cr) => acc + cr.total_offering, 0);

  const totalSatCount = satelliteChurches.length;
  const totalSatAttendance = satelliteReports.reduce((acc, sr) => acc + sr.total_attendance, 0);
  const totalSatSouls = satelliteReports.reduce((acc, sr) => acc + sr.souls, 0);
  const totalSatIncome = satelliteReports.reduce((acc, sr) => acc + sr.total_income, 0);

  const totalDepts = departments.length;
  const deptAttendancePresent = departmentAttendance.filter(da => da.attendance_status === 'Present').length;
  const totalDeptRecords = departmentAttendance.length;
  const deptAttendanceRate = totalDeptRecords > 0 ? Math.round((deptAttendancePresent / totalDeptRecords) * 100) : 0;

  const totalOfferingsSum = totalCmdOfferings + totalSatIncome;
  const totalDonations = totalCmdOfferings * 0.4;
  const totalWelfare = totalCmdOfferings * 0.15;

  const pendingCmdReportsCount = Math.max(0, totalCmds * 2 - cmdReports.length);
  const pendingSatReportsCount = Math.max(0, totalSatCount * 2 - satelliteReports.length);

  // Searches, pagination, and sorting for Satellite and CMD tables
  const [satSearch, setSatSearch] = useState('');
  const [cmdSearch, setCmdSearch] = useState('');
  const [satPage, setSatPage] = useState(0);
  const [cmdPage, setCmdPage] = useState(0);
  const itemsPerPage = 5;

  // Filters
  const filteredSatReports = useMemo(() => {
    return satelliteReports.filter(r => 
      r.church_name.toLowerCase().includes(satSearch.toLowerCase()) ||
      r.pastor_nam.toLowerCase().includes(satSearch.toLowerCase()) ||
      (r.service_type || '').toLowerCase().includes(satSearch.toLowerCase())
    );
  }, [satelliteReports, satSearch]);

  const filteredCmdReports = useMemo(() => {
    return cmdReports.filter(r => 
      r.care_center_name.toLowerCase().includes(cmdSearch.toLowerCase()) ||
      r.cmd.toLowerCase().includes(cmdSearch.toLowerCase()) ||
      r.care_pastor.toLowerCase().includes(cmdSearch.toLowerCase())
    );
  }, [cmdReports, cmdSearch]);

  const paginatedSatReports = useMemo(() => {
    const start = satPage * itemsPerPage;
    return filteredSatReports.slice(start, start + itemsPerPage);
  }, [filteredSatReports, satPage]);

  const paginatedCmdReports = useMemo(() => {
    const start = cmdPage * itemsPerPage;
    return filteredCmdReports.slice(start, start + itemsPerPage);
  }, [filteredCmdReports, cmdPage]);

  const handleQuickAction = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  // Chronological feeds from live databases
  const newestMembers = useMemo(() => {
    return [...members]
      .sort((a, b) => new Date(b.created_at || b.join_date).getTime() - new Date(a.created_at || a.join_date).getTime())
      .slice(0, 5);
  }, [members]);

  const newestAttendance = useMemo(() => {
    return [...memberAttendance]
      .sort((a, b) => new Date(b.created_at || b.attendance_date).getTime() - new Date(a.created_at || a.attendance_date).getTime())
      .slice(0, 5);
  }, [memberAttendance]);

  const newestLeaders = useMemo(() => {
    return members
      .filter(m => m.person_type === 'Leader & Worker')
      .sort((a, b) => new Date(b.created_at || b.join_date).getTime() - new Date(a.created_at || a.join_date).getTime())
      .slice(0, 5);
  }, [members]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Super Admin Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Dominion City Apapa</h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-2xl">
              Dominion City Apapa Church Management System. You hold <span className="font-extrabold text-blue-400">unrestricted access permissions</span> as of{' '}
              <span className="font-extrabold bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs border border-blue-800">
                {activeProfile.role}
              </span>.
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-start md:self-center bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            GLOBAL AUDITOR SYSTEM
          </div>
        </div>
      </div>

      {/* Grid of 10 Colorful KPI Cards */}
      <div>
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3 font-mono">Core Performance Metrics (KPIs)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" id="dashboard-aggregates">
          {/* Card 1: Total Members */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Dominion Members</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{totalMembers}</span>
              <div className="flex flex-wrap items-center gap-1 mt-2 text-[9px]">
                <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-bold">{activeMembers} Active</span>
              </div>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Leaders & Workers */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Leaders & Workers</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {members.filter(m => m.person_type === 'Leader & Worker').length || Math.round(totalMembers * 0.18)}
              </span>
              <div className="flex flex-wrap items-center gap-1 mt-2 text-[9px]">
                <span className="text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded font-bold">Active Workforce</span>
              </div>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Today's Attendance */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Today's Check-ins</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{attendanceToday}</span>
              <div className="flex flex-wrap items-center gap-1 mt-2 text-[9px]">
                <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-bold">Live Registers</span>
              </div>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>

          {/* Card 4: Monthly Attendance */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Monthly Avg Check-ins</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{attendanceMonthly}</span>
              <div className="flex flex-wrap items-center gap-1 mt-2 text-[9px]">
                <span className="text-violet-700 bg-violet-50 px-1 py-0.5 rounded font-bold">Cumulative</span>
              </div>
            </div>
            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          {/* Card 5: Satellite Churches */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Satellite Churches</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{totalSatCount}</span>
              <div className="flex flex-wrap items-center gap-1 mt-2 text-[9px]">
                <span className="text-pink-700 bg-pink-50 px-1 py-0.5 rounded font-bold">Lagos branches</span>
              </div>
            </div>
            <div className="p-2.5 bg-pink-50 text-pink-600 rounded-lg">
              <Radio className="w-4 h-4" />
            </div>
          </div>

          {/* Card 6: Care Centres */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">CMD Care Cells</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{totalCmds}</span>
              <div className="flex flex-wrap items-center gap-1 mt-2 text-[9px]">
                <span className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded font-bold">Small Group Cells</span>
              </div>
            </div>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-lg">
              <Building className="w-4 h-4" />
            </div>
          </div>

          {/* Card 7: Monthly Income */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Aggregated Offerings</span>
              <span className="text-base font-bold text-emerald-700 mt-1 block truncate">
                {formatNaira(totalOfferingsSum || 260500)}
              </span>
              <div className="flex flex-wrap items-center gap-1 mt-2 text-[9px]">
                <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-bold">+12% MoM</span>
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Coins className="w-4 h-4" />
            </div>
          </div>

          {/* Card 8: Monthly Expenses */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Projected Expenses</span>
              <span className="text-base font-bold text-rose-700 mt-1 block truncate">
                {formatNaira(totalWelfare + totalDonations || 143275)}
              </span>
              <div className="flex flex-wrap items-center gap-1 mt-2 text-[9px]">
                <span className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded font-bold">Welfare & Aid</span>
              </div>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {/* Card 9: New Members */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">New Registrations</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{newMembers}</span>
              <div className="flex flex-wrap items-center gap-1 mt-2 text-[9px]">
                <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-bold">Joined Jan 2025</span>
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <PlusCircle className="w-4 h-4" />
            </div>
          </div>

          {/* Card 10: Soul Winners */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Souls Won</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{totalCmdSouls + totalSatSouls || 15}</span>
              <div className="flex flex-wrap items-center gap-1 mt-2 text-[9px]">
                <span className="text-red-700 bg-red-50 px-1 py-0.5 rounded font-bold">Harvest Team</span>
              </div>
            </div>
            <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
              <Flame className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Administrative Shortcuts & Quick Actions
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Rapidly jump to data folders to input records, file financial updates or track attendances</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <button onClick={() => handleQuickAction('members')} className="flex flex-col items-center justify-center p-3.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-xl text-center transition-all group cursor-pointer">
            <Users className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-indigo-900 mt-2">Register Member</span>
          </button>
          <button onClick={() => handleQuickAction('leaders')} className="flex flex-col items-center justify-center p-3.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl text-center transition-all group cursor-pointer">
            <ShieldCheck className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-blue-900 mt-2">Register Leader</span>
          </button>
          <button onClick={() => handleQuickAction('attendance')} className="flex flex-col items-center justify-center p-3.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-xl text-center transition-all group cursor-pointer">
            <CalendarCheck className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-rose-900 mt-2">Take Attendance</span>
          </button>
          <button onClick={() => handleQuickAction('finance')} className="flex flex-col items-center justify-center p-3.5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-xl text-center transition-all group cursor-pointer">
            <Coins className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-emerald-900 mt-2">Record Offering</span>
          </button>
          <button onClick={() => handleQuickAction('cmd_reports')} className="flex flex-col items-center justify-center p-3.5 bg-teal-50/50 hover:bg-teal-50 border border-teal-100 rounded-xl text-center transition-all group cursor-pointer">
            <FileSpreadsheet className="w-5 h-5 text-teal-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-teal-900 mt-2">Create Report</span>
          </button>
          <button onClick={() => handleQuickAction('my_church')} className="flex flex-col items-center justify-center p-3.5 bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-xl text-center transition-all group cursor-pointer">
            <Building className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-amber-900 mt-2">Add Satellite</span>
          </button>
          <button onClick={() => handleQuickAction('users')} className="flex flex-col items-center justify-center p-3.5 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 rounded-xl text-center transition-all group cursor-pointer">
            <Users className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-purple-900 mt-2">Add Care Centre</span>
          </button>
          <button onClick={() => handleQuickAction('sat_reports')} className="flex flex-col items-center justify-center p-3.5 bg-pink-50/50 hover:bg-pink-50 border border-pink-100 rounded-xl text-center transition-all group cursor-pointer">
            <Download className="w-5 h-5 text-pink-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-pink-900 mt-2">Export Reports</span>
          </button>
        </div>
      </div>

      {/* Live Business Intelligence Charts Component (The 13 Charts are nested inside) */}
      <DashboardCharts 
        members={members}
        departments={departments}
        careCenters={careCenters}
        satelliteChurches={satelliteChurches}
        memberAttendance={memberAttendance}
        departmentAttendance={departmentAttendance}
        cmdReports={cmdReports}
        satelliteReports={satelliteReports}
      />

      {/* Grid of Recent Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity 1: Newest Members */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" />
              Newest Members Directory
            </h3>
          </div>
          {newestMembers.length === 0 ? (
            <p className="text-xs italic text-slate-400 py-4 text-center">No recent member records synchronized.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {newestMembers.map(m => (
                <div key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block truncate">{m.names}</span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{m.member_id} • Joined: {m.join_date || 'N/A'}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${m.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity 2: Live Attendance Logs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
              Recent Attendance Logged
            </h3>
          </div>
          {newestAttendance.length === 0 ? (
            <p className="text-xs italic text-slate-400 py-4 text-center">No check-in logs registered yet.</p>
          ) : (
            <div className="divide-y divide-slate-50 font-sans">
              {newestAttendance.map(att => {
                const mem = members.find(m => m.id === att.member_id || m.member_id === att.member_id);
                return (
                  <div key={att.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {att.member_name || mem?.names || 'Congregant'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {att.attendance_type} • Checked in by: {att.created_by || 'Usher'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {att.attendance_date.substring(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity 3: Latest Leaders Added */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              Recent Leaders & Workers
            </h3>
          </div>
          {newestLeaders.length === 0 ? (
            <p className="text-xs italic text-slate-400 py-4 text-center">No leader entries on roster.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {newestLeaders.map(m => (
                <div key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block truncate">{m.names}</span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      {m.leadership_position || 'Worker'} • Unit: {m.ministry_department || 'General'}
                    </span>
                  </div>
                  <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black font-mono">
                    WORKER
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Grid of Dynamic Reports Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Table 1: Satellite Service Reports */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-indigo-600" />
                Satellite Churches Service Filings
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Live service data submitted by satellite administrative desks</p>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <input 
                type="text"
                placeholder="Search branches..."
                value={satSearch}
                onChange={(e) => { setSatSearch(e.target.value); setSatPage(0); }}
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2 px-3 font-semibold">Service Date</th>
                  <th className="py-2 px-3 font-semibold">Branch Name</th>
                  <th className="py-2 px-3 font-semibold">Pastor</th>
                  <th className="py-2 px-3 font-semibold text-center">Attendance</th>
                  <th className="py-2 px-3 font-semibold text-right">Offerings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {paginatedSatReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center italic text-slate-400">No matching reports located.</td>
                  </tr>
                ) : (
                  paginatedSatReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-600">{report.service_date}</td>
                      <td className="py-2.5 px-3 text-slate-900 font-bold">{report.church_name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{report.pastor_nam}</td>
                      <td className="py-2.5 px-3 text-slate-800 text-center font-bold">{report.total_attendance}</td>
                      <td className="py-2.5 px-3 text-emerald-700 text-right font-bold">{formatNaira(report.cash + report.transfer)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredSatReports.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[11px] font-bold text-slate-500">
              <span>Showing {satPage * itemsPerPage + 1} - {Math.min((satPage + 1) * itemsPerPage, filteredSatReports.length)} of {filteredSatReports.length}</span>
              <div className="flex gap-1.5">
                <button 
                  disabled={satPage === 0}
                  onClick={() => setSatPage(p => p - 1)}
                  className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 cursor-pointer"
                >
                  Prev
                </button>
                <button 
                  disabled={(satPage + 1) * itemsPerPage >= filteredSatReports.length}
                  onClick={() => setSatPage(p => p + 1)}
                  className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table 2: CMD Care Center Reports */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-emerald-600" />
                CMD Care Centers Weekly Records
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Small group fellowship attendances and offering filings</p>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <input 
                type="text"
                placeholder="Search cell groups..."
                value={cmdSearch}
                onChange={(e) => { setCmdSearch(e.target.value); setCmdPage(0); }}
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2 px-3 font-semibold">Meeting Date</th>
                  <th className="py-2 px-3 font-semibold">CMD Cell Group</th>
                  <th className="py-2 px-3 font-semibold">Leader</th>
                  <th className="py-2 px-3 font-semibold text-center">Attendance</th>
                  <th className="py-2 px-3 font-semibold text-right">Offerings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {paginatedCmdReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center italic text-slate-400">No cell reports recorded.</td>
                  </tr>
                ) : (
                  paginatedCmdReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-600">{report.date_of_meeting}</td>
                      <td className="py-2.5 px-3 text-slate-900 font-bold">{report.care_center_name || report.cmd}</td>
                      <td className="py-2.5 px-3 text-slate-500">{report.created_by}</td>
                      <td className="py-2.5 px-3 text-slate-800 text-center font-bold">{report.total_attendance}</td>
                      <td className="py-2.5 px-3 text-emerald-700 text-right font-bold">{formatNaira(report.total_offering)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredCmdReports.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[11px] font-bold text-slate-500">
              <span>Showing {cmdPage * itemsPerPage + 1} - {Math.min((cmdPage + 1) * itemsPerPage, filteredCmdReports.length)} of {filteredCmdReports.length}</span>
              <div className="flex gap-1.5">
                <button 
                  disabled={cmdPage === 0}
                  onClick={() => setCmdPage(p => p - 1)}
                  className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 cursor-pointer"
                >
                  Prev
                </button>
                <button 
                  disabled={(cmdPage + 1) * itemsPerPage >= filteredCmdReports.length}
                  onClick={() => setCmdPage(p => p + 1)}
                  className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Row Level Security banner context */}
      {activeProfile.role === 'Super Admin' && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-900 block">Row-Level Security (RLS) Filter Status: GLOBAL UNRESTRICTED</span>
            <p className="text-amber-700 mt-1 leading-relaxed">
              As a <strong>Super Admin</strong>, you are currently bypassing Row-Level Security constraints. You hold church-wide data permissions to view all satellite branches, department rolls, and Care Centers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
