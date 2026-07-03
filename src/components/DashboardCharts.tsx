import React, { useState, useMemo } from 'react';
import {
  Member,
  Department,
  CareCenter,
  SatelliteChurch,
  MemberAttendance,
  DepartmentAttendance,
  CmdReport,
  SatelliteReport
} from '../types';
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
import {
  Activity,
  TrendingUp,
  Users,
  Coins,
  Building,
  Radio,
  Briefcase,
  Sparkles,
  PieChart as PieIcon,
  BarChart2
} from 'lucide-react';

interface DashboardChartsProps {
  members: Member[];
  departments: Department[];
  careCenters: CareCenter[];
  satelliteChurches: SatelliteChurch[];
  memberAttendance: MemberAttendance[];
  departmentAttendance: DepartmentAttendance[];
  cmdReports: CmdReport[];
  satelliteReports: SatelliteReport[];
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6'];

export default function DashboardCharts({
  members,
  departments,
  careCenters,
  satelliteChurches,
  memberAttendance,
  departmentAttendance,
  cmdReports,
  satelliteReports
}: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'growth' | 'finance' | 'ops' | 'all'>('attendance');

  // Helper to format naira currency
  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // --- 1. Attendance Trend (Line Chart) ---
  const attendanceTrendData = useMemo(() => {
    const counts: { [date: string]: number } = {};
    memberAttendance.forEach(a => {
      if (a.attendance_date) counts[a.attendance_date] = (counts[a.attendance_date] || 0) + 1;
    });
    const sortedDates = Object.keys(counts).sort();
    if (sortedDates.length === 0) {
      return [
        { name: '05-31', count: 45 },
        { name: '06-01', count: 52 },
        { name: '06-02', count: 60 },
        { name: '06-03', count: 48 },
        { name: '06-04', count: 70 },
        { name: '06-05', count: 82 },
        { name: '06-07', count: 95 }
      ];
    }
    return sortedDates.map(date => ({
      name: date.substring(5), // MM-DD
      count: counts[date]
    }));
  }, [memberAttendance]);

  // --- 2. Weekly Attendance (Bar Chart) ---
  const weeklyAttendanceData = useMemo(() => {
    const counts: { [type: string]: number } = {};
    memberAttendance.forEach(a => {
      const type = a.attendance_type || 'Sunday Service';
      counts[type] = (counts[type] || 0) + 1;
    });
    if (Object.keys(counts).length === 0) {
      return [
        { name: 'Sunday Service', count: 180 },
        { name: 'Midweek Service', count: 95 },
        { name: 'Special Meeting', count: 40 },
        { name: 'Vigil', count: 25 }
      ];
    }
    return Object.keys(counts).map(key => ({
      name: key,
      count: counts[key]
    }));
  }, [memberAttendance]);

  // --- 3. Monthly Offering (Area Chart) ---
  const monthlyOfferingData = useMemo(() => {
    const monthlySum: { [month: string]: number } = {};
    satelliteReports.forEach(sr => {
      const date = sr.service_date || '';
      const month = date ? new Date(date).toLocaleString('default', { month: 'short' }) : 'Jun';
      monthlySum[month] = (monthlySum[month] || 0) + (sr.total_income || 0);
    });
    cmdReports.forEach(cr => {
      const date = cr.date_of_meeting || '';
      const month = date ? new Date(date).toLocaleString('default', { month: 'short' }) : 'Jun';
      monthlySum[month] = (monthlySum[month] || 0) + (cr.total_offering || 0);
    });
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const activeMonths = Object.keys(monthlySum).sort((a, b) => months.indexOf(a) - months.indexOf(b));
    if (activeMonths.length === 0) {
      return [
        { name: 'Mar', amount: 150000 },
        { name: 'Apr', amount: 210000 },
        { name: 'May', amount: 195000 },
        { name: 'Jun', amount: 260500 }
      ];
    }
    return activeMonths.map(month => ({
      name: month,
      amount: monthlySum[month]
    }));
  }, [satelliteReports, cmdReports]);

  // --- 4. Income vs Expenses (Stacked Bar) ---
  const incomeVsExpensesData = useMemo(() => {
    const monthlyData: { [month: string]: { income: number; expenses: number } } = {};
    satelliteReports.forEach(sr => {
      const date = sr.service_date || '';
      const month = date ? new Date(date).toLocaleString('default', { month: 'short' }) : 'Jun';
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 };
      monthlyData[month].income += sr.total_income || 0;
      monthlyData[month].expenses += (sr.total_income || 0) * 0.40; // Simulated 40% expenses
    });
    cmdReports.forEach(cr => {
      const date = cr.date_of_meeting || '';
      const month = date ? new Date(date).toLocaleString('default', { month: 'short' }) : 'Jun';
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 };
      monthlyData[month].income += cr.total_offering || 0;
      monthlyData[month].expenses += (cr.total_offering || 0) * 0.45; // Simulated 45% expenses
    });
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const activeMonths = Object.keys(monthlyData).sort((a, b) => months.indexOf(a) - months.indexOf(b));
    if (activeMonths.length === 0) {
      return [
        { name: 'Mar', Income: 150000, Expenses: 67500 },
        { name: 'Apr', Income: 210000, Expenses: 94500 },
        { name: 'May', Income: 195000, Expenses: 87750 },
        { name: 'Jun', Income: 260500, Expenses: 117225 }
      ];
    }
    return activeMonths.map(month => ({
      name: month,
      Income: Math.round(monthlyData[month].income),
      Expenses: Math.round(monthlyData[month].expenses)
    }));
  }, [satelliteReports, cmdReports]);

  // --- 5. Members Growth (Line Chart) ---
  const membersGrowthData = useMemo(() => {
    const sortedMembers = [...members].sort((a, b) => new Date(a.join_date || a.created_at).getTime() - new Date(b.join_date || b.created_at).getTime());
    let cumulative = 0;
    const data: { name: string; count: number }[] = [];
    const monthlySum: { [month: string]: number } = {};
    sortedMembers.forEach(m => {
      const date = m.join_date || m.created_at || '';
      const month = date ? new Date(date).toLocaleString('default', { month: 'short', year: '2-digit' }) : 'Jun 26';
      monthlySum[month] = (monthlySum[month] || 0) + 1;
    });
    const uniqueMonths = Object.keys(monthlySum);
    if (uniqueMonths.length === 0) {
      return [
        { name: 'Jan 26', count: 120 },
        { name: 'Feb 26', count: 135 },
        { name: 'Mar 26', count: 158 },
        { name: 'Apr 26', count: 180 },
        { name: 'May 26', count: 210 },
        { name: 'Jun 26', count: 250 }
      ];
    }
    uniqueMonths.sort((a, b) => new Date('01 ' + a).getTime() - new Date('01 ' + b).getTime());
    uniqueMonths.forEach(m => {
      cumulative += monthlySum[m];
      data.push({ name: m, count: cumulative });
    });
    return data;
  }, [members]);

  // --- 6. New Members Per Month (Bar Chart) ---
  const newMembersPerMonthData = useMemo(() => {
    const monthlyCount: { [month: string]: number } = {};
    members.forEach(m => {
      const date = m.join_date || m.created_at || '';
      const month = date ? new Date(date).toLocaleString('default', { month: 'short' }) : 'Jun';
      monthlyCount[month] = (monthlyCount[month] || 0) + 1;
    });
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const activeMonths = Object.keys(monthlyCount).sort((a, b) => months.indexOf(a) - months.indexOf(b));
    if (activeMonths.length === 0) {
      return [
        { name: 'Jan', count: 15 },
        { name: 'Feb', count: 18 },
        { name: 'Mar', count: 22 },
        { name: 'Apr', count: 25 },
        { name: 'May', count: 30 },
        { name: 'Jun', count: 40 }
      ];
    }
    return activeMonths.map(month => ({
      name: month,
      count: monthlyCount[month]
    }));
  }, [members]);

  // --- 7. Care Centre Performance (Horizontal Bar Chart) ---
  const careCentrePerformanceData = useMemo(() => {
    const cmdSum: { [name: string]: number } = {};
    cmdReports.forEach(cr => {
      const name = cr.care_center_name || cr.cmd || 'Care Cell';
      cmdSum[name] = (cmdSum[name] || 0) + (cr.total_attendance || 0);
    });
    const sorted = Object.keys(cmdSum).map(name => ({
      name,
      attendance: cmdSum[name]
    })).sort((a, b) => b.attendance - a.attendance);
    if (sorted.length === 0) {
      return [
        { name: 'Apapa Center 1', attendance: 75 },
        { name: 'Surulere Cell', attendance: 62 },
        { name: 'Festac Cell A', attendance: 48 },
        { name: 'Amuwo Group', attendance: 39 },
        { name: 'Orile Outreach', attendance: 25 }
      ];
    }
    return sorted.slice(0, 5);
  }, [cmdReports]);

  // --- 8. Satellite Church Attendance (Bar Chart) ---
  const satelliteAttendanceData = useMemo(() => {
    const satSum: { [name: string]: number } = {};
    satelliteReports.forEach(sr => {
      const name = sr.church_name || 'Satellite Branch';
      satSum[name] = (satSum[name] || 0) + (sr.total_attendance || 0);
    });
    const mapped = Object.keys(satSum).map(name => ({
      name: name.replace('Dominion City ', '').substring(0, 15),
      attendance: satSum[name]
    }));
    if (mapped.length === 0) {
      return [
        { name: 'Lekki Branch', attendance: 240 },
        { name: 'Ikeja Branch', attendance: 180 },
        { name: 'Ajah Branch', attendance: 150 },
        { name: 'Yaba Branch', attendance: 120 }
      ];
    }
    return mapped;
  }, [satelliteReports]);

  // --- 9. Department Attendance (Pie Chart) ---
  const departmentAttendanceData = useMemo(() => {
    const deptCount: { [name: string]: number } = {};
    members.forEach(m => {
      if (m.person_type === 'Leader & Worker' && m.ministry_department) {
        deptCount[m.ministry_department] = (deptCount[m.ministry_department] || 0) + 1;
      }
    });
    const mapped = Object.keys(deptCount).map(name => ({
      name,
      value: deptCount[name]
    }));
    if (mapped.length === 0) {
      return [
        { name: 'Choir', value: 35 },
        { name: 'Media Team', value: 20 },
        { name: 'Ushering Unit', value: 25 },
        { name: 'Protocol Unit', value: 15 }
      ];
    }
    return mapped;
  }, [members]);

  // --- 10. Gender Distribution (Doughnut Chart) ---
  const genderDistributionData = useMemo(() => {
    let male = 0;
    let female = 0;
    members.forEach(m => {
      if (m.gender === 'Male') male++;
      else if (m.gender === 'Female') female++;
    });
    if (male === 0 && female === 0) {
      return [
        { name: 'Male', value: 145 },
        { name: 'Female', value: 105 }
      ];
    }
    return [
      { name: 'Male', value: male },
      { name: 'Female', value: female }
    ];
  }, [members]);

  // --- 11. Age Distribution (Pie Chart) ---
  const ageDistributionData = useMemo(() => {
    const brackets = {
      'Kids (<12)': 0,
      'Youth (12-25)': 0,
      'Adults (26-50)': 0,
      'Seniors (50+)': 0
    };
    members.forEach(m => {
      if (!m.dob) {
        brackets['Adults (26-50)']++;
        return;
      }
      const birthYear = new Date(m.dob).getFullYear();
      const age = 2026 - birthYear;
      if (age < 12) brackets['Kids (<12)']++;
      else if (age <= 25) brackets['Youth (12-25)']++;
      else if (age <= 50) brackets['Adults (26-50)']++;
      else brackets['Seniors (50+)']++;
    });
    return Object.keys(brackets).map(key => ({
      name: key,
      value: brackets[key as keyof typeof brackets] || 10
    }));
  }, [members]);

  // --- 12. Member Growth by Month (Area Chart) ---
  const memberGrowthByMonthData = useMemo(() => {
    return membersGrowthData;
  }, [membersGrowthData]);

  // --- 13. Finance Summary (Mixed Chart) ---
  const financeSummaryData = useMemo(() => {
    return incomeVsExpensesData.map(d => ({
      name: d.name,
      Income: d.Income,
      Expenses: d.Expenses,
      Surplus: d.Income - d.Expenses
    }));
  }, [incomeVsExpensesData]);

  // Conditional tabs styling helper
  const getTabClass = (tab: typeof activeTab) => {
    return `px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
      activeTab === tab
        ? 'bg-slate-900 text-white shadow-xs'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;
  };

  const renderChartContainer = (title: string, desc: string, children: React.ReactNode) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4 hover:shadow-md transition-shadow">
      <div>
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{desc}</p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" id="church-analytics-hub">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 tracking-widest block">Business Intelligence</span>
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5 mt-0.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Apapa Analytics & Insights Center
          </h2>
        </div>
        
        {/* Tab triggers */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveTab('attendance')} className={getTabClass('attendance')}>
            <Activity className="w-3.5 h-3.5" /> Attendance
          </button>
          <button onClick={() => setActiveTab('growth')} className={getTabClass('growth')}>
            <Users className="w-3.5 h-3.5" /> Growth
          </button>
          <button onClick={() => setActiveTab('finance')} className={getTabClass('finance')}>
            <Coins className="w-3.5 h-3.5" /> Finances
          </button>
          <button onClick={() => setActiveTab('ops')} className={getTabClass('ops')}>
            <Building className="w-3.5 h-3.5" /> Operations
          </button>
          <button onClick={() => setActiveTab('all')} className={getTabClass('all')}>
            <BarChart2 className="w-3.5 h-3.5" /> All Charts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Category */}
        {(activeTab === 'attendance' || activeTab === 'all') && (
          <>
            {renderChartContainer(
              "Attendance Trend (Line Chart)",
              "Live tracking of member service registers and total session logins",
              <LineChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #f1f5f9' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="count" name="Check-ins" stroke="#4f46e5" strokeWidth={2.5} activeDot={{ r: 6 }} />
              </LineChart>
            )}

            {renderChartContainer(
              "Weekly Attendance (Bar Chart)",
              "Comparison across Sunday service, midweek service, vigils, and small groups",
              <BarChart data={weeklyAttendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #f1f5f9' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="count" name="Attendance count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={35}>
                  {weeklyAttendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}

            {renderChartContainer(
              "Satellite Church Attendance (Bar Chart)",
              "Attendance volumes aggregated from weekly satellite service reports",
              <BarChart data={satelliteAttendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #f1f5f9' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="attendance" name="Attendance count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            )}

            {renderChartContainer(
              "Department Attendance (Pie Chart)",
              "Active workers roster count distributed by ministry/ops service unit",
              <PieChart>
                <Pie
                  data={departmentAttendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {departmentAttendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            )}
          </>
        )}

        {/* Growth Category */}
        {(activeTab === 'growth' || activeTab === 'all') && (
          <>
            {renderChartContainer(
              "Members Growth (Line Chart)",
              "Chronological growth curve based on official member join dates",
              <LineChart data={membersGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #f1f5f9' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="count" name="Total members" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            )}

            {renderChartContainer(
              "New Members Per Month (Bar Chart)",
              "Aggregated count of newly added congregation rosters per month",
              <BarChart data={newMembersPerMonthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #f1f5f9' }} />
                <Bar dataKey="count" name="New additions" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            )}

            {renderChartContainer(
              "Member Growth by Month (Area Chart)",
              "Monthly expansion rate of the congregation rosters",
              <AreaChart data={memberGrowthByMonthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="100%">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" name="Growth" stroke="#10b981" fillOpacity={1} fill="url(#colorGrowth)" strokeWidth={2} />
              </AreaChart>
            )}

            {renderChartContainer(
              "Gender Distribution (Doughnut Chart)",
              "Percentage representation of Male vs Female congregation rosters",
              <PieChart>
                <Pie
                  data={genderDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#ec4899" />
                </Pie>
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            )}

            {renderChartContainer(
              "Age Distribution (Pie Chart)",
              "Calculated age brackets parsed from DOB fields in membership registers",
              <PieChart>
                <Pie
                  data={ageDistributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  dataKey="value"
                  nameKey="name"
                >
                  {ageDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            )}
          </>
        )}

        {/* Finance Category */}
        {(activeTab === 'finance' || activeTab === 'all') && (
          <>
            {renderChartContainer(
              "Monthly Offering (Area Chart)",
              "Cumulative funds received from all Care Center cells and satellite churches",
              <AreaChart data={monthlyOfferingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOffering" x1="0" y1="0" x2="0" y2="100%">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip formatter={(value: any) => formatNaira(Number(value))} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Area type="monotone" dataKey="amount" name="Offering" stroke="#4f46e5" fillOpacity={1} fill="url(#colorOffering)" strokeWidth={2.5} />
              </AreaChart>
            )}

            {renderChartContainer(
              "Income vs Expenses (Stacked Bar Chart)",
              "Filing reports matching weekly total incoming offerings vs simulated costs",
              <BarChart data={incomeVsExpensesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip formatter={(value: any) => formatNaira(Number(value))} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Income" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={25} />
                <Bar dataKey="Expenses" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            )}

            {renderChartContainer(
              "Finance Summary (Mixed Chart)",
              "Interactive comparison of Income bar, Expense bar, and Net Surplus Line",
              <ComposedChart data={financeSummaryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip formatter={(value: any) => formatNaira(Number(value))} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Income" fill="#10b981" radius={[2, 2, 0, 0]} barSize={15} />
                <Bar dataKey="Expenses" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={15} />
                <Line type="monotone" dataKey="Surplus" name="Net Surplus" stroke="#4f46e5" strokeWidth={2.5} activeDot={{ r: 5 }} />
              </ComposedChart>
            )}
          </>
        )}

        {/* Operations Category */}
        {(activeTab === 'ops' || activeTab === 'all') && (
          <>
            {renderChartContainer(
              "Care Centre Performance (Horizontal Bar Chart)",
              "Top 5 Care Center Cells ranked by aggregated meeting check-in sizes",
              <BarChart data={careCentrePerformanceData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={80} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="attendance" name="Attendance count" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            )}
          </>
        )}
      </div>
    </div>
  );
}
