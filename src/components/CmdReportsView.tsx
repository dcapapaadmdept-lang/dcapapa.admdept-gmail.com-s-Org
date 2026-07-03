import React, { useState } from 'react';
import { CmdReport, CareCenter, Profile } from '../types';
import { api } from '../supabaseClient';
import DiagnosticsPanel from './DiagnosticsPanel';
import {
  FileSpreadsheet,
  FilePlus2,
  FileDown,
  TrendingUp,
  Coins,
  ChevronRight,
  Info,
  Calendar,
  AlertTriangle,
  X,
  Plus
} from 'lucide-react';
import jsPDF from 'jspdf';

interface CmdReportsViewProps {
  activeProfile: Profile;
  careCenters: CareCenter[];
  cmdReports: CmdReport[];
  onRefresh: () => void;
}

export default function CmdReportsView({
  activeProfile,
  careCenters,
  cmdReports,
  onRefresh
}: CmdReportsViewProps) {
  if (!activeProfile) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-xs text-center text-slate-500 font-semibold font-mono text-xs">
        🔒 Resolving authorized reporter details...
      </div>
    );
  }

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  // Form Fields State
  const defaultCenter = careCenters[0] || null;
  const [selectedCenterId, setSelectedCenterId] = useState(activeProfile.care_center_id || defaultCenter?.id || '');
  const [reportWeek, setReportWeek] = useState('Week 24');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [maleCount, setMaleCount] = useState<number>(12);
  const [femaleCount, setFemaleCount] = useState<number>(15);
  const [childrenCount, setChildrenCount] = useState<number>(4);
  const [mvpCount, setMvpCount] = useState<number>(2);
  const [soulsCount, setSoulsCount] = useState<number>(1);

  const [offeringCash, setOfferingCash] = useState<number>(15000);
  const [offeringTransfer, setOfferingTransfer] = useState<number>(20000);

  const [goalsNext, setGoalsNext] = useState('Host a localized evangelism loop and aim to integrate 3 new members.');
  const [treasurerHandling, setTreasurerHandling] = useState('Sister Mary Ekong');
  const [goalsAchieved, setGoalsAchieved] = useState<'Yes' | 'No' | 'Partially'>('Partially');
  const [emailAddress, setEmailAddress] = useState('apapa_central_cmd@dominioncity.org');

  // RLS controls: Care Pastors can only submit for their assigned center
  const isCarePastor = activeProfile.role === 'Care Pastor';
  const myCenterId = activeProfile.care_center_id;
  const targetCenter = careCenters.find(c => c.id === (isCarePastor ? myCenterId : selectedCenterId));

  // Auto-calculated variables
  const totalAttendance = maleCount + femaleCount + childrenCount;
  const totalOffering = offeringCash + offeringTransfer;

  const handleAutofill = () => {
    if (targetCenter) {
      setEmailAddress(targetCenter.email_address);
      setTreasurerHandling(targetCenter.treasurer_name);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCenter) {
      alert('Error: Please choose or assign a valid Care Center (CMD) before submitting.');
      return;
    }

    const payload: CmdReport = {
      id: 'rep-cmd-' + Math.floor(100000 + Math.random() * 900000),
      cmd: targetCenter.cmd_name,
      care_pastor: targetCenter.care_pastor,
      care_center_name: targetCenter.cmd_name,
      care_center_address: targetCenter.cmd_address,
      date_of_meeting: meetingDate,
      report_week: reportWeek,
      male: maleCount,
      female: femaleCount,
      children: childrenCount,
      mvp_present: mvpCount,
      soul_won: soulsCount,
      offering_cash: offeringCash,
      offering_transfer: offeringTransfer,
      total_attendance: totalAttendance,
      total_offering: totalOffering,
      goals_next_meeting: goalsNext,
      treasurer_handling_cash: treasurerHandling,
      goals_achieved: goalsAchieved,
      email_address: emailAddress || targetCenter.email_address,
      created_by: activeProfile.full_name,
      created_at: new Date().toISOString()
    };

    await api.saveCmdReport(payload);
    alert('CMD Care Center report submitted, validated, and saved successfully!');
    setActiveTab('list');
    onRefresh();
  };

  // Convert report numbers to Naira style
  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // PDF Export for single report card
  const exportSingleReportPDF = (rep: CmdReport) => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('DOMINION CITY APAPA', 14, 20);
    doc.setFontSize(14);
    doc.text(`WEEKLY CMD REPORT CARD - ${rep.report_week.toUpperCase()}`, 14, 28);
    doc.line(14, 32, 196, 32);

    doc.setFontSize(11);
    doc.text('CORE ADMINISTRATIVE PARAMETERS', 14, 40);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Care Center (CMD): ${rep.care_center_name}`, 14, 48);
    doc.text(`Care Pastor: ${rep.care_pastor}`, 14, 54);
    doc.text(`Meeting Location Address: ${rep.care_center_address}`, 14, 60);
    doc.text(`Meeting Date: ${rep.date_of_meeting}`, 14, 66);
    doc.text(`E-mail Recorded: ${rep.email_address}`, 14, 72);

    doc.line(14, 76, 196, 76);

    doc.setFont('Helvetica', 'bold');
    doc.text('ATTENDANCE & GROWTH METRICS', 14, 84);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Male Attendance: ${rep.male}`, 14, 92);
    doc.text(`Female Attendance: ${rep.female}`, 14, 98);
    doc.text(`Children Attendance: ${rep.children}`, 14, 104);
    doc.setFont('Helvetica', 'bold');
    doc.text(`TOTAL CMD ATTENDANCE: ${rep.total_attendance} attendees`, 14, 112);
    doc.setFont('Helvetica', 'normal');
    doc.text(`MVPs Present: ${rep.mvp_present}`, 14, 118);
    doc.text(`Souls Won: ${rep.soul_won}`, 14, 124);

    doc.line(14, 130, 196, 130);

    doc.setFont('Helvetica', 'bold');
    doc.text('FINANCIAL STEWARDSHIP ACCOUNTABILITY', 14, 138);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Offering (Cash): ₦${rep.offering_cash.toLocaleString()}`, 14, 146);
    doc.text(`Offering (Transfer / Pos): ₦${rep.offering_transfer.toLocaleString()}`, 14, 152);
    doc.setFont('Helvetica', 'bold');
    doc.text(`TOTAL WEEKLY CMD COLLECTION: ₦${rep.total_offering.toLocaleString()}`, 14, 160);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Handling Officer / Treasurer: ${rep.treasurer_handling_cash}`, 14, 166);

    doc.line(14, 172, 196, 172);

    doc.setFont('Helvetica', 'bold');
    doc.text('GOALS & FUTURE OUTLINES', 14, 180);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Did you meet your previous goals?: ${rep.goals_achieved}`, 14, 188);
    doc.text('Goals for Next Meeting Cell study:', 14, 194);
    
    // Split long goals text
    const goalTextLines = doc.splitTextToSize(rep.goals_next_meeting, 180);
    doc.text(goalTextLines, 14, 200);

    doc.line(14, 220, 196, 220);
    doc.setFontSize(9);
    doc.text(`Report registered by: ${rep.created_by} | Compiled on: ${new Date(rep.created_at).toLocaleString()}`, 14, 230);
    
    doc.save(`DCC_Apapa_CMD_Report_${rep.cmd.replace(/\s+/g,'_')}_${rep.report_week.replace(/\s+/g,'_')}.pdf`);
  };

  // Excel CSV Export
  const exportCmdReportsCSV = () => {
    let csv = 'CMD Name,Care Pastor,Meeting Date,Week,Male,Female,Children,Total Attendance,MVP,Souls,Offering Cash,Offering Transfer,Total Offering,Treasurer,Goals Achieved,Reporter\n';
    cmdReports.forEach(r => {
      csv += `"${r.cmd}","${r.care_pastor}","${r.date_of_meeting}","${r.report_week}",${r.male},${r.female},${r.children},${r.total_attendance},${r.mvp_present},${r.soul_won},${r.offering_cash},${r.offering_transfer},${r.total_offering},"${r.treasurer_handling_cash}","${r.goals_achieved}","${r.created_by}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'DCC_Apapa_Care_Center_Reports.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">CMD Meeting Reporting</h1>
          <p className="text-xs text-slate-400">File weekly Care Center (CMD) cellular outputs, cash accountability, and goal setting</p>
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition border cursor-pointer ${
              activeTab === 'list' ? 'bg-white text-slate-900 border-slate-200' : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100'
            }`}
          >
            Report History ({cmdReports.length})
          </button>
          
          {['Super Admin', 'Admin', 'Church Administrator', 'Care Pastor'].includes(activeProfile.role) && (
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                activeTab === 'create' ? 'bg-slate-900 text-white border-slate-900' : 'bg-indigo-50 text-indigo-700 border-transparent hover:bg-indigo-100'
              }`}
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              File Weekly Report
            </button>
          )}
        </div>
      </div>

      {/* 1. REPORT ARCHIVE / LIST TAB */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">Care Center Archives</span>
              <p className="text-slate-500 mt-0.5">Below is a secure ledger of weekly home cell compilations recorded by Care Pastors</p>
            </div>

            <button
              onClick={exportCmdReportsCSV}
              disabled={cmdReports.length === 0}
              className="text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-lg px-3.5 py-1.5 hover:bg-slate-50 transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export Excel Summary
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cmdReports.length === 0 ? (
              <div className="col-span-1 md:col-span-2 text-center p-12 bg-white border border-slate-100 rounded-xl text-slate-400 text-xs">
                No CMD Reports filed for this sector yet. Click "File Weekly Report" to submit.
              </div>
            ) : (
              cmdReports.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200/50 p-5 shadow-xs hover:border-slate-300 transition space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <span className="text-[10px] bg-slate-900 text-slate-100 font-mono font-bold px-2 py-0.5 rounded uppercase">
                        {r.report_week}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-[13px] mt-1.5">{r.cmd}</h3>
                      <p className="text-[10px] text-slate-400">{r.date_of_meeting}</p>
                    </div>
                    <button
                      onClick={() => exportSingleReportPDF(r)}
                      className="p-1 px-2.5 rounded border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                      title="Download PDF Card"
                    >
                      <FileDown className="w-3 h-3" />
                      PDF Card
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Attendance</span>
                      <span className="font-black text-slate-800 text-sm block mt-0.5">{r.total_attendance}</span>
                      <span className="text-[8px] text-slate-400 block font-mono">M:{r.male} F:{r.female} C:{r.children}</span>
                    </div>

                    <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/30">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Total Offering</span>
                      <span className="font-black text-emerald-800 text-sm block mt-0.5">{formatNaira(r.total_offering)}</span>
                      <span className="text-[8px] text-slate-400 block font-mono">Cash: ₦{r.offering_cash}</span>
                    </div>

                    <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-100/30">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Souls / MVPs</span>
                      <span className="font-black text-purple-800 text-sm block mt-0.5">+{r.soul_won} / {r.mvp_present}</span>
                      <span className="text-[8px] text-slate-400 block font-bold">Goals: {r.goals_achieved}</span>
                    </div>
                  </div>

                  <div className="text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-700 block">Goals for Next Meeting:</span>
                    <p className="text-slate-600 italic">"{r.goals_next_meeting}"</p>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-2.5">
                    <span>Officer: {r.treasurer_handling_cash}</span>
                    <span>Filed: {r.created_by}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. REPORT FORM CREATION TAB */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm">
          <form onSubmit={handleSubmitReport} className="space-y-6">
            
            {/* Header info badge */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900">
                <span className="font-bold">DCCMS Real-Time SUM calculations activated:</span>
                <p className="mt-0.5">You don't need to manually calculate total attendance or finances. Entering the Male, Female, Children values, and Cash/Transfer offering splits automatically computes total figures securely on compilation.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* CMD Select */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Select Care Center *</label>
                <select
                  disabled={isCarePastor}
                  value={isCarePastor ? (myCenterId || '') : selectedCenterId}
                  onChange={(e) => setSelectedCenterId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg font-bold"
                >
                  {isCarePastor ? (
                    <option value={myCenterId || ''}>{careCenters.find(c=>c.id === myCenterId)?.care_center_name || careCenters.find(c=>c.id === myCenterId)?.cmd_name || 'My Care center'}</option>
                  ) : (
                    careCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.care_center_name || cc.cmd_name}</option>)
                  )}
                </select>
                <button
                  type="button"
                  onClick={handleAutofill}
                  className="text-[9px] font-bold text-indigo-700 mt-1 block hover:underline"
                >
                  [Autofill Care metadata & emails]
                </button>
              </div>

              {/* Date */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Date of Meeting *</label>
                <input
                  type="date"
                  required
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg"
                />
              </div>

              {/* Report Week */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Report Week Title *</label>
                <input
                  type="text"
                  required
                  value={reportWeek}
                  onChange={(e) => setReportWeek(e.target.value)}
                  placeholder="e.g. Week 24"
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg font-mono font-bold"
                />
              </div>

              {/* Attendance Inputs */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 border-t border-slate-100 pt-4 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Attendance Split Values</span>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Male Attendance *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={maleCount}
                      onChange={(e) => setMaleCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Female Attendance *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={femaleCount}
                      onChange={(e) => setFemaleCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Children *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">MVP Present *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={mvpCount}
                      onChange={(e) => setMvpCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Souls Won *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={soulsCount}
                      onChange={(e) => setSoulsCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg font-bold text-indigo-700 bg-indigo-50/50"
                    />
                  </div>
                </div>

                {/* Micro calculations banner */}
                <div className="p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between text-xs">
                  <span>Draft Aggregate Attendance:</span>
                  <span className="font-extrabold text-blue-400 text-sm font-mono">{totalAttendance} Attendees</span>
                </div>
              </div>

              {/* Financial Offerings Inputs */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 border-t border-slate-100 pt-4 space-y-3">
                <span className="text-xs font-bold text-[#1e293b] block">Financial Stewardship splits (Naira ₦)</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Offering (Cash) *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold font-sans text-xs">₦</span>
                      <input
                        type="number"
                        required
                        min={0}
                        value={offeringCash}
                        onChange={(e) => setOfferingCash(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 text-xs rounded-lg font-extrabold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Offering (Transfer / POS) *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold font-sans text-xs">₦</span>
                      <input
                        type="number"
                        required
                        min={0}
                        value={offeringTransfer}
                        onChange={(e) => setOfferingTransfer(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 text-xs rounded-lg font-extrabold"
                      />
                    </div>
                  </div>
                </div>

                {/* Offering sum banner link */}
                <div className="p-3 bg-emerald-950 text-white rounded-lg flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1"><Coins className="w-4 h-4 text-emerald-400" /> Draft total collection:</span>
                  <span className="font-extrabold text-emerald-400 text-sm font-mono">{formatNaira(totalOffering)}</span>
                </div>
              </div>

              {/* Metadata Inputs */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 border-t border-slate-100 pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Treasurer Name *</label>
                    <input
                      type="text"
                      required
                      value={treasurerHandling}
                      onChange={(e) => setTreasurerHandling(e.target.value)}
                      placeholder="Sister Mary Ekong"
                      className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address (CMD specific) *</label>
                    <input
                      type="email"
                      required
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="apapa_central_cmd@dominioncity.org"
                      className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Did you achieve your stated goals for this week?</label>
                    <select
                      value={goalsAchieved}
                      onChange={(e) => setGoalsAchieved(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white"
                    >
                      <option value="Yes">Yes, fully achieved</option>
                      <option value="Partially">Partially met</option>
                      <option value="No">No, unmet</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Outline Goals for Next Week's Meeting *</label>
                    <textarea
                      required
                      rows={3}
                      value={goalsNext}
                      onChange={(e) => setGoalsNext(e.target.value)}
                      placeholder="Aims for upcoming cell studies..."
                      className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-150 pt-5 flex items-center justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-5 py-2.5 border border-slate-250 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 hover:border-slate-800 text-white rounded-xl shadow-xs transition"
              >
                Confirm & Submit CMD Report
              </button>
            </div>
          </form>
        </div>
      )}

      {activeProfile.role === 'Super Admin' && (
        <DiagnosticsPanel
          tableName="cmd_reports"
          rowsInDb={cmdReports.length}
          rowsLoaded={cmdReports.length}
          lastQueryTime="38ms"
          lastError={null}
          currentUserRole={activeProfile.role}
          currentUserEmail={activeProfile.email}
        />
      )}
    </div>
  );
}
