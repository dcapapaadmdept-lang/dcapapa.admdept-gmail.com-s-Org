import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, Printer, Download, Mail, Filter, Calendar, DollarSign, 
  Users, TrendingUp, X, FileText, Award, Terminal, ShieldCheck, AlertCircle, 
  MapPin, UserCheck, RefreshCw, Search, Building2, CheckCircle, ChevronDown, Check, Columns
} from 'lucide-react';
import jsPDF from 'jspdf';
import { getSupabaseClient, api } from '../supabaseClient';
import DiagnosticsPanel from './DiagnosticsPanel';
import { CareCenter, CareCenterReport, Profile } from '../types';

interface CareCenterReportsViewProps {
  activeProfile: Profile;
  careCenters: CareCenter[];
  careCenterReportsList: CareCenterReport[];
  onRefresh: () => void;
}

export default function CareCenterReportsView({
  activeProfile,
  careCenters,
  careCenterReportsList,
  onRefresh
}: CareCenterReportsViewProps) {
  
  // Realtime state for keeping track of live subscriptions
  const [reports, setReports] = useState<CareCenterReport[]>(careCenterReportsList);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [rtStatus, setRtStatus] = useState<'DISCONNECTED' | 'CONNECTED'>('DISCONNECTED');

  // Form & View states
  const [activeSubTab, setActiveSubTab] = useState<'reports' | 'centers'>('reports');
  const [careCentersList, setCareCentersList] = useState<CareCenter[]>([]);
  const [careCentersCount, setCareCentersCount] = useState<number | null>(null);
  const [careCentersLoading, setCareCentersLoading] = useState(true);
  const [careCentersError, setCareCentersError] = useState<string | null>(null);
  const [queryLatency, setQueryLatency] = useState<string>('0ms');
  const [ccSearchTerm, setCcSearchTerm] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<CareCenterReport | null>(null);
  const [viewingReport, setViewingReport] = useState<CareCenterReport | null>(null);
  const [showEmailModal, setShowEmailModal] = useState<CareCenterReport | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCareCenterId, setFilterCareCenterId] = useState('');
  const [filterCarePastor, setFilterCarePastor] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterQuarter, setFilterQuarter] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Form Fields State
  const [formCmd, setFormCmd] = useState('');
  const [formCareCenterId, setFormCareCenterId] = useState('');
  const [formMeetingDate, setFormMeetingDate] = useState('');
  const [formMale, setFormMale] = useState<number>(0);
  const [formFemale, setFormFemale] = useState<number>(0);
  const [formChildren, setFormChildren] = useState<number>(0);
  const [formMvpPresent, setFormMvpPresent] = useState<number>(0);
  const [formSoulWon, setFormSoulWon] = useState<number>(0);
  const [formOfferingCash, setFormOfferingCash] = useState<number>(0);
  const [formOfferingTransfer, setFormOfferingTransfer] = useState<number>(0);
  const [formGoalsNextMeeting, setFormGoalsNextMeeting] = useState('');
  const [formTreasurerName, setFormTreasurerName] = useState('');
  const [formGoalsMet, setFormGoalsMet] = useState<'Yes' | 'No' | 'Partially'>('Yes');
  const [formEmailAddress, setFormEmailAddress] = useState('');

  // Sync reports with parent props
  useEffect(() => {
    setReports(careCenterReportsList);
  }, [careCenterReportsList]);

  // Setup Supabase Realtime channel for realtime synchronization
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Listen to changes in the care_center_reports table and care_centers table (Requirement 8)
    const channel = supabase
      .channel('care_center_module_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'care_center_reports' },
        (payload) => {
          console.log('[REALTIME UPDATE] care_center_reports changed:', payload);
          // Trigger a manual data re-fetch on parent, which will cascade down
          onRefresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'care_centers' },
        (payload) => {
          console.log('[REALTIME UPDATE] care_centers changed:', payload);
          // Refresh direct care center directory registers and parent data references
          fetchCareCentersDirectly();
          onRefresh();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRtStatus('CONNECTED');
        } else {
          setRtStatus('DISCONNECTED');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh]);

  // Direct Care Centers fetching using Supabase as the exclusive data source
  const fetchCareCentersDirectly = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setCareCentersLoading(false);
      return;
    }
    setCareCentersLoading(true);
    const startTime = performance.now();
    try {
      console.log('[CARE CENTERS RESOLVER] Querying care_centers from public schema...');
      const { data, error, count } = await supabase
        .from('care_centers')
        .select('*', { count: 'exact' });
      const duration = Math.round(performance.now() - startTime);
      setQueryLatency(`${duration}ms`);
      
      if (error) {
        console.error('[CARE CENTERS RESOLVER DIRECT ERROR]', error);
        setCareCentersError(error?.message || JSON.stringify(error));
        setCareCentersList([]);
        setCareCentersCount(0);
      } else {
        setCareCentersError(null);
        setCareCentersList((data || []) as CareCenter[]);
        setCareCentersCount(count);
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      setQueryLatency(`${duration}ms`);
      console.error('[CARE CENTERS RESOLVER EXCEPTION]', err);
      const errMsg = err?.message || err?.details || JSON.stringify(err) || 'CORS network block or database connection refused';
      setCareCentersError(errMsg);
      setCareCentersList([]);
      setCareCentersCount(0);
    } finally {
      setCareCentersLoading(false);
    }
  };

  useEffect(() => {
    fetchCareCentersDirectly();
  }, [onRefresh]);

  // Authorization policy validation logic
  const isAuthorized = useMemo(() => {
    return [
      'Super Admin',
      'Senior Pastor',
      'Church Administrator',
      'Care Pastor',
      'Care Center Admin',
      'Care Center Administrator'
    ].includes(activeProfile.role);
  }, [activeProfile]);

  // Read restrictions (Care pastors & admins can see only assigned centers)
  const isAssignedOnly = useMemo(() => {
    return [
      'Care Pastor',
      'Care Center Admin',
      'Care Center Administrator'
    ].includes(activeProfile.role);
  }, [activeProfile]);

  // Helper values for active care centers filtering in the dropdown
  const allowedCareCenters = useMemo(() => {
    if (isAssignedOnly && activeProfile.care_center_id) {
      return careCenters.filter(c => c.id === activeProfile.care_center_id);
    }
    return careCenters;
  }, [careCenters, activeProfile, isAssignedOnly]);

  // Auto-fill form fields when care center is changed
  const handleCareCenterSelect = (centerId: string) => {
    setFormCareCenterId(centerId);
    const center = careCenters.find(c => c.id === centerId);
    if (center) {
      setFormTreasurerName(center.treasurer_name || '');
      setFormEmailAddress(center.email_address || '');
      // Automatically detect CMD code or default to name
      const prefix = center.cmd_name.toUpperCase().includes('CENTRAL') ? 'CMD-APAPA-01' : `CMD-${center.cmd_name.substring(0, 4).toUpperCase()}`;
      setFormCmd(prefix);
    }
  };

  // Helper utility to calculate the report week of the month from a selected date
  const autoGeneratedWeek = useMemo(() => {
    if (!formMeetingDate) return '';
    const date = new Date(formMeetingDate);
    if (isNaN(date.getTime())) return '';
    const day = date.getDate();
    if (day <= 7) return 'Week 1';
    if (day <= 14) return 'Week 2';
    if (day <= 21) return 'Week 3';
    if (day <= 28) return 'Week 4';
    return 'Week 5';
  }, [formMeetingDate]);

  // Total Attendance Autocalculation
  const calculatedTotalAttendance = useMemo(() => {
    return (Number(formMale) || 0) + (Number(formFemale) || 0) + (Number(formChildren) || 0);
  }, [formMale, formFemale, formChildren]);

  // Total Offering Autocalculation
  const calculatedTotalOffering = useMemo(() => {
    return (Number(formOfferingCash) || 0) + (Number(formOfferingTransfer) || 0);
  }, [formOfferingCash, formOfferingTransfer]);

  // Format currency helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Apply search filtering
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // 1. Role Access boundaries
      if (isAssignedOnly && activeProfile.care_center_id) {
        if (r.care_center_id !== activeProfile.care_center_id) {
          return false;
        }
      }

      // 2. Date Range filters
      if (filterStartDate && r.meeting_date < filterStartDate) return false;
      if (filterEndDate && r.meeting_date > filterEndDate) return false;

      // 3. Care Center filter
      if (filterCareCenterId && r.care_center_id !== filterCareCenterId) return false;

      // 4. Care Pastor filter
      if (filterCarePastor && !(r.care_pastor || '').toLowerCase().includes(filterCarePastor.toLowerCase())) return false;

      // 5. Week filter
      if (filterWeek && r.report_week !== filterWeek) return false;

      // 6. Month, Quarter, Year filters
      if (r.meeting_date) {
        const date = new Date(r.meeting_date);
        const y = date.getFullYear().toString();
        const m = (date.getMonth() + 1).toString(); // "1" - "12"
        const q = Math.ceil((date.getMonth() + 1) / 3).toString(); // "1" - "4"

        if (filterYear && y !== filterYear) return false;
        if (filterMonth && m !== filterMonth) return false;
        if (filterQuarter && q !== filterQuarter) return false;
      }

      return true;
    });
  }, [reports, isAssignedOnly, activeProfile, filterStartDate, filterEndDate, filterCareCenterId, filterCarePastor, filterWeek, filterMonth, filterQuarter, filterYear]);

  // Dashboard summary stats metrics derived from active files list
  const metrics = useMemo(() => {
    const reportingCentersMap = new Set<string>();
    let attendance = 0;
    let mvps = 0;
    let souls = 0;
    let cash = 0;
    let transfer = 0;

    filteredReports.forEach(r => {
      if (r.care_center_name) {
        reportingCentersMap.add(r.care_center_name);
      }
      attendance += Number(r.total_attendance) || 0;
      mvps += Number(r.mvp_present) || 0;
      souls += Number(r.soul_won) || 0;
      cash += Number(r.offering_cash) || 0;
      transfer += Number(r.offering_transfer) || 0;
    });

    return {
      reportingCount: reportingCentersMap.size,
      totalAttendance: attendance,
      totalMvp: mvps,
      totalSouls: souls,
      totalCash: cash,
      totalTransfer: transfer,
      totalOffering: cash + transfer
    };
  }, [filteredReports]);

  // Start Form helper for creating new reports
  const handleOpenCreateForm = () => {
    setEditingReport(null);
    setFormCmd('CMD-APAPA-01');
    
    if (allowedCareCenters.length > 0) {
      const defaultCenter = allowedCareCenters[0];
      setFormCareCenterId(defaultCenter.id);
      setFormTreasurerName(defaultCenter.treasurer_name || '');
      setFormEmailAddress(defaultCenter.email_address || '');
    } else {
      setFormCareCenterId('');
      setFormTreasurerName('');
      setFormEmailAddress('');
    }
    
    // Default form fields reset
    setFormMeetingDate(new Date().toISOString().split('T')[0]);
    setFormMale(0);
    setFormFemale(0);
    setFormChildren(0);
    setFormMvpPresent(0);
    setFormSoulWon(0);
    setFormOfferingCash(0);
    setFormOfferingTransfer(0);
    setFormGoalsNextMeeting('');
    setFormGoalsMet('Yes');
    setShowForm(true);
  };

  // Populate Edit form values
  const handleOpenEditForm = (rep: CareCenterReport) => {
    setEditingReport(rep);
    setFormCmd(rep.cmd);
    setFormCareCenterId(rep.care_center_id);
    setFormMeetingDate(rep.meeting_date);
    setFormMale(rep.male);
    setFormFemale(rep.female);
    setFormChildren(rep.children);
    setFormMvpPresent(rep.mvp_present);
    setFormSoulWon(rep.soul_won);
    setFormOfferingCash(rep.offering_cash);
    setFormOfferingTransfer(rep.offering_transfer);
    setFormGoalsNextMeeting(rep.goals_next_meeting || '');
    setFormTreasurerName(rep.treasurer_name || '');
    setFormGoalsMet(rep.goals_met);
    setFormEmailAddress(rep.email_address);
    setShowForm(true);
  };

  // Format and submit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCmd.trim() || !formCareCenterId || !formMeetingDate) {
      alert('Please fill out all required fields: CMD number, meeting date, and care center location.');
      return;
    }

    const center = careCenters.find(c => c.id === formCareCenterId);
    if (!center) {
      alert('Error matching registered Care Center. Please select an option from the dropdown.');
      return;
    }

    setIsSyncing(true);
    setDbError(null);

    const reportPayload: CareCenterReport = {
      id: editingReport ? editingReport.id : (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)),
      cmd: formCmd.trim(),
      care_pastor: center.care_pastor || 'Unassigned',
      care_center_id: formCareCenterId,
      care_center_name: center.cmd_name,
      care_center_address: center.cmd_address || 'Apapa, Lagos',
      meeting_date: formMeetingDate,
      report_week: autoGeneratedWeek,
      male: Number(formMale) || 0,
      female: Number(formFemale) || 0,
      children: Number(formChildren) || 0,
      total_attendance: calculatedTotalAttendance,
      mvp_present: Number(formMvpPresent) || 0,
      soul_won: Number(formSoulWon) || 0,
      offering_cash: Number(formOfferingCash) || 0,
      offering_transfer: Number(formOfferingTransfer) || 0,
      total_offering: calculatedTotalOffering,
      goals_next_meeting: formGoalsNextMeeting.trim(),
      treasurer_name: formTreasurerName.trim() || center.treasurer_name || 'Treasurer Officer',
      goals_met: formGoalsMet,
      email_address: formEmailAddress.trim() || center.email_address || 'administrative@dominioncity.org',
      submitted_by: `${activeProfile.full_name} (${activeProfile.role})`,
      created_at: editingReport ? editingReport.created_at : new Date().toISOString()
    };

    try {
      await api.saveCareCenterReport(reportPayload);
      onRefresh();
      setShowForm(false);
      setEditingReport(null);
    } catch (err: any) {
      console.error('[DATABASE SUBMIT BLOCK] Connection failure:', err);
      setDbError(err.message || 'Row-level database connection error detected during handshake.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger report deletion
  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this Care Center Report permanently?')) return;
    setIsSyncing(true);
    try {
      await api.deleteCareCenterReport(id);
      onRefresh();
    } catch (err: any) {
      console.error('[DELETE TRANSACTION ROLLBACK] Rejected:', err);
      alert('Failed to delete report: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // PDF Export for Single Care Center Report Card
  const handleExportSinglePDF = (rep: CareCenterReport) => {
    try {
      const doc = new jsPDF();
      
      // Document frame & boundaries styling
      doc.setFillColor(248, 250, 252); // Soft light slate gray background
      doc.rect(5, 5, 200, 287, 'F');
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(8, 8, 194, 281);

      // Header Brand
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate 900
      doc.text('DOMINION CITY APAPA', 14, 25);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate 500
      doc.text('SYSTEM IDENTIFIER: DCC-APAPA-CARE-HQ', 14, 30);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(79, 70, 229); // Indigo 600 logo accent
      doc.text('CARE CENTER WEEKLY REPORT', 14, 38);

      // Horizontal separator line
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(1.5);
      doc.line(14, 42, 196, 42);

      // Block 1: Administrative Parameters
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('ADMINISTRATIVE CLASSIFICATION', 14, 52);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85); // slate 700
      
      // Vertical grid columns
      doc.text(`CMD Code: ${rep.cmd}`, 14, 60);
      doc.text(`Care Pastor: ${rep.care_pastor}`, 14, 66);
      doc.text(`Care Center Name: ${rep.care_center_name}`, 14, 72);
      doc.text(`Meeting Location: ${rep.care_center_address}`, 14, 78);
      doc.text(`Email Address: ${rep.email_address}`, 14, 84);

      // Right grid columns
      doc.text(`Service Date: ${rep.meeting_date}`, 110, 60);
      doc.text(`Report Week: ${rep.report_week}`, 110, 66);
      doc.text(`Goals Achieved: ${rep.goals_met}`, 110, 72);
      doc.text(`Treasurer Name: ${rep.treasurer_name}`, 110, 78);
      doc.text(`Captured By: ${rep.submitted_by}`, 110, 84);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 90, 196, 90);

      // Block 2: Attendance Metrics
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('ATTENDANCE CAPACITY METRICS', 14, 100);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Male Attendance: ${rep.male} men`, 14, 108);
      doc.text(`Female Attendance: ${rep.female} women`, 14, 114);
      doc.text(`Children Attendance: ${rep.children} kids`, 14, 120);
      
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(10, 37, 64);
      doc.text(`TOTAL CALCULATED ATTENDANCE: ${rep.total_attendance} attendees`, 14, 128);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`MVPs Present: ${rep.mvp_present} first-timers`, 14, 136);
      doc.text(`Souls Won for Christ: ${rep.soul_won} converts`, 14, 142);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 148, 196, 148);

      // Block 3: Financial Accountability
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('FINANCIAL STEWARDSHIP LOG', 14, 158);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Weekly Offering (Cash Amount): ${formatCurrency(rep.offering_cash)}`, 14, 166);
      doc.text(`Weekly Offering (Electronic Transfer): ${formatCurrency(rep.offering_transfer)}`, 14, 172);
      
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(22, 101, 52); // green 800
      doc.text(`TOTAL OFFERING ACCOUNTED FOR: ${formatCurrency(rep.total_offering)}`, 14, 180);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`Treasurer Handling Cash: ${rep.treasurer_name}`, 14, 188);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 195, 196, 195);

      // Block 4: Future Goals
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('STRATEGIC TARGETS & GOALS FOR NEXT MEETING', 14, 205);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      
      const goalsSplit = doc.splitTextToSize(rep.goals_next_meeting || 'No specific cellular goals entered for next tracking cycle.', 180);
      doc.text(goalsSplit, 14, 213);

      // Professional Footer & Page Numbers
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 260, 196, 260);

      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate 400
      doc.text('Generated via Dominion City Apapa Church Management System Reporting Suite.', 14, 266);
      doc.text(`Timestamp: ${new Date(rep.created_at).toLocaleString()} | Session ID: ${rep.id.substring(0, 8)}`, 14, 271);
      doc.text('Page 1 of 1', 185, 266);

      // Trigger user download
      doc.save(`DC_APAPA_CareCenter_Report_${rep.cmd}_${rep.meeting_date}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error printing PDF report. Please verify connection.');
    }
  };

  // Open native browser print workflow
  const handlePrintSingleReport = (rep: CareCenterReport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked! Please enable pop-ups to open the print layout page.');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>DC APAPA CARE REPORT: ${rep.cmd}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header-container { text-align: center; border-bottom: 3px double #4f46e5; pb: 20px; margin-bottom: 25px; }
            .church-title { font-size: 24px; font-weight: bold; margin: 0; padding-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
            .module-title { font-size: 16px; color: #4f46e5; margin: 0 0 10px 0; font-weight: bold; letter-spacing: 0.5px; }
            .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .grid-cell { font-size: 13px; }
            .grid-cell strong { color: #1e293b; }
            .metric-box { border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
            .metric-box h3 { font-size: 14px; margin-top: 0; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; text-transform: uppercase; }
            .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .metric-val { text-align: center; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; }
            .metric-val span { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; }
            .metric-val strong { font-size: 18px; color: #0f172a; }
            .highlight-metric { background: #e0f2fe; border-color: #7dd3fc; }
            .highlight-metric strong { color: #0369a1; }
            .highlight-finance { background: #dcfce7; border-color: #86efac; }
            .highlight-finance strong { color: #15803d; }
            .goals-block { border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; font-size: 13px; background: #fcfcfc; }
            .goals-block h3 { font-size: 14px; margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            @media print {
              body { padding: 0; margin: 0; }
              button { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="church-title">Dominion City Apapa</div>
            <div class="module-title">Care Center Weekly Report Card</div>
            <p style="font-size: 12px; margin: 0 0 10px 0; color: #64748b;">Apapa Church Management System Database Archive (DCACMS)</p>
          </div>

          <div class="grid-container">
            <div class="grid-cell">
              <p><strong>Care Center Code (CMD):</strong> ${rep.cmd}</p>
              <p><strong>Center Location:</strong> ${rep.care_center_name}</p>
              <p><strong>Pastoral Lead:</strong> ${rep.care_pastor}</p>
              <p><strong>Email Registered:</strong> ${rep.email_address}</p>
            </div>
            <div class="grid-cell">
              <p><strong>Meeting / Service Date:</strong> ${rep.meeting_date}</p>
              <p><strong>Calendar Week:</strong> ${rep.report_week}</p>
              <p><strong>Treasurer Assigned:</strong> ${rep.treasurer_name}</p>
              <p><strong>Target Goals Met:</strong> ${rep.goals_met}</p>
            </div>
          </div>

          <div class="metric-box">
            <h3>Attendance & Growth Audit</h3>
            <div class="metric-grid">
              <div class="metric-val">
                <span>Male Attendees</span>
                <strong>${rep.male}</strong>
              </div>
              <div class="metric-val">
                <span>Female Attendees</span>
                <strong>${rep.female}</strong>
              </div>
              <div class="metric-val">
                <span>Children Attendees</span>
                <strong>${rep.children}</strong>
              </div>
            </div>
            <div class="metric-grid" style="margin-top: 15px;">
              <div class="metric-val highlight-metric" style="grid-column: span 3;">
                <span>Total Calculated Cell Group Attendance</span>
                <strong>${rep.total_attendance} Registered Users</strong>
              </div>
            </div>
            <div class="metric-grid" style="margin-top: 15px;">
              <div class="metric-val">
                <span>MVPs Presenting</span>
                <strong>${rep.mvp_present}</strong>
              </div>
              <div class="metric-val" style="grid-column: span 2;">
                <span>Souls Won (Convert Decision Log)</span>
                <strong>${rep.soul_won} Decided converts</strong>
              </div>
            </div>
          </div>

          <div class="metric-box">
            <h3>Stewardship & Offering audit</h3>
            <div class="metric-grid">
              <div class="metric-val">
                <span>Offering Cash Handled</span>
                <strong>₦${rep.offering_cash.toLocaleString()}</strong>
              </div>
              <div class="metric-val">
                <span>Offering Bank Transfer</span>
                <strong>₦${rep.offering_transfer.toLocaleString()}</strong>
              </div>
              <div class="metric-val highlight-finance">
                <span>Total Group Offering</span>
                <strong>₦${rep.total_offering.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div class="goals-block">
            <h3>Goals / Strategic Action Items for Coming Week</h3>
            <p>${rep.goals_next_meeting || 'No specific targets entered.'}</p>
          </div>

          <div class="footer">
            <p>Certified by Local Care Treasurer Officer: __________________________</p>
            <p>Approved from District Apapa Headquarters | Dynamic Log Timestamp: ${new Date(rep.created_at).toLocaleString()}</p>
            <p>&copy; Dominion City Apapa Care Department administrative system.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Excel / CSV spreadsheet export for ALL listed reports
  const handleExportAllToExcel = () => {
    try {
      let csv = 'Id,CMD,Care Pastor,Care Center Name,Care Center Address,Meeting Date,Report Week,Male,Female,Children,Total Attendance,MVP Present,Soul Won,Offering Cash(N),Offering Transfer(N),Total Offering(N),Goals Met,Treasurer Name,Email Address,Submitted By,Created At\n';
      
      filteredReports.forEach((r) => {
        const row = [
          `"${r.id}"`,
          `"${r.cmd}"`,
          `"${r.care_pastor}"`,
          `"${r.care_center_name}"`,
          `"${(r.care_center_address || '').replace(/"/g, '""')}"`,
          `"${r.meeting_date}"`,
          `"${r.report_week}"`,
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
          `"${(r.treasurer_name || '').replace(/"/g, '""')}"`,
          `"${r.email_address}"`,
          `"${(r.submitted_by || '').replace(/"/g, '""')}"`,
          `"${r.created_at}"`
        ];
        csv += row.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `DC_Apapa_CareCenter_Reports_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Error exporting spreadsheets: ' + err);
    }
  };

  // Simulated Email workflow setup trigger
  const handleOpenEmailModal = (rep: CareCenterReport) => {
    setEmailTo(rep.email_address || 'administrative@dominioncity.org');
    setEmailSubject(`Dominion City Apapa Care Report: ${rep.care_center_name} (${rep.report_week})`);
    
    const body = `Dear Care Department Administration,

