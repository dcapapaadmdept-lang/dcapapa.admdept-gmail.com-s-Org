import React, { useState, useRef, useEffect } from 'react';
import { Member, Department, CareCenter, SatelliteChurch, Profile, MEMBER_SCHEMA, SchemaField } from '../types';
import { api, getSupabaseConfig, getSupabaseClient } from '../supabaseClient';
import DiagnosticsPanel from './DiagnosticsPanel';
import {
  Search,
  Filter,
  UserPlus,
  Trash2,
  Edit2,
  FileDown,
  Upload,
  AlertOctagon,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  X,
  Sparkles,
  RefreshCw,
  Copy,
  Info,
  ChevronDown,
  Database
} from 'lucide-react';

interface MemberManagementViewProps {
  activeProfile: Profile;
  members: Member[];
  departments: Department[];
  careCenters: CareCenter[];
  satelliteChurches: SatelliteChurch[];
  onRefresh: () => void;
  membersQueryError?: string | null;
  totalSupabaseRecords?: number | null;
  lastExecutedQuery?: string;
  mode?: 'Member' | 'Leader & Worker';
}

export default function MemberManagementView({
  activeProfile: propActiveProfile,
  members: propMembers,
  departments,
  careCenters,
  satelliteChurches,
  onRefresh,
  membersQueryError: propMembersQueryError = null,
  totalSupabaseRecords = null,
  lastExecutedQuery = '',
  mode = 'Member'
}: MemberManagementViewProps) {
  // If profile data is unavailable, use fallback role = super_admin and continue loading members (Requirements 15 & 16)
  const activeProfile = propActiveProfile || {
    id: 'fallback-admin-id',
    email: 'dcapapa.admdept@gmail.com',
    full_name: 'Super Admin Fallback',
    role: 'super_admin' as any,
    created_at: new Date().toISOString()
  } as Profile;

  const isSatelliteAdmin = ['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile.role);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersQueryError, setMembersQueryError] = useState<string | null>(propMembersQueryError);
  const [supabaseResponse, setSupabaseResponse] = useState<any | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showResponsePayload, setShowResponsePayload] = useState(false);

  // State variables declared early for inline function references
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [satFilter, setSatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [maritalStatusFilter, setMaritalStatusFilter] = useState('');
  
  // Pagination State (Requirements 8, 9 & 10)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  const [totalMatchingRecords, setTotalMatchingRecords] = useState(0);
  const [queryCount, setQueryCount] = useState(0);
  const [currentRangeStr, setCurrentRangeStr] = useState('0 - 0');
  const [unfilteredTotal, setUnfilteredTotal] = useState(3564);
  const [lastQueryDuration, setLastQueryDuration] = useState('0ms');

  const fetchMembers = async () => {
    setIsLoadingMembers(true);
    setMembersQueryError(null);
    setSupabaseResponse(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.log('[MEMBERS] No Supabase client. Loading offline members for mode:', mode);
        const localMembers = await api.getMembers(activeProfile);
        let filtered = localMembers;
        if (mode === 'Leader & Worker') {
          filtered = filtered.filter(m => m.person_type === 'Leader & Worker');
        } else {
          filtered = filtered.filter(m => m.person_type === 'Member' || !m.person_type);
        }
        
        // Filter by search term
        if (searchTerm.trim()) {
          const s = searchTerm.trim().toLowerCase();
          filtered = filtered.filter(m => 
            (m.names || '').toLowerCase().includes(s) ||
            (m.member_id || '').toLowerCase().includes(s) ||
            (m.phone_number || '').toLowerCase().includes(s)
          );
        }
        
        // Filter by other dropdowns
        if (deptFilter) {
          filtered = filtered.filter(m => m.department_id === deptFilter);
        }
        if (centerFilter) {
          filtered = filtered.filter(m => m.care_center_id === centerFilter);
        }
        if (!isSatelliteAdmin && satFilter) {
          filtered = filtered.filter(m => m.satellite_church_id === satFilter);
        }
        if (genderFilter) {
          filtered = filtered.filter(m => m.gender === genderFilter);
        }
        if (maritalStatusFilter) {
          filtered = filtered.filter(m => m.marital_status === maritalStatusFilter);
        }
        if (statusFilter) {
          filtered = filtered.filter(m => m.status === statusFilter);
        }
        
        setUnfilteredTotal(localMembers.filter(m => mode === 'Leader & Worker' ? m.person_type === 'Leader & Worker' : (m.person_type === 'Member' || !m.person_type)).length);
        setTotalMatchingRecords(filtered.length);
        
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageData = filtered.slice(startIndex, endIndex);
        setMembers(pageData);
        setCurrentRangeStr(`${startIndex} - ${Math.min(endIndex, filtered.length)}`);
        setIsLoadingMembers(false);
        return;
      }

      console.log('--- EXECUTING DIRECT MEMBERS QUERY WITH SERVER-SIDE PAGINATION ---');
      setQueryCount(prev => prev + 1);

      // Load satellite_church_id from profiles table if isSatelliteAdmin is active
      let satelliteChurchId = activeProfile.satellite_church_id;
      if (isSatelliteAdmin) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profData } = await supabase
              .from('profiles')
              .select('satellite_church_id')
              .eq('id', user.id)
              .maybeSingle();
            if (profData?.satellite_church_id) {
              satelliteChurchId = profData.satellite_church_id;
            }
          }
        } catch (e) {
          console.warn("[MEMBERS] Failed to fetch current auth user profile:", e);
        }
      }
      const enforcedSatelliteChurchId = isSatelliteAdmin ? (satelliteChurchId || 'none-assigned') : null;

      // 1. Fetch total unfiltered count
      let unfilteredQuery = supabase
        .from('members')
        .select('*', { count: 'exact', head: true });
      if (isSatelliteAdmin) {
        unfilteredQuery = unfilteredQuery.eq('satellite_church_id', enforcedSatelliteChurchId);
      }
      if (mode === 'Leader & Worker') {
        unfilteredQuery = unfilteredQuery.eq('person_type', 'Leader & Worker');
      } else {
        unfilteredQuery = unfilteredQuery.or('person_type.eq.Member,person_type.is.null');
      }
      const unfilteredRes = await unfilteredQuery;
      if (unfilteredRes.count !== null) {
        setUnfilteredTotal(unfilteredRes.count);
      }

      // 2. Build the paginated, filtered query
      let query = supabase
        .from('members')
        .select('*', { count: 'exact' });

      if (isSatelliteAdmin) {
        query = query.eq('satellite_church_id', enforcedSatelliteChurchId);
      }
      if (mode === 'Leader & Worker') {
        query = query.eq('person_type', 'Leader & Worker');
      } else {
        query = query.or('person_type.eq.Member,person_type.is.null');
      }

      // Apply search term if any (Name, Member ID, Phone Number)
      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`names.ilike.${term},member_id.ilike.${term},phone_number.ilike.${term}`);
      }

      // Apply filters if any
      if (deptFilter) {
        query = query.eq('department_id', deptFilter);
      }
      if (centerFilter) {
        query = query.eq('care_center_id', centerFilter);
      }
      if (!isSatelliteAdmin && satFilter) {
        query = query.eq('satellite_church_id', satFilter);
      }
      if (genderFilter) {
        query = query.eq('gender', genderFilter);
      }
      if (maritalStatusFilter) {
        query = query.eq('marital_status', maritalStatusFilter);
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      // Apply sorting
      query = query.order('names', { ascending: true });

      // Server-side Range Pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize - 1;
      query = query.range(startIndex, endIndex);

      setCurrentRangeStr(`${startIndex} - ${endIndex}`);

      const startTime = performance.now();
      const { data, error, count, status, statusText } = await query;
      const duration = Math.round(performance.now() - startTime);
      setLastQueryDuration(`${duration}ms`);

      // Log returned count, first returned member, and query error (Requirement 6, 11)
      console.log('[MEMBERS REPAIR DIAGNOSTICS]');
      console.log(`- Base total in database: ${unfilteredRes.count}`);
      console.log(`- Filtered total count: ${count}`);
      console.log(`- Returned current page row count: ${data?.length || 0}`);
      console.log(`- Current requested range: ${startIndex} - ${endIndex}`);
      console.log(`- First returned member:`, data?.length ? data[0] : 'None');
      console.log(`- Query error:`, error);

      const respObj = { data, error, count, status, statusText, range: `${startIndex}-${endIndex}` };
      setSupabaseResponse(respObj);

      if (error) {
        const errMsg = error.message || '';
        setMembersQueryError(error.message);
        setMembers([]);
        setTotalMatchingRecords(0);
      } else {
        setMembers(data || []);
        setTotalMatchingRecords(count || 0);
      }
    } catch (err: any) {
      console.warn('[MEMBERS DIRECTORY DIRECT FETCH FAULT]', err);
      const errMsg = err.message || JSON.stringify(err);
      setMembersQueryError(errMsg);
      setMembers([]);
      setTotalMatchingRecords(0);
      setSupabaseResponse({ error: errMsg });
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [
    currentPage,
    searchTerm,
    deptFilter,
    centerFilter,
    satFilter,
    statusFilter,
    genderFilter,
    maritalStatusFilter
  ]);

  // Dynamic Schema State starting with known 16 columns
  const [dynamicSchema, setDynamicSchema] = useState<SchemaField[]>(MEMBER_SCHEMA);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'member_id',
    'names',
    'phone_number',
    'gender',
    'department_id',
    'care_center_id',
    'satellite_church_id',
    'status'
  ]);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  
  // Selected Member Details State (Requirement 6 details window)
  const [selectedDetailsMember, setSelectedDetailsMember] = useState<Member | null>(null);

  // Editing state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMember, setFormMember] = useState<Partial<Member>>({
    names: '',
    email: '',
    phone_number: '',
    address: '',
    gender: 'Male',
    marital_status: 'Single',
    dob: '',
    join_date: '',
    care_center_id: '',
    satellite_church_id: '',
    department_id: '',
    status: 'Active',
    photo_url: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  // CSV Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    valid: number;
    duplicates: number;
    errors: string[];
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Can the current user edit members?
  const canEdit = ['Super Admin', 'Admin', 'super_admin', 'Church Administrator', 'Care Pastor', 'Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile.role as any);
  const isSuperAdmin = activeProfile.role === 'Super Admin' || (activeProfile.role as string) === 'super_admin';
  const canDelete = ['Super Admin', 'Admin', 'super_admin', 'Church Administrator'].includes(activeProfile.role as any);

  // Delete Member Confirm States
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmeeName, setDeleteConfirmeeName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Deletion debug details (Requirement 10)
  const [debugTargetId, setDebugTargetId] = useState<string | null>(null);
  const [debugPayload, setDebugPayload] = useState<any>(null);
  const [debugResponse, setDebugResponse] = useState<any>(null);

  // Auditor Tab State
  const [auditorTab, setAuditorTab] = useState<'queries' | 'rls' | 'deletion'>('queries');

  // Schema Validation & Auto-Discovery Effect (Requirement 8)
  useEffect(() => {
    if (members.length > 0) {
      // Analyze current properties in fetched records
      const firstRow = members[0];
      const actualKeys = Object.keys(firstRow);
      
      const discoveredFields: SchemaField[] = [];
      actualKeys.forEach(k => {
        const alreadyKnown = MEMBER_SCHEMA.some(s => s.key === k);
        if (!alreadyKnown) {
          discoveredFields.push({
            key: k,
            label: k.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            type: 'custom',
            nullable: true,
            required: false
          });
        }
      });
      
      if (discoveredFields.length > 0) {
        console.log('[SCHEMA DISCOVERY] Auto-detected additional live Supabase columns:', discoveredFields);
        setDynamicSchema([...MEMBER_SCHEMA, ...discoveredFields]);
      } else {
        setDynamicSchema(MEMBER_SCHEMA);
      }
    } else {
      setDynamicSchema(MEMBER_SCHEMA);
    }
  }, [members]);

  // Reset pagination to first page when search terms or filter attributes shift
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, centerFilter, satFilter, statusFilter, genderFilter, maritalStatusFilter]);

  // Filters are now executed directly on Supabase server-side!
  const filteredMembers = isSatelliteAdmin && activeProfile.satellite_church_id
    ? members.filter(m => m.satellite_church_id === activeProfile.satellite_church_id)
    : members;
  const totalPages = Math.ceil(totalMatchingRecords / pageSize);
  const paginatedMembers = filteredMembers;

  // Query Logger Compiler
  const getAuditQueries = () => {
    if (!activeProfile) {
      return {
        jsQuery: 'No Authorization Context',
        sqlQuery: 'No Authorization Context',
        rlsRuleApplied: 'Forbidden'
      };
    }

    let jsQuery = `supabase.from('members').select('*', { count: 'exact' })`;
    let sqlQuery = `SELECT * FROM public.members`;
    let rlsRuleApplied = "Full Directory Access (All Rows)";

    const userRole = activeProfile.role;
    if (userRole === 'Care Pastor') {
      jsQuery += `.eq('care_center_id', '${activeProfile.care_center_id || ''}')`;
      sqlQuery += ` WHERE care_center_id = '${activeProfile.care_center_id || ''}'`;
      rlsRuleApplied = `Care Pastor Isolation (Care Center ID: ${activeProfile.care_center_id || 'unassigned'})`;
    } else if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(userRole || '')) {
      jsQuery += `.eq('satellite_church_id', '${activeProfile.satellite_church_id || ''}')`;
      sqlQuery += ` WHERE satellite_church_id = '${activeProfile.satellite_church_id || ''}'`;
      rlsRuleApplied = `Satellite Admin Isolation (Satellite Church ID: ${activeProfile.satellite_church_id || 'unassigned'})`;
    } else if (userRole === 'Department Head') {
      jsQuery += `.eq('department_id', '${activeProfile.department_id || ''}')`;
      sqlQuery += ` WHERE department_id = '${activeProfile.department_id || ''}'`;
      rlsRuleApplied = `Department Head Isolation (Department Unit ID: ${activeProfile.department_id || 'unassigned'})`;
    } else if (userRole === 'Member') {
      jsQuery += `.eq('email', '${activeProfile.email || ''}')`;
      sqlQuery += ` WHERE email = '${activeProfile.email || ''}'`;
      rlsRuleApplied = `Self-Member Record Isolation (Email: ${activeProfile.email || ''})`;
    }

    // Append search & range to JS query representation for high fidelity
    if (searchTerm.trim()) {
      const escapedTerm = searchTerm.trim().replace(/'/g, "''");
      jsQuery += `.or('names.ilike.%${escapedTerm}%,member_id.ilike.%${escapedTerm}%,phone_number.ilike.%${escapedTerm}%')`;
    }
    if (deptFilter) jsQuery += `.eq('department_id', '${deptFilter}')`;
    if (centerFilter) jsQuery += `.eq('care_center_id', '${centerFilter}')`;
    if (satFilter) jsQuery += `.eq('satellite_church_id', '${satFilter}')`;
    if (genderFilter) jsQuery += `.eq('gender', '${genderFilter}')`;
    if (maritalStatusFilter) jsQuery += `.eq('marital_status', '${maritalStatusFilter}')`;
    if (statusFilter) jsQuery += `.eq('status', '${statusFilter}')`;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize - 1;
    jsQuery += `.range(${startIndex}, ${endIndex})`;

    sqlQuery += ` ORDER BY names ASC LIMIT ${pageSize} OFFSET ${startIndex};`;

    return { jsQuery, sqlQuery, rlsRuleApplied };
  };

  // Handle Save (Create/Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMember.names) return;

    const id = formMember.id || 'mem-' + Math.random().toString(36).substr(2, 9);
    const member_id = formMember.member_id || 'DCC-APA-' + Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString();

    // Dynamically build payload targeting all active schema fields (Requirement 6 & 8)
    const fullMemberPayload: any = {
      id,
      member_id,
      created_at: formMember.created_at || dateStr
    };

    dynamicSchema.forEach(field => {
      if (field.type === 'system') return; // Handled as core keys
      const formVal = (formMember as any)[field.key];
      if (formVal !== undefined) {
        fullMemberPayload[field.key] = formVal === '' ? null : formVal;
      } else {
        fullMemberPayload[field.key] = field.nullable ? null : (field.options?.[0] || '');
      }
    });

    if (isSatelliteAdmin && activeProfile.satellite_church_id) {
      fullMemberPayload.satellite_church_id = activeProfile.satellite_church_id;
    }

    await api.saveMember(fullMemberPayload as Member);
    setIsFormOpen(false);
    onRefresh();
  };

  const handleEdit = (member: Member) => {
    setFormMember(member);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleDeleteTrigger = (id: string, name: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmeeName(name);
    setDeleteError(null);
    // Track ID early for diagnostics (Requirement 10)
    setDebugTargetId(id);
    setDebugPayload({ id, names: name, target_table: "members" });
    setDebugResponse(null);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    if (!canDelete) {
      const permErr = "You do not have administrative permission to delete member records.";
      setDeleteError(permErr);
      setDebugResponse({ error: permErr, status: 403 });
      return;
    }
    
    setIsDeleting(true);
    setDeleteError(null);
    
    // Log target member ID and payload to console (Requirement 4)
    console.log(`[DELETION HANDLER STARTED] Initiating permanent deletion sequence:`, {
      member_id: deleteConfirmId,
      payload: { id: deleteConfirmId, name: deleteConfirmeeName }
    });

    try {
      const result = await api.deleteMember(deleteConfirmId);
      
      // Log response to console (Requirement 4)
      console.log(`[DELETION HANDLER SUCCESS] Supabase response received:`, result);
      
      // Update debug panel states (Requirement 10)
      setDebugResponse(result.supabase_response);

      // Success Notification (Requirement 5)
      setDeleteSuccess("Member deleted successfully");
      
      // Close confirmation dialog
      setDeleteConfirmId(null);
      setDeleteConfirmeeName('');
      
      // Automatically refresh the roster list immediately (Requirement 9)
      onRefresh();
      
      // Clear success notification after a delay
      setTimeout(() => setDeleteSuccess(null), 5000);
    } catch (err: any) {
      // Log error details to console (Requirement 4)
      console.error("[DELETION HANDLER FAILURE] Detailed deletion error captured:", {
        member_id: deleteConfirmId,
        error: err
      });

      // Display exact error returned from Supabase (Requirement 5)
      const exactError = err?.message || err?.details || JSON.stringify(err) || "Unknown database error";
      setDeleteError(exactError);

      // Update debug panel response with error (Requirement 10)
      setDebugResponse({
        error: exactError,
        raw_error: err,
        status: err?.status || 500,
        hint: "Check Row Level Security Policies, foreign key dependencies, or network connectivity."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Parsing Engine - Fully Dynamic (Requirement 6 & 8)
  const parseCSVText = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
      setImportSummary({ total: 0, valid: 0, duplicates: 0, errors: ['CSV must contain a header and at least one data row.'] });
      return;
    }

    // Capture header row
    const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim().toLowerCase());
    
    // Check key required columns (names)
    const nameIndex = headers.findIndex(h => h === 'names' || h === 'name' || h.includes('name'));
    if (nameIndex === -1) {
      setImportSummary({ total: 0, valid: 0, duplicates: 0, errors: ['Header missing vital column: "Names" (or "Name").'] });
      return;
    }

    const rows: any[] = [];
    let duplicatesCount = 0;
    const errorLogs: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Basic CSV cell extraction
      const parts = lines[i].split(',').map(cell => cell.replace(/["']/g, '').trim());
      const cellCount = parts.length;

      if (cellCount < headers.length) {
        errorLogs.push(`Row ${i + 1}: Malformed row has too few cells or missing commas.`);
        continue;
      }

      const names = parts[nameIndex];
      if (!names) {
        errorLogs.push(`Row ${i + 1}: Member Name is blank.`);
        continue;
      }

      // Dynamic Duplicate Detection:
      const nameExists = members.some(m => m.names.toLowerCase() === names.toLowerCase());
      const emailIndex = headers.findIndex(h => h === 'email' || h.includes('email'));
      const email = emailIndex !== -1 ? parts[emailIndex] : '';
      const emailExists = email ? members.some(m => m.email?.toLowerCase() === email.toLowerCase()) : false;

      let isDuplicate = false;
      if (nameExists || emailExists) {
        isDuplicate = true;
        duplicatesCount++;
      }

      // Construct draft row starting with required system fields
      const draftRow: any = {
        id: 'mem-csv-' + Math.floor(100000 + Math.random() * 900000),
        member_id: 'DCC-APA-' + Math.floor(1000 + Math.random() * 9000),
        status: 'Active',
        isDuplicate
      };

      // Loop through all properties dynamically to parse values
      dynamicSchema.forEach(field => {
        if (field.type === 'system') return; // Core properties are pre-populated
        
        const cellIndex = headers.findIndex(h => 
          h === field.key.toLowerCase() ||
          h === field.label.toLowerCase() ||
          h.replace(/_/g, '') === field.key.toLowerCase().replace(/_/g, '') ||
          h.includes(field.key.toLowerCase())
        );

        if (cellIndex !== -1 && parts[cellIndex] !== undefined && parts[cellIndex] !== '') {
          const rawVal = parts[cellIndex].trim();
          
          if (field.type === 'relation_dept') {
            const deptObj = departments.find(d => d.department_name.toLowerCase().includes(rawVal.toLowerCase()) || d.id.toLowerCase().includes(rawVal.toLowerCase()));
            draftRow[field.key] = deptObj ? deptObj.id : undefined;
          } else if (field.type === 'relation_cmd') {
            const cmdObj = careCenters.find(c => (c.care_center_name || '').toLowerCase().includes(rawVal.toLowerCase()) || c.cmd_name.toLowerCase().includes(rawVal.toLowerCase()) || c.id.toLowerCase().includes(rawVal.toLowerCase()));
            draftRow[field.key] = cmdObj ? cmdObj.id : undefined;
          } else if (field.type === 'relation_sat') {
            const satObj = satelliteChurches.find(s => s.church_name.toLowerCase().includes(rawVal.toLowerCase()) || s.id.toLowerCase().includes(rawVal.toLowerCase()));
            draftRow[field.key] = satObj ? satObj.id : undefined;
          } else if (field.type === 'select') {
            const cleanOpt = field.options?.find(opt => opt.toLowerCase() === rawVal.toLowerCase()) || field.options?.[0] || 'Active';
            draftRow[field.key] = cleanOpt;
          } else {
            draftRow[field.key] = rawVal;
          }
        } else {
          // Defaults if missing in CSV
          if (field.key === 'names') draftRow.names = names;
          else if (field.key === 'email') draftRow.email = email || `${names.toLowerCase().replace(/\s+/g, '')}@dominioncity.org`;
          else if (field.key === 'phone_number') draftRow.phone_number = '+2348000000000';
          else if (field.key === 'address') draftRow.address = 'Lagos, Nigeria';
          else if (field.key === 'gender') draftRow.gender = 'Male';
          else if (field.key === 'marital_status') draftRow.marital_status = 'Single';
          else if (field.key === 'dob') draftRow.dob = '1995-01-01';
          else if (field.key === 'join_date') draftRow.join_date = new Date().toISOString().split('T')[0];
        }
      });

      rows.push(draftRow);
    }

    setParsedRows(rows);
    setImportSummary({
      total: lines.length - 1,
      valid: rows.filter(r => !r.isDuplicate).length,
      duplicates: duplicatesCount,
      errors: errorLogs
    });
  };

  const loadSampleCSV = () => {
    const sample = `names,email,phone_number,address,gender,marital_status,dob,join_date,department,cmd,satellite
Brother Emmanuel Okafor,emmanuel.ok@gmail.com,+2348039988771,Apapa Wharf,Male,Married,1986-06-15,2025-05-10,Media Unit,Apapa Central CMD,
Sister Chinelo Obi,chinelo@gmail.com,+2348123004455,Surulere Lagos,Female,Single,1995-10-12,2025-06-01,Choir,Surulere Care Center,Dominion City Surulere Satellite
David Alao,david.alao@gmail.com,+2348031122334,12 Marine Rd,Male,Married,1987-04-12,2020-03-05,Media Unit,Apapa Central CMD,`;
    
    setCsvContent(sample);
    parseCSVText(sample);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
        parseCSVText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
        parseCSVText(text);
      };
      reader.readAsText(file);
    }
  };

  const triggerImport = async () => {
    // Import all parsed rows that are NOT duplicates (to keep data secure and prevent double counts)
    const rowsToImport = parsedRows.filter(r => !r.isDuplicate);
    if (rowsToImport.length === 0) return;

    for (const m of rowsToImport) {
      const memberObj: Member = {
        id: m.id,
        member_id: m.member_id,
        names: m.names,
        phone_number: m.phone_number,
        address: m.address,
        gender: m.gender,
        marital_status: m.marital_status,
        dob: m.dob,
        join_date: m.join_date,
        department_id: m.department_id,
        care_center_id: m.care_center_id,
        satellite_church_id: m.satellite_church_id,
        email: m.email,
        status: m.status,
        created_at: new Date().toISOString()
      };
      await api.saveMember(memberObj);
    }

    setImportSummary(null);
    setParsedRows([]);
    setCsvContent('');
    setIsImportOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Upper header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold font-sans text-slate-900" id="directory-mode-title">
              {mode === 'Leader & Worker' ? 'Leaders & Workers Directory' : 'Members Directory'}
            </h1>
            <span className="bg-emerald-100 text-emerald-850 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300" id="members-loaded-badge">
              {mode === 'Leader & Worker' ? 'Leaders Loaded' : 'Members Loaded'}: {members.length}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {mode === 'Leader & Worker'
              ? 'Manage Dominion City Apapa leaders & workers rosters, details, and assignments'
              : 'Manage Dominion City Apapa members rosters, details, and assignments'}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {activeProfile.role === 'Super Admin' && (
              <button
                onClick={() => {
                  setCsvContent('');
                  setParsedRows([]);
                  setImportSummary(null);
                  setIsImportOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition rounded-lg cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Universal Import CSV
              </button>
            )}
            <button
              onClick={() => {
                setFormMember({
                  names: '',
                  email: '',
                  phone_number: '',
                  address: '',
                  gender: 'Male',
                  marital_status: 'Single',
                  dob: '',
                  join_date: '',
                  care_center_id: '',
                  satellite_church_id: '',
                  department_id: '',
                  status: 'Active',
                  person_type: mode,
                  leadership_position: '',
                  ministry_department: '',
                  worker_since: '',
                  leadership_status: 'Active',
                  reporting_pastor: '',
                  service_unit: ''
                });
                setIsEditing(false);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 border border-slate-900 hover:bg-slate-800 transition rounded-lg cursor-pointer bg-clip-border"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register Member
            </button>
          </div>
        )}
      </div>

      {/* Supabase Query Failure Alert Context (Requirement 6) */}
      {isSuperAdmin && membersQueryError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 flex items-start gap-3.5 animate-in fade-in duration-200 shadow-xs" id="members-query-error-display">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-950 uppercase tracking-widest font-mono">SUPABASE LIVE DATABASE TRANSACTION FAULT</h4>
            <p className="text-xs text-rose-700 leading-normal font-semibold">
              The application threw a secure connection error while trying to query the 'members' table directly in Supabase:
            </p>
            <pre className="text-[10.5px] font-mono text-rose-900 bg-rose-100/50 p-2.5 rounded border border-rose-200/65 overflow-x-auto whitespace-pre selection:bg-rose-200 max-h-40 mt-1.5 block">
              {membersQueryError}
            </pre>
            <p className="text-[10px] text-rose-500 font-mono mt-1.5">
              Please check if your active Row Level Security (RLS) POLICIES are blocking the operation, or verify your service key credentials.
            </p>
          </div>
        </div>
      )}

      {/* Real-Time Database Query Auditor Panel */}
      {isSuperAdmin && (
        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 shadow-md space-y-4">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${membersQueryError ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-300">
              Supabase Real-time Query Auditor & RLS Diagnostic
            </h3>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setAuditorTab('queries')}
              className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded transition cursor-pointer ${
                auditorTab === 'queries'
                  ? 'bg-slate-850 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Queries
            </button>
            <button
              type="button"
              onClick={() => setAuditorTab('rls')}
              className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded transition cursor-pointer ${
                auditorTab === 'rls'
                  ? 'bg-slate-[#111827] text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              PostgreSQL RLS Policies
            </button>
            <button
              type="button"
              onClick={() => setAuditorTab('deletion')}
              className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded transition cursor-pointer ${
                auditorTab === 'deletion'
                  ? 'bg-[#111827] text-rose-450 text-rose-400 border border-rose-500/35'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Requirements 4 & 10 diagnostics console"
            >
              Deletion Diagnostics
            </button>
            <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold font-mono ml-1.5 self-center">
              {getSupabaseConfig().isConfigured ? 'CONNECTED TO SUPABASE' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Live System Diagnostics Dashboard Panel (Requirement 8 & 10) */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-3" id="live-diagnostics-dashboard">
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
            System Live Diagnostics (Requirements 8, 9, 10 & 11)
          </span>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* 1. Total Members in Database */}
            <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-md space-y-0.5">
              <span className="text-[8px] font-mono text-slate-505 uppercase tracking-wider block font-semibold">Total DB Members</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-white font-mono leading-none">
                  {unfilteredTotal}
                </span>
                <span className="text-[7.5px] text-slate-400 font-medium">unfiltered</span>
              </div>
            </div>

            {/* 2. Total Members Loaded (Current page size) */}
            <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-md space-y-0.5">
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">Members Loaded</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-emerald-400 font-mono leading-none">
                  {members.length}
                </span>
                <span className="text-[7.5px] text-slate-400 font-medium">on page</span>
              </div>
            </div>

            {/* 3. Filter Search Matches */}
            <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-md space-y-0.5">
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block font-semibold font-semibold">Filter Matches</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-indigo-400 font-mono leading-none">
                  {totalMatchingRecords}
                </span>
                <span className="text-[7.5px] text-slate-400 font-medium">rows</span>
              </div>
            </div>

            {/* 4. Current Page & Total Pages */}
            <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-md space-y-0.5">
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">Page State</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-amber-400 font-mono leading-none">
                  {currentPage}
                </span>
                <span className="text-[8px] text-slate-400 font-medium">/ {totalPages || 1}</span>
              </div>
            </div>

            {/* 5. Query Count */}
            <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-md space-y-0.5">
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block font-semibold font-semibold">Query Count</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-sky-400 font-mono leading-none font-mono">
                  {queryCount}
                </span>
                <span className="text-[7.5px] text-slate-400 font-medium">runs</span>
              </div>
            </div>

            {/* 6. Current Range Requested */}
            <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-md space-y-0.5 col-span-2 md:col-span-1">
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">Current Range</span>
              <div className="flex items-baseline gap-1 truncate">
                <span className="text-[9.5px] font-bold text-teal-400 font-mono leading-none truncate" title={currentRangeStr}>
                  {currentRangeStr}
                </span>
              </div>
            </div>

            {/* 7. Force interactive Refresh button */}
            <div className="flex items-center col-span-2 md:col-span-1">
              <button
                type="button"
                onClick={async () => {
                  onRefresh();
                  await fetchMembers();
                }}
                className="w-full flex items-center justify-center gap-1 px-2.5 py-2 text-[10px] font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-97 transition rounded-md cursor-pointer font-mono shadow-xs border border-emerald-500/20"
                title="Force reload database context"
              >
                <RefreshCw className="w-3 h-3 animate-spin-slow shrink-0" />
                REFRESH
              </button>
            </div>
          </div>

          {/* Executed Query Monitor */}
          <div className="bg-slate-900/60 p-3 rounded border border-slate-850 space-y-1 mt-1">
            <span className="text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">Last executed client pipeline query (select('*'))</span>
            <div className="font-mono text-[10px] text-indigo-300 break-all bg-slate-950 p-2 rounded border border-slate-900 select-all">
              {lastExecutedQuery || `supabase.from('members').select('*')`}
            </div>
          </div>

          {/* Exact Supabase Response Object Log Accordion (Requirement 13) */}
          <div className="bg-slate-900/40 p-3 rounded border border-slate-850 space-y-2 mt-2">
            <button
              type="button"
              onClick={() => setShowResponsePayload(!showResponsePayload)}
              className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider font-mono text-left focus:outline-hidden cursor-pointer"
            >
              <span className="flex items-center gap-2 text-indigo-400">
                <Database className="w-3.5 h-3.5" />
                Exact Supabase Response Object Payload (Requirement 13)
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform text-slate-400 ${showResponsePayload ? 'rotate-180' : ''}`} />
            </button>
            {showResponsePayload && (
              <div className="pt-2 animate-in slide-in-from-top-1 duration-150">
                <pre className="text-[10px] font-mono bg-slate-950 p-3 rounded border border-slate-900 overflow-x-auto text-slate-300 max-h-80 select-all select-text whitespace-pre-wrap leading-normal">
                  {supabaseResponse ? JSON.stringify(supabaseResponse, null, 2) : 'No response payload captured yet. Please execute "FORCE REFRESH NOW" to fetch from live database.'}
                </pre>
              </div>
            )}
          </div>

          <DiagnosticsPanel
            tableName="members"
            rowsInDb={unfilteredTotal}
            rowsLoaded={members.length}
            lastQueryTime={lastQueryDuration}
            lastError={membersQueryError}
            currentUserRole={activeProfile.role}
            currentUserEmail={activeProfile.email}
          />
        </div>

        {auditorTab === 'queries' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-in fade-in duration-200">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 home-code-decor relative overflow-hidden">
                <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                  JavaScript client-side API Query
                </span>
                <code className="text-[10px] md:text-xs font-mono text-emerald-400 break-all block leading-relaxed selection:bg-slate-800 selection:text-white">
                  {getAuditQueries().jsQuery}
                </code>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 home-code-decor relative overflow-hidden">
                <span className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest block">
                  Equivalent SQL statement execution
                </span>
                <code className="text-[10px] md:text-xs font-mono text-amber-400 break-all block leading-relaxed selection:bg-slate-800 selection:text-white">
                  {getAuditQueries().sqlQuery}
                </code>
              </div>
            </div>

            <div className="text-[10.5px] text-slate-400 flex items-start gap-1.5 pt-1.5 border-t border-slate-800/60">
              <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-300 font-semibold">Row Level Security Policy: </strong>
                {getAuditQueries().rlsRuleApplied}
              </span>
            </div>
          </div>
        ) : auditorTab === 'rls' ? (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                  PostgreSQL Access Policies for public.members (SELECT & DELETE)
                </span>
                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/30 font-mono">
                  Super Admin, Church Admin Authorized
                </span>
              </div>
              
              <pre className="text-[10px] md:text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed p-2.5 bg-slate-900/80 rounded border border-slate-800 selection:bg-slate-800 selection:text-white max-h-80 overflow-y-auto">
{`-- 1. Ensure Row Level Security is Enabled on members table
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- 2. Clean old policies first
DROP POLICY IF EXISTS "Workers can select members based on role filters" ON public.members;
DROP POLICY IF EXISTS "Admins and authorized personnel can select members" ON public.members;
DROP POLICY IF EXISTS "Authorize member record deletion" ON public.members;

-- 3. Policy to authorize Super Admin, Church Admin, Senior Pastor to read all records,
-- and other users with matching role scopes or individual records to read matching rows.
CREATE POLICY "Super Admins, Church Admins, Senior Pastors, and staff can select members"
  ON public.members FOR SELECT
  USING (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Senior Pastor', 'Church Administrator', 'Finance Officer') or
    ((select role from public.profiles where id = auth.uid()) = 'Care Pastor' and care_center_id = (select care_center_id from public.profiles where id = auth.uid())) or
    ((select role from public.profiles where id = auth.uid()) = 'Satellite Church Admin' and satellite_church_id = (select satellite_church_id from public.profiles where id = auth.uid())) or
    ((select role from public.profiles where id = auth.uid()) = 'Department Head' and department_id = (select department_id from public.profiles where id = auth.uid())) or
    (email = (select email from public.profiles where id = auth.uid()))
  );

-- 4. Policy to restrict row deletion EXCLUSIVELY to Super Admin and Church Administrator (Requirement 7 & 8)
CREATE POLICY "Authorize member record deletion"
  ON public.members FOR DELETE
  USING (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Church Administrator')
  );`}
              </pre>
            </div>

            <p className="text-[10.5px] text-slate-400 leading-normal">
              💡 <strong className="text-slate-300">Explanation:</strong> This policy prevents malicious or unauthorized delete requests. Only Super Admin and Church Admin users can execute a SQL DELETE. Care pastors, satellite church admins and department heads are blocked.
            </p>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                <span className="text-[10px] font-mono font-bold text-rose-450 text-rose-400 uppercase tracking-widest block">
                  Active Deletion Workflow Debug logs
                </span>
                <span className="text-[9px] bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded font-bold font-mono border border-slate-800">
                  Requirement 10 Debug Panel
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* ID Panel */}
                <div className="space-y-1 bg-slate-900/50 p-3 rounded border border-slate-800">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                    Selected Member ID
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-300">
                    {debugTargetId ? (
                      <span className="text-rose-400 select-all font-mono">{debugTargetId}</span>
                    ) : (
                      <span className="text-slate-500 italic font-mono">No record targeted yet (click Delete in list)</span>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="space-y-1 bg-slate-900/50 p-3 rounded border border-slate-800">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                    Supabase Operation Status
                  </span>
                  <div className="font-mono text-xs font-bold">
                    {debugResponse ? (
                      debugResponse.error ? (
                        <span className="text-rose-500 font-mono">❌ FAILED / BLOCKED</span>
                      ) : (
                        <span className="text-emerald-500 font-mono">✔ COMPLETED SUCCESSFULLY</span>
                      )
                    ) : (
                      <span className="text-slate-500 italic font-mono">Standby</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payload representation */}
              <div className="space-y-1 bg-slate-900/50 p-3 rounded border border-slate-800">
                <span className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest block">
                  Delete Request Payload Details
                </span>
                <pre className="text-[10.5px] font-mono text-amber-400 overflow-x-auto whitespace-pre p-2 bg-slate-950 rounded border border-slate-900 leading-normal max-h-32">
                  {debugPayload ? JSON.stringify(debugPayload, null, 2) : "No request payload compiled yet"}
                </pre>
              </div>

              {/* Live Response Payload */}
              <div className="space-y-1 bg-slate-900/50 p-3 rounded border border-slate-800">
                <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                  Supabase API Response Payload
                </span>
                <pre className="text-[10.5px] font-mono text-emerald-400 overflow-x-auto whitespace-pre p-2 bg-slate-900 rounded border border-slate-800 leading-normal max-h-48 overflow-y-auto">
                  {debugResponse ? JSON.stringify(debugResponse, null, 2) : "Awaiting database transaction feedback"}
                </pre>
              </div>
            </div>
            
            <p className="text-[10.5px] text-slate-400 leading-normal">
              💡 <strong className="text-slate-300">Cascade Constraint Cleanup:</strong> The deletion query automatically clears dependents in <code className="text-rose-400 font-mono">member_attendance</code>, <code className="text-rose-400 font-mono">department_attendance</code>, <code className="text-rose-400 font-mono">followups</code>, and <code className="text-rose-400 font-mono">audit_logs</code> tables to ensure foreign key compliance.
            </p>
          </div>
        )}
      </div>
      )}

      {deleteSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span>{deleteSuccess}</span>
        </div>
      )}

      {deleteError && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
          <AlertOctagon className="w-4.5 h-4.5 text-rose-600 shrink-0" />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Advanced search and filters bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search roster by name, email, or custom Member ID (e.g., DCC-APA-0001)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 text-slate-950 border border-slate-200/80 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-920 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {/* Department filter */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">By Choir/Media Dept</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-2 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg text-xs focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.department_name}</option>
              ))}
            </select>
          </div>

          {/* Care center filter */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">By Care Center Name</label>
            <select
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              className="w-full px-2 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg text-xs focus:outline-none"
            >
              <option value="">All Care Centers</option>
              {careCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.care_center_name || cc.cmd_name}</option>
              ))}
            </select>
          </div>

          {/* Satellite filter */}
          {!isSatelliteAdmin && (
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">By Satellite Church</label>
              <select
                value={satFilter}
                onChange={(e) => setSatFilter(e.target.value)}
                className="w-full px-2 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg text-xs focus:outline-none"
              >
                <option value="">All Satellites</option>
                {satelliteChurches.map((s) => (
                  <option key={s.id} value={s.id}>{s.church_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status filter */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Worker Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg text-xs focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-2 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg text-xs focus:outline-none"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Marital Status Filter */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Marital Status</label>
            <select
              value={maritalStatusFilter}
              onChange={(e) => setMaritalStatusFilter(e.target.value)}
              className="w-full px-2 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg text-xs focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Widowed">Widowed</option>
              <option value="Divorced">Divorced</option>
            </select>
          </div>

          {/* Clear filters Button */}
          <div className="col-span-2 md:col-span-1 flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setDeptFilter('');
                setCenterFilter('');
                setSatFilter('');
                setStatusFilter('');
                setGenderFilter('');
                setMaritalStatusFilter('');
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Column Selector and Export Operations (Requirement 4 & 6) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/60 text-xs shadow-3xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Columns shown:</span>
          <div className="relative">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-md font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer shadow-3xs"
            >
              Configure Columns ({visibleColumns.length})
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            {showColumnDropdown && (
              <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-30 space-y-2 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1">
                  <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">Select Visible Columns</span>
                  <button
                    onClick={() => setVisibleColumns(dynamicSchema.map(s => s.key))}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold"
                  >
                    Select All
                  </button>
                </div>
                {dynamicSchema.map(field => {
                  const isChecked = visibleColumns.includes(field.key);
                  return (
                    <label key={field.key} className="flex items-center gap-2 py-1 hover:bg-slate-50 rounded px-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            if (visibleColumns.length > 1) {
                              setVisibleColumns(visibleColumns.filter(c => c !== field.key));
                            }
                          } else {
                            setVisibleColumns([...visibleColumns, field.key]);
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-750 font-medium text-[11px]">{field.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Custom CSV Spreadsheets Exporter (Requirement 6) */}
        <button
          onClick={async () => {
            try {
              const supabase = getSupabaseClient();
              if (!supabase) {
                alert("Supabase is not configured.");
                return;
              }
              // Fetch entire filtered list for CSV export
              let query = supabase.from('members').select('*');
              
              if (isSatelliteAdmin) {
                let satelliteChurchId = activeProfile.satellite_church_id;
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    const { data: profData } = await supabase
                      .from('profiles')
                      .select('satellite_church_id')
                      .eq('id', user.id)
                      .maybeSingle();
                    if (profData?.satellite_church_id) {
                      satelliteChurchId = profData.satellite_church_id;
                    }
                  }
                } catch (e) {
                  console.warn("[MEMBERS] Failed to fetch current auth user profile for CSV export:", e);
                }
                query = query.eq('satellite_church_id', satelliteChurchId || 'none-assigned');
              } else if (satFilter) {
                query = query.eq('satellite_church_id', satFilter);
              }
              
              if (searchTerm.trim()) {
                const term = `%${searchTerm.trim()}%`;
                query = query.or(`names.ilike.${term},member_id.ilike.${term},phone_number.ilike.${term}`);
              }
              if (deptFilter) query = query.eq('department_id', deptFilter);
              if (centerFilter) query = query.eq('care_center_id', centerFilter);
              if (genderFilter) query = query.eq('gender', genderFilter);
              if (maritalStatusFilter) query = query.eq('marital_status', maritalStatusFilter);
              if (statusFilter) query = query.eq('status', statusFilter);
              
              query = query.order('names', { ascending: true });
              
              const { data, error } = await query;
              if (error) {
                alert("Error fetching records for CSV export: " + error.message);
                return;
              }
              
              const exportItems = data || [];
              const keys = dynamicSchema.map(s => s.key);
              const headers = dynamicSchema.map(s => `"${s.label.replace(/"/g, '""')}"`).join(',');
              const rows = exportItems.map(m => {
                return keys.map(k => {
                  const val = (m as any)[k];
                  if (val === null || val === undefined) return '""';
                  return `"${String(val).replace(/"/g, '""')}"`;
                }).join(',');
              });
              const csvData = [headers, ...rows].join('\n');
              const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", `DCC_Apapa_Workers_Directory_${new Date().toISOString().split('T')[0]}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } catch (err: any) {
              alert("Export failure: " + (err.message || err));
            }
          }}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer transition shadow-3xs flex items-center gap-1 text-xs"
        >
          <Database className="w-3.5 h-3.5" />
          Export All Columns ({totalMatchingRecords} matching rows)
        </button>
      </div>

      {/* Roster list table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {visibleColumns.map(colKey => {
                  const field = dynamicSchema.find(s => s.key === colKey);
                  return (
                    <th key={colKey} className="p-4">
                      {field ? field.label : colKey}
                    </th>
                  );
                })}
                {canEdit && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
              {membersQueryError ? (
                <tr>
                  <td colSpan={visibleColumns.length + (canEdit ? 1 : 0)} className="p-8 text-center text-rose-500 font-extrabold font-mono text-xs bg-rose-50/40 border border-thin border-rose-100/50">
                    ⚠️ SUPABASE SECURE DATABASE RETRIEVAL FAULT: {membersQueryError}
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + (canEdit ? 1 : 0)} className="p-8 text-center text-slate-400 font-semibold font-mono text-xs">
                    {members.length === 0 ? "No members found in Supabase." : "No matching members found under current filters."}
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((m) => {
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      {visibleColumns.map(colKey => {
                        const field = dynamicSchema.find(s => s.key === colKey);
                        const val = (m as any)[colKey];

                        // Special rendering contexts
                        if (colKey === 'names') {
                          return (
                            <td key={colKey} className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 text-white flex items-center justify-center font-bold text-[13px] shrink-0 uppercase">
                                  {m.names ? m.names.split(' ').map(n=>n[0]).slice(0, 2).join('') : 'DC'}
                                </div>
                                <div className="max-w-[200px]">
                                  <span
                                    onClick={() => setSelectedDetailsMember(m)}
                                    className="font-extrabold text-slate-900 block text-[13px] hover:underline cursor-pointer truncate"
                                    title="Click to view full details card"
                                  >
                                    {m.names}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block truncate">{m.email}</span>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        if (colKey === 'department_id') {
                          const dept = departments.find(d => d.id === val);
                          return (
                            <td key={colKey} className="p-4">
                              {dept ? (
                                <span className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md inline-block">
                                  {dept.department_name}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                              )}
                            </td>
                          );
                        }

                        if (colKey === 'care_center_id') {
                          const cmd = careCenters.find(c => c.id === val);
                          return (
                            <td key={colKey} className="p-4">
                              {cmd ? (
                                <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md inline-block">
                                  {cmd.care_center_name || cmd.cmd_name}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                              )}
                            </td>
                          );
                        }

                        if (colKey === 'satellite_church_id') {
                          const sat = satelliteChurches.find(s => s.id === val);
                          return (
                            <td key={colKey} className="p-4">
                              {sat ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold text-amber-805 bg-amber-50 border border-amber-100/50 inline-block">
                                  {sat.church_name.replace('Dominion City ', '')}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                              )}
                            </td>
                          );
                        }

                        if (colKey === 'status') {
                          return (
                            <td key={colKey} className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                val === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                                val === 'Inactive' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  val === 'Active' ? 'bg-emerald-500' :
                                  val === 'Inactive' ? 'bg-slate-500' : 'bg-amber-500'
                                }`}></span>
                                {val || 'Inactive'}
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={colKey} className="p-4 font-medium text-slate-800 max-w-[150px] truncate">
                            {val !== null && val !== undefined && val !== '' ? String(val) : <span className="text-slate-300 italic">-</span>}
                          </td>
                        );
                      })}

                      {/* Action buttons */}
                      {canEdit && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(m)}
                              className="p-1 text-slate-500 hover:text-slate-900 transition rounded"
                              title="Edit Member Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteTrigger(m.id, m.names)}
                                className="p-1 text-rose-500 hover:text-rose-700 transition rounded hover:bg-rose-50 cursor-pointer"
                                title="Delete Member Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Control Bar (Requirements 8, 9 & 10) */}
        {totalMatchingRecords > 0 && !membersQueryError && (
          <div className="bg-slate-50 border-t border-slate-100 px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
            <span className="text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{totalMatchingRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
              <strong className="text-slate-800">{Math.min(currentPage * pageSize, totalMatchingRecords)}</strong> of{' '}
              <strong className="text-indigo-700 font-black">{totalMatchingRecords}</strong> matched workers 
              {' '}(Total <strong className="text-slate-800 font-mono">{unfilteredTotal}</strong> in database, loaded on this page <strong className="text-slate-800 font-mono">{members.length}</strong>)
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Go To Page Input */}
              <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3 mr-1">
                <span className="text-slate-500 font-medium select-none truncate">Go to:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages || 1}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setCurrentPage(Math.min(Math.max(val, 1), totalPages || 1));
                    }
                  }}
                  className="w-14 px-1.5 py-1 text-center bg-white border border-slate-200 rounded-md font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-920"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white font-bold transition disabled:cursor-not-allowed cursor-pointer"
                  title="First Page"
                >
                  &laquo;
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white font-bold transition disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Page"
                >
                  Prev
                </button>
                
                <span className="px-3 py-1.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-black font-mono">
                  Page {currentPage} of {totalPages || 1}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white font-bold transition disabled:cursor-not-allowed cursor-pointer"
                  title="Next Page"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white font-bold transition disabled:cursor-not-allowed cursor-pointer"
                  title="Last Page"
                >
                  &raquo;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* REGISTRATION & EDIT FORM MODAL (Requirement 6 & 8) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  {isEditing
                    ? mode === 'Leader & Worker'
                      ? 'Modify Leader & Worker Details'
                      : 'Modify Member Details'
                    : mode === 'Leader & Worker'
                    ? 'Register New Leader or Worker'
                    : 'Register New Member'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">All active live columns represented dynamically according to Supabase metadata</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dynamicSchema.map(field => {
                  const leadershipFieldKeys = [
                    'leadership_position',
                    'ministry_department',
                    'worker_since',
                    'leadership_status',
                    'reporting_pastor',
                    'service_unit'
                  ];
                  if (leadershipFieldKeys.includes(field.key as string) && formMember.person_type !== 'Leader & Worker') {
                    return null;
                  }

                  if (field.type === 'system') {
                    // System fields shown as styled read-only inputs
                    if (field.key !== 'member_id' && field.key !== 'created_at') return null;
                    return (
                      <div key={field.key} className="col-span-1">
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">{field.label} (System auto-field)</label>
                        <input
                          type="text"
                          disabled
                          value={(formMember as any)[field.key] || 'Generated dynamically on write'}
                          className="w-full px-3 py-2 border border-slate-150 bg-slate-50 rounded-lg text-xs text-slate-400 cursor-not-allowed font-mono"
                        />
                      </div>
                    );
                  }

                  if (field.type === 'select') {
                    return (
                      <div key={field.key} className="col-span-1">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">{field.label} {field.required ? '*' : ''}</label>
                        <select
                          required={field.required}
                          value={(formMember as any)[field.key] || ''}
                          onChange={(e) => setFormMember({ ...formMember, [field.key]: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        >
                          <option value="">Select Option...</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.type === 'relation_dept') {
                    return (
                      <div key={field.key} className="col-span-1">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">{field.label}</label>
                        <select
                          value={(formMember as any)[field.key] || ''}
                          onChange={(e) => setFormMember({ ...formMember, [field.key]: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800"
                        >
                          <option value="">Unassigned</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.department_name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.type === 'relation_cmd') {
                    return (
                      <div key={field.key} className="col-span-1">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">{field.label}</label>
                        <select
                          value={(formMember as any)[field.key] || ''}
                          onChange={(e) => setFormMember({ ...formMember, [field.key]: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 font-medium"
                        >
                          <option value="">Unassigned</option>
                          {careCenters.map(cc => (
                            <option key={cc.id} value={cc.id}>{cc.care_center_name || cc.cmd_name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.type === 'relation_sat') {
                    return (
                      <div key={field.key} className="col-span-1">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">{field.label}</label>
                        <select
                          disabled={isSatelliteAdmin}
                          value={isSatelliteAdmin ? (activeProfile.satellite_church_id || '') : ((formMember as any)[field.key] || '')}
                          onChange={(e) => setFormMember({ ...formMember, [field.key]: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                        >
                          <option value="">Unassigned</option>
                          {satelliteChurches.map(sc => (
                            <option key={sc.id} value={sc.id}>{sc.church_name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  const isWide = field.key === 'names' || field.key === 'address' || field.key === 'photo_url';
                  return (
                    <div key={field.key} className={isWide ? 'col-span-2' : 'col-span-1'}>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">{field.label} {field.required ? '*' : ''}</label>
                      <input
                        type={field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                        required={field.required}
                        value={(formMember as any)[field.key] || ''}
                        onChange={(e) => setFormMember({ ...formMember, [field.key]: e.target.value })}
                        placeholder={`e.g. Enter ${field.label.toLowerCase()}`}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 border border-slate-950 text-white hover:bg-slate-800 rounded-lg transition"
                >
                  Save Worker Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNIVERSAL CSV IMPORT DRAWER / MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-100 shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <FileSpreadsheet className="text-blue-400 w-4.5 h-4.5" />
                  Universal Member CSV Import System
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Highly persistent engine featuring CSV Validation, Duplicate Protection, and Interactive Draft Previews</p>
              </div>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 max-h-[75vh] overflow-y-auto">
              
              {/* Box 1: Drop & Input zone */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">CSV Data Source</span>
                  <button
                    onClick={loadSampleCSV}
                    className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded inline-flex items-center gap-0.5 hover:bg-indigo-100 transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600 animate-spin" /> Load Sample Template
                  </button>
                </div>

                {/* Drag zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragActive ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Drag and Drop church CSV file here</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Or choose a structured spreadsheet from your directory</p>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".csv"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3.5 px-3 py-1 bg-white border border-slate-200 rounded text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
                  >
                    Select File
                  </button>
                </div>

                {/* Paste Area */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Or Copy and Paste CSV Plain Text:</label>
                  <textarea
                    rows={6}
                    value={csvContent}
                    onChange={(e) => {
                      setCsvContent(e.target.value);
                      parseCSVText(e.target.value);
                    }}
                    placeholder="names,email,phone_number,address,gender,marital_status,dob,join_date,department,cmd,satellite&#10;Brother Jude Agwu,jude.agwu@gmail.com,+2348000000000,Apapa Lagos,Male,Married,1990-01-01,2025-06-01,Choir,Apapa Central CMD,"
                    className="w-full px-3 py-2 bg-slate-50 font-mono text-[10px] border border-slate-250 rounded-lg placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Box 2: Live validation results and stats */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-800 block">CSV Verification & Diagnostics</span>

                {importSummary ? (
                  <div className="space-y-3.5">
                    
                    {/* Summary metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400 block font-mono">Found Rows</span>
                        <span className="text-lg font-bold text-slate-800">{importSummary.total}</span>
                      </div>
                      <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100/35 text-center">
                        <span className="text-[10px] text-emerald-800/80 block font-mono">Ready to Save</span>
                        <span className="text-lg font-bold text-emerald-700">{importSummary.valid}</span>
                      </div>
                      <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-100/35 text-center">
                        <span className="text-[10px] text-amber-800/80 block font-mono">Duplicates (Skip)</span>
                        <span className="text-lg font-bold text-amber-700">{importSummary.duplicates}</span>
                      </div>
                    </div>

                    {/* Warnings & Errors */}
                    {importSummary.duplicates > 0 && (
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start gap-2 text-[11px] text-amber-800">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <div>
                          <span className="font-bold">Duplicate Detection Triggered:</span> Checked matching Names and Emails against current {members.length} members. DCCMS will safely skip duplicates list to prevent data clutter.
                        </div>
                      </div>
                    )}

                    {importSummary.errors.length > 0 && (
                      <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 space-y-1">
                        <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> Parsed Row Exceptions:
                        </span>
                        <ul className="list-disc pl-4 text-[10px] text-rose-700/80 space-y-0.5 max-h-24 overflow-y-auto">
                          {importSummary.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                        </ul>
                      </div>
                    )}

                    {importSummary.valid > 0 && (
                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex items-start gap-2 text-[11px] text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                        <div>
                          <span className="font-bold">Validation Succeeded!</span> Ready to write {importSummary.valid} pristine church member profiles directly to your persistent storage.
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs">
                    No spreadsheet loaded. Paste a plain-text block or load sample template to test parser validation rules.
                  </div>
                )}
              </div>

              {/* Dynamic spreadsheet cells interactive preview table at bottom */}
              {parsedRows.length > 0 && (
                <div className="col-span-1 lg:col-span-2 border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Parsed Roster Live Matrix Preview</span>
                    <span>{parsedRows.length} Draft profiles</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto text-[11px]">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-150 border-b border-slate-200 text-slate-500 font-bold">
                          <th className="p-2">Client ID</th>
                          <th className="p-2">Full Name</th>
                          <th className="p-2">Mobile Number</th>
                          <th className="p-2">Address</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Departments & Care Centers</th>
                          <th className="p-2 text-right">Roster Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className={row.isDuplicate ? 'bg-amber-50/50 text-amber-800/80' : 'hover:bg-slate-50'}>
                            <td className="p-2 font-mono text-[9px]">{row.member_id}</td>
                            <td className="p-2 font-bold">{row.names}</td>
                            <td className="p-2">{row.phone_number}</td>
                            <td className="p-2 truncate max-w-[120px]">{row.address}</td>
                            <td className="p-2 truncate max-w-[120px]">{row.email}</td>
                            <td className="p-2">
                              Dept ID: {row.department_id || 'None'} / CMD: {row.care_center_id || 'None'}
                            </td>
                            <td className="p-2 text-right">
                              {row.isDuplicate ? (
                                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[9px] font-bold">DUPLICATE</span>
                              ) : (
                                <span className="bg-emerald-150 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-bold">VALID</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom action panel button */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 max-w-md">
                * By pushing, records propagate immediately to the active environment (Simulated local storage/live. If live Supabase DB variables are active, files push real-time).
              </span>

              <div className="flex gap-2 text-xs font-semibold">
                <button
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={triggerImport}
                  disabled={!parsedRows.some(r => !r.isDuplicate)}
                  className="px-4 py-2 bg-indigo-700/90 border border-indigo-700 text-white rounded-lg hover:bg-indigo-700/100 disabled:bg-slate-200 disabled:border-slate-200 disabled:text-slate-400 cursor-pointer flex items-center gap-1.5"
                >
                  Confirm Import Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG MODAL (Requirements 2 & 10) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header / Caution Accent */}
            <div className="p-5 bg-rose-50 border-b border-rose-100 text-rose-800 flex items-center gap-2.5">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-rose-900 font-sans">Delete Member</h3>
                <p className="text-[10px] text-rose-700 font-medium">This is a permanent database write operation</p>
              </div>
            </div>

            {/* Message Body */}
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                Are you sure you want to permanently delete this member?
              </p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider">Member target profile</span>
                <span className="text-xs font-bold text-slate-800 block">{deleteConfirmeeName || "Unspecified name"}</span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-normal">
                Executing deletion will clear dependency records inside <code className="text-[10px] font-mono text-rose-500 font-bold bg-rose-50 px-1 rounded">member_attendance</code>, <code className="text-[10px] font-mono text-rose-500 font-bold bg-rose-50 px-1 rounded">department_attendance</code>, <code className="text-[10px] font-mono text-rose-500 font-bold bg-rose-50 px-1 rounded">followups</code>, and <code className="text-[10px] font-mono text-rose-500 font-bold bg-rose-50 px-1 rounded">audit_logs</code> tables to fulfill PostgreSQL schema integrity rules.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmId(null);
                  setDeleteConfirmeeName('');
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition rounded-lg cursor-pointer disabled:opacity-50 font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition rounded-lg cursor-pointer disabled:opacity-50 shadow-xs active:scale-98 font-sans"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER DETAILS MODAL CARD (Requirement 6 - Details view) */}
      {selectedDetailsMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Worker Profile Context Card</h3>
                <span className="text-[10px] font-mono text-slate-400 mt-0.5">Live database record view</span>
              </div>
              <button onClick={() => setSelectedDetailsMember(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Hero section */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-900 text-white border border-slate-800 flex items-center justify-center font-bold text-lg uppercase shadow-md select-none">
                {selectedDetailsMember.names ? selectedDetailsMember.names.split(' ').map(n=>n[0]).slice(0, 2).join('') : 'DC'}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900 block leading-tight">{selectedDetailsMember.names}</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono bg-slate-205 bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-bold">ID: {selectedDetailsMember.member_id}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    selectedDetailsMember.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedDetailsMember.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            {/* Detail Grid */}
            <div className="p-5 grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto">
              {dynamicSchema
                .filter(field => field.key !== 'names' && field.key !== 'member_id' && field.key !== 'status')
                .map(field => {
                  let cellVal = (selectedDetailsMember as any)[field.key];
                  
                  if (field.type === 'relation_dept') {
                    const deptObj = departments.find(d => d.id === cellVal);
                    cellVal = deptObj ? deptObj.department_name : 'No Department Assignment';
                  } else if (field.type === 'relation_cmd') {
                    const cmdObj = careCenters.find(c => c.id === cellVal);
                    cellVal = cmdObj ? (cmdObj.care_center_name || cmdObj.cmd_name) : 'No Care Center assignment';
                  } else if (field.type === 'relation_sat') {
                    const satObj = satelliteChurches.find(s => s.id === cellVal);
                    cellVal = satObj ? satObj.church_name : 'No Satellite assignment';
                  }

                  return (
                    <div key={field.key} className="col-span-1 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{field.label}</span>
                      <span className="text-xs font-semibold text-slate-800 block break-words">
                        {cellVal !== null && cellVal !== undefined && cellVal !== '' ? String(cellVal) : <span className="text-slate-300 italic font-mono">-</span>}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Footer Close */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedDetailsMember(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
