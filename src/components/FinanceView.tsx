import React, { useState, useEffect } from 'react';
import { 
  api 
} from '../supabaseClient';
import { 
  Profile, 
  SatelliteChurch, 
  CareCenter, 
  Finance 
} from '../types';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  Activity, 
  Trash2, 
  Plus, 
  Filter, 
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface FinanceViewProps {
  activeProfile: Profile;
  satelliteChurches: SatelliteChurch[];
  careCenters: CareCenter[];
  onRefresh: () => void;
}

export default function FinanceView({ activeProfile, satelliteChurches, careCenters, onRefresh }: FinanceViewProps) {
  const [finances, setFinances] = useState<Finance[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters state
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // New Transaction Form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    type: 'Income' as 'Income' | 'Expense',
    category_id: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    recorded_by: activeProfile?.full_name || '',
    satellite_church_id: activeProfile?.satellite_church_id || '',
    care_center_id: ''
  });

  const isSatelliteAdmin = ['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile.role);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [fetchedFinances, fetchedCategories] = await Promise.all([
        api.getFinances(activeProfile),
        api.getFinanceCategories()
      ]);
      setFinances(fetchedFinances);
      setCategories(fetchedCategories);

      // Default the first category
      const filteredCats = fetchedCategories.filter((c: any) => c.type === formData.type);
      if (filteredCats.length > 0) {
        setFormData(prev => ({ ...prev, category_id: filteredCats[0].id }));
      }
    } catch (err: any) {
      console.error('[FINANCE LOAD ERROR]', err);
      setErrorMsg(err?.message || 'Failed to retrieve ledger data. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProfile]);

  // Adjust default category when form type changes
  useEffect(() => {
    const filteredCats = categories.filter((c: any) => c.type === formData.type);
    if (filteredCats.length > 0) {
      setFormData(prev => ({ ...prev, category_id: filteredCats[0].id }));
    }
  }, [formData.type, categories]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please specify a positive numeric amount.');
      return;
    }

    if (!formData.category_id) {
      setErrorMsg('Please choose a valid category.');
      return;
    }

    try {
      setSubmitting(true);
      const uuid = 'fin-' + Math.random().toString(36).substr(2, 9);
      const satelliteId = isSatelliteAdmin ? (activeProfile.satellite_church_id || undefined) : (formData.satellite_church_id || undefined);

      const record: Finance = {
        id: uuid,
        type: formData.type,
        category_id: formData.category_id,
        amount: parsedAmount,
        transaction_date: formData.transaction_date,
        description: formData.description || undefined,
        recorded_by: formData.recorded_by || undefined,
        satellite_church_id: satelliteId,
        care_center_id: formData.care_center_id || undefined,
        created_at: new Date().toISOString()
      };

      await api.saveFinance(record);
      setSuccessMsg('Transaction entry appended to the ledger successfully!');
      setShowAddForm(false);
      
      // Reset non-static fields
      setFormData(prev => ({
        ...prev,
        amount: '',
        description: ''
      }));

      onRefresh();
      loadData();
    } catch (err: any) {
      console.error('[FINANCE SAVE FAILURE]', err);
      setErrorMsg(err?.message || 'Failed to authorize transaction save.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to remove this transaction record?')) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setLoading(true);
      await api.deleteFinance(id);
      setSuccessMsg('Ledger line discarded successfully.');
      onRefresh();
      loadData();
    } catch (err: any) {
      console.error('[FINANCE REMOVE FAILURE]', err);
      setErrorMsg(err?.message || 'Access denied on record deletion.');
      setLoading(false);
    }
  };

  // Helper selectors
  const getBranchName = (id?: string) => {
    if (!id) return 'General/Apapa HQ';
    const b = satelliteChurches.find(s => s.id === id);
    return b ? b.church_name : id;
  };

  const getCareCenterName = (id?: string) => {
    if (!id) return '';
    const c = careCenters.find(cc => cc.id === id);
    return c ? `(${c.care_center_name || c.cmd_name})` : '';
  };

  const getCategoryName = (id?: string) => {
    if (!id) return 'Miscellaneous';
    const c = categories.find(cat => cat.id === id);
    return c ? c.category_name : id;
  };

  // isolation parameters
  const assignedBranchId = activeProfile?.satellite_church_id;
  const targetBranchName = assignedBranchId ? getBranchName(assignedBranchId) : '';

  // Filter computation
  const filteredFinances = finances.filter(f => {
    // 1. Double filter to preserve strict isolation for Satellite Church Admins
    if (isSatelliteAdmin && f.satellite_church_id !== assignedBranchId) {
      return false;
    }

    // 2. Form filters
    if (typeFilter !== 'All' && f.type !== typeFilter) {
      return false;
    }
    if (branchFilter !== 'All' && (f.satellite_church_id || '') !== (branchFilter === 'HQ' ? '' : branchFilter)) {
      return false;
    }
    if (categoryFilter !== 'All' && f.category_id !== categoryFilter) {
      return false;
    }

    return true;
  });

  // KPI aggregates
  const totalIncome = filteredFinances
    .filter(f => f.type === 'Income')
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const totalExpense = filteredFinances
    .filter(f => f.type === 'Expense')
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const netBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-6" id="finance-ledger-container">
      {/* Header and trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-500" />
            Financial Ledger & Branch Treasury
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isSatelliteAdmin ? (
              <span>Strict isolation active: filtering transaction journals exclusively belonging to <strong>{targetBranchName}</strong>.</span>
            ) : (
              <span>Super Admin general ledger console. Accessing consolidated records across all satellite branches.</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-150 rounded-lg transition-all"
            title="Reload Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-slate-950 font-bold text-white px-4 py-2 text-xs rounded-lg shadow-sm hover:bg-slate-800 transition-all"
            id="btn-add-finance-tx"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? 'Discard Form' : 'Record Transaction'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Recording Form container */}
      {showAddForm && (
        <form onSubmit={handleAddTransaction} className="bg-white border border-slate-150 rounded-xl shadow-sm p-6 space-y-4" id="ledger-entry-form">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              New Entry Builder
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
              Audited Entry
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Entry Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Transaction Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-indigo-500"
              >
                <option value="Income">Income (+)</option>
                <option value="Expense">Expense (-)</option>
              </select>
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Category Code</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-indigo-500"
                required
              >
                {categories
                  .filter(cat => cat.type === formData.type)
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                  ))
                }
                {categories.filter(cat => cat.type === formData.type).length === 0 && (
                  <option value="">No categories available</option>
                )}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Amount (₦)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="150000"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-indigo-500 font-mono font-bold"
                required
              />
            </div>

            {/* Transaction Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Date</label>
              <input
                type="date"
                name="transaction_date"
                value={formData.transaction_date}
                onChange={handleInputChange}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Satellite Church Target context */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Target Satellite Branch</label>
              <select
                name="satellite_church_id"
                value={isSatelliteAdmin ? (activeProfile.satellite_church_id || '') : formData.satellite_church_id}
                onChange={handleInputChange}
                disabled={isSatelliteAdmin}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">General Headquarters / Apapa</option>
                {satelliteChurches.map(c => (
                  <option key={c.id} value={c.id}>{c.church_name}</option>
                ))}
              </select>
            </div>

            {/* Optional Associated Care Center */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Linked Care Center (Optional)</label>
              <select
                name="care_center_id"
                value={formData.care_center_id}
                onChange={handleInputChange}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-indigo-500"
              >
                <option value="">None</option>
                {careCenters
                  .filter(cc => !isSatelliteAdmin || (cc as any).satellite_church_id === assignedBranchId)
                  .map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.care_center_name || cc.cmd_name}</option>
                  ))
                }
              </select>
            </div>

            {/* Recorded by */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Recorded By (Officer)</label>
              <input
                type="text"
                name="recorded_by"
                value={formData.recorded_by}
                onChange={handleInputChange}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-indigo-500"
                required
              />
            </div>

            {/* Description comment */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Description / Memo</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Audit description details"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-600 bg-slate-100 hover:bg-slate-200 text-xs font-bold px-4 py-2 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-all"
            >
              {submitting ? 'Recording...' : 'Write Entry'}
            </button>
          </div>
        </form>
      )}

      {/* Financial Analytics Summary Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total Inflow Income Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Branch Income</span>
            <h2 className="text-2xl font-black text-emerald-600 font-mono">
              ₦{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <span className="text-emerald-500">●</span> Evaluated from active records
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Outflow Expense Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Outflows & Exp</span>
            <h2 className="text-2xl font-black text-rose-600 font-mono">
              ₦{totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <span className="text-rose-400">●</span> Capital outlay & facility logistics
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Net Treasury Balance Card */}
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-850 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net Treasury Reserve</span>
            <h2 className={`text-2xl font-black font-mono ${netBalance >= 0 ? 'text-amber-400' : 'text-rose-450 text-rose-400'}`}>
              ₦{netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <span className={netBalance >= 0 ? 'text-amber-450 text-amber-500' : 'text-rose-450 text-rose-500'}>●</span> Cash flow net balance
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center border border-slate-700 shadow-xs">
            <Activity className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Filters section */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">Ledger Filters:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 grow max-w-3xl">
          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700"
            >
              <option value="All">All Transactions ({filteredFinances.length})</option>
              <option value="Income">Income Inflows only</option>
              <option value="Expense">Expenses only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.category_name} ({cat.type})</option>
              ))}
            </select>
          </div>

          {/* Branch Filter (Only for Super Admins) */}
          <div>
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              disabled={isSatelliteAdmin}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {isSatelliteAdmin ? (
                <option value={assignedBranchId || ''}>{targetBranchName}</option>
              ) : (
                <>
                  <option value="All">All Branches</option>
                  <option value="HQ">General HQ / Apapa</option>
                  {satelliteChurches.map(sh => (
                    <option key={sh.id} value={sh.id}>{sh.church_name}</option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Grid Ledger details */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2 uppercase tracking-wide">
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            Transaction journal log ({filteredFinances.length} lines loaded)
          </h3>
          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-full">
            ₦{filteredFinances.reduce((s, f) => s + Number(f.amount), 0).toLocaleString()} volume
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-450 text-slate-500 font-medium">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
              Compiling ledger balances...
            </div>
          ) : filteredFinances.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Briefcase className="w-10 h-10 text-slate-200 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">This ledger sheet is empty.</p>
              <p className="text-[11px] text-slate-400">Match active parameters above or compose a custom entry to build data.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" id="finance-ledger-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest font-black">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Branch Source</th>
                  <th className="px-5 py-3">Recorded By</th>
                  <th className="px-5 py-3">Memo / Description</th>
                  <th className="px-5 py-3 text-right">Amount (₦)</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredFinances.map(f => {
                  const isIncome = f.type === 'Income';
                  return (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                        {f.transaction_date}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2 py-1.5 rounded-md text-[10px] font-mono font-bold ${
                          isIncome 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {isIncome ? 'INFLOW' : 'OFFSET'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        {getCategoryName(f.category_id)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{getBranchName(f.satellite_church_id)}</span>
                          {f.care_center_id && (
                            <span className="text-[10px] text-indigo-500 font-mono">{getCareCenterName(f.care_center_id)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {f.recorded_by || 'Uncredited'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 italic max-w-xs truncate" title={f.description}>
                        {f.description || '—'}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-mono font-bold text-sm whitespace-nowrap ${
                        isIncome ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {isIncome ? '+' : '-'} ₦{Number(f.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteTransaction(f.id)}
                          className="p-1 px-2 text-rose-500 hover:bg-rose-50 rounded transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="Purge transaction record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Purge</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
