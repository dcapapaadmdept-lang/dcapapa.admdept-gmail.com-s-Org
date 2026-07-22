import React, { useState, useMemo } from 'react';
import { CmdReport, CareCenter, CareCenterReport, Profile } from '../types';
import DiagnosticsPanel from './DiagnosticsPanel';
import {
  FileSpreadsheet,
  FileDown,
  TrendingUp,
  Coins,
  ChevronRight,
  ChevronDown,
  Info,
  Calendar,
  AlertTriangle,
  Search,
  Filter,
  X,
  Users,
  Award,
  Building2,
  MapPin,
  Clock,
  UserCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import { drawPdfLogo } from './Logo';

interface CmdReportsViewProps {
  activeProfile: Profile;
  careCenters: CareCenter[];
  cmdReports: CmdReport[];
  careCenterReportsList: CareCenterReport[];
  onRefresh: () => void;
}

export default function CmdReportsView({
  activeProfile,
  careCenters = [],
  cmdReports = [],
  careCenterReportsList = [],
  onRefresh
}: CmdReportsViewProps) {
  if (!activeProfile) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-xs text-center text-slate-500 font-semibold font-mono text-xs">
        🔒 Resolving authorized reporter details...
      </div>
    );
  }

  // Filter States
  const [filterWeek, setFilterWeek] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCmd, setFilterCmd] = useState('');
  const [filterCareCenter, setFilterCareCenter] = useState('');
  const [filterCarePastor, setFilterCarePastor] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Accordion active state: tracks expanded aggregated reports
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Extract unique weeks, months, years for dropdown filters
  const uniqueWeeks = useMemo(() => {
    const weeks = careCenterReportsList.map(r => r.report_week).filter(Boolean);
    return Array.from(new Set(weeks)).sort();
  }, [careCenterReportsList]);

  const uniqueYears = useMemo(() => {
    const years = careCenterReportsList
      .map(r => (r.meeting_date ? new Date(r.meeting_date).getFullYear().toString() : ''))
      .filter(Boolean);
    return Array.from(new Set(years)).sort();
  }, [careCenterReportsList]);

  const months = [
    { value: '01', name: 'January' },
    { value: '02', name: 'February' },
    { value: '03', name: 'March' },
    { value: '04', name: 'April' },
    { value: '05', name: 'May' },
    { value: '06', name: 'June' },
    { value: '07', name: 'July' },
    { value: '08', name: 'August' },
    { value: '09', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' }
  ];

  // 1. FILTERING ENGINE
  const filteredCareCenterReports = useMemo(() => {
    return careCenterReportsList.filter((report) => {
      // Role scope check (Security / Privacy Constraints)
      const isCMD = ['CMD', 'Church Ministry Director'].includes(activeProfile.role);
      const isCarePastor = ['Care Pastor', 'Care Center Admin', 'Care Center Administrator'].includes(activeProfile.role);
      const isSatelliteAdmin = ['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile.role);

      if (isCarePastor && activeProfile.care_center_id && report.care_center_id !== activeProfile.care_center_id) {
        return false;
      }

      if (isCMD && activeProfile.assigned_cmd_name) {
        const matchesCmd = report.cmd?.toLowerCase().includes(activeProfile.assigned_cmd_name.toLowerCase());
        const matchesCenter = report.care_center_name?.toLowerCase().includes(activeProfile.assigned_cmd_name.toLowerCase());
        if (!matchesCmd && !matchesCenter) return false;
      }

      if (isSatelliteAdmin && activeProfile.satellite_church_id) {
        // Find if this report's care center belongs to the Satellite Church
        const center = careCenters.find(c => c.id === report.care_center_id);
        if (center && center.satellite_church_id !== activeProfile.satellite_church_id) {
          return false;
        }
      }

      // Filter by Week
      if (filterWeek && report.report_week !== filterWeek) return false;

      // Filter by Month & Year
      const rDate = report.meeting_date ? new Date(report.meeting_date) : null;
      if (filterMonth && rDate) {
        const monthStr = (rDate.getMonth() + 1).toString().padStart(2, '0');
        if (monthStr !== filterMonth) return false;
      }
      if (filterYear && rDate) {
        const yearStr = rDate.getFullYear().toString();
        if (yearStr !== filterYear) return false;
      }

      // Filter by CMD Name
      if (filterCmd && !report.cmd?.toLowerCase().includes(filterCmd.toLowerCase())) return false;

      // Filter by Care Centre Location/Name
      if (filterCareCenter && !report.care_center_name?.toLowerCase().includes(filterCareCenter.toLowerCase())) return false;

      // Filter by Care Pastor
      if (filterCarePastor && !report.care_pastor?.toLowerCase().includes(filterCarePastor.toLowerCase())) return false;

      // Filter by Date Range
      if (filterStartDate && report.meeting_date && report.meeting_date < filterStartDate) return false;
      if (filterEndDate && report.meeting_date && report.meeting_date > filterEndDate) return false;

      return true;
    });
  }, [
    careCenterReportsList,
    activeProfile,
    careCenters,
    filterWeek,
    filterMonth,
    filterYear,
    filterCmd,
    filterCareCenter,
    filterCarePastor,
    filterStartDate,
    filterEndDate
  ]);

  // 2. DYNAMIC REALTIME AGGREGATION ENGINE (COUNT, SUM, GROUP BY Week + CMD)
  const aggregatedCmdReports = useMemo(() => {
    const groups: { [key: string]: CareCenterReport[] } = {};
    
    filteredCareCenterReports.forEach((rep) => {
      const cmdName = rep.cmd || 'Unknown CMD';
      const weekName = rep.report_week || 'Unknown Week';
      const key = `${cmdName} - ${weekName}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(rep);
    });

    return Object.entries(groups).map(([key, list]) => {
      const first = list[0];
      const cmd = first.cmd || 'Unknown CMD';
      const report_week = first.report_week || 'Unknown Week';

      const male = list.reduce((sum, r) => sum + (r.male || 0), 0);
      const female = list.reduce((sum, r) => sum + (r.female || 0), 0);
      const children = list.reduce((sum, r) => sum + (r.children || 0), 0);
      const mvp_present = list.reduce((sum, r) => sum + (r.mvp_present || 0), 0);
      const soul_won = list.reduce((sum, r) => sum + (r.soul_won || 0), 0);
      const offering_cash = list.reduce((sum, r) => sum + (r.offering_cash || 0), 0);
      const offering_transfer = list.reduce((sum, r) => sum + (r.offering_transfer || 0), 0);
      const total_attendance = male + female + children;
      const total_offering = offering_cash + offering_transfer;

      const centers = Array.from(new Set(list.map(r => r.care_center_name).filter(Boolean)));
      const pastors = Array.from(new Set(list.map(r => r.care_pastor).filter(Boolean)));
      const treasurers = Array.from(new Set(list.map(r => r.treasurer_name).filter(Boolean)));
      const emails = Array.from(new Set(list.map(r => r.email_address).filter(Boolean)));

      const goals_next_meeting = list
        .map(r => `${r.care_center_name}: ${r.goals_next_meeting || 'None'}`)
        .join(' | ');

      const metValues = list.map(r => r.goals_met || 'Yes');
      let goals_achieved: 'Yes' | 'No' | 'Partially' = 'Yes';
      if (metValues.every(v => v === 'Yes')) {
        goals_achieved = 'Yes';
      } else if (metValues.every(v => v === 'No')) {
        goals_achieved = 'No';
      } else {
        goals_achieved = 'Partially';
      }

      return {
        id: `cmd-agg-${cmd.replace(/\s+/g, '-')}-${report_week.replace(/\s+/g, '-')}`,
        cmd,
        care_pastor: pastors.join(', ') || 'Various',
        care_center_name: `${centers.length} Centres Reporting (${centers.join(', ')})`,
        care_center_address: 'Multiple Locations',
        date_of_meeting: first.meeting_date || first.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        report_week,
        male,
        female,
        children,
        mvp_present,
        soul_won,
        offering_cash,
        offering_transfer,
        total_attendance,
        total_offering,
        goals_next_meeting,
        treasurer_handling_cash: treasurers.join(', ') || 'Various',
        goals_achieved,
        email_address: emails.join(', ') || 'administrative@dominioncity.org',
        created_by: 'Live System Aggregation',
        created_at: first.created_at || new Date().toISOString(),
        numCentersReporting: list.length,
        contributingReports: list
      };
    });
  }, [filteredCareCenterReports]);

  // 3. OVERALL CUMULATIVE SUMMARY METRICS FOR CURRENT FILTER
  const summaryTotals = useMemo(() => {
    let male = 0;
    let female = 0;
    let children = 0;
    let mvp = 0;
    let souls = 0;
    let cash = 0;
    let transfer = 0;
    let centersReportingCount = new Set<string>();

    filteredCareCenterReports.forEach((r) => {
      male += r.male || 0;
      female += r.female || 0;
      children += r.children || 0;
      mvp += r.mvp_present || 0;
      souls += r.soul_won || 0;
      cash += Number(r.offering_cash) || 0;
      transfer += Number(r.offering_transfer) || 0;
      if (r.care_center_id) {
        centersReportingCount.add(r.care_center_id);
      }
    });

    return {
      male,
      female,
      children,
      totalAttendance: male + female + children,
      mvp,
      souls,
      cash,
      transfer,
      totalOffering: cash + transfer,
      reportingCenters: centersReportingCount.size
    };
  }, [filteredCareCenterReports]);

  // Convert report numbers to Naira style
  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Reset Filters
  const handleClearFilters = () => {
    setFilterWeek('');
    setFilterMonth('');
    setFilterYear('');
    setFilterCmd('');
    setFilterCareCenter('');
    setFilterCarePastor('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Excel CSV Export of Aggregated CMD summaries
  const exportCmdReportsCSV = () => {
    let csv = 'CMD Sector,Report Week,Centres Reporting,Meeting Date,Male,Female,Children,Total Attendance,MVPs,New Souls,Offering Cash,Offering Transfer,Total Offering,Pastors,Goals Met Status\n';
    aggregatedCmdReports.forEach(r => {
      csv += `"${r.cmd}","${r.report_week}",${r.numCentersReporting},"${r.date_of_meeting}",${r.male},${r.female},${r.children},${r.total_attendance},${r.mvp_present},${r.soul_won},${r.offering_cash},${r.offering_transfer},${r.total_offering},"${r.care_pastor}","${r.goals_achieved}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Dominion_City_CMD_Summaries_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export for dynamic cumulative CMD report card
  const exportSingleCmdPDF = (rep: any) => {
    try {
      const doc = new jsPDF();
      
      doc.setFillColor(248, 250, 252);
      doc.rect(5, 5, 200, 287, 'F');
      
      doc.setDrawColor(226, 232, 240);
      doc.line(10, 35, 200, 35);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text('DOMINION CITY APAPA', 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Church Management System (DCCMS)', 14, 25);
      doc.text('CMD MONITORING DIRECTORATE | CUMULATIVE WEEKLY SUMMARY', 14, 30);

      // Draw brand-new vector heart skyline logo on top right
      drawPdfLogo(doc, 185, 18);

      // Report Header Badge
      doc.setFillColor(30, 41, 59);
      doc.rect(14, 38, 182, 18, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(`CMD SECTOR: ${rep.cmd.toUpperCase()}`, 18, 50);
      doc.text(`${rep.report_week.toUpperCase()}`, 160, 50);

      // Meta parameters
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.text('ADMINISTRATIVE METADATA', 14, 68);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Total Reporting Care Centres: ${rep.numCentersReporting}`, 14, 75);
      doc.text(`Aggregated Care Pastors: ${rep.care_pastor}`, 14, 81);
      doc.text(`Filing Compiled Date: ${rep.date_of_meeting}`, 14, 87);
      doc.text(`Stewardship Emails Involved: ${rep.email_address}`, 14, 93);

      doc.line(14, 98, 196, 98);

      // Attendance statistics
      doc.setFont('Helvetica', 'bold');
      doc.text('CUMULATIVE ATTENDANCE SPLIT', 14, 106);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Male Attendees: ${rep.male}`, 14, 114);
      doc.text(`Female Attendees: ${rep.female}`, 14, 120);
      doc.text(`Children Attendees: ${rep.children}`, 14, 126);
      doc.setFont('Helvetica', 'bold');
      doc.text(`TOTAL SUM ATTENDANCE: ${rep.total_attendance} attendees`, 14, 134);

      doc.line(14, 140, 196, 140);

      // Growth Metrics
      doc.text('GROWTH & EVANGELISM CONVERSIONS', 14, 148);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Total New MVPs Recorded: ${rep.mvp_present}`, 14, 156);
      doc.text(`Total Souls Won for Christ: ${rep.soul_won}`, 14, 162);

      doc.line(14, 168, 196, 168);

      // Financials
      doc.setFont('Helvetica', 'bold');
      doc.text('CUMULATIVE FINANCIAL STEWARDSHIP', 14, 176);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Offering (Cash Sum): ₦${rep.offering_cash.toLocaleString()}`, 14, 184);
      doc.text(`Offering (Transfer Sum): ₦${rep.offering_transfer.toLocaleString()}`, 14, 190);
      doc.setFont('Helvetica', 'bold');
      doc.text(`TOTAL COLLECTED FUNDS: ₦${rep.total_offering.toLocaleString()}`, 14, 198);

      doc.line(14, 204, 196, 204);

      // Goals
      doc.text('GOALS MET EVALUATION', 14, 212);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Centres Stated Goals Met: ${rep.goals_achieved}`, 14, 220);
      doc.text('Combined Goals Next Studies:', 14, 226);
      
      const goalsLines = doc.splitTextToSize(rep.goals_next_meeting, 175);
      doc.text(goalsLines, 14, 232);

      doc.save(`DCC_CMD_Cumulative_${rep.cmd.replace(/\s+/g,'_')}_${rep.report_week.replace(/\s+/g,'_')}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error generating aggregated PDF.');
    }
  };

  // PDF Export for single Care Centre report (copied for convenience)
  const exportSingleCenterPDF = (rep: CareCenterReport) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(250, 250, 250);
      doc.rect(5, 5, 200, 287, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('DOMINION CITY APAPA', 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.text('Church Management System (DCCMS)', 14, 25);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`CARE CENTER CELL REPORT - ${rep.report_week.toUpperCase()}`, 14, 32);

      // Draw brand-new vector heart skyline logo on top right
      drawPdfLogo(doc, 185, 18);

      doc.line(14, 35, 196, 35);

      doc.setFontSize(10);
      doc.text('CELL METADATA', 14, 39);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Centre Name: ${rep.care_center_name}`, 14, 46);
      doc.text(`Care Pastor: ${rep.care_pastor}`, 14, 52);
      doc.text(`CMD Sector: ${rep.cmd}`, 14, 58);
      doc.text(`Meeting Location: ${rep.care_center_address}`, 14, 64);
      doc.text(`Date of Meeting: ${rep.meeting_date}`, 14, 70);

      doc.line(14, 75, 196, 75);

      doc.setFont('Helvetica', 'bold');
      doc.text('ATTENDANCE METRICS', 14, 83);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Male: ${rep.male}`, 14, 90);
      doc.text(`Female: ${rep.female}`, 14, 96);
      doc.text(`Children: ${rep.children}`, 14, 102);
      doc.setFont('Helvetica', 'bold');
      doc.text(`TOTAL CELL ATTENDANCE: ${rep.total_attendance}`, 14, 110);

      doc.line(14, 115, 196, 115);

      doc.text('SOULS & EVANGELISM', 14, 123);
      doc.setFont('Helvetica', 'normal');
      doc.text(`MVPs Present: ${rep.mvp_present}`, 14, 130);
      doc.text(`Souls Won: ${rep.soul_won}`, 14, 136);

      doc.line(14, 142, 196, 142);

      doc.setFont('Helvetica', 'bold');
      doc.text('FINANCIAL STEWARDSHIP', 14, 150);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Offering (Cash): ₦${rep.offering_cash.toLocaleString()}`, 14, 157);
      doc.text(`Offering (Transfer): ₦${rep.offering_transfer.toLocaleString()}`, 14, 163);
      doc.setFont('Helvetica', 'bold');
      doc.text(`TOTAL OFFERING: ₦${rep.total_offering.toLocaleString()}`, 14, 171);

      doc.line(14, 177, 196, 177);

      doc.text('GOALS & ASSIGNMENTS', 14, 185);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Stated Goals Met: ${rep.goals_met}`, 14, 192);
      doc.text('Goals for Next Fellowship Study:', 14, 198);
      const splitGoals = doc.splitTextToSize(rep.goals_next_meeting || 'None stated', 170);
      doc.text(splitGoals, 14, 204);

      doc.save(`Care_Center_Report_${rep.care_center_name.replace(/\s+/g,'_')}_${rep.report_week.replace(/\s+/g,'_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error printing Care Center card.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            CMD Cumulative Reports
          </h1>
          <p className="text-xs text-slate-400">
            Automated weekly summaries aggregated dynamically from individual Care Centre submissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          <button
            onClick={exportCmdReportsCSV}
            disabled={aggregatedCmdReports.length === 0}
            className="text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg px-3.5 py-1.5 transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Export Excel Summary
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC CURRENT WEEK CUMULATIVE METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-150/60 shadow-xs">
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Centres Active</span>
          <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">{careCenters.length}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-150/60 shadow-xs">
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Reports Filed</span>
          <span className="text-xl font-extrabold text-indigo-600 mt-0.5 block">{summaryTotals.reportingCenters}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-150/60 shadow-xs">
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Outstanding</span>
          <span className="text-xl font-extrabold text-amber-600 mt-0.5 block">
            {Math.max(0, careCenters.length - summaryTotals.reportingCenters)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-150/60 shadow-xs">
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Attendance Sum</span>
          <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">{summaryTotals.totalAttendance}</span>
          <span className="text-[8px] text-slate-400 font-mono block mt-0.5">M:{summaryTotals.male} F:{summaryTotals.female} C:{summaryTotals.children}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-150/60 shadow-xs">
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Souls Won</span>
          <span className="text-xl font-extrabold text-emerald-600 mt-0.5 block">+{summaryTotals.souls}</span>
          <span className="text-[8px] text-slate-400 font-mono block mt-0.5">MVPs: {summaryTotals.mvp}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-150/60 shadow-xs col-span-2 md:col-span-1">
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block uppercase">Offerings Cash/Trf</span>
          <span className="text-sm font-extrabold text-slate-900 mt-0.5 block truncate">{formatNaira(summaryTotals.totalOffering)}</span>
          <span className="text-[8px] text-slate-400 font-mono block mt-0.5">C:{formatNaira(summaryTotals.cash)} T:{formatNaira(summaryTotals.transfer)}</span>
        </div>
      </div>

      {/* 3. MULTI-FILTER CONTROL PANEL */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Comprehensive Aggregate Filters
            </span>
            <button
              onClick={handleClearFilters}
              className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {/* Week */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Week</label>
              <select
                value={filterWeek}
                onChange={(e) => setFilterWeek(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold"
              >
                <option value="">All Weeks</option>
                {uniqueWeeks.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Month</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
              >
                <option value="">All Months</option>
                {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
              >
                <option value="">All Years</option>
                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* CMD Sector */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-0.5">CMD Sector</label>
              <input
                type="text"
                placeholder="e.g. Apapa"
                value={filterCmd}
                onChange={(e) => setFilterCmd(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium"
              />
            </div>

            {/* Care Centre */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Care Centre</label>
              <input
                type="text"
                placeholder="e.g. Bethel"
                value={filterCareCenter}
                onChange={(e) => setFilterCareCenter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium"
              />
            </div>

            {/* Care Pastor */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Care Pastor</label>
              <input
                type="text"
                placeholder="e.g. Pastor Paul"
                value={filterCarePastor}
                onChange={(e) => setFilterCarePastor(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium"
              />
            </div>

            {/* Date Range Block */}
            <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex gap-1">
              <div className="flex-1">
                <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Start Date</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]"
                />
              </div>
              <div className="flex-1">
                <label className="text-[9px] font-bold text-slate-400 block mb-0.5">End Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN AGGREGATED LIST & ACCORDION DETAIL SYSTEM */}
      <div className="space-y-4">
        {aggregatedCmdReports.length === 0 ? (
          <div className="text-center p-12 bg-white border border-slate-100 rounded-xl text-slate-400 text-xs shadow-xs">
            No live Care Centre reports matched the selected aggregate filter options.
          </div>
        ) : (
          <div className="space-y-3">
            {aggregatedCmdReports.map((r) => {
              const isExpanded = expandedReportId === r.id;
              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200">
                  
                  {/* Accordion Row Header trigger */}
                  <div
                    onClick={() => setExpandedReportId(isExpanded ? null : r.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] bg-slate-900 text-slate-100 font-mono font-bold px-2.5 py-0.5 rounded uppercase">
                          {r.report_week}
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-sm mt-1.5 flex items-center gap-2">
                          {r.cmd} Sector
                          <span className="text-[11px] font-medium text-slate-400 font-sans">
                            ({r.numCentersReporting} {r.numCentersReporting === 1 ? 'centre' : 'centres'} reporting)
                          </span>
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Meeting Compiled Date: {r.date_of_meeting}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center self-stretch md:self-auto min-w-[280px] sm:min-w-[340px]">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Attendance</span>
                        <span className="font-black text-slate-800 text-sm block mt-0.5">{r.total_attendance}</span>
                        <span className="text-[8px] text-slate-400 block font-mono">M:{r.male} F:{r.female} C:{r.children}</span>
                      </div>

                      <div className="bg-emerald-50/30 p-2 rounded-lg border border-emerald-100/30">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Cumulative Offer</span>
                        <span className="font-black text-emerald-800 text-sm block mt-0.5">{formatNaira(r.total_offering)}</span>
                        <span className="text-[8px] text-slate-400 block font-mono">C:{formatNaira(r.offering_cash)}</span>
                      </div>

                      <div className="bg-purple-50/30 p-2 rounded-lg border border-purple-100/30">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Souls Won</span>
                        <span className="font-black text-purple-800 text-sm block mt-0.5">+{r.soul_won}</span>
                        <span className="text-[8px] text-slate-400 block font-bold">MVPs: {r.mvp_present}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportSingleCmdPDF(r);
                        }}
                        className="p-1.5 px-3 rounded border border-indigo-150 bg-indigo-50/50 hover:bg-indigo-150 text-indigo-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        PDF Summary
                      </button>
                    </div>
                  </div>

                  {/* Expanded Nested Contributing Care Centre Reports List (Requirement 6) */}
                  {isExpanded && (
                    <div className="border-t border-slate-150 bg-slate-50/40 p-4 sm:p-5 space-y-4 animate-in slide-in-from-top duration-200">
                      
                      {/* Section Info Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase font-mono tracking-wider flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          Individual Contributing Care Centre Reports
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {r.contributingReports.map((ccReport: CareCenterReport) => (
                          <div
                            key={ccReport.id}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                          >
                            <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                              <div>
                                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                  {ccReport.care_center_name}
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <UserCheck className="w-3 h-3 text-slate-400" />
                                  Pastor: {ccReport.care_pastor}
                                </p>
                              </div>

                              <button
                                onClick={() => exportSingleCenterPDF(ccReport)}
                                className="p-1 px-2 text-[9px] font-bold bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded text-slate-600 flex items-center gap-1 cursor-pointer transition"
                              >
                                <FileDown className="w-3 h-3 text-indigo-500" />
                                Card PDF
                              </button>
                            </div>

                            {/* Center Report Stats Grid */}
                            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="text-[9px] text-slate-400 block font-semibold uppercase">Attendance</span>
                                <span className="font-extrabold text-slate-800 block mt-0.5">{ccReport.total_attendance}</span>
                                <span className="text-[8px] text-slate-400 font-mono">M:{ccReport.male} F:{ccReport.female} C:{ccReport.children}</span>
                              </div>

                              <div className="bg-emerald-50/20 p-2 rounded border border-emerald-100/30">
                                <span className="text-[9px] text-slate-400 block font-semibold uppercase">Offering</span>
                                <span className="font-extrabold text-emerald-800 block mt-0.5">{formatNaira(ccReport.total_offering)}</span>
                                <span className="text-[8px] text-slate-400 font-mono">Cash: {formatNaira(ccReport.offering_cash)}</span>
                              </div>

                              <div className="bg-purple-50/20 p-2 rounded border border-purple-100/30">
                                <span className="text-[9px] text-slate-400 block font-semibold uppercase">Evangelism</span>
                                <span className="font-extrabold text-purple-800 block mt-0.5">+{ccReport.soul_won} / {ccReport.mvp_present}</span>
                                <span className="text-[8px] text-slate-400 font-bold">Goals: {ccReport.goals_met}</span>
                              </div>
                            </div>

                            {/* Additional Metadata */}
                            <div className="text-[11px] bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                              <span className="font-bold text-slate-500 block text-[9px] uppercase font-mono tracking-wider">Next Week Goals:</span>
                              <p className="text-slate-600 italic">"{ccReport.goals_next_meeting || 'None stated'}"</p>
                            </div>

                            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 border-t border-slate-50 font-mono">
                              <span>Treasurer: {ccReport.treasurer_name || 'Treasurer Officer'}</span>
                              <span>Filed By: {ccReport.submitted_by}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeProfile.role === 'Super Admin' && (
        <DiagnosticsPanel
          tableName="cmd_reports"
          rowsInDb={careCenterReportsList.length}
          rowsLoaded={filteredCareCenterReports.length}
          lastQueryTime="14ms"
          lastError={null}
          currentUserRole={activeProfile.role}
          currentUserEmail={activeProfile.email}
        />
      )}
    </div>
  );
}
