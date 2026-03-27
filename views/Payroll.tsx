'use client';

import React, { useState, useEffect } from 'react';

const Payroll = () => {
    const [periods, setPeriods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Night Differential specific state
    const [ndPercentage, setNdPercentage] = useState(10);
    const [ndStartTime, setNdStartTime] = useState("22:00");
    const [ndEndTime, setNdEndTime] = useState("06:00");
    const [ndActive, setNdActive] = useState(true);

    // New Period Modal state
    const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
    const [newPeriod, setNewPeriod] = useState({
        name: '',
        startDate: '',
        endDate: ''
    });

    // Results Modal state
    const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);
    const [selectedResult, setSelectedResult] = useState<any | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [loadingResults, setLoadingResults] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchPeriods();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/payroll/settings');
            const data = await res.json();
            const nd = data.find((s: any) => s.name === 'Night Differential');
            if (nd) {
                setNdPercentage(nd.percentage);
                setNdStartTime(nd.startTime);
                setNdEndTime(nd.endTime);
                setNdActive(nd.isActive);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchPeriods = async () => {
        try {
            const res = await fetch('/api/payroll/periods');
            const data = await res.json();
            setPeriods(data);
        } catch (error) {
            console.error('Error fetching periods:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveND = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/payroll/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Night Differential',
                    percentage: ndPercentage,
                    startTime: ndStartTime,
                    endTime: ndEndTime,
                    isActive: ndActive
                })
            });

            if (res.ok) {
                alert('Night Differential rules updated successfully');
                fetchSettings();
            }
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleCreatePeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/payroll/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPeriod)
            });

            if (res.ok) {
                setIsPeriodModalOpen(false);
                setNewPeriod({ name: '', startDate: '', endDate: '' });
                fetchPeriods();
            }
        } catch (error) {
            console.error('Error creating period:', error);
        }
    };

    const handleProcessPayroll = async (id: string) => {
        setProcessingId(id);
        try {
            const res = await fetch(`/api/payroll/process/${id}`, { method: 'POST' });
            if (res.ok) {
                fetchPeriods();
                // If the results modal is open for the same period, auto-refresh it
                if (selectedPeriod?.id === id) {
                    setLoadingResults(true);
                    try {
                        const updated = await fetch(`/api/payroll/periods/${id}/results`);
                        const data = await updated.json();
                        setResults(data);
                    } finally {
                        setLoadingResults(false);
                    }
                }
            } else {
                alert('Failed to process payroll');
            }
        } catch (error) {
            console.error('Error processing payroll:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleViewResults = async (period: any) => {
        setSelectedPeriod(period);
        setLoadingResults(true);
        try {
            const res = await fetch(`/api/payroll/periods/${period.id}/results`);
            const data = await res.json();
            setResults(data);
        } catch (error) {
            console.error('Error fetching results:', error);
        } finally {
            setLoadingResults(false);
        }
    };

    const handleDeletePeriod = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete the payroll period "${name}"? This will permanently remove all associated audit records.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/payroll/periods/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('Payroll period deleted successfully');
                fetchPeriods();
            } else {
                alert('Failed to delete payroll period');
            }
        } catch (error) {
            console.error('Error deleting period:', error);
            alert('An error occurred while deleting the period');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">Payroll Hub</h1>
                    <p className="text-slate-500 font-medium">Automated calculations for base pay, night differential, and overtime.</p>
                </div>
                <button 
                    onClick={() => setIsPeriodModalOpen(true)}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                >
                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    </div>
                    New Period
                </button>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Payroll Periods Table */}
                <div className="xl:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Active Periods</h2>
                        <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {periods.length} Found
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Period Details</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Date Range</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Operations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {periods.map((period) => (
                                    <tr key={period.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="font-black text-slate-800 text-lg leading-none mb-1">{period.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono tracking-tighter">REF: {period.id.slice(-8).toUpperCase()}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                                <div className="text-sm font-bold text-slate-600">
                                                    {new Date(period.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})} - {new Date(period.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm border ${
                                                period.status === 'Completed' 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                                {period.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {period.status === 'Completed' ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleViewResults(period)}
                                                            className="px-6 py-2.5 bg-white border-2 border-slate-100 text-slate-600 rounded-xl text-xs font-black hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                                                        >
                                                            View Results
                                                        </button>
                                                        <button 
                                                            onClick={() => handleProcessPayroll(period.id)}
                                                            disabled={processingId === period.id}
                                                            className="w-10 h-10 bg-white border-2 border-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:border-amber-400 hover:text-amber-500 transition-all shadow-sm disabled:opacity-50"
                                                            title="Rerun Payroll"
                                                        >
                                                            {processingId === period.id 
                                                                ? <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                                                                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                            }
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleProcessPayroll(period.id)}
                                                        disabled={processingId === period.id}
                                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {processingId === period.id ? 'Processing...' : 'Run Payroll'}
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleDeletePeriod(period.id, period.name)}
                                                    className="w-10 h-10 bg-white border-2 border-slate-100 text-slate-300 rounded-xl flex items-center justify-center hover:border-rose-500 hover:text-rose-500 transition-all shadow-sm"
                                                    title="Delete Period"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {periods.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200">
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                </div>
                                                <div className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active payroll cycles found</div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Night Differential Config */}
                <div className="flex flex-col gap-8">
                    <div className="bg-slate-900 p-10 rounded-[2rem] shadow-2xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                        
                        <div className="flex items-center gap-4 mb-10 relative z-10">
                            <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center shadow-inner">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">Night Premium</h2>
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Automatic Calculation</p>
                            </div>
                        </div>

                        <div className="space-y-8 relative z-10">
                            <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                                <span className="font-bold text-sm text-white/80 tracking-wide">Status</span>
                                <button onClick={() => setNdActive(!ndActive)} className={`w-14 h-7 rounded-full transition-all duration-500 relative ${ndActive ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-1.5 w-4 h-4 bg-white rounded-full transition-all duration-500 ${ndActive ? 'left-8' : 'left-2'}`}></div>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-3">Premium Rate</label>
                                    <div className="relative">
                                        <input type="number" value={ndPercentage} onChange={(e) => setNdPercentage(parseFloat(e.target.value))} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500 transition-all font-black text-xl" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 font-black">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-3">Multiplier</label>
                                    <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl font-black text-xl border border-indigo-500/20">{(1 + ndPercentage/100).toFixed(2)}x</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-3">Range Start</label>
                                    <input type="time" value={ndStartTime} onChange={(e) => setNdStartTime(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500 font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-3">Range End</label>
                                    <input type="time" value={ndEndTime} onChange={(e) => setNdEndTime(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500 font-mono text-sm" />
                                </div>
                            </div>

                            <button onClick={handleSaveND} disabled={saving} className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-50">
                                {saving ? 'Applying...' : 'Update Policy'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals section */}
            {isPeriodModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">New Cycle</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 italic">Create Draft Payroll Period</p>
                            </div>
                            <button onClick={() => setIsPeriodModalOpen(false)} className="p-3 text-slate-300 hover:text-slate-900 hover:bg-white rounded-[1.5rem] transition-all shadow-sm">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreatePeriod} className="p-10 space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Period Label</label>
                                <input 
                                    type="text" required placeholder="e.g., March 16-31, 2026" value={newPeriod.name}
                                    onChange={(e) => setNewPeriod({...newPeriod, name: e.target.value})}
                                    className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-3xl outline-none transition-all font-black text-slate-800 text-xl" 
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cut-off Start</label>
                                    <input 
                                        type="date" required value={newPeriod.startDate}
                                        onChange={(e) => setNewPeriod({...newPeriod, startDate: e.target.value})}
                                        className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-3xl outline-none transition-all font-mono font-bold text-slate-600" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cut-off End</label>
                                    <input 
                                        type="date" required value={newPeriod.endDate}
                                        onChange={(e) => setNewPeriod({...newPeriod, endDate: e.target.value})}
                                        className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-3xl outline-none transition-all font-mono font-bold text-slate-600" 
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-black hover:translate-y-[-4px] active:translate-y-0 transition-all duration-300">
                                Create Payroll Period
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Results Modal */}
            {selectedPeriod && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-lg z-50 flex items-center justify-center p-6 sm:p-12">
                    <div className="bg-white rounded-[3rem] w-full max-w-6xl h-full max-h-[85vh] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
                        <div className="p-12 pb-8 border-b border-slate-50 flex justify-between items-start bg-slate-50/10">
                            <div>
                                <div className="flex items-center gap-4 mb-3">
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{selectedPeriod.name}</h2>
                                    <span className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">Audit Results</span>
                                </div>
                                <p className="text-slate-400 font-bold text-sm">Calculated on {new Date(selectedPeriod.updatedAt).toLocaleDateString()} • {results.length} Employees</p>
                            </div>
                            <button onClick={() => setSelectedPeriod(null)} className="p-4 text-slate-300 hover:text-slate-900 hover:bg-white rounded-[2rem] transition-all shadow-sm border border-slate-50">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-12 py-8 custom-scrollbar bg-slate-50/10">
                            {loadingResults ? (
                                <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-300">
                                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="font-black uppercase tracking-widest text-xs">Fetching audit data...</span>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white z-10">Employee</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white z-10">Base Rate</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white z-10 text-center">Work (C/ND/OT)</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white z-10 text-center">Issues (L/U/A)</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white z-10 text-right">Breakdown</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white z-10 text-right">Net Pay</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {results.map((rec) => (
                                            <tr key={rec.id} className="hover:bg-white transition-all group">
                                                <td className="px-6 py-6 font-bold">
                                                    <div className="text-slate-800 text-sm leading-none">{rec.employee.firstName} {rec.employee.lastName}</div>
                                                    <div className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-tight">{rec.employee.position?.name || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="text-slate-600 text-sm font-bold tracking-tighter">₱{rec.baseRate.toLocaleString()}</div>
                                                    <div className="text-[9px] text-slate-400 uppercase font-black">{rec.salaryType}</div>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <div className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black" title="Credited Work Hours (Within Shift Window)">{rec.totalHours.toFixed(1)}h</div>
                                                        <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black" title="Night Diff Hours">{rec.ndHours.toFixed(1)}h</div>
                                                        <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black" title="Overtime Hours">{rec.otHours.toFixed(1)}h</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${rec.lateHours > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-300'}`} title="Late Hours">{rec.lateHours.toFixed(1)}h</div>
                                                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${rec.undertimeHours > 0 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300'}`} title="Undertime Hours">{rec.undertimeHours.toFixed(1)}h</div>
                                                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${rec.absentDays > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-300'}`} title="Absent Days">{rec.absentDays}d</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <div className="text-[10px] flex flex-col items-end gap-1 font-bold whitespace-nowrap">
                                                        <div className="flex gap-2 text-slate-400">
                                                            <span>Earnings:</span>
                                                            <span className="text-slate-600">₱{(rec.basePay + rec.ndPay + rec.otPay).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex gap-2 text-rose-300">
                                                            <span>Deductions:</span>
                                                            <span className="text-rose-500">-₱{(rec.lateDeduction + rec.undertimeDeduction + rec.absenceDeduction).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="text-xl font-black text-emerald-600 tracking-tighter">₱{rec.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        <button 
                                                            onClick={() => setSelectedResult(rec)}
                                                            className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                                                        >
                                                            View Payslip
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-12 bg-slate-900 flex justify-between items-center text-white">
                            <div>
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] block mb-1">Total Payout</span>
                                <div className="text-3xl font-black">₱{results.reduce((acc, curr) => acc + curr.netPay, 0).toLocaleString()}</div>
                            </div>
                            <button onClick={() => window.print()} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm flex items-center gap-3 transition-all">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Print Statement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Payslip Modal */}
            {selectedResult && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 shadow-2xl relative custom-scrollbar">
                        <button 
                            onClick={() => setSelectedResult(null)}
                            className="absolute top-8 right-8 p-3 text-slate-300 hover:text-slate-900 transition-all"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Employee Payslip</h3>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{selectedPeriod.name}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-black text-slate-800">{selectedResult.employee.firstName} {selectedResult.employee.lastName}</div>
                                <div className="text-[10px] text-slate-400 font-black uppercase">{selectedResult.employee.position?.name}</div>
                            </div>
                        </div>

                        {/* Rate Breakdown — uses DOLE annualized formula with per-employee workFactor snapshot */}
                        {(() => {
                            // baseRate is always the canonical monthly basic (stored at payroll-run time).
                            // workFactor is snapshotted on the record (313 or 261).
                            const factor: number = selectedResult.workFactor === 261 ? 261 : 313;
                            const monthlyRate = selectedResult.baseRate;                        // canonical monthly
                            const dailyRate   = (monthlyRate * 12) / factor;                   // DOLE formula
                            const hourlyRate  = dailyRate / 8;
                            
                            const RateCard = ({ label, value, active }: { label: string, value: number, active: boolean }) => (
                                <div className={`flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all ${active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-black uppercase tracking-widest ${active ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-mono font-black text-lg ${active ? 'text-emerald-600' : 'text-slate-600'}`}>
                                            ₱{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        {active && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"></div>}
                                    </div>
                                </div>
                            );

                            return (
                                <div className="mb-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rate Breakdown</p>
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                                            {factor}-day DOLE factor · Daily = Monthly × 12 ÷ {factor}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <RateCard label="Monthly" value={monthlyRate} active={selectedResult.salaryType === 'Monthly'} />
                                        <RateCard label="Daily" value={dailyRate} active={selectedResult.salaryType === 'Daily'} />
                                        <RateCard label="Hourly" value={hourlyRate} active={selectedResult.salaryType === 'Hourly'} />
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="grid grid-cols-2 gap-12">
                            {/* Gross Compensation */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] border-b-2 border-slate-900 pb-2">Gross Compensation</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm py-1 group">
                                        <span className="text-slate-900 font-bold">Basic Salary (Per Cut Off)</span>
                                        <span className="font-mono font-black text-slate-700">₱{selectedResult.basePay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-xs py-1.5 px-2 bg-indigo-50/50 rounded flex items-center mb-2 border border-indigo-50">
                                        <span className="font-bold text-indigo-800 tracking-tight">Salary Made During Period</span>
                                        <span className="font-mono text-indigo-700 font-black">
                                            ₱{Math.max(0, selectedResult.basePay - selectedResult.absenceDeduction - selectedResult.undertimeDeduction - selectedResult.lateDeduction).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    {selectedResult.isPositiveCrediting && (
                                        <div className="px-2.5 py-2 bg-amber-50 border border-amber-200 rounded-md text-[10px] uppercase font-black tracking-widest text-amber-600 flex items-start gap-2 mb-3 shadow-inner">
                                            <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span className="leading-snug">DOLE Positive Crediting Fallback applied<br/><span className="text-amber-500/80 font-bold tracking-tight normal-case text-xs">Due to extra heavy absences in cut-off</span></span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm py-1 text-slate-600">
                                        <span className="font-medium">Absences (Days: {selectedResult.absentDays})</span>
                                        <span className="font-mono text-rose-600 font-bold">{selectedResult.absenceDeduction > 0 ? `-₱${selectedResult.absenceDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm py-1 text-slate-600">
                                        <span className="font-medium">Undertime (Hours: {selectedResult.undertimeHours.toFixed(1)})</span>
                                        <span className="font-mono text-rose-600 font-bold">{selectedResult.undertimeDeduction > 0 ? `-₱${selectedResult.undertimeDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm py-1 text-slate-600">
                                        <span className="font-medium">Late (Hours: {selectedResult.lateHours.toFixed(1)})</span>
                                        <span className="font-mono text-rose-600 font-bold">{selectedResult.lateDeduction > 0 ? `-₱${selectedResult.lateDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm py-1 text-slate-600">
                                        <span className="font-medium">Leave Pay</span>
                                        <span className="font-mono text-emerald-600 font-bold">{selectedResult.leavePay > 0 ? `+₱${selectedResult.leavePay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-3 mt-1 border-t-2 border-slate-100">
                                        <span className="text-slate-900 font-black uppercase tracking-tight">Total Basic Pay</span>
                                        <span className="font-mono font-black text-slate-900 text-lg">₱{selectedResult.totalBasicPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-8 mt-4 border-t border-slate-50">
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span className="font-medium">Night Shift Diff</span>
                                        <span className="font-mono font-bold text-slate-700">₱{selectedResult.ndPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span className="font-medium">Overtime</span>
                                        <span className="font-mono font-bold text-slate-700">₱{selectedResult.otPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span className="font-medium">Holiday Pay</span>
                                        <span className="font-mono font-bold text-slate-700">₱{selectedResult.holidayPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-sm bg-slate-900 te p-5 rounded-2xl shadow-xl shadow-slate-100">
                                        <span className="text-white/70 font-black uppercase tracking-widest text-[10px] mt-1">Gross Taxable Income</span>
                                        <span className="font-mono font-black text-white text-xl">₱{selectedResult.grossTaxableIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Deductions */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] border-b-2 border-slate-900 pb-2">Deductions</h4>

                                {/* Government Mandated */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Government Mandated</p>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-700 font-medium">SSS Contribution</span>
                                            <span className="font-mono text-rose-600 font-bold">₱{selectedResult.sssDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-700 font-medium">PhilHealth</span>
                                            <span className="font-mono text-rose-600 font-bold">₱{selectedResult.phicDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-700 font-medium">Pag-IBIG</span>
                                            <span className="font-mono text-rose-600 font-bold">₱{selectedResult.hdmfDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs pt-2 border-t border-dashed border-slate-200">
                                            <span className="text-slate-500 font-black uppercase tracking-wide">Sub-total</span>
                                            <span className="font-mono font-black text-rose-500">₱{selectedResult.subTotalGovtDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tax */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Withholding Tax</p>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-700 font-medium">Income Tax (TRAIN Law)</span>
                                            <span className="font-mono text-rose-600 font-bold">₱{selectedResult.taxDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Other Deductions */}
                                {(selectedResult.hmoDeduction > 0 || selectedResult.sssLoan > 0 || selectedResult.hdmfLoan > 0 || selectedResult.companyLoan > 0 || selectedResult.otherDeduction > 0) && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Other Deductions</p>
                                        <div className="space-y-2.5">
                                            {selectedResult.hmoDeduction > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-700 font-medium">HMO</span>
                                                    <span className="font-mono text-rose-600 font-bold">₱{selectedResult.hmoDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {selectedResult.sssLoan > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-700 font-medium">SSS Loan</span>
                                                    <span className="font-mono text-rose-600 font-bold">₱{selectedResult.sssLoan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {selectedResult.hdmfLoan > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-700 font-medium">Pag-IBIG Loan</span>
                                                    <span className="font-mono text-rose-600 font-bold">₱{selectedResult.hdmfLoan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {selectedResult.companyLoan > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-700 font-medium">Company Loan</span>
                                                    <span className="font-mono text-rose-600 font-bold">₱{selectedResult.companyLoan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {selectedResult.otherDeduction > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-700 font-medium">Other</span>
                                                    <span className="font-mono text-rose-600 font-bold">₱{selectedResult.otherDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Grand Total */}
                                <div className="flex justify-between text-sm pt-4 border-t-2 border-slate-900 mt-2">
                                    <span className="text-slate-900 font-black uppercase tracking-tight text-xs">Total Deductions</span>
                                    <span className="font-mono font-black text-rose-600 text-lg">₱{(selectedResult.subTotalGovtDues + selectedResult.subTotalDeductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            {/* Shortfall Warning — shown when contributions exceed gross pay */}
                            {(() => {
                                const totalDeduc = selectedResult.subTotalGovtDues + selectedResult.subTotalDeductions;
                                const shortfall = totalDeduc - selectedResult.grossTaxableIncome;
                                if (shortfall <= 0) return null;
                                return (
                                    <div className="mt-6 p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex gap-4 items-start">
                                        <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-amber-900 font-black text-xs uppercase tracking-wide mb-1">Contribution Shortfall Detected</p>
                                            <p className="text-amber-800 text-xs font-medium leading-relaxed">
                                                Statutory government contributions (₱{totalDeduc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceed this period's gross pay (₱{selectedResult.grossTaxableIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). 
                                                The shortfall of <strong>₱{shortfall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> must be employer-advanced
                                                and remitted to SSS, PhilHealth, and Pag-IBIG on the employee's behalf.
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="pt-10 mt-4 border-t-4 border-slate-900">
                                {(() => {
                                    const totalDeduc = selectedResult.subTotalGovtDues + selectedResult.subTotalDeductions;
                                    const hasShortfall = totalDeduc > selectedResult.grossTaxableIncome;
                                    return (
                                        <div className={`text-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center text-center ${hasShortfall ? 'bg-amber-500 shadow-amber-100' : 'bg-emerald-600 shadow-emerald-100'}`}>
                                            <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] block mb-2">Net Take Home Pay</span>
                                            <div className="text-5xl font-black tracking-tighter">₱{selectedResult.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            {hasShortfall && <span className="text-white/70 text-[10px] font-black uppercase tracking-widest mt-2">⚠ Employer to advance shortfall</span>}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        </div>
                        
                        <div className="mt-12 text-center">
                            <button 
                                onClick={() => window.print()}
                                className="px-10 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all font-mono"
                            >
                                Download PDF / Print
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payroll;
