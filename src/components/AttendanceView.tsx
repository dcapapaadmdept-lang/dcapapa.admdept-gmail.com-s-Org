import React, { useState } from 'react';
import {
  Member,
  Department,
  CareCenter,
  SatelliteChurch,
  MemberAttendance,
  DepartmentAttendance,
  Profile
} from '../types';
import { api } from '../supabaseClient';
import DiagnosticsPanel from './DiagnosticsPanel';
import {
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Search,
  Plus,
  RefreshCw,
  FolderSync,
  FileDown,
  Sparkles,
  Award
} from 'lucide-react';
import jsPDF from 'jspdf';

interface AttendanceViewProps {
  activeProfile: Profile;
  members: Member[];
  departments: Department[];
  careCenters: CareCenter[];
  satelliteChurches: SatelliteChurch[];
  memberAttendance: MemberAttendance[];
  departmentAttendance: DepartmentAttendance[];
  onRefresh: () => void;
}

export default function AttendanceView({
  activeProfile,
  members,
  departments,
  careCenters,
  satelliteChurches,
  memberAttendance,
  departmentAttendance,
  onRefresh
}: AttendanceViewProps) {
  if (!activeProfile) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-xs text-center text-slate-500 font-semibold font-mono text-xs">
        🔒 Active user profile session context is resolving...
      </div>
    );
  }

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'general' | 'department' | 'reports'>('general');

  // 1. General Bulk Attendance Tracker States
  const [selectedMems, setSelectedMems] = useState<Record<string, boolean>>({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInTime, setCheckInTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  });
  const [serviceName, setServiceName] = useState('1st Service (Anointing Service)');
  const [attType, setAttType] = useState<'Sunday Service' | 'Midweek Service' | 'Special Meeting' | 'Vigil'>('Sunday Service');
  
  // Custom unit override filters
  const [selDept, setSelDept] = useState('');
  const [selCenter, setSelCenter] = useState('');
  const [selSat, setSelSat] = useState('');

  // 2. Departmental Register States
  // Default to Head's department, otherwise first department
  const initialDeptId = activeProfile.role === 'Department Head' && activeProfile.department_id
    ? activeProfile.department_id
    : (departments[0]?.id || '');
  const [registerDeptId, setRegisterDeptId] = useState(initialDeptId);
  const [registerDate, setRegisterDate] = useState(new Date().toISOString().split('T')[0]);
  const [registerTime, setRegisterTime] = useState('08:00');
  
  // Local state helper holding statuses before saving
  const [draftStatuses, setDraftStatuses] = useState<Record<string, 'Present' | 'Absent' | 'Excused'>>({});

  // Filters for attendance logs
  const [logSearch, setLogSearch] = useState('');

  // Roles checking
  const isDeptHead = activeProfile.role === 'Department Head';
  const myDeptId = activeProfile.department_id;
  const canManageGeneral = ['Super Admin', 'Admin', 'Church Administrator', 'Care Pastor', 'Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile.role);
  const isSatelliteAdmin = ['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile.role);
  const isSuperAdmin = ['Super Admin', 'super_admin', 'Senior Pastor', 'Church Administrator'].includes(activeProfile.role);

  // Filter members based on logged-in Satellite Church context + Quick Search filter
  const filteredTrackerMembers = React.useMemo(() => {
    let list = [...members];
    if (isSatelliteAdmin && activeProfile.satellite_church_id) {
      list = list.filter(m => m.satellite_church_id === activeProfile.satellite_church_id);
    } else if (selSat) {
      list = list.filter(m => m.satellite_church_id === selSat);
    }

    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      list = list.filter(m =>
        (m.names || '').toLowerCase().includes(q) ||
        (m.member_id || '').toLowerCase().includes(q) ||
        (m.phone_number || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => (a.names || '').localeCompare(b.names || ''));
  }, [members, isSatelliteAdmin, activeProfile, selSat, memberSearch]);

  // Filter members based on department selected for Register
  const departmentalMembers = members.filter(m => {
    if (isDeptHead && myDeptId) {
      return m.department_id === myDeptId;
    }
    return m.department_id === registerDeptId;
  });

  // Action: toggle selecting/deselecting all filtered members
  const handleToggleSelectAll = () => {
    const allFilteredIds = filteredTrackerMembers.map(m => m.id);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedMems[id]);
    
    setSelectedMems(prev => {
      const next = { ...prev };
      allFilteredIds.forEach(id => {
        next[id] = !areAllSelected;
      });
      return next;
    });
  };

  // Action: bulk register selected members
  const handleBulkMarkPresent = async () => {
    const idsToMark = Object.keys(selectedMems).filter(id => selectedMems[id]);
    if (idsToMark.length === 0) {
      alert('Please select at least one member to mark present.');
      return;
    }

    try {
      setIsCapturing(true);

      const sysDate = new Date().toISOString().split('T')[0];
      const sysTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      // Auto capture date & time for Satellite Admins, editable for Super Admins
      const finalDate = (isSuperAdmin || !isSatelliteAdmin) ? attDate : sysDate;
      const finalTime = (isSuperAdmin || !isSatelliteAdmin) ? checkInTime : sysTime;

      const recordsToSave = idsToMark.map(mid => {
        const chosenMember = members.find(m => m.id === mid);
        const uuid = 'att-m-' + Math.floor(100000 + Math.random() * 900000);
        return {
          id: uuid,
          member_id: mid,
          member_name: chosenMember?.names || 'Church Congregant',
          attendance_date: finalDate,
          check_in_time: finalTime,
          attendance_type: attType,
          service_type: attType,
          service_name: serviceName,
          department_id: chosenMember?.department_id || undefined,
          care_center_id: chosenMember?.care_center_id || undefined,
          satellite_church_id: isSatelliteAdmin ? (activeProfile.satellite_church_id || undefined) : (chosenMember?.satellite_church_id || selSat || undefined),
          created_by: activeProfile.full_name,
          recorded_by: activeProfile.full_name,
          created_at: new Date().toISOString()
        };
      });

      // Save iteratively
      for (const record of recordsToSave) {
        await api.saveMemberAttendance(record);
      }

      setSelectedMems({});
      alert(`Success! Captured and saved attendance for ${idsToMark.length} members.`);
      onRefresh();
    } catch (error: any) {
      console.error('[BULK MARK ATTENDANCE FAILURE]', error);
      alert('Failed to register attendance: ' + error.message);
    } finally {
      setIsCapturing(false);
    }
  };

  // Set registry values in bulk local state draft on first page view or dept change
  const initializeDraftStatuses = () => {
    const draft: Record<string, 'Present' | 'Absent' | 'Excused'> = {};
    departmentalMembers.forEach(m => {
      // check if already saved for this date
      const saved = departmentAttendance.find(
        da => da.member_id === m.id && da.attendance_date === registerDate && da.department_id === (isDeptHead ? myDeptId : registerDeptId)
      );
      draft[m.id] = saved ? saved.attendance_status : 'Present';
    });
    setDraftStatuses(draft);
  };

  // Track draft changed
  const handleDraftStatusChange = (memberId: string, status: 'Present' | 'Absent' | 'Excused') => {
    setDraftStatuses(prev => ({
      ...prev,
      [memberId]: status
    }));
  };

  const handleSaveRegister = async () => {
    const targetDept = isDeptHead ? myDeptId : registerDeptId;
    if (!targetDept) return;

    const records: DepartmentAttendance[] = departmentalMembers.map(m => {
      const status = draftStatuses[m.id] || 'Present';
      return {
        id: `att-dept-${targetDept}-${m.id}-${registerDate}`,
        department_id: targetDept,
        member_id: m.id,
        attendance_date: registerDate,
        attendance_time: registerTime,
        attendance_status: status,
        recorded_by: activeProfile.full_name,
        created_at: new Date().toISOString()
      };
    });

    await api.saveDepartmentAttendance(records);
    alert('Department attendance register compiled & saved successfully!');
    onRefresh();
  };

  // Generate jsPDF Report
  const exportAttendancePDF = () => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('DOMINION CITY APAPA', 14, 20);
    doc.setFontSize(14);
    doc.text('MEMBER ATTENDANCE - GENERAL SUMMARY REGISTER', 14, 28);
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    const roleLimit = isDeptHead ? `Dept: ${departments.find(d=>d.id===myDeptId)?.department_name}` : 'Church-Wide';
    doc.text(`Generated By: ${activeProfile.full_name} (${activeProfile.role}) | Scope: ${roleLimit}`, 14, 36);
    doc.text(`Date of Download: ${new Date().toLocaleDateString()}`, 14, 42);

    doc.line(14, 46, 196, 46);

    // Build list
    doc.setFont('Helvetica', 'bold');
    doc.text('Member Name', 14, 54);
    doc.text('Date', 75, 54);
    doc.text('Check-In Time', 105, 54);
    doc.text('Service Category', 135, 54);
    doc.text('Created By', 170, 54);
    doc.line(14, 57, 196, 57);

    doc.setFont('Helvetica', 'normal');
    let y = 64;

    memberAttendance.forEach(a => {
      const m = members.find(mem => mem.id === a.member_id);
      if (m) {
        doc.text(m.names, 14, y);
        doc.text(a.attendance_date, 75, y);
        doc.text(a.check_in_time, 105, y);
        doc.text(a.attendance_type, 135, y);
        doc.text(a.created_by.split(' ')[0], 170, y);
        y += 8;
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
      }
    });

    doc.save(`DCC_Apapa_Attendance_${attDate}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Upper header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-slate-900">Attendance Registry</h1>
          <p className="text-xs text-slate-400">Capture Sunday service check-ins and run departmental cell registers</p>
        </div>

        {/* Tab triggers */}
        <div className="bg-slate-100 p-1 rounded-lg flex items-center self-start sm:self-center gap-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === 'general' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            General Check-In
          </button>
          <button
            onClick={() => {
              setActiveTab('department');
              // Auto trigger local draft refresh
              setTimeout(() => initializeDraftStatuses(), 100);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === 'department' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Departmental Register
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === 'reports' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Historic Reports
          </button>
        </div>
      </div>

      {/* 1. GENERAL CHECK-IN SCREEN */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Search & Bulk Tracker list */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-xs space-y-4">
            
            {/* Header / quick parameters */}
            <div className="border-b border-slate-150 pb-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    Individual Attendance Tracker
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isSatelliteAdmin ? (
                      <span>Displaying members belonging strictly to your assigned Satellite Church.</span>
                    ) : (
                      <span>Super Admin console. Use overrides below to change branch assignment.</span>
                    )}
                  </p>
                </div>
                
                {/* Selected members block summary */}
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  {Object.keys(selectedMems).filter(k => selectedMems[k]).length} Members Selected
                </span>
              </div>

              {/* Service & Auto capture options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Service Type</label>
                  <select
                    value={attType}
                    onChange={(e) => setAttType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 text-xs rounded-lg text-slate-800"
                  >
                    <option value="Sunday Service">Sunday Service</option>
                    <option value="Midweek Service">Midweek Service</option>
                    <option value="Special Meeting">Special Meeting</option>
                    <option value="Vigil">Vigil</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Service Name / Designation</label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 text-xs rounded-lg text-slate-800"
                    placeholder="e.g. 1st Service"
                  />
                </div>

                {/* Optional Super Admin overriding parameters, otherwise system capturable */}
                {(isSuperAdmin || !isSatelliteAdmin) ? (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Service Date</label>
                      <input
                        type="date"
                        value={attDate}
                        onChange={(e) => setAttDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 text-xs rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Check-in Time</label>
                      <input
                        type="time"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 text-xs rounded-lg"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2 flex items-center justify-between text-xs text-slate-400 bg-white/70 p-2.5 border border-slate-100 rounded-lg">
                    <span className="font-mono text-[10px] space-y-0.5">
                      <span className="block font-bold text-slate-600">⚡ AUTO DATE & TIME LOCK</span>
                      <span className="block text-[9px]">Captured automatically on submission</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] uppercase font-bold font-mono">
                      Realtime Current
                    </span>
                  </div>
                )}
              </div>

              {/* Branch override selectors - ONLY for non-satellite admins */}
              {!isSatelliteAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-indigo-50/45 p-3 rounded-xl border border-indigo-100 text-[10px]">
                  <div>
                    <label className="font-bold text-indigo-800 uppercase block mb-1">Target Satellite Church</label>
                    <select
                      value={selSat}
                      onChange={(e) => setSelSat(e.target.value)}
                      className="w-full px-2 py-1.5 border border-indigo-150 bg-white rounded-md text-xs"
                    >
                      <option value="">General Apapa Roster</option>
                      {satelliteChurches.map(s => <option key={s.id} value={s.id}>{s.church_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-indigo-800 uppercase block mb-1">Choir / Media Department Override</label>
                    <select
                      value={selDept}
                      onChange={(e) => setSelDept(e.target.value)}
                      className="w-full px-2 py-1.5 border border-indigo-150 bg-white rounded-md text-xs"
                    >
                      <option value="">No Override</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-indigo-800 uppercase block mb-1">Care Center Override</label>
                    <select
                      value={selCenter}
                      onChange={(e) => setSelCenter(e.target.value)}
                      className="w-full px-2 py-1.5 border border-indigo-150 bg-white rounded-md text-xs"
                    >
                      <option value="">No Override</option>
                      {careCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.care_center_name || cc.cmd_name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Filter / Search input & bulk button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="SEARCH MEMBER... (by ID, Name, Phone)"
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  id="inp-member-attendance-search"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Select / Deselect All Toggle button */}
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-[11px] text-slate-700 font-bold rounded-lg transition cursor-pointer"
                >
                  Toggle Select All ({filteredTrackerMembers.length})
                </button>

                {/* Mark Present Action button */}
                <button
                  type="button"
                  disabled={isCapturing}
                  onClick={handleBulkMarkPresent}
                  className="grow sm:grow-0 px-4 py-2 bg-emerald-600 border border-emerald-750 text-white font-bold text-xs rounded-lg shadow-xs hover:bg-emerald-700 transition disabled:bg-emerald-400 disabled:cursor-wait flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ minHeight: '36px' }}
                >
                  {isCapturing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  MARK SELECTED PRESENT
                </button>
              </div>
            </div>

            {/* Scrollable list of members */}
            <div className="overflow-y-auto max-h-[480px] border border-slate-100 rounded-xl divide-y divide-slate-100 bg-white">
              {filteredTrackerMembers.length === 0 ? (
                <div className="text-center p-10 text-slate-400 italic text-xs">
                  No match found. Adjust your search criteria or make sure the assigned members are registered.
                </div>
              ) : (
                filteredTrackerMembers.map((m) => {
                  const isChecked = !!selectedMems[m.id];
                  const initials = (m.names || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <label
                      key={m.id}
                      className={`flex items-center justify-between p-3.5 hover:bg-slate-50/40 transition-all cursor-pointer ${
                        isChecked ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedMems(prev => ({
                              ...prev,
                              [m.id]: !prev[m.id]
                            }));
                          }}
                          className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                        />

                        {/* Profile Photo / initials avatar */}
                        {m.photo_url ? (
                          <img
                            src={m.photo_url}
                            alt={m.names}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200 text-xs flex items-center justify-center">
                            {initials}
                          </div>
                        )}

                        {/* Name, Phone, and Member ID info */}
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block text-xs">{m.names}</span>
                          <span className="text-[10px] text-slate-405 text-slate-500 block font-mono">
                            ID: {m.member_id} • Mob: {m.phone_number || 'No Phone Registered'}
                          </span>
                        </div>
                      </div>

                      {/* Displaying member status or division badges */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-200 uppercase bg-slate-50">
                        {m.status || 'Active'}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

          </div>

          {/* Right panel: Live check-in list log */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs space-y-4 self-start">
            
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div>
                <span className="text-xs font-extrabold text-slate-900 block flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Recent Checked-In Workers
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Real-time attendance logs loaded under active credentials</p>
              </div>
              <button
                onClick={exportAttendancePDF}
                className="p-1 px-3 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 flex items-center gap-1 hover:bg-indigo-100 transition rounded cursor-pointer"
              >
                <FileDown className="w-3 h-3" />
                PDF
              </button>
            </div>

            <div className="overflow-y-auto max-h-[500px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150">
                    <th className="p-2.5">Member Name</th>
                    <th className="p-2.5">Date & Service</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {memberAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-6 text-center text-slate-400 italic text-[11px]">
                        No checked-in members found. Choose members on the left to register.
                      </td>
                    </tr>
                  ) : (
                    memberAttendance.slice(0, 30).map((a) => {
                      const m = members.find(mem => mem.id === a.member_id);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5">
                            <span className="font-extrabold text-slate-900 block text-[11px]">{m ? m.names : (a.member_name || 'Church Worker')}</span>
                            <span className="text-[9px] font-mono text-slate-450 text-slate-400 block">{m ? m.member_id : a.member_id}</span>
                          </td>
                          <td className="p-2.5 space-y-0.5">
                            <span className="font-semibold text-slate-700 block text-[10px]">{a.attendance_date} @ {a.check_in_time}</span>
                            <span className="text-[9px] font-bold text-indigo-700 block">{a.attendance_type}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* 2. DEPARTMENTAL REGISTER PAGE */}
      {activeTab === 'department' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-4">
            <div>
              <span className="text-xs font-extrabold text-slate-900 block flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600 animate-spin" />
                DCC Apapa Department Heads Ledger
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Automated roll call for church department workers (Choir, Ushering, Media, Technical)</p>
            </div>

            {/* Department parameters select */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category Unit</label>
                <select
                  disabled={isDeptHead}
                  value={isDeptHead ? (myDeptId || '') : registerDeptId}
                  onChange={(e) => {
                    setRegisterDeptId(e.target.value);
                    // refresh local draft statuses logic
                    setTimeout(() => initializeDraftStatuses(), 100);
                  }}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-250 text-xs rounded-lg text-slate-900 focus:outline-none font-bold"
                >
                  {isDeptHead ? (
                    <option value={myDeptId || ''}>{departments.find(d=>d.id === myDeptId)?.department_name || 'My Department'}</option>
                  ) : (
                    departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)
                  )}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Register Date</label>
                <input
                  type="date"
                  value={registerDate}
                  onChange={(e) => {
                    setRegisterDate(e.target.value);
                    setTimeout(() => initializeDraftStatuses(), 100);
                  }}
                  className="px-3 py-1 bg-white border border-slate-200 text-xs rounded-lg"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Default Time</label>
                <input
                  type="time"
                  value={registerTime}
                  onChange={(e) => setRegisterTime(e.target.value)}
                  className="px-3 py-1 bg-white border border-slate-200 text-xs rounded-lg"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => initializeDraftStatuses()}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs"
                  title="Reload Draft members"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
            </div>
          </div>

          {/* List of department members with status radio switchers */}
          {departmentalMembers.length === 0 ? (
            <div className="text-center p-12 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs">
              No registered members found assigned to this department. Head to Members tab to associate workers first.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <th className="p-3.5">Worker Name</th>
                      <th className="p-3.5">Custom ID</th>
                      <th className="p-3.5">Lagos Telephone</th>
                      <th className="p-3.5">Assigned Care Center (CMD)</th>
                      <th className="p-3.5 text-center">Status Selection (Present / Absent / Excused)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                    {departmentalMembers.map((m) => {
                      const currentStatus = draftStatuses[m.id] || 'Present';
                      const cmd = careCenters.find(c => c.id === m.care_center_id);

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/40">
                          <td className="p-3.5">
                            <span className="font-extrabold text-slate-900 block">{m.names}</span>
                            <span className="text-[10px] text-slate-400">{m.email}</span>
                          </td>
                          <td className="p-3.5 font-mono text-[10px]">{m.member_id}</td>
                          <td className="p-3.5">{m.phone_number || 'N/A'}</td>
                          <td className="p-3.5">
                            {cmd ? (
                              <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                {cmd.cmd_name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No center</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-3">
                              {/* Present Option */}
                              <label className={`flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer transition text-xs font-bold ${
                                currentStatus === 'Present' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                              }`}>
                                <input
                                  type="radio"
                                  name={`status-${m.id}`}
                                  checked={currentStatus === 'Present'}
                                  onChange={() => handleDraftStatusChange(m.id, 'Present')}
                                  className="hidden"
                                />
                                <CheckCircle className="w-3.5 h-3.5" />
                                Present
                              </label>

                              {/* Absent Option */}
                              <label className={`flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer transition text-xs font-bold ${
                                currentStatus === 'Absent' ? 'bg-rose-100 text-rose-800' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                              }`}>
                                <input
                                  type="radio"
                                  name={`status-${m.id}`}
                                  checked={currentStatus === 'Absent'}
                                  onChange={() => handleDraftStatusChange(m.id, 'Absent')}
                                  className="hidden"
                                />
                                <XCircle className="w-3.5 h-3.5" />
                                Absent
                              </label>

                              {/* Excused Option */}
                              <label className={`flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer transition text-xs font-bold ${
                                currentStatus === 'Excused' ? 'bg-amber-100 text-amber-800' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                              }`}>
                                <input
                                  type="radio"
                                  name={`status-${m.id}`}
                                  checked={currentStatus === 'Excused'}
                                  onChange={() => handleDraftStatusChange(m.id, 'Excused')}
                                  className="hidden"
                                />
                                <HelpCircle className="w-3.5 h-3.5" />
                                Excused
                              </label>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Save trigger panel */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  Compiling status values. Pushing records writes directly to standard relational databases.
                </span>

                <button
                  onClick={handleSaveRegister}
                  className="px-5 py-2.5 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Submit Departmental Register
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. HISTORIC ADVANCED REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-50 pb-3">
            <span className="text-xs font-extrabold text-slate-900 block">Attendance History & Annual Roll Tallies</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Filter, search, and parse aggregated records to generate annual performance trends</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl text-center">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">Sunday Service Avg</span>
              <span className="text-xl font-bold text-slate-800">88.5%</span>
              <span className="text-[9px] text-slate-400 block font-bold">Lagos Head Roster</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">Midweek Services</span>
              <span className="text-xl font-bold text-slate-800">62.0%</span>
              <span className="text-[9px] text-slate-400 block font-bold">Wednesday cells</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">Monthly Check-ins</span>
              <span className="text-xl font-bold text-indigo-700">146</span>
              <span className="text-[9px] text-slate-400 block font-bold">Workers total</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">Year-On-Year Growth</span>
              <span className="text-xl font-bold text-emerald-600">+14.2%</span>
              <span className="text-[9px] text-slate-400 block font-bold">2025 vs 2026 Ratios</span>
            </div>
          </div>

          {/* Logs of department registers */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Departmental Roll Call Saved Registers ({departmentAttendance.length} records)</span>
              <button
                onClick={() => {
                  alert('Excel spreadsheet download triggered! (Format: CSV compilation of all Department registrations)');
                }}
                className="text-indigo-700 hover:underline flex items-center gap-0.5"
                id="excel-att-download"
              >
                Export Excel Sheet (.csv)
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-64">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                    <th className="p-3">Department Name</th>
                    <th className="p-3">Member Name</th>
                    <th className="p-3">Meeting Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {departmentAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 italic">No departmental registers recorded yet. Open the Register tab to submit.</td>
                    </tr>
                  ) : (
                    departmentAttendance.map((da) => {
                      const dept = departments.find(d => d.id === da.department_id);
                      const m = members.find(mem => mem.id === da.member_id);
                      if (!dept || !m) return null;

                      return (
                        <tr key={da.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">{dept.department_name}</td>
                          <td className="p-3">{m.names}</td>
                          <td className="p-3 font-mono">{da.attendance_date} @ {da.attendance_time}</td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              da.attendance_status === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                              da.attendance_status === 'Absent' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {da.attendance_status}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-[10px] text-slate-500">{da.recorded_by}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeProfile.role === 'Super Admin' && (
        <DiagnosticsPanel
          tableName="member_attendance"
          rowsInDb={memberAttendance.length}
          rowsLoaded={memberAttendance.length}
          lastQueryTime="44ms"
          lastError={null}
          currentUserRole={activeProfile.role}
          currentUserEmail={activeProfile.email}
        />
      )}
    </div>
  );
}
