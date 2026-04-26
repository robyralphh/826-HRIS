'use client';

import React, { useState, useEffect } from 'react';

const Finance = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'loans' | 'assets'>('dashboard');
    const [loading, setLoading] = useState(true);
    
    // Data states
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loans, setLoans] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [ledger, setLedger] = useState<any>({ entries: [], summary: { totalIncome: 0, totalExpenses: 0, netBalance: 0 } });
    const [employees, setEmployees] = useState<any[]>([]);

    // Modal states
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    
    // Viewer states
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerImages, setViewerImages] = useState<string[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [viewerZoom, setViewerZoom] = useState(1);
    
    // Form states
    const [newExpense, setNewExpense] = useState({ employeeId: '', amount: '', category: 'Travel', description: '', receiptUrls: [] as string[] });
    const [newLoan, setNewLoan] = useState({ employeeId: '', principalAmount: '', monthlyDeduction: '' });
    const [newAsset, setNewAsset] = useState({ employeeId: '', name: '', type: 'Laptop', serialNumber: '', purchaseDate: '', purchasePrice: '', condition: 'Good', status: 'Available' });
    
    // Permission state
    const [perms, setPerms] = useState<Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>>({
        expenses: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        loans: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        assets: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        finance: { canView: false, canCreate: false, canEdit: false, canDelete: false }
    });

    useEffect(() => {
        loadPermissions();
        fetchData();
        fetchEmployees();
    }, []);

    const loadPermissions = () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userObj = JSON.parse(userStr);
                const role = userObj.role;
                
                const roleName = typeof role === 'string' ? role : role?.name;
                const normalizedRole = roleName?.toLowerCase().trim().replace(/\s/g, '');
                
                if (normalizedRole === 'superadmin') {
                    const allPerm = { canView: true, canCreate: true, canEdit: true, canDelete: true };
                    setPerms({
                        expenses: allPerm,
                        loans: allPerm,
                        assets: allPerm,
                        finance: allPerm
                    });
                    return;
                }

                if (role?.permissions) {
                    const findPerm = (mod: string) => role.permissions.find((p: any) => p.module === mod) || { canView: false, canCreate: false, canEdit: false, canDelete: false };
                    setPerms({
                        expenses: findPerm('Expenses'),
                        loans: findPerm('Loans'),
                        assets: findPerm('Assets'),
                        finance: findPerm('Finance')
                    });
                }
            }
        } catch (error) {
            console.error('Error loading permissions', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [expRes, loanRes, assetRes, ledgerRes] = await Promise.all([
                fetch('/api/finance/expenses'),
                fetch('/api/finance/loans'),
                fetch('/api/finance/assets'),
                fetch('/api/finance/ledger')
            ]);

            const [expData, loanData, assetData, ledgerData] = await Promise.all([
                expRes.json(),
                loanRes.json(),
                assetRes.json(),
                ledgerRes.json()
            ]);

            setExpenses(expData);
            setLoans(loanData);
            setAssets(assetData);
            setLedger(ledgerData);
        } catch (error) {
            console.error('Error fetching finance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees');
            const data = await res.json();
            setEmployees(data);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const adminId = user.id || user._id;
            
            const headers: Record<string, string> = { 
                'Content-Type': 'application/json' 
            };
            if (adminId) headers['x-admin-id'] = adminId;

            const res = await fetch(`/api/finance/expenses/${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchData();
            } else {
                const err = await res.json();
                alert(`${err.error || 'Failed to update status'}${err.details ? ': ' + err.details : ''}`);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('An unexpected error occurred while updating status. Check console for details.');
        }
    };

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/finance/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newExpense)
            });
            if (res.ok) {
                setIsExpenseModalOpen(false);
                setNewExpense({ employeeId: '', amount: '', category: 'Travel', description: '', receiptUrls: [] });
                fetchData();
            }
        } catch (error) {
            console.error('Error creating expense:', error);
        }
    };

    const handleCreateLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/finance/loans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLoan)
            });
            if (res.ok) {
                setIsLoanModalOpen(false);
                setNewLoan({ employeeId: '', principalAmount: '', monthlyDeduction: '' });
                fetchData();
            }
        } catch (error) {
            console.error('Error creating loan:', error);
        }
    };

    const handleCreateAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/finance/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAsset)
            });
            if (res.ok) {
                setIsAssetModalOpen(false);
                setNewAsset({ employeeId: '', name: '', type: 'Laptop', serialNumber: '', purchaseDate: '', purchasePrice: '', condition: 'Good', status: 'Available' });
                fetchData();
            }
        } catch (error) {
            console.error('Error creating asset:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Finance Module...</p>
            </div>
        );
    }

    return (
        <div className="p-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">Finance Hub</h1>
                    <p className="text-slate-500 font-medium">Manage expenses, loans, company assets, and financial records.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white p-1 rounded-2xl shadow-xl border border-slate-100 flex">
                        {(['dashboard', 'expenses', 'loans', 'assets'] as const).map((tab) => {
                            // Map tab to permission key
                            const permKey = tab === 'dashboard' ? 'finance' : tab;
                            const canView = tab === 'dashboard' || (perms[permKey]?.canView);
                            
                            if (!canView) return null;

                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                        activeTab === tab 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {tab}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-all duration-700"></div>
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-4">Total Revenue / Income</p>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2">₱{ledger.summary.totalIncome.toLocaleString()}</div>
                            <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                <span>Company Ledger Total</span>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-rose-500/10 transition-all duration-700"></div>
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-4">Total Expenses</p>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2">₱{ledger.summary.totalExpenses.toLocaleString()}</div>
                            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                                <span>Operational Costs</span>
                            </div>
                        </div>
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                            <p className="text-white/40 font-black uppercase tracking-widest text-[10px] mb-4">Net Balance</p>
                            <div className="text-4xl font-black tracking-tighter leading-none mb-2">₱{ledger.summary.netBalance.toLocaleString()}</div>
                            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest italic">
                                <span>Company Treasury</span>
                            </div>
                        </div>
                    </div>

                    {/* Ledger Entries */}
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Recent Ledger Entries</h2>
                            <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                                Add Entry
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Date</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Type</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Category</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Description</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(ledger.entries || []).map((entry: any) => (
                                        <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6 text-sm font-bold text-slate-600">{new Date(entry.date).toLocaleDateString()}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                    entry.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                    {entry.type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-sm font-black text-slate-800 tracking-tight">{entry.category}</td>
                                            <td className="px-8 py-6 text-xs text-slate-500 font-medium">{entry.description || '-'}</td>
                                            <td className={`px-8 py-6 text-right font-black text-lg tracking-tighter ${
                                                entry.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'
                                            }`}>
                                                {entry.type === 'INCOME' ? '+' : '-'}₱{entry.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {ledger.entries.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300">
                                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 00-2 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                                    </div>
                                                    <div className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">No ledger entries found</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'expenses' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Expense Reimbursements</h2>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Employee pending claims</p>
                            </div>
                            {perms.expenses.canCreate && (
                                <button 
                                    onClick={() => setIsExpenseModalOpen(true)}
                                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                                    New Request
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Employee</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Category</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Description</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Receipts</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Amount</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {expenses.map((exp: any) => (
                                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6 font-black text-slate-800 text-sm">{exp.employee?.firstName} {exp.employee?.lastName}</td>
                                            <td className="px-8 py-6">
                                                <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-xs text-slate-500 font-medium max-w-xs truncate">{exp.description}</td>
                                            <td className="px-8 py-6 text-center">
                                                {(exp.receiptUrls || []).length > 0 ? (
                                                    <button 
                                                        onClick={() => {
                                                            setViewerImages(exp.receiptUrls);
                                                            setViewerIndex(0);
                                                            setIsViewerOpen(true);
                                                        }}
                                                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2 mx-auto active:scale-95"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        View ({exp.receiptUrls.length})
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-300 uppercase italic">None</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${
                                                    exp.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                                                    exp.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                    {exp.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-lg tracking-tighter text-slate-900">
                                                ₱{exp.amount.toLocaleString()}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {exp.status === 'Pending' && perms.expenses.canEdit && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleUpdateStatus(exp.id || exp._id, 'Approved')}
                                                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                                                title="Approve"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleUpdateStatus(exp.id || exp._id, 'Rejected')}
                                                                className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                                                                title="Reject"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </>
                                                    )}
                                                    {exp.status === 'Approved' && perms.expenses.canEdit && (
                                                        <button 
                                                            onClick={() => handleUpdateStatus(exp.id || exp._id, 'Paid')}
                                                            className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                                                        >
                                                            Mark Paid
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {expenses.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center italic text-slate-400 font-bold uppercase tracking-widest text-[10px]">No expense records found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'loans' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Active Loans & Cash Advances</h2>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Automatic payroll deductions</p>
                            </div>
                            {perms.loans.canCreate && (
                                <button 
                                    onClick={() => setIsLoanModalOpen(true)}
                                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all flex items-center gap-3 active:scale-95"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                                    Create Loan
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Employee</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Principal</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Monthly Deduc</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Progress</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loans.map((loan: any) => (
                                        <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6 font-black text-slate-800 text-sm">{loan.employee?.firstName} {loan.employee?.lastName}</td>
                                            <td className="px-8 py-6 text-sm font-bold text-slate-600">₱{loan.principalAmount.toLocaleString()}</td>
                                            <td className="px-8 py-6 text-sm font-black text-rose-500">-₱{loan.monthlyDeduction.toLocaleString()}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1.5 min-w-[120px]">
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                                                            style={{ width: `${Math.min(100, (1 - loan.remainingBalance / loan.principalAmount) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        {Math.round((1 - loan.remainingBalance / loan.principalAmount) * 100)}% Paid
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-lg tracking-tighter text-slate-900">
                                                ₱{loan.remainingBalance.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {loans.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center italic text-slate-400 font-bold uppercase tracking-widest text-[10px]">No active loans</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'assets' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Company Asset Inventory</h2>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Track laptops, vehicles, and equipment</p>
                            </div>
                            {perms.assets.canCreate && (
                                <button 
                                    onClick={() => setIsAssetModalOpen(true)}
                                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                                    Add Asset
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Asset Name</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Type</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Assigned To</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Serial No.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {assets.map((asset: any) => (
                                        <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6 font-black text-slate-800 text-sm">{asset.name}</td>
                                            <td className="px-8 py-6 text-xs text-slate-500 font-bold">{asset.type}</td>
                                            <td className="px-8 py-6">
                                                {asset.employee ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-600 uppercase tracking-tighter shadow-inner ring-1 ring-slate-200">
                                                            {asset.employee.firstName.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700">{asset.employee.firstName} {asset.employee.lastName}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-300 uppercase italic">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${
                                                    asset.status === 'Available' ? 'bg-emerald-50 text-emerald-600' :
                                                    asset.status === 'Assigned' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {asset.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right font-mono text-xs font-black text-slate-400">{asset.serialNumber || 'N/A'}</td>
                                        </tr>
                                    ))}
                                    {assets.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center italic text-slate-400 font-bold uppercase tracking-widest text-[10px]">No assets found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Reimbursement</h2>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Submit employee expense</p>
                            </div>
                            <button onClick={() => setIsExpenseModalOpen(false)} className="p-3 text-slate-300 hover:text-slate-900 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateExpense} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Employee</label>
                                <select 
                                    required 
                                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700"
                                    value={newExpense.employeeId}
                                    onChange={(e) => setNewExpense({...newExpense, employeeId: e.target.value})}
                                >
                                    <option value="">Choose an employee...</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₱)</label>
                                    <input 
                                        type="number" required 
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-slate-800 text-lg"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                    <select 
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700"
                                        value={newExpense.category}
                                        onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                                    >
                                        <option value="Travel">Travel</option>
                                        <option value="Office Supplies">Office Supplies</option>
                                        <option value="Meals">Meals</option>
                                        <option value="Utilities">Utilities</option>
                                        <option value="Training">Training</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                <textarea 
                                    required rows={3}
                                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-medium text-slate-600 text-sm"
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                ></textarea>
                            </div>
                            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2.5xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98]">
                                Record Expense
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Loan Modal */}
            {isLoanModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Setup Loan / Advance</h2>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Establish repayment terms</p>
                            </div>
                            <button onClick={() => setIsLoanModalOpen(false)} className="p-3 text-slate-300 hover:text-slate-900 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateLoan} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Employee</label>
                                <select 
                                    required 
                                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700"
                                    value={newLoan.employeeId}
                                    onChange={(e) => setNewLoan({...newLoan, employeeId: e.target.value})}
                                >
                                    <option value="">Choose an employee...</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Principal Amount (₱)</label>
                                    <input 
                                        type="number" required 
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-slate-800 text-lg"
                                        value={newLoan.principalAmount}
                                        onChange={(e) => setNewLoan({...newLoan, principalAmount: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Deduction (₱)</label>
                                    <input 
                                        type="number" required 
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-rose-500 text-lg"
                                        value={newLoan.monthlyDeduction}
                                        onChange={(e) => setNewLoan({...newLoan, monthlyDeduction: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 italic text-[10px] text-indigo-600 font-bold leading-relaxed">
                                FYI: This deduction will automatically be applied to every payroll period until the remaining balance reaches zero.
                            </div>
                            <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2.5xl font-black text-lg shadow-xl hover:bg-black transition-all active:scale-[0.98]">
                                Activate Loan
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Asset Modal */}
            {isAssetModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add Tool / Equipment</h2>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Register company property</p>
                            </div>
                            <button onClick={() => setIsAssetModalOpen(false)} className="p-3 text-slate-300 hover:text-slate-900 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateAsset} className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Name</label>
                                <input 
                                    type="text" required placeholder="e.g., MacBook Pro M3"
                                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none text-slate-800 font-bold"
                                    value={newAsset.name}
                                    onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                    <select 
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700"
                                        value={newAsset.type}
                                        onChange={(e) => setNewAsset({...newAsset, type: e.target.value})}
                                    >
                                        <option value="Laptop">Laptop</option>
                                        <option value="Phone">Phone</option>
                                        <option value="Vehicle">Vehicle</option>
                                        <option value="Furniture">Furniture</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Serial Number</label>
                                    <input 
                                        type="text" required placeholder="S/N: 123456"
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none text-slate-800 font-mono font-bold"
                                        value={newAsset.serialNumber}
                                        onChange={(e) => setNewAsset({...newAsset, serialNumber: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign to Employee (Optional)</label>
                                <select 
                                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700"
                                    value={newAsset.employeeId}
                                    onChange={(e) => setNewAsset({...newAsset, employeeId: e.target.value, status: e.target.value ? 'Assigned' : 'Available'})}
                                >
                                    <option value="">Inventory (Not Assigned)</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2.5xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98]">
                                Register Asset
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Receipt Viewer Modal */}
            {isViewerOpen && (
                <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex flex-col animate-in fade-in duration-300">
                    {/* Header */}
                    <div className="p-6 flex justify-between items-center bg-white/5 border-b border-white/10">
                        <div className="flex flex-col">
                            <h3 className="text-white font-black text-lg tracking-tight">Attachment Viewer</h3>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-0.5">
                                {viewerIndex + 1} of {viewerImages.length} • {viewerImages[viewerIndex].split('/').pop()?.split('-').pop()}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <a 
                                href={viewerImages[viewerIndex]} 
                                target="_blank" 
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                Open Original
                            </a>
                            <button 
                                onClick={() => setIsViewerOpen(false)}
                                className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 relative flex items-center justify-center p-12 group">
                        {/* Navigation - Prev */}
                        {viewerImages.length > 1 && (
                            <button 
                                onClick={() => {
                                    setViewerIndex((prev) => (prev === 0 ? viewerImages.length - 1 : prev - 1));
                                    setViewerZoom(1); // Reset zoom on slide change
                                }}
                                className="absolute left-8 p-6 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all z-10 group-hover:scale-110 active:scale-90"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        )}

                        <div className="max-w-[95vw] max-h-[88vh] w-full h-full relative overflow-auto rounded-[2.5rem] shadow-2xl border border-white/10 bg-black/40 cursor-zoom-in group/viewer">
                            {/* Centering Wrapper */}
                            <div className="min-w-full min-h-full flex items-center justify-center p-8">
                                {viewerImages[viewerIndex].match(/\.(jpg|jpeg|png|gif|webp)$/i) || viewerImages[viewerIndex].startsWith('/uploads/') ? (
                                    <img 
                                        src={viewerImages[viewerIndex]} 
                                        alt="Receipt" 
                                        className="max-w-full max-h-full object-contain transition-transform duration-300 ease-out animate-in zoom-in duration-500"
                                        style={{ transform: `scale(${viewerZoom})`, transformOrigin: 'center' }}
                                    />
                                ) : (
                                    <div className="p-20 text-center">
                                        <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-white/20 mx-auto mb-6">
                                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </div>
                                        <h4 className="text-xl font-black text-white/80 tracking-tight">External Link Detected</h4>
                                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2 mb-8">This attachment is hosted externally (e.g. Google Drive/Dropbox)</p>
                                        <a 
                                            href={viewerImages[viewerIndex]} 
                                            target="_blank" 
                                            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mx-auto"
                                        >
                                            Visit External Site
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Zoom Controls */}
                            {viewerImages[viewerIndex].match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 opacity-0 group-hover/viewer:opacity-100 transition-all duration-300 z-50">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setViewerZoom(prev => Math.max(0.5, prev - 0.25)); }}
                                        className="p-2.5 text-white hover:bg-white/10 rounded-xl transition-colors"
                                        title="Zoom Out"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
                                    </button>
                                    <div className="px-4 text-[10px] font-black text-white uppercase tracking-widest border-x border-white/10 min-w-[80px] text-center">
                                        {Math.round(viewerZoom * 100)}%
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setViewerZoom(prev => Math.min(3, prev + 0.25)); }}
                                        className="p-2.5 text-white hover:bg-white/10 rounded-xl transition-colors"
                                        title="Zoom In"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setViewerZoom(1); }}
                                        className="p-2.5 text-white/40 hover:text-white transition-colors ml-1"
                                        title="Reset Zoom"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Navigation - Next */}
                        {viewerImages.length > 1 && (
                            <button 
                                onClick={() => {
                                    setViewerIndex((prev) => (prev === viewerImages.length - 1 ? 0 : prev + 1));
                                    setViewerZoom(1); // Reset zoom on slide change
                                }}
                                className="absolute right-8 p-6 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all z-10 group-hover:scale-110 active:scale-90"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Footer / Thumbnails */}
                    {viewerImages.length > 1 && (
                        <div className="p-8 flex justify-center gap-4 bg-white/5 border-t border-white/10 overflow-x-auto">
                            {viewerImages.map((src, i) => (
                                <button 
                                    key={src + i}
                                    onClick={() => setViewerIndex(i)}
                                    className={`relative w-24 h-16 rounded-xl overflow-hidden transition-all flex-shrink-0 ${
                                        i === viewerIndex ? 'ring-4 ring-indigo-500 scale-110' : 'opacity-40 hover:opacity-100'
                                    }`}
                                >
                                    {src.match(/\.(jpg|jpeg|png|gif|webp)$/i) || src.startsWith('/uploads/') ? (
                                        <img src={src} className="w-full h-full object-cover" alt="Thumbnail" />
                                    ) : (
                                        <div className="w-full h-full bg-indigo-900 flex items-center justify-center text-white/30">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Finance;