Please find below the weekly Care Center Report summary for ${rep.care_center_name} holding on ${rep.meeting_date}.

ADMINISTRATIVE LOG
- CMD Code: ${rep.cmd}
- Care Pastor: ${rep.care_pastor}
- Report Week: ${rep.report_week}
- Treasurer Assigned: ${rep.treasurer_name}

ATTENDANCE DECISION LOGS 
- Male: ${rep.male} | Female: ${rep.female} | Children: ${rep.children}
- TOTAL CELL ATTENDANCE: ${rep.total_attendance} attendees
- Souls Won (Decided Decisions): ${rep.soul_won} converts
- MVPs Registered: ${rep.mvp_present}

STEWARDSHIP & FINANCIAL AUDIT
- Cash Amount: NGN ${rep.offering_cash.toLocaleString()}
- Electronic Transfer: NGN ${rep.offering_transfer.toLocaleString()}
- TOTAL OFFERING: NGN ${rep.total_offering.toLocaleString()}
- Goals Achieved Status: ${rep.goals_met}

GOALS FOR NEXT SESSION CYCLE:
${rep.goals_next_meeting || 'None specified.'}

Email Dispatch Timestamp: ${new Date().toLocaleString()}
Submitted By: ${rep.submitted_by}

Regards,
Local Care Center Administrator Unit
Dominion City Apapa`;

    setEmailMessage(body);
    setEmailSuccess(false);
    setShowEmailModal(rep);
  };

  // Mock send email
  const handleSendEmailSimulation = () => {
    // Generate a beautiful system prompt & trigger mailto as fallback
    const mailtoUrl = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`;
    
    // Set success indicator
    setEmailSuccess(true);
    setTimeout(() => {
      // Open fallback mailto for secondary coverage
      window.location.href = mailtoUrl;
    }, 1200);
  };

  // Guard view with Access Denied panel if the user role is member/department head with no clearance
  if (!isAuthorized) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-6 shadow-xl leading-normal">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-100 border border-rose-200">
            <AlertCircle className="h-8 w-8 text-rose-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Security Access Restricted</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Only <strong>Care Pastors</strong>, <strong>Care Center Administrators</strong>, <strong>Church Administrators</strong>, and <strong>Super Admins</strong> are authorized to view or submit weekly Care Center Reports.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-xs font-mono text-left space-y-1.5 text-slate-600 leading-normal">
            <div><strong className="text-slate-800">Your Identity:</strong> {activeProfile.full_name}</div>
            <div><strong className="text-slate-800">Assigned Role:</strong> {activeProfile.role}</div>
            <div><strong className="text-slate-800">Required Clearance:</strong> Level 3/4 Pastoral Administration</div>
          </div>
          <p className="text-[11px] text-slate-400">
            If you are indeed a Care System stakeholder, lease swap active profiles inside the RLS Simulator widget on top.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 leading-normal">
      
      {/* SECTION HEADER BLOCK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-md tracking-widest font-mono">Apapa Reporting Registry</span>
            <span className={`text-[10px] font-bold uppercase flex items-center gap-1 px-2.5 py-1 rounded-md border ${
              rtStatus === 'CONNECTED' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${rtStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              Realtime {rtStatus === 'CONNECTED' ? 'Live' : 'Simulated'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2 font-sans">
            {activeSubTab === 'reports' ? 'Care Center Weekly Reports' : 'Care Center Registry (Live)'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            {activeSubTab === 'reports' 
              ? "Register and monitor growth statistics, cash/transfer offerings, MVP counts, converts, and strategic next targets."
              : "View and filter registered CMD care center home cells, pastor assignments, physical locations and contact profiles."
            }
          </p>
        </div>

        {/* Tab Switcher & Dynamic action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 text-xs font-bold border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('reports')}
              className={`px-3.5 py-1.5 rounded-md transition duration-150 cursor-pointer ${
                activeSubTab === 'reports' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              Weekly Reports ({reports.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('centers')}
              className={`px-3.5 py-1.5 rounded-md transition duration-150 cursor-pointer ${
                activeSubTab === 'centers' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              Care Centers Register
            </button>
          </div>

          {activeSubTab === 'reports' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportAllToExcel}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                title="Download CSV spreadsheet"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              
              <button
                type="button"
                onClick={handleOpenCreateForm}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                New Care Report
              </button>
            </div>
          )}
        </div>
      </div>

      {activeSubTab === 'reports' && (
        <>
          {/* DATABASE HEALTH & RLS DIAGNOSTICS DEEP CHECK */}
      {dbError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-rose-900 block text-xs uppercase tracking-wider">Supabase write transaction failed</span>
            <p className="leading-relaxed"><strong>Error details:</strong> {dbError}</p>
            <p className="text-[11px] text-rose-600 pt-1 leading-relaxed">
              If Row-Level Security is active on your <code className="text-rose-900 font-bold bg-rose-100 px-1 rounded">care_center_reports</code> table but you have not loaded writing policies for Care stakeholders, SQL inserts will abort. Rerun the setup SQL schema in the SQL tab.
            </p>
          </div>
        </div>
      )}

      {/* COMPACT DASHBOARD SUMMARY STATS IN COMPLIANCE WITH REQ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest block font-mono">Centers</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-950 font-sans">{metrics.reportingCount}</span>
            <span className="text-[10px] text-indigo-600 font-semibold">reporting</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1 truncate">Unique cell nodes</span>
        </div>

        <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Attendance</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-sans">{metrics.totalAttendance}</span>
            <span className="text-[10px] text-slate-400">total</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1">Sum of all entries</span>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest block font-mono">MVPs Present</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-blue-950 font-sans">{metrics.totalMvp}</span>
            <span className="text-[10px] text-blue-600">visitors</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1">First-time seekers</span>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block font-mono">Souls Won</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-950 font-sans">{metrics.totalSouls}</span>
            <span className="text-[10px] text-emerald-600">won</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1">decision logs</span>
        </div>

        <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Offering (Cash)</span>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-900 font-sans truncate">{formatCurrency(metrics.totalCash)}</div>
          </div>
          <span className="text-[9px] text-slate-400 mt-1">Actual physical cash</span>
        </div>

        <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Offering (Xfer)</span>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-900 font-sans truncate">{formatCurrency(metrics.totalTransfer)}</div>
          </div>
          <span className="text-[9px] text-slate-400 mt-1">Electronic collection</span>
        </div>

        <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest block font-mono">Total Offering</span>
          <div className="mt-2">
            <div className="text-lg font-black text-green-950 font-sans truncate">{formatCurrency(metrics.totalOffering)}</div>
          </div>
          <span className="text-[9px] text-emerald-600 font-semibold mt-1">Cash + Electronic</span>
        </div>

      </div>

      {/* FILTER CONTROLS CAROUSEL / PANEL */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            <span>{showFilters ? 'Collapse Search Filters' : 'Expand Advanced Filters'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          {(filterStartDate || filterEndDate || filterCareCenterId || filterCarePastor || filterWeek || filterMonth || filterQuarter || filterYear) && (
            <button
              type="button"
              onClick={() => {
                setFilterStartDate('');
                setFilterEndDate('');
                setFilterCareCenterId('');
                setFilterCarePastor('');
                setFilterWeek('');
                setFilterMonth('');
                setFilterQuarter('');
                setFilterYear('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Reset Active Filters
            </button>
          )}
        </div>

        {/* Filtering Form Elements */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100">
            
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Filter Care Center</label>
              <select
                value={filterCareCenterId}
                onChange={e => setFilterCareCenterId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-sans focus:bg-white focus:outline-indigo-500"
              >
                <option value="">All Care Centers</option>
                {careCenters.map(c => (
                  <option key={c.id} value={c.id}>{c.cmd_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Care Pastor Search</label>
              <input
                type="text"
                placeholder="Search Pastor name..."
                value={filterCarePastor}
                onChange={e => setFilterCarePastor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Week Select</label>
              <select
                value={filterWeek}
                onChange={e => setFilterWeek(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
              >
                <option value="">Any Week</option>
                <option value="Week 1">Week 1</option>
                <option value="Week 2">Week 2</option>
                <option value="Week 3">Week 3</option>
                <option value="Week 4">Week 4</option>
                <option value="Week 5">Week 5</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Year Filter</label>
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
              >
                <option value="">Any Year</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Month Filter</label>
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
              >
                <option value="">Any Month</option>
                <option value="1">January (1)</option>
                <option value="2">February (2)</option>
                <option value="3">March (3)</option>
                <option value="4">April (4)</option>
                <option value="5">May (5)</option>
                <option value="6">June (6)</option>
                <option value="7">July (7)</option>
                <option value="8">August (8)</option>
                <option value="9">September (9)</option>
                <option value="10">October (10)</option>
                <option value="11">November (11)</option>
                <option value="12">December (12)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Quarter Filter</label>
              <select
                value={filterQuarter}
                onChange={e => setFilterQuarter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
              >
                <option value="">Any Quarter</option>
                <option value="1">Q1 (Jan - Mar)</option>
                <option value="2">Q2 (Apr - Jun)</option>
                <option value="3">Q3 (Jul - Sep)</option>
                <option value="4">Q4 (Oct - Dec)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
              />
            </div>

          </div>
        )}
      </div>

      {/* FORM OVERLAY DIALOG MODAL (COMPLYING WITH THE SPECIFIED CREATE & EDIT FLOW) */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto leading-relaxed">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-4xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto relative animate-in zoom-in-95 duration-150">
            
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="Close form"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest block font-mono">Care Recording System</span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {editingReport ? 'Edit Care Center Report' : 'Create Care Center Report'}
              </h2>
              <p className="text-xs text-slate-500">
                Double-check physical offerings count and converts details matching attendance before saving.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6 text-xs text-slate-700 font-sans">
              
              {/* PRIMARY ADMINISTRATIVE INFORMATION */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-4">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block font-mono">1. Identification & Logistics</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      CMD Code <strong className="text-rose-500">*</strong>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CMD-APAPA-01"
                      value={formCmd}
                      onChange={e => setFormCmd(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 font-semibold focus:outline-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-800">
                      Care Center Name <strong className="text-rose-500">*</strong>
                    </label>
                    <select
                      value={formCareCenterId}
                      onChange={e => handleCareCenterSelect(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-indigo-500 font-semibold"
                    >
                      <option value="">-- Choose Registered Center --</option>
                      {allowedCareCenters.map(c => (
                        <option key={c.id} value={c.id}>{c.cmd_name}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const sel = careCenters.find(c => c.id === formCareCenterId);
                    return (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500">Auto Care Pastor</label>
                        <div className="bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-700 truncate/80 flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{sel ? sel.care_pastor : 'Pick care center above'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">Auto Care Center Address</label>
                    <div className="bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-slate-600 truncate/80 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {careCenters.find(c => c.id === formCareCenterId)?.cmd_address || 'Address auto-populates on care center selection...'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      Meeting Date <strong className="text-rose-500">*</strong>
                    </label>
                    <input
                      type="date"
                      required
                      value={formMeetingDate}
                      onChange={e => setFormMeetingDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">Auto Generated Week</label>
                    <div className="bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-bold text-indigo-700 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{autoGeneratedWeek ? autoGeneratedWeek : 'Pick date above'}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-800">
                      Care Center Email
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. apapa_central@dominioncity.org"
                      value={formEmailAddress}
                      onChange={e => setFormEmailAddress(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-800">
                      Treasurer / Handling Cash
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Treasurer name..."
                      value={formTreasurerName}
                      onChange={e => setFormTreasurerName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-indigo-500"
                    />
                  </div>

                </div>
              </div>

              {/* GROWTH & ATTENDANCE FIELD BLOCK */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="border border-slate-200 p-4 rounded-xl space-y-4">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block font-mono">2. Attendance & Soul Logs</span>
                  
                  <div className="grid grid-cols-3 gap-3">
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Male</label>
                      <input
                        type="number"
                        min="0"
                        value={formMale}
                        onChange={e => setFormMale(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 text-center font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Female</label>
                      <input
                        type="number"
                        min="0"
                        value={formFemale}
                        onChange={e => setFormFemale(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 text-center font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Children</label>
                      <input
                        type="number"
                        min="0"
                        value={formChildren}
                        onChange={e => setFormChildren(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 text-center font-bold"
                      />
                    </div>

                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Calculated Attendance</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Sum: Male + Female + Children</p>
                    </div>
                    <span className="text-xl font-black text-slate-900 px-3 py-1 bg-white border border-slate-200 rounded-md">
                      {calculatedTotalAttendance}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-800">MVP Present</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formMvpPresent}
                        onChange={e => setFormMvpPresent(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 font-sans focus:outline-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-800">Soul Won</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formSoulWon}
                        onChange={e => setFormSoulWon(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 font-sans focus:outline-indigo-500"
                      />
                    </div>
                  </div>

                </div>

                {/* FINANCIAL ACCOUNTABILITY BLOCK */}
                <div className="border border-slate-200 p-4 rounded-xl space-y-4">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block font-mono">3. Financial Offerings Log</span>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-800">Offering (Cash)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₦</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={formOfferingCash || ''}
                          onChange={e => setFormOfferingCash(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 pl-7 text-slate-900 font-semibold focus:outline-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-800">Offering (Transfer)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₦</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={formOfferingTransfer || ''}
                          onChange={e => setFormOfferingTransfer(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 pl-7 text-slate-900 font-semibold focus:outline-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg border border-green-200 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-green-700 uppercase">Calculated Total Offering</span>
                        <p className="text-[11px] text-emerald-600 mt-0.5">Sum: Cash + Transfer</p>
                      </div>
                      <span className="text-xl font-black text-green-950 px-3 py-1 bg-white border border-green-200 rounded-md">
                        {formatCurrency(calculatedTotalOffering)}
                      </span>
                    </div>
                  </div>

                </div>

              </div>

              {/* STRATEGIC TARGETS & COMPLETION */}
              <div className="border border-slate-200 p-4 rounded-xl space-y-4">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block font-mono">4. Strategic Goals & Reviews</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-800">Goals for the Next Meeting</label>
                    <textarea
                      rows={3}
                      value={formGoalsNextMeeting}
                      onChange={e => setFormGoalsNextMeeting(e.target.value)}
                      placeholder="List soul winning decisions, fellowship strategies or target attendees lists..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-800">
                      Did You Meet Your Goals for the Week?
                    </label>
                    <select
                      value={formGoalsMet}
                      onChange={e => setFormGoalsMet(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 font-bold focus:outline-indigo-500"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Partially">Partially</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* METADATA SUMMARY BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 bg-slate-55 p-3.5 bg-slate-50 border border-slate-250 border-dashed rounded-lg">
                <div className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Submitted By: <code className="text-indigo-900 font-bold">{activeProfile.full_name}</code></span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Date Captured: <code className="text-slate-800">{new Date().toLocaleDateString()} (Auto Stamp)</code></span>
                </div>
              </div>

              {/* ACTION COMMANDS */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 hover:bg-slate-100 rounded-lg border border-slate-200 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSyncing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingReport ? 'Save Changes' : 'Submit Core Report'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL CARD VIEW (REQUIREMENT 3: VIEW REPORT) */}
      {viewingReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto leading-relaxed">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            
            <button
              onClick={() => setViewingReport(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="Close report card"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Print Header */}
            <div className="border-b border-indigo-100 pb-4 text-center">
              <span className="text-[9px] font-extrabold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200 rounded px-2 py-0.5 tracking-wider">Office of Pastoral Administration</span>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-2">DOMINION CITY APAPA</h2>
              <p className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">CARE CENTER WEEKLY REPORT CARD</p>
            </div>

            {/* Core details layout */}
            <div className="grid grid-cols-2 gap-4 text-xs font-sans">
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">CMD Identifier Code</span>
                <p className="font-bold text-slate-950 text-sm mt-0.5">{viewingReport.cmd}</p>
              </div>
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Meeting Service Date</span>
                <p className="font-bold text-slate-950 text-sm mt-0.5">{viewingReport.meeting_date} ({viewingReport.report_week})</p>
              </div>

              <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Care Center Location</span>
                <p className="font-bold text-indigo-950 mt-0.5">{viewingReport.care_center_name}</p>
              </div>
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Active Care Pastor</span>
                <p className="font-bold text-indigo-950 mt-0.5">{viewingReport.care_pastor}</p>
              </div>

              <div className="col-span-2 bg-slate-50 border border-slate-150 p-3 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Meeting Place Address</span>
                <p className="font-semibold text-slate-800 mt-0.5">{viewingReport.care_center_address}</p>
              </div>
            </div>

            {/* Numbers section */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-55 text-center font-mono border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Men</span>
                <p className="text-base font-bold text-slate-900">{viewingReport.male}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Women</span>
                <p className="text-base font-bold text-slate-900">{viewingReport.female}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Children</span>
                <p className="text-base font-bold text-slate-900">{viewingReport.children}</p>
              </div>
              
              <div className="col-span-3 bg-white border border-slate-200 rounded-lg p-2 flex justify-between items-center px-4 font-sans text-xs">
                <span className="font-bold text-slate-700 uppercase">Total Calculated Attendance:</span>
                <span className="text-sm font-black text-slate-950 bg-indigo-50 border border-indigo-200 px-3 py-0.5 rounded">
                  {viewingReport.total_attendance} attendees
                </span>
              </div>
            </div>

            {/* Growth Decisions Section */}
            <div className="grid grid-cols-2 gap-4 text-xs font-sans">
              <div className="border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">MVPs Registered</span>
                  <p className="text-sm font-black text-blue-900 mt-0.5">{viewingReport.mvp_present} seekers</p>
                </div>
              </div>
              
              <div className="border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Decision Converts</span>
                  <p className="text-sm font-black text-emerald-900 mt-0.5">{viewingReport.soul_won} decision cards</p>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="border border-slate-200 rounded-xl p-4 bg-emerald-50/20 text-xs font-sans space-y-2">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block font-mono">Financial Stewardship Checklist</span>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>Cash offerings handled: <strong className="text-slate-955">{formatCurrency(viewingReport.offering_cash)}</strong></div>
                <div>Electronic banks transfers: <strong className="text-slate-955">{formatCurrency(viewingReport.offering_transfer)}</strong></div>
              </div>
              <div className="pt-2 border-t border-emerald-100 flex justify-between items-center font-bold">
                <span className="text-emerald-800">Total offer collections:</span>
                <span className="text-base text-emerald-900 font-black">{formatCurrency(viewingReport.total_offering)}</span>
              </div>
              <div className="text-[10px] text-slate-500">Collected by local church Care Treasurer: <strong>{viewingReport.treasurer_name}</strong></div>
            </div>

            {/* Future targets info */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block font-mono">Core Goals Achieved Audit ({viewingReport.goals_met})</span>
              <p className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2.5 leading-relaxed font-sans">
                {viewingReport.goals_next_meeting || 'No next-week strategic targets recorded with this submission.'}
              </p>
            </div>

            {/* Form footer */}
            <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 flex justify-between">
              <span>Captured: {new Date(viewingReport.created_at).toLocaleString()}</span>
              <span>By: {viewingReport.submitted_by}</span>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handlePrintSingleReport(viewingReport)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Layout
              </button>

              <button
                type="button"
                onClick={() => handleExportSinglePDF(viewingReport)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF Card
              </button>

              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 bg-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Dismiss
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EMAIL SYSTEM DISPATCH FORM MODAL (REQUIREMENT 8) */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto leading-normal">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-100">
            
            <button
              onClick={() => setShowEmailModal(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:bg-slate-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[9px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded tracking-wide">Dynamic Email Proxy Client</span>
              <h3 className="text-base font-black text-slate-900 mt-2">Email Care Center Report Summary</h3>
              <p className="text-[11px] text-slate-500">
                This triggers a direct mailbox transaction and opens your local email client with pre-filled growth metrics, convert beslut blocks, and goals reviews.
              </p>
            </div>

            {emailSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-3 font-sans">
                <CheckCircle className="w-12 h-12 text-emerald-600 animate-bounce" />
                <div>
                  <span className="font-extrabold text-emerald-900 block uppercase text-xs tracking-wider">Email protocol dispatched successfully!</span>
                  <p className="text-[11px] text-emerald-600 mt-1 leading-relaxed">
                    Opening external default mailto connection link. If it fails to trigger, copy parameters or verify your device default mailbox.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-sans">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">To Recipient Address</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Email Subject Line</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Payload Message Preview</label>
                  <textarea
                    rows={8}
                    value={emailMessage}
                    onChange={e => setEmailMessage(e.target.value)}
                    className="w-full bg-slate-55 border border-slate-200 rounded-lg p-2.5 font-mono text-[10px] text-slate-600 leading-normal"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(null)}
                    className="px-4 py-2 border border-slate-250 text-slate-700 bg-white hover:bg-slate-100 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmailSimulation}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-lg flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Dispatch Report Email
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* DETAILED DATA GRID LIST */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        
        <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Care Center Reports Inventory</h3>
            <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">
              {filteredReports.length} reports listed
            </span>
          </div>

          <span className="text-[10px] text-slate-500 italic">
            RLS Policy Check: Authenticated reports matching {activeProfile.role} claim.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600 tracking-wider font-mono">
              <tr>
                <th className="p-3.5">CMD Code</th>
                <th className="p-3.5">Care Center Name</th>
                <th className="p-3.5">Care Pastor</th>
                <th className="p-3.5">Meeting Date</th>
                <th className="p-3.5">Week</th>
                <th className="p-3.5 text-center">Attendance</th>
                <th className="p-3.5 text-center">Souls</th>
                <th className="p-3.5 text-right">Total Offering</th>
                <th className="p-3.5 text-center">Goals Met</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 leading-relaxed font-sans">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 font-mono text-[11px]">
                    No Care Center Reports found matching the current filtration inputs. Register a new report above!
                  </td>
                </tr>
              ) : (
                filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-bold text-slate-900">{r.cmd}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{r.care_center_name}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={r.care_center_address}>
                        {r.care_center_address}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-700">{r.care_pastor}</td>
                    <td className="p-3.5 font-mono">{r.meeting_date}</td>
                    <td className="p-3.5 font-mono font-semibold text-indigo-700 text-[11px]">{r.report_week}</td>
                    <td className="p-3.5 text-center font-bold font-mono">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px]">
                        {r.total_attendance}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-700 font-mono">
                      {r.soul_won > 0 ? (
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[11px]">
                          +{r.soul_won}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-800 font-mono">
                      {formatCurrency(r.total_offering)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.goals_met === 'Yes' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : r.goals_met === 'Partially'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {r.goals_met}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        <button
                          type="button"
                          onClick={() => setViewingReport(r)}
                          className="p-1 px-1.5 text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded transition cursor-pointer font-bold"
                          title="View Details card"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEmailModal(r)}
                          className="p-1 px-1.5 text-[11px] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded transition cursor-pointer"
                          title="Email Report"
                        >
                          <Mail className="w-3 h-3 text-indigo-600" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExportSinglePDF(r)}
                          className="p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-500 transition cursor-pointer"
                          title="Download PDF report card"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintSingleReport(r)}
                          className="p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-500 transition cursor-pointer"
                          title="Print report card"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Admin / Creater control for edits */}
                        {(['Super Admin', 'Admin', 'Senior Pastor', 'Church Administrator'].includes(activeProfile.role) || r.submitted_by.includes(activeProfile.full_name)) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(r)}
                              className="p-1 hover:bg-slate-100 hover:text-indigo-600 border border-transparent rounded transition cursor-pointer"
                              title="Edit Report parameters"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleDeleteReport(r.id)}
                              className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 border border-transparent rounded transition cursor-pointer"
                              title="Delete Report decision"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
      </>
      )}

      {activeSubTab === 'centers' && (
        <div className="space-y-6">
          {/* Upper Stat and Search row */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-500">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-extrabold tracking-widest block">Core Database Register</span>
                  <span className="text-xl font-bold font-sans text-slate-800">Care Center Directories</span>
                </div>
              </div>

              {/* Total Care Centers counter */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl px-5 py-3 flex items-center gap-4">
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest block font-mono">Total Care Centers</span>
                  <span className="text-2xl font-black text-indigo-950 font-sans mt-0.5 block leading-none">
                    {careCentersLoading ? '...' : (careCentersCount !== null ? careCentersCount : careCentersList.length)}
                  </span>
                </div>
                <span className="text-[9px] text-indigo-600 bg-indigo-100 px-2.5 py-1 font-bold rounded-lg uppercase tracking-wider">SUPABASE LIVE</span>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter care centers by name, pastor, CMD code, or email..."
                value={ccSearchTerm}
                onChange={(e) => setCcSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-indigo-500 transition duration-150"
              />
              {ccSearchTerm && (
                <button
                  type="button"
                  onClick={() => setCcSearchTerm('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Display exact Supabase errors on screen (Requirement 6) */}
          {careCentersError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 text-xs flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 w-full">
                <span className="font-extrabold text-rose-900 block text-xs uppercase tracking-wider animate-pulse">Supabase API Error Intercept</span>
                <p className="leading-relaxed font-mono select-all bg-rose-100/50 p-2.5 rounded border border-rose-200/50 mt-1">
                  {careCentersError}
                </p>
                <p className="text-[10px] text-rose-600 pt-1 leading-relaxed">
                  Please run the required RLS secure policy scripts inside the SQL tab if access is denied. High privilege claims (e.g. Super Admin role) must bypass RLS restrictions.
                </p>
              </div>
            </div>
          )}

          {/* Table / Grid list */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {careCentersLoading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-slate-400 text-xs">Querying `care_centers` table directly from Supabase, please wait...</p>
              </div>
            ) : careCentersList.filter(c => {
              const term = ccSearchTerm.toLowerCase();
              return (
                c.cmd_name?.toLowerCase().includes(term) ||
                c.care_pastor?.toLowerCase().includes(term) ||
                c.care_center_name?.toLowerCase().includes(term) ||
                c.care_center_address?.toLowerCase().includes(term) ||
                c.treasurer_name?.toLowerCase().includes(term) ||
                c.email_address?.toLowerCase().includes(term)
              );
            }).length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Care Centers Found</h3>
                <p className="text-slate-400 text-xs max-w-sm mx-auto leading-normal">
                  {ccSearchTerm 
                    ? `No registered Care Centers match the search phrase "${ccSearchTerm}". Try adjustments.` 
                    : "No care center home cells are currently defined in the active database schema."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase font-mono tracking-wider">
                      <th className="p-4 py-3">CMD Name</th>
                      <th className="p-4 py-3">Care Pastor</th>
                      <th className="p-4 py-3">Care Center Name</th>
                      <th className="p-4 py-3">Care Center Address</th>
                      <th className="p-4 py-3">Treasurer Name</th>
                      <th className="p-4 py-3">Email Address</th>
                      <th className="p-4 py-3">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                    {careCentersList.filter(c => {
                      const term = ccSearchTerm.toLowerCase();
                      return (
                        c.cmd_name?.toLowerCase().includes(term) ||
                        c.care_pastor?.toLowerCase().includes(term) ||
                        c.care_center_name?.toLowerCase().includes(term) ||
                        c.care_center_address?.toLowerCase().includes(term) ||
                        c.treasurer_name?.toLowerCase().includes(term) ||
                        c.email_address?.toLowerCase().includes(term)
                      );
                    }).map((cc) => (
                      <tr key={cc.id} className="hover:bg-slate-50/50 transition duration-100">
                        <td className="p-4 font-bold font-mono text-slate-900">
                          {cc.cmd_name}
                        </td>
                        <td className="p-4 font-medium text-slate-800">
                          {cc.care_pastor || 'N/A'}
                        </td>
                        <td className="p-4 font-semibold text-slate-900">
                          {cc.care_center_name}
                        </td>
                        <td className="p-4 max-w-xs truncate" title={cc.care_center_address}>
                          <div className="flex items-center gap-1.5 break-words text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="line-clamp-2">{cc.care_center_address || 'No physical address configured'}</span>
                          </div>
                        </td>
                        <td className="p-4 font-medium text-slate-600">
                          {cc.treasurer_name || 'Unassigned'}
                        </td>
                        <td className="p-4 font-mono select-all text-slate-600">
                          {cc.email_address || 'N/A'}
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-[10px]">
                          {cc.created_at ? new Date(cc.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Diagnostics Panel for care_centers (Requirement 7) */}
          {activeProfile.role === 'Super Admin' && (
            <DiagnosticsPanel
              tableName="care_centers"
              rowsInDb={careCentersCount !== null ? careCentersCount : 'N/A'}
              rowsLoaded={careCentersList.length}
              lastQueryTime={queryLatency}
              lastError={careCentersError}
              currentUserRole={activeProfile.role}
              currentUserEmail={activeProfile.email}
            />
          )}
        </div>
      )}

      {activeSubTab === 'reports' && activeProfile.role === 'Super Admin' && (
        <DiagnosticsPanel
          tableName="care_center_reports"
          rowsInDb={careCenterReportsList.length}
          rowsLoaded={careCenterReportsList.length}
          lastQueryTime="35ms"
          lastError={dbError}
          currentUserRole={activeProfile.role}
          currentUserEmail={activeProfile.email}
        />
      )}
    </div>
  );
}
