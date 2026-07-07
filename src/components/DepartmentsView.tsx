import React, { useState, useMemo } from 'react';
import { Department, Member, Profile } from '../types';
import { api } from '../supabaseClient';
import { 
  Building, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Users, 
  Calendar, 
  ChevronRight,
  ShieldAlert,
  Download,
  Upload
} from 'lucide-react';
import DiagnosticsPanel from './DiagnosticsPanel';

interface DepartmentsViewProps {
  activeProfile: Profile;
  departments: Department[];
  members: Member[];
  onRefresh: () => void;
}

export default function DepartmentsView({
  activeProfile,
  departments,
  members,
  onRefresh
}: DepartmentsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Modal / Form state
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formName, setFormName] = useState('');
  const [formLeaderId, setFormLeaderId] = useState('');
  const [formAssistantLeaderId, setFormAssistantLeaderId] = useState('');
  
  // CSV Import State
  const [showImport, setShowImport] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Error and Loading states
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permissions
  const isAdminOrSuper = ['Super Admin', 'Admin', 'Church Administrator'].includes(activeProfile?.role || '');

  // Filter and sort departments
  const processedDepartments = useMemo(() => {
    let result = [...departments];

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(d => 
        d.department_name.toLowerCase().includes(term) ||
        d.id.toLowerCase().includes(term) ||
        (d.leader_id && d.leader_id.toLowerCase().includes(term)) ||
        (d.assistant_leader_id && d.assistant_leader_id.toLowerCase().includes(term))
      );
    }

    result.sort((a, b) => {
      let valA = sortBy === 'name' ? a.department_name : a.created_at || '';
      let valB = sortBy === 'name' ? b.department_name : b.created_at || '';

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [departments, searchTerm, sortBy, sortOrder]);

  const handleOpenCreateForm = () => {
    setEditingDept(null);
    setFormName('');
    setFormLeaderId('');
    setFormAssistantLeaderId('');
    setDbError(null);
    setShowForm(true);
  };

  const handleOpenEditForm = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.department_name);
    setFormLeaderId(dept.leader_id || '');
    setFormAssistantLeaderId(dept.assistant_leader_id || '');
    setDbError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setDbError('Department Name is required.');
      return;
    }

    setIsSubmitting(true);
    setDbError(null);

    const payload: Department = {
      id: editingDept?.id || 'dept-' + Math.floor(100000 + Math.random() * 900000),
      department_name: formName.trim(),
      leader_id: formLeaderId.trim() || undefined,
      assistant_leader_id: formAssistantLeaderId.trim() || undefined,
      created_at: editingDept?.created_at || new Date().toISOString()
    };

    try {
      await api.saveDepartment(payload);
      setShowForm(false);
      onRefresh();
    } catch (err: any) {
      console.error('[DATABASE SUBMIT BLOCK] Department write rejected:', err);
      setDbError(err?.message || 'Handshake failed: Database rejected the department payload.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this department? This operation is irreversible and will clear associations.')) return;
    
    setDbError(null);
    try {
      await api.deleteDepartment(id);
      onRefresh();
    } catch (err: any) {
      console.error('[DATABASE TRANSACTION BLOCK] Department delete rejected:', err);
      setDbError(err?.message || 'Database execution failed while attempting to delete department.');
    }
  };

  // CSV Import handler
  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(null);

    if (!importCsvText.trim()) {
      setImportError('Please enter some CSV data.');
      return;
    }

    const lines = importCsvText.split('\n');
    if (lines.length < 2) {
      setImportError('CSV should contain at least a header row and one data row.');
      return;
    }

    // Header validation
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIndex = header.indexOf('name');
    const leaderIndex = header.indexOf('leader');

    if (nameIndex === -1) {
      setImportError('Required column "name" not found in the CSV header.');
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    try {
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Naive comma parsing (doesn't handle commas in quotes but adequate for simple imports)
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const name = cols[nameIndex];
        const leaderVal = leaderIndex !== -1 ? cols[leaderIndex] : '';

        if (!name) continue;

        const payload: Department = {
          id: 'dept-' + Math.floor(100000 + Math.random() * 900000),
          department_name: name,
          leader_id: leaderVal || undefined,
          created_at: new Date().toISOString()
        };

        await api.saveDepartment(payload);
        successCount++;
      }

      setImportSuccess(`Successfully registered ${successCount} departments into the Supabase public schema!`);
      setImportCsvText('');
      setTimeout(() => setShowImport(false), 2000);
      onRefresh();
    } catch (err: any) {
      console.error('[CSV IMPORT RUNTIME ERROR]', err);
      setImportError(err?.message || 'Database synchronization broke down mid-transaction during import.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export departments to CSV format
  const exportCSV = () => {
    let csvContent = 'id,department_name,leader_id,assistant_leader_id,created_at\n';
    departments.forEach(d => {
      csvContent += `"${d.id}","${d.department_name}","${d.leader_id || ''}","${d.assistant_leader_id || ''}","${d.created_at || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'DCC_Apapa_Church_Departments.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Upper Branded Heading Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            Church Departments Registry
          </h1>
          <p className="text-xs text-slate-400">Establish and coordinate internal operational teams, assigns leaders, and monitors database registers</p>
        </div>

        {/* Top-Level Controls */}
        {isAdminOrSuper && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-250 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </button>
            <button
              onClick={handleOpenCreateForm}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Department
            </button>
          </div>
        )}
      </div>

      {/* Database Error Banner */}
      {dbError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 text-xs leading-normal">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">SUPABASE SCHEMATIC INTERACTION ERROR:</span>
            <p className="font-mono mt-1 bg-white p-2.5 rounded border border-rose-100 select-all">{dbError}</p>
          </div>
        </div>
      )}

      {/* CSV Import Modal Panel */}
      {showImport && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 animate-in slide-in-from-top duration-250">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-800">Batch Upload via CSV Schema</h3>
            <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <form onSubmit={handleImportCSV} className="space-y-4">
            <div className="text-[10px] text-slate-500 font-mono space-y-1 bg-white p-3 rounded-lg border border-slate-150">
              <span className="font-bold text-slate-700 block">CSV File Format Standard:</span>
              <p>Header line: <code className="text-indigo-600">name, leader</code></p>
              <p>Example:</p>
              <p className="bg-slate-50 p-1 rounded">Choir, Brother Jude Agwu<br />Ushering, Sister Mary Ekong</p>
            </div>

            <textarea
              required
              rows={4}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="name, leader&#10;Media Department, Brother Michael Jones&#10;Greeters Squad, Sister Deborah Smith"
              className="w-full p-3 border border-slate-250 rounded-lg text-xs font-mono"
            />

            {importError && (
              <p className="text-[11px] font-bold text-rose-600 bg-rose-50 p-2 rounded">{importError}</p>
            )}
            {importSuccess && (
              <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded">{importSuccess}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImport(false)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-250 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Importing...' : 'Execute Import'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Edit Modal Panel */}
      {showForm && (
        <div className="bg-white border border-slate-250 rounded-xl p-5 space-y-4 shadow-md animate-in zoom-in-95 duration-150">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-900">
              {editingDept ? `Modify Department: ${editingDept.department_name}` : 'Establish New Department Profile'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Technical Crew"
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg font-semibold"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Select Leader (Full Name / Email)</label>
                <select
                  value={formLeaderId}
                  onChange={(e) => setFormLeaderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white font-semibold"
                >
                  <option value="">-- No designated leader assigned --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.names}>{m.names} ({m.email || 'No email'})</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Select Assistant Leader</label>
                <select
                  value={formAssistantLeaderId}
                  onChange={(e) => setFormAssistantLeaderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-white font-semibold"
                >
                  <option value="">-- No designated assistant assigned --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.names}>{m.names}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Commit Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search, Filter, & Export Utilities */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search departments by name, code, leaders..."
            className="w-full bg-white border border-slate-200 pl-9 pr-4 py-2 text-xs rounded-lg font-medium shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg bg-white font-bold text-slate-600"
          >
            <option value="name">Sort by: Name</option>
            <option value="created_at">Sort by: Date Established</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg bg-white font-bold text-slate-600 cursor-pointer"
          >
            Order: {sortOrder.toUpperCase()}
          </button>

          <button
            onClick={exportCSV}
            disabled={departments.length === 0}
            className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg bg-white font-bold text-emerald-700 hover:bg-emerald-50 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Export
          </button>
        </div>
      </div>

      {/* Main Department List Grid */}
      {processedDepartments.length === 0 ? (
        <div className="text-center p-16 bg-white border border-slate-100 rounded-2xl shadow-2xs text-slate-500 font-semibold font-mono text-xs">
          🚫 No departments found matching search or filters. Setup departments to register workers!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedDepartments.map((dept) => {
            const countAssociated = members.filter(m => m.department_id === dept.id).length;
            const leadersCount = members.filter(m => m.department_id === dept.id && m.person_type === 'Leader & Worker').length;

            return (
              <div 
                key={dept.id} 
                className="bg-white rounded-xl border border-slate-200/60 p-5 hover:shadow-md transition duration-150 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-mono font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        ID: {dept.id}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-[14px]">{dept.department_name}</h3>
                    </div>
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                      <Building className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span><b>Leader:</b> {dept.leader_id || 'Not Assigned'}</span>
                    </div>
                    {dept.assistant_leader_id && (
                      <div className="flex items-center gap-1.5 pl-5">
                        <span className="text-[10px] text-slate-400 font-bold">Asst:</span>
                        <span>{dept.assistant_leader_id}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span><b>Established:</b> {dept.created_at ? new Date(dept.created_at).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold font-mono text-[10px] bg-slate-50 px-2 py-0.5 rounded text-slate-500">
                    {countAssociated} Workers / {leadersCount} Leaders
                  </span>
                  
                  {isAdminOrSuper && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditForm(dept)}
                        className="p-1 px-2.5 rounded hover:bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center gap-1 border border-slate-200 cursor-pointer"
                        title="Edit Department Info"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="p-1 px-1.5 rounded hover:bg-rose-50 text-rose-600 border border-transparent hover:border-rose-100 cursor-pointer"
                        title="Delete Department"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeProfile?.role === 'Super Admin' && (
        <DiagnosticsPanel
          tableName="departments"
          rowsInDb={departments.length}
          rowsLoaded={departments.length}
          lastQueryTime="14ms"
          lastError={null}
          currentUserRole={activeProfile.role}
          currentUserEmail={activeProfile.email}
        />
      )}
    </div>
  );
}
